import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { ShakeSettings, ShakeSensitivity } from '../types/expense';
import { StorageService, DEFAULT_SHAKE_SETTINGS } from '../services/storage';
import { NotificationService } from '../services/notificationService';

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

export const ShakeProvider = ({ children }: { children: ReactNode }) => {
  const [isShakeModalOpen, setIsShakeModalOpen] = useState<boolean>(false);
  const [shakeSettings, setShakeSettings] = useState<ShakeSettings>(DEFAULT_SHAKE_SETTINGS);
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(false);

  const lastShakeTime = useRef<number>(0);
  const lastX = useRef<number>(0);
  const lastY = useRef<number>(0);
  const lastZ = useRef<number>(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Load shake settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await StorageService.getShakeSettings();
        setShakeSettings(stored);
        if (stored.backgroundAccess) {
          await NotificationService.requestPermissions();
        }
      } catch (e) {
        console.warn('Error loading shake settings:', e);
      }
    };
    loadSettings();
  }, []);

  const triggerShakeAction = () => {
    const now = Date.now();
    // Debounce shake triggers by 1.2s to prevent multiple triggers in one shake motion
    if (now - lastShakeTime.current < 1200) {
      return;
    }
    lastShakeTime.current = now;

    // Haptic feedback
    if (shakeSettings.hapticFeedback && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (e) {
        // Safe fallback
      }
    }

    setIsShakeModalOpen(true);
  };

  // Accelerometer subscription
  useEffect(() => {
    let subscription: any = null;

    const setupAccelerometer = async () => {
      if (!shakeSettings.enabled) return;

      try {
        const available = await Accelerometer.isAvailableAsync();
        setIsSensorAvailable(available);

        if (available) {
          Accelerometer.setUpdateInterval(100); // 10 samples/second

          subscription = Accelerometer.addListener((data) => {
            const { x, y, z } = data;
            const deltaX = Math.abs(x - lastX.current);
            const deltaY = Math.abs(y - lastY.current);
            const deltaZ = Math.abs(z - lastZ.current);

            const totalDelta = deltaX + deltaY + deltaZ;
            const threshold = SENSITIVITY_THRESHOLDS[shakeSettings.sensitivity] || 2.1;

            if (totalDelta > threshold) {
              triggerShakeAction();
            }

            lastX.current = x;
            lastY.current = y;
            lastZ.current = z;
          });
        }
      } catch (err) {
        console.warn('Accelerometer setup warning:', err);
      }
    };

    setupAccelerometer();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [shakeSettings.enabled, shakeSettings.sensitivity, shakeSettings.hapticFeedback]);

  // AppState listener for background quick-access notifications
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        // App went to background
        if (shakeSettings.backgroundAccess && Platform.OS !== 'web') {
          NotificationService.showQuickAccessNotification();
        }
      } else if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App became active
        NotificationService.dismissQuickAccessNotification();
      }

      appState.current = nextAppState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [shakeSettings.backgroundAccess]);

  // Notification tap response listener (when user taps the notification from background/lockscreen)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Check if app was launched by tapping a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && response.notification.request.content.data?.action === 'OPEN_SHAKE_MODAL') {
        setIsShakeModalOpen(true);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.action === 'OPEN_SHAKE_MODAL') {
        setIsShakeModalOpen(true);
      }
    });

    return () => subscription.remove();
  }, []);

  const openShakeModal = () => {
    if (shakeSettings.hapticFeedback && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setIsShakeModalOpen(true);
  };

  const closeShakeModal = () => {
    setIsShakeModalOpen(false);
  };

  const simulateShake = () => {
    triggerShakeAction();
  };

  const updateShakeSettings = async (newSettings: Partial<ShakeSettings>) => {
    const updated = { ...shakeSettings, ...newSettings };
    setShakeSettings(updated);
    await StorageService.saveShakeSettings(updated);

    if (newSettings.backgroundAccess !== undefined) {
      if (newSettings.backgroundAccess) {
        await NotificationService.requestPermissions();
      } else {
        await NotificationService.dismissQuickAccessNotification();
      }
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
