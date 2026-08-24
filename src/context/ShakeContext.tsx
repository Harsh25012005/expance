import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Platform, AppState, AppStateStatus, Linking } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { ShakeSettings, ShakeSensitivity } from '../types/expense';
import { StorageService, DEFAULT_SHAKE_SETTINGS } from '../services/storage';
import { ShakeServiceBridge } from '../services/shakeServiceBridge';

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

// Sensitivity thresholds for JS-side (expo-sensors, values in g-force)
const SENSITIVITY_THRESHOLDS: Record<ShakeSensitivity, number> = {
  low: 2.5,
  medium: 1.8,
  high: 1.2,
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ShakeProvider = ({ children }: { children: ReactNode }) => {
  const [isShakeModalOpen, setIsShakeModalOpen] = useState<boolean>(false);
  const [shakeSettings, setShakeSettings] = useState<ShakeSettings>(DEFAULT_SHAKE_SETTINGS);
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(false);

  // Refs — used inside accelerometer callback to avoid stale closures
  const settingsRef = useRef<ShakeSettings>(DEFAULT_SHAKE_SETTINGS);
  const lastShakeTime = useRef<number>(0);
  const lastX = useRef<number>(0);
  const lastY = useRef<number>(0);
  const lastZ = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const setModalRef = useRef<(v: boolean) => void>(setIsShakeModalOpen);
  const nativeServiceStarted = useRef<boolean>(false);

  useEffect(() => { setModalRef.current = setIsShakeModalOpen; }, [setIsShakeModalOpen]);
  useEffect(() => { settingsRef.current = shakeSettings; }, [shakeSettings]);

  // ── Load settings on mount ────────────────────────────────────────────────
  useEffect(() => {
    StorageService.getShakeSettings()
      .then((stored) => {
        setShakeSettings(stored);
        settingsRef.current = stored;
        console.log('[Shake] Settings loaded:', JSON.stringify(stored));
      })
      .catch((e) => console.warn('[Shake] Error loading settings:', e));
  }, []);

  // ── JS-side shake handler (foreground only, uses refs) ────────────────────
  const handleShake = useCallback(() => {
    const now = Date.now();
    if (now - lastShakeTime.current < 1200) return;
    lastShakeTime.current = now;

    console.log('[Shake] 🔔 JS shake detected! appState =', appStateRef.current);

    if (settingsRef.current.hapticFeedback && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }

    // Only open modal if app is in foreground
    // (background shakes are handled by the native ShakeService)
    if (appStateRef.current === 'active') {
      console.log('[Shake] ✅ Opening modal (JS foreground)');
      setModalRef.current(true);
    }
  }, []);

  // ── JS Accelerometer (foreground shake detection) ─────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let sub: ReturnType<typeof Accelerometer.addListener> | null = null;

    Accelerometer.isAvailableAsync()
      .then((available) => {
        setIsSensorAvailable(available);
        if (!available) {
          console.warn('[Shake] Accelerometer not available');
          return;
        }

        console.log('[Shake] ✅ JS Accelerometer started');
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
      .catch((e) => console.warn('[Shake] Accelerometer error:', e));

    return () => sub?.remove();
  }, [handleShake]);

  // ── Native ShakeService (background shake detection) ──────────────────────
  // Start/stop the native foreground service based on app state and settings
  useEffect(() => {
    if (!ShakeServiceBridge.isAvailable || !settingsRef.current.enabled) return;

    const onStateChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      console.log('[Shake] AppState:', prev, '→', next);
      appStateRef.current = next;

      if (prev === 'active' && (next === 'background' || next === 'inactive')) {
        // App going to background → start native service
        if (settingsRef.current.backgroundAccess) {
          console.log('[Shake] Starting native ShakeService');
          ShakeServiceBridge.start(settingsRef.current.sensitivity);
          nativeServiceStarted.current = true;
        }
      } else if (next === 'active' && nativeServiceStarted.current) {
        // App returning to foreground → stop native service (JS takes over)
        console.log('[Shake] Stopping native ShakeService (JS takes over)');
        ShakeServiceBridge.stop();
        nativeServiceStarted.current = false;
      }
    };

    const sub = AppState.addEventListener('change', onStateChange);
    return () => sub.remove();
  }, [shakeSettings.enabled, shakeSettings.backgroundAccess, shakeSettings.sensitivity]);

  // ── Deep link listener: native ShakeService → JS ──────────────────────────
  // When the native service detects a shake, it launches the app with the
  // deep link "exp+expense://shake-open". We listen for that here.
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleDeepLink = (event: { url: string }) => {
      console.log('[Shake] Deep link received:', event.url);
      if (event.url && event.url.includes('shake-open')) {
        console.log('[Shake] ✅ Opening modal from native shake');
        // Small delay to let the app fully come to foreground
        setTimeout(() => {
          if (settingsRef.current.hapticFeedback) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          }
          setIsShakeModalOpen(true);
        }, 300);
      }
    };

    // Check if app was launched from a shake deep link (cold start)
    Linking.getInitialURL()
      .then((url) => {
        if (url && url.includes('shake-open')) {
          console.log('[Shake] App launched from shake deep link:', url);
          setTimeout(() => setIsShakeModalOpen(true), 500);
        }
      })
      .catch(() => {});

    // Listen for deep links while app is running (warm start)
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove();
  }, []);

  // ── Cleanup native service when component unmounts ────────────────────────
  useEffect(() => {
    return () => {
      if (nativeServiceStarted.current) {
        ShakeServiceBridge.stop();
      }
    };
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────
  const openShakeModal = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setIsShakeModalOpen(true);
  }, []);

  const closeShakeModal = useCallback(() => setIsShakeModalOpen(false), []);
  const simulateShake = useCallback(() => handleShake(), [handleShake]);

  const updateShakeSettings = useCallback(async (patch: Partial<ShakeSettings>) => {
    const updated = { ...settingsRef.current, ...patch };
    setShakeSettings(updated);
    settingsRef.current = updated;
    await StorageService.saveShakeSettings(updated);

    // If background access was turned off, stop the native service
    if (patch.backgroundAccess === false || patch.enabled === false) {
      ShakeServiceBridge.stop();
      nativeServiceStarted.current = false;
    }
    // If background access was turned on and app is in background, start service
    if (patch.backgroundAccess === true && appStateRef.current !== 'active' && updated.enabled) {
      ShakeServiceBridge.start(updated.sensitivity);
      nativeServiceStarted.current = true;
    }
  }, []);

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
