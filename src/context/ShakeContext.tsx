import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, Linking } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useExpenses } from './ExpenseContext';
import { Expense } from '../types/expense';
import { shakeServiceBridge } from '../services/shakeServiceBridge';
import { addShakeListener, emitShakeEvent } from '../utils/shakeEvents';
import { showShakeExpenseNotification, setupNotificationChannel } from '../utils/shakeNotifications';

export interface OpenModalOptions {
  triggeredByShake?: boolean;
  initialExpense?: Expense;
}

export interface ShakeContextType {
  isQuickAddModalOpen: boolean;
  openAddExpensePopup: (options?: OpenModalOptions) => void;
  openQuickAddModal: (options?: OpenModalOptions) => void;
  closeQuickAddModal: () => void;
  triggeredByShake: boolean;
  editingExpense: Expense | null;
  simulateShake: () => void;
  lastShakeTimestamp: number;
  openAddExpenseFromShake: () => void;
}

const ShakeContext = createContext<ShakeContextType | undefined>(undefined);

const SHAKE_COOLDOWN_MS = 1500;

export const ShakeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useExpenses();
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState<boolean>(false);
  const [triggeredByShake, setTriggeredByShake] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [lastShakeTimestamp, setLastShakeTimestamp] = useState<number>(0);

  // Refs to avoid stale closures in event listeners
  const isModalOpenRef = useRef<boolean>(false);
  const settingsRef = useRef(settings);
  const lastShakeTimeRef = useRef<number>(0);
  const lastXRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const lastZRef = useRef<number>(0);
  const initializedRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    isModalOpenRef.current = isQuickAddModalOpen;
  }, [isQuickAddModalOpen]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Request notification permissions and setup channel on mount
  useEffect(() => {
    setupNotificationChannel();
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  /**
   * openAddExpensePopup — The single authoritative function that opens the Add Expense popup.
   * Directly updates global modal state with required debug logs.
   */
  const openAddExpensePopup = useCallback((options?: OpenModalOptions) => {
    console.log('[ADD EXPENSE] openAddExpensePopup() called');
    console.log('[ADD EXPENSE] setting visible = true');
    setTriggeredByShake(options?.triggeredByShake ?? false);
    setEditingExpense(options?.initialExpense ?? null);
    setIsQuickAddModalOpen(true);
  }, []);

  /**
   * openQuickAddModal — Alias for openAddExpensePopup for backward compatibility across components.
   */
  const openQuickAddModal = openAddExpensePopup;

  const closeQuickAddModal = useCallback(() => {
    setIsQuickAddModalOpen(false);
    setTriggeredByShake(false);
    setEditingExpense(null);
  }, []);

  /**
   * handleShakeDetected —
   * - If AppState === 'active': Open popup directly
   * - If AppState !== 'active': Trigger curated Expenza notification fallback
   */
  const handleShakeDetected = useCallback(() => {
    const currentAppState = AppState.currentState;
    console.log('[SHAKE] DETECTED');

    const now = Date.now();
    if (now - lastShakeTimeRef.current < SHAKE_COOLDOWN_MS) {
      console.log('[SHAKE] Cooldown active, ignoring');
      return;
    }
    lastShakeTimeRef.current = now;
    setLastShakeTimestamp(now);

    if (settingsRef.current.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    }

    if (currentAppState === 'active') {
      console.log('[SHAKE] APP STATE: active');
      console.log('[SHAKE] Opening Add Expense popup');
      openAddExpensePopup({ triggeredByShake: true });
    } else {
      console.log(`[SHAKE] APP STATE: ${currentAppState}`);
      // Show varied, curated, emoji-free notification
      showShakeExpenseNotification();
    }
  }, [openAddExpensePopup]);

  const openAddExpenseFromShake = handleShakeDetected;

  const simulateShake = useCallback(() => {
    console.log('[SHAKE DEBUG] simulateShake called');
    emitShakeEvent();
  }, []);

  // 1. Global Shake Event Bus listener (receives events from Native Android bridge & JS)
  useEffect(() => {
    const sub = addShakeListener(() => {
      handleShakeDetected();
    });
    return () => {
      sub.remove();
    };
  }, [handleShakeDetected]);

  // 2. Sync foreground state with native ShakeService on initial mount
  useEffect(() => {
    shakeServiceBridge.setAppForeground(true);
    return () => {
      shakeServiceBridge.setAppForeground(false);
    };
  }, []);

  // 3. Notification Tap & Deep Link Listener (Opens Add Expense directly)
  useEffect(() => {
    // A. Handle notification click response (from expo-notifications)
    const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
      console.log('[SHAKE] Notification tapped');
      console.log('[SHAKE] ADD_EXPENSE action requested');
      console.log('[SHAKE] Opening Add Expense');
      openAddExpensePopup({ triggeredByShake: true });
    });

    // B. Handle deep links (expenza://add-expense)
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url && (url.includes('shake-open') || url.includes('add-expense') || url.includes('expenza://'))) {
        console.log('[SHAKE] Notification tapped');
        console.log('[SHAKE] ADD_EXPENSE action requested');
        console.log('[SHAKE] Opening Add Expense');
        openAddExpensePopup({ triggeredByShake: true });
      }
    };

    Linking.getInitialURL()
      .then((url) => {
        if (url && (url.includes('shake-open') || url.includes('add-expense') || url.includes('expenza://'))) {
          console.log('[SHAKE] Notification tapped');
          console.log('[SHAKE] ADD_EXPENSE action requested');
          console.log('[SHAKE] Opening Add Expense');
          openAddExpensePopup({ triggeredByShake: true });
        }
      })
      .catch(() => {});

    const linkingSub = Linking.addEventListener('url', handleDeepLink);

    return () => {
      responseSub.remove();
      linkingSub.remove();
    };
  }, [openAddExpensePopup]);

  // 4. Foreground Accelerometer & AppState Lifecycle Management
  useEffect(() => {
    let sensorSubscription: { remove: () => void } | null = null;

    const setupAccelerometer = () => {
      if (sensorSubscription) {
        sensorSubscription.remove();
        sensorSubscription = null;
      }

      if (!settings.shakeEnabled) {
        return;
      }

      console.log('[SHAKE DEBUG] Sensor service started (JS Accelerometer)');
      // 20Hz update rate (50ms interval)
      Accelerometer.setUpdateInterval(50);

      sensorSubscription = Accelerometer.addListener((data) => {
        if (!settingsRef.current.shakeEnabled) return;

        const { x, y, z } = data;

        if (!initializedRef.current) {
          lastXRef.current = x;
          lastYRef.current = y;
          lastZRef.current = z;
          initializedRef.current = true;
          return;
        }

        const deltaX = Math.abs(x - lastXRef.current);
        const deltaY = Math.abs(y - lastYRef.current);
        const deltaZ = Math.abs(z - lastZRef.current);
        const delta = deltaX + deltaY + deltaZ;

        lastXRef.current = x;
        lastYRef.current = y;
        lastZRef.current = z;

        // Calibrated G-force thresholds:
        // low: firm deliberate shake (default)
        // medium: moderate shake
        // high: light shake
        const threshold =
          settingsRef.current.shakeSensitivity === 'low'
            ? 2.6
            : settingsRef.current.shakeSensitivity === 'high'
            ? 1.3
            : 1.8;

        if (delta > threshold) {
          console.log(`[SHAKE] Accelerometer delta=${delta.toFixed(2)}, threshold=${threshold}`);
          emitShakeEvent();
        }
      });
    };

    // App state changes handling (Foreground vs Background Lifecycle)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
      console.log(`[SHAKE] AppState changed: ${nextAppState}`);

      if (nextAppState === 'active') {
        shakeServiceBridge.setAppForeground(true);
        setupAccelerometer();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        shakeServiceBridge.setAppForeground(false);
        if (sensorSubscription) {
          sensorSubscription.remove();
          sensorSubscription = null;
        }
        // Ensure background native service is active on Android if enabled
        if (settingsRef.current.shakeEnabled && Platform.OS === 'android') {
          shakeServiceBridge.startService(settingsRef.current.shakeSensitivity);
        }
      }
    };

    setupAccelerometer();
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (sensorSubscription) {
        sensorSubscription.remove();
      }
      appStateSub.remove();
    };
  }, [settings.shakeEnabled, settings.shakeSensitivity, openAddExpensePopup]);

  return (
    <ShakeContext.Provider
      value={{
        isQuickAddModalOpen,
        openAddExpensePopup,
        openQuickAddModal,
        closeQuickAddModal,
        triggeredByShake,
        editingExpense,
        simulateShake,
        lastShakeTimestamp,
        openAddExpenseFromShake,
      }}
    >
      {children}
    </ShakeContext.Provider>
  );
};

export const useShake = (): ShakeContextType => {
  const context = useContext(ShakeContext);
  if (!context) {
    throw new Error('useShake must be used within a ShakeProvider');
  }
  return context;
};
