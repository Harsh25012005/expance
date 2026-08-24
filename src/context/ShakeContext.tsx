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

// ─── Notification handler ─────────────────────────────────────────────────────
// When the app is in FOREGROUND → suppress all notifications (modal opens directly)
// When in BACKGROUND → allow the shake alert to show as a heads-up banner
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isForeground = AppState.currentState === 'active';
    const isShakeAlert = notification.request.content.data?.action === 'SHAKE_ALERT';
    return {
      shouldPlaySound: !isForeground && isShakeAlert,
      shouldSetBadge: false,
      shouldShowBanner: !isForeground && isShakeAlert,
      shouldShowList: !isForeground && isShakeAlert,
    };
  },
});

const TRAY_ID = 'shake-tray-keepalive';
const SHAKE_ALERT_ID = 'shake-expense-alert';

// ─── Channel setup ────────────────────────────────────────────────────────────
async function setupChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    // Silent tray (just keeps the app "registered" in background)
    await Notifications.setNotificationChannelAsync('shake-tray', {
      name: 'ShakeExpense Background',
      importance: Notifications.AndroidImportance.LOW,
      enableVibrate: false,
      enableLights: false,
      showBadge: false,
    });

    // Max-priority channel for the shake heads-up alert over other apps
    await Notifications.setNotificationChannelAsync('shake-alert', {
      name: 'Shake Expense Alert',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#10b981',
      showBadge: false,
      bypassDnd: true,
    });
  } catch (_) {}
}

// ─── Tray notification — keeps JS runtime alive in background ─────────────────
async function showTrayNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.dismissNotificationAsync(TRAY_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: TRAY_ID,
      content: {
        title: '⚡ ShakeExpense is listening',
        body: 'Shake your phone to log an expense instantly',
        data: { action: 'TRAY_TAP' },
        sticky: true,
        autoDismiss: false,
      },
      trigger: null,
    });
  } catch (_) {}
}

async function dismissTrayNotification(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(TRAY_ID);
    await Notifications.dismissNotificationAsync(SHAKE_ALERT_ID);
  } catch (_) {}
}

// ─── Shake alert notification — shown on top of other apps ───────────────────
async function fireShakeAlertNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.dismissNotificationAsync(SHAKE_ALERT_ID).catch(() => {});

    // Set notification category with "Add Expense" action button
    await Notifications.setNotificationCategoryAsync('SHAKE_CATEGORY', [
      {
        identifier: 'OPEN_EXPENSE',
        buttonTitle: '➕ Add Expense Now',
        options: { opensAppToForeground: true },
      },
    ]).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: SHAKE_ALERT_ID,
      content: {
        title: '📳 Shake Detected!',
        body: 'Tap to open Quick Expense — Remark & Amount',
        data: { action: 'SHAKE_ALERT' },
        categoryIdentifier: 'SHAKE_CATEGORY',
        autoDismiss: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[Shake] Failed to fire alert notification:', e);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ShakeProvider = ({ children }: { children: ReactNode }) => {
  const [isShakeModalOpen, setIsShakeModalOpen] = useState<boolean>(false);
  const [shakeSettings, setShakeSettings] = useState<ShakeSettings>(DEFAULT_SHAKE_SETTINGS);
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(false);

  // All refs — never stale inside accelerometer callback
  const settingsRef = useRef<ShakeSettings>(DEFAULT_SHAKE_SETTINGS);
  const lastShakeTime = useRef<number>(0);
  const lastX = useRef<number>(0);
  const lastY = useRef<number>(0);
  const lastZ = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pendingOpenModal = useRef<boolean>(false);
  const setModalRef = useRef<(v: boolean) => void>(setIsShakeModalOpen);

  useEffect(() => { setModalRef.current = setIsShakeModalOpen; }, [setIsShakeModalOpen]);
  useEffect(() => { settingsRef.current = shakeSettings; }, [shakeSettings]);

  // ── Init: load settings + request permissions + setup channels ─────────────
  useEffect(() => {
    const init = async () => {
      try {
        const stored = await StorageService.getShakeSettings();
        setShakeSettings(stored);
        settingsRef.current = stored;
        console.log('[Shake] Settings loaded:', stored);

        if (Platform.OS !== 'web') {
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }
          await setupChannels();
        }
      } catch (e) {
        console.warn('[Shake] Init error:', e);
      }
    };
    init();
  }, []);

  // ── Core shake handler (only uses refs — NEVER stale) ────────────────────
  const handleShake = useCallback(() => {
    const now = Date.now();
    if (now - lastShakeTime.current < 1200) return;
    lastShakeTime.current = now;

    console.log('[Shake] 🔔 Shake! appState =', appStateRef.current);

    if (settingsRef.current.hapticFeedback && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }

    if (appStateRef.current === 'active') {
      // App is in foreground: open modal DIRECTLY — no notification at all
      console.log('[Shake] ✅ App active → opening modal directly');
      setModalRef.current(true);
    } else {
      // App is in background: fire a heads-up notification that appears
      // in front of whatever app is currently on screen
      console.log('[Shake] 📳 App in background → firing heads-up notification');
      pendingOpenModal.current = true;
      fireShakeAlertNotification();
    }
  }, []);

  // ── Accelerometer subscription (stable — set up once, uses refs) ──────────
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let sub: ReturnType<typeof Accelerometer.addListener> | null = null;

    Accelerometer.isAvailableAsync()
      .then((available) => {
        setIsSensorAvailable(available);
        if (!available) {
          console.warn('[Shake] Accelerometer NOT available');
          return;
        }

        console.log('[Shake] ✅ Accelerometer available — listening');
        Accelerometer.setUpdateInterval(80);

        sub = Accelerometer.addListener(({ x, y, z }) => {
          if (!settingsRef.current.enabled) return;

          const dx = Math.abs(x - lastX.current);
          const dy = Math.abs(y - lastY.current);
          const dz = Math.abs(z - lastZ.current);
          const delta = dx + dy + dz;
          const threshold = SENSITIVITY_THRESHOLDS[settingsRef.current.sensitivity] ?? 1.8;

          if (delta > threshold) handleShake();

          lastX.current = x;
          lastY.current = y;
          lastZ.current = z;
        });
      })
      .catch((e) => console.warn('[Shake] Accelerometer setup error:', e));

    return () => sub?.remove();
  }, [handleShake]);

  // ── AppState listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const onStateChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      console.log('[Shake] AppState:', prev, '→', next);

      if (next === 'active') {
        dismissTrayNotification();
        if (pendingOpenModal.current) {
          pendingOpenModal.current = false;
          console.log('[Shake] Opening modal from pending flag');
          setIsShakeModalOpen(true);
        }
      }

      if (prev === 'active' && (next === 'background' || next === 'inactive')) {
        if (settingsRef.current.enabled && Platform.OS === 'android') {
          showTrayNotification();
        }
      }

      appStateRef.current = next;
    };

    const sub = AppState.addEventListener('change', onStateChange);
    return () => sub.remove();
  }, []);

  // ── Notification response handler (user taps notification) ───────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // If app opened FROM a notification tap
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (!resp) return;
      const action = resp.notification.request.content.data?.action;
      if (action === 'SHAKE_ALERT' || action === 'TRAY_TAP' ||
          resp.actionIdentifier === 'OPEN_EXPENSE' ||
          resp.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        pendingOpenModal.current = false;
        setIsShakeModalOpen(true);
      }
    });

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const action = resp.notification.request.content.data?.action;
      if (action === 'SHAKE_ALERT' || action === 'TRAY_TAP' ||
          resp.actionIdentifier === 'OPEN_EXPENSE') {
        pendingOpenModal.current = false;
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

  const updateShakeSettings = useCallback(async (patch: Partial<ShakeSettings>) => {
    const updated = { ...settingsRef.current, ...patch };
    setShakeSettings(updated);
    settingsRef.current = updated;
    await StorageService.saveShakeSettings(updated);
    if (!updated.enabled) dismissTrayNotification();
  }, []);

  return (
    <ShakeContext.Provider
      value={{ isShakeModalOpen, openShakeModal, closeShakeModal, shakeSettings, updateShakeSettings, simulateShake, isSensorAvailable }}
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
