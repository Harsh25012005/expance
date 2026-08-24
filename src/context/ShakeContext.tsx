import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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

// Sensitivity thresholds (total acceleration delta)
const SENSITIVITY_THRESHOLDS: Record<ShakeSensitivity, number> = {
  low: 2.8,     // requires stronger shake
  medium: 2.1,  // balanced default
  high: 1.5,    // sensitive shake
};

const TRAY_NOTIFICATION_ID = 'shake-expense-tray-keepalive';

// ─── Setup minimal notification handler (no visible popup from our side) ─────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,   // Never show banner notifications
    shouldShowList: false,     // Never show in notification list
  }),
});

// ─── Persistent tray notification to keep accelerometer alive ────────────────
async function showTrayNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // Low-priority channel - no sound, no vibration, no heads-up
    await Notifications.setNotificationChannelAsync('shake-tray', {
      name: 'ShakeExpense Active',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: undefined,
      enableVibrate: false,
      enableLights: false,
      showBadge: false,
    });

    await Notifications.dismissNotificationAsync(TRAY_NOTIFICATION_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: TRAY_NOTIFICATION_ID,
      content: {
        title: '⚡ ShakeExpense is listening…',
        body: 'Shake your phone anywhere to log an expense instantly',
        data: { action: 'KEEP_ALIVE' },
        sticky: true,
        autoDismiss: false,
        ...(Platform.OS === 'android' ? { channelId: 'shake-tray' } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    // Safe fallback
  }
}

async function dismissTrayNotification(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(TRAY_NOTIFICATION_ID);
  } catch (e) {
    // Safe fallback
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ShakeProvider = ({ children }: { children: ReactNode }) => {
  const [isShakeModalOpen, setIsShakeModalOpen] = useState<boolean>(false);
  const [shakeSettings, setShakeSettings] = useState<ShakeSettings>(DEFAULT_SHAKE_SETTINGS);
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(false);

  const lastShakeTime = useRef<number>(0);
  const lastX = useRef<number>(0);
  const lastY = useRef<number>(0);
  const lastZ = useRef<number>(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const pendingOpenModal = useRef<boolean>(false);

  // Load shake settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await StorageService.getShakeSettings();
        setShakeSettings(stored);
        if (stored.enabled && Platform.OS === 'android') {
          // Request notification permission for the tray keep-alive only
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }
        }
      } catch (e) {
        console.warn('Error loading shake settings:', e);
      }
    };
    loadSettings();
  }, []);

  // ── Trigger shake action ──────────────────────────────────────────────────
  const triggerShakeAction = () => {
    const now = Date.now();
    // Debounce: prevent multiple triggers in one shake motion
    if (now - lastShakeTime.current < 1200) return;
    lastShakeTime.current = now;

    // Haptic feedback
    if (shakeSettings.hapticFeedback && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (_) {}
    }

    if (appState.current === 'active') {
      // App is in foreground → open modal directly, no notification at all
      setIsShakeModalOpen(true);
    } else {
      // App is in background → mark pending, tray notification tap will open modal
      // The accelerometer keeps running because of the foreground tray notification
      pendingOpenModal.current = true;
    }
  };

  // ── Accelerometer subscription ────────────────────────────────────────────
  useEffect(() => {
    let subscription: ReturnType<typeof Accelerometer.addListener> | null = null;

    const setupAccelerometer = async () => {
      if (!shakeSettings.enabled || Platform.OS === 'web') return;

      try {
        const available = await Accelerometer.isAvailableAsync();
        setIsSensorAvailable(available);
        if (!available) return;

        Accelerometer.setUpdateInterval(100); // 10 samples/second

        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const deltaX = Math.abs(x - lastX.current);
          const deltaY = Math.abs(y - lastY.current);
          const deltaZ = Math.abs(z - lastZ.current);
          const totalDelta = deltaX + deltaY + deltaZ;
          const threshold = SENSITIVITY_THRESHOLDS[shakeSettings.sensitivity] ?? 2.1;

          if (totalDelta > threshold) {
            triggerShakeAction();
          }

          lastX.current = x;
          lastY.current = y;
          lastZ.current = z;
        });
      } catch (err) {
        console.warn('Accelerometer setup warning:', err);
      }
    };

    setupAccelerometer();

    return () => {
      subscription?.remove();
    };
  }, [shakeSettings.enabled, shakeSettings.sensitivity, shakeSettings.hapticFeedback]);

  // ── AppState listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasBackground = appState.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      if (isNowActive && (wasBackground || pendingOpenModal.current)) {
        // App came to foreground — open the modal if shake happened in background
        if (pendingOpenModal.current) {
          pendingOpenModal.current = false;
          setIsShakeModalOpen(true);
        }
      }

      const wasActive = appState.current === 'active';
      const isNowBackground = nextAppState === 'background' || nextAppState === 'inactive';

      if (wasActive && isNowBackground && shakeSettings.enabled && Platform.OS === 'android') {
        // App went to background → show minimal tray notification to keep runtime alive
        showTrayNotification();
      } else if (isNowActive && Platform.OS === 'android') {
        // App became active → dismiss tray notification
        dismissTrayNotification();
      }

      appState.current = nextAppState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [shakeSettings.enabled]);

  // ── Handle tray notification tap (to open modal) ──────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Only handle tray keep-alive tap (not other notifications)
      if (data?.action === 'KEEP_ALIVE') {
        pendingOpenModal.current = false;
        setIsShakeModalOpen(true);
      }
    });

    return () => subscription.remove();
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────
  const openShakeModal = () => {
    if (shakeSettings.hapticFeedback && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    setIsShakeModalOpen(true);
  };

  const closeShakeModal = () => setIsShakeModalOpen(false);

  const simulateShake = () => triggerShakeAction();

  const updateShakeSettings = async (newSettings: Partial<ShakeSettings>) => {
    const updated = { ...shakeSettings, ...newSettings };
    setShakeSettings(updated);
    await StorageService.saveShakeSettings(updated);

    if (newSettings.enabled === false) {
      dismissTrayNotification();
    }
  };

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
  if (!context) {
    throw new Error('useShake must be used within a ShakeProvider');
  }
  return context;
};
