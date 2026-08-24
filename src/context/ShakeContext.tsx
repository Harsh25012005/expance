import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { ShakeSettings, ShakeSensitivity } from '../types/expense';
import { StorageService, DEFAULT_SHAKE_SETTINGS } from '../services/storage';

interface ShakeContextType {
  isShakeModalOpen: boolean;
  openShakeModal: () => void;
  closeShakeModal: () => void;
  shakeSettings: ShakeSettings;
  updateShakeSettings: (settings: Partial<ShakeSettings>) => Promise<void>;
  simulateShake: () => void;
  isSensorAvailable: boolean;
}

const ShakeContext = createContext<ShakeContextType | undefined>(undefined);

// Sensitivity thresholds — total acceleration delta between frames
const SENSITIVITY_THRESHOLDS: Record<ShakeSensitivity, number> = {
  low: 2.5,
  medium: 1.8,
  high: 1.2,
};

// ─── Minimal silent tray notification (keep-alive for background) ─────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

const TRAY_ID = 'shake-tray-keepalive';

async function showTrayNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('shake-tray', {
      name: 'ShakeExpense Active',
      importance: Notifications.AndroidImportance.LOW,
      enableVibrate: false,
      enableLights: false,
      showBadge: false,
    });
    await Notifications.dismissNotificationAsync(TRAY_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: TRAY_ID,
      content: {
        title: '⚡ ShakeExpense is listening…',
        body: 'Shake phone anytime to log an expense',
        data: { action: 'TRAY_TAP' },
        sticky: true,
        autoDismiss: false,
      },
      trigger: null,
      // @ts-ignore — channelId is an Android-only field on the schedule request
      channelId: 'shake-tray',
    });
  } catch (_) {}
}

async function dismissTrayNotification(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(TRAY_ID);
  } catch (_) {}
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ShakeProvider = ({ children }: { children: ReactNode }) => {
  const [isShakeModalOpen, setIsShakeModalOpen] = useState<boolean>(false);
  const [shakeSettings, setShakeSettings] = useState<ShakeSettings>(DEFAULT_SHAKE_SETTINGS);
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(false);

  // ── Refs used inside accelerometer listener — always fresh, no stale closure
  const settingsRef = useRef<ShakeSettings>(DEFAULT_SHAKE_SETTINGS);
  const lastShakeTime = useRef<number>(0);
  const lastX = useRef<number>(0);
  const lastY = useRef<number>(0);
  const lastZ = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pendingOpenModal = useRef<boolean>(false);
  const setModalOpenRef = useRef<(v: boolean) => void>(setIsShakeModalOpen);

  // Keep setModalOpenRef in sync (so the accelerometer listener always has latest setter)
  useEffect(() => {
    setModalOpenRef.current = setIsShakeModalOpen;
  }, [setIsShakeModalOpen]);

  // Keep settingsRef in sync with state
  useEffect(() => {
    settingsRef.current = shakeSettings;
  }, [shakeSettings]);

  // ── Load settings on mount ────────────────────────────────────────────────
  useEffect(() => {
    StorageService.getShakeSettings()
      .then((stored) => {
        setShakeSettings(stored);
        settingsRef.current = stored;
        console.log('[Shake] Settings loaded:', stored);
      })
      .catch((e) => console.warn('[Shake] Error loading settings:', e));
  }, []);

  // ── Core shake handler (uses refs — never stale) ─────────────────────────
  const handleShake = useCallback(() => {
    const now = Date.now();
    if (now - lastShakeTime.current < 1200) return; // debounce
    lastShakeTime.current = now;

    console.log('[Shake] 🔔 Shake detected! appState:', appStateRef.current);

    // Haptic
    if (settingsRef.current.hapticFeedback && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }

    if (appStateRef.current === 'active') {
      console.log('[Shake] Opening modal directly (app is active)');
      setModalOpenRef.current(true);
    } else {
      console.log('[Shake] App in background — setting pending flag');
      pendingOpenModal.current = true;
    }
  }, []); // empty deps — handleShake uses only refs

  // ── Accelerometer subscription ────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let sub: ReturnType<typeof Accelerometer.addListener> | null = null;

    const setup = async () => {
      const available = await Accelerometer.isAvailableAsync().catch(() => false);
      setIsSensorAvailable(available);

      if (!available) {
        console.warn('[Shake] Accelerometer not available on this device');
        return;
      }

      console.log('[Shake] ✅ Accelerometer available, starting listener');
      Accelerometer.setUpdateInterval(80); // ~12 samples/sec

      sub = Accelerometer.addListener(({ x, y, z }) => {
        // Only check shake if enabled (use ref, not state — never stale)
        if (!settingsRef.current.enabled) return;

        const dx = Math.abs(x - lastX.current);
        const dy = Math.abs(y - lastY.current);
        const dz = Math.abs(z - lastZ.current);
        const totalDelta = dx + dy + dz;

        const threshold =
          SENSITIVITY_THRESHOLDS[settingsRef.current.sensitivity] ?? 1.8;

        if (totalDelta > threshold) {
          handleShake();
        }

        lastX.current = x;
        lastY.current = y;
        lastZ.current = z;
      });
    };

    setup();

    return () => {
      sub?.remove();
      console.log('[Shake] Accelerometer subscription removed');
    };
  }, [handleShake]); // handleShake is stable (useCallback with [])

  // ── AppState listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const onStateChange = (nextState: AppStateStatus) => {
      console.log('[Shake] AppState:', appStateRef.current, '→', nextState);

      const comingToForeground =
        appStateRef.current.match(/inactive|background/) && nextState === 'active';

      if (comingToForeground) {
        dismissTrayNotification();
        if (pendingOpenModal.current) {
          pendingOpenModal.current = false;
          console.log('[Shake] Opening modal (was pending from background)');
          setIsShakeModalOpen(true);
        }
      }

      const goingToBackground =
        appStateRef.current === 'active' &&
        (nextState === 'background' || nextState === 'inactive');

      if (goingToBackground && settingsRef.current.enabled && Platform.OS === 'android') {
        showTrayNotification();
      }

      appStateRef.current = nextState;
    };

    const sub = AppState.addEventListener('change', onStateChange);
    return () => sub.remove();
  }, []);

  // ── Tray notification tap → open modal ───────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.action === 'TRAY_TAP') {
        setIsShakeModalOpen(true);
      }
    });
    return () => sub.remove();
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────
  const openShakeModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsShakeModalOpen(true);
  }, []);

  const closeShakeModal = useCallback(() => setIsShakeModalOpen(false), []);

  const simulateShake = useCallback(() => handleShake(), [handleShake]);

  const updateShakeSettings = useCallback(
    async (newSettings: Partial<ShakeSettings>) => {
      const updated = { ...settingsRef.current, ...newSettings };
      setShakeSettings(updated);
      settingsRef.current = updated;
      await StorageService.saveShakeSettings(updated);
      if (!updated.enabled) dismissTrayNotification();
    },
    []
  );

  return (
    <ShakeContext.Provider
      value={{
        isShakeModalOpen,
        openShakeModal,
        closeShakeModal,
        shakeSettings,
        updateShakeSettings,
        simulateShake,
        isSensorAvailable,
      }}
    >
      {children}
    </ShakeContext.Provider>
  );
};

export const useShake = () => {
  const context = useContext(ShakeContext);
  if (!context) throw new Error('useShake must be used within a ShakeProvider');
  return context;
};
