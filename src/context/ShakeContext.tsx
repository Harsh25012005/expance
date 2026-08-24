import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, Linking } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useExpenses } from './ExpenseContext';
import { Expense } from '../types/expense';
import { shakeServiceBridge } from '../services/shakeServiceBridge';

interface OpenModalOptions {
  triggeredByShake?: boolean;
  initialExpense?: Expense;
}

interface ShakeContextType {
  isQuickAddModalOpen: boolean;
  openQuickAddModal: (options?: OpenModalOptions) => void;
  closeQuickAddModal: () => void;
  triggeredByShake: boolean;
  editingExpense: Expense | null;
  simulateShake: () => void;
  lastShakeTimestamp: number;
}

const ShakeContext = createContext<ShakeContextType | undefined>(undefined);

const SHAKE_COOLDOWN_MS = 2000;

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

  useEffect(() => {
    isModalOpenRef.current = isQuickAddModalOpen;
  }, [isQuickAddModalOpen]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const triggerAddExpense = useCallback((fromShake: boolean = true) => {
    const now = Date.now();
    if (now - lastShakeTimeRef.current < SHAKE_COOLDOWN_MS) {
      return; // Within debounce cooldown
    }
    lastShakeTimeRef.current = now;
    setLastShakeTimestamp(now);

    if (settingsRef.current.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    }

    // Only open if not already open
    if (!isModalOpenRef.current) {
      setTriggeredByShake(fromShake);
      setEditingExpense(null);
      setIsQuickAddModalOpen(true);
    }
  }, []);

  const openQuickAddModal = useCallback((options?: OpenModalOptions) => {
    setTriggeredByShake(options?.triggeredByShake ?? false);
    setEditingExpense(options?.initialExpense ?? null);
    setIsQuickAddModalOpen(true);
  }, []);

  const closeQuickAddModal = useCallback(() => {
    setIsQuickAddModalOpen(false);
    setTriggeredByShake(false);
    setEditingExpense(null);
  }, []);

  const simulateShake = useCallback(() => {
    triggerAddExpense(true);
  }, [triggerAddExpense]);

  // Sync foreground state with native ShakeService
  useEffect(() => {
    shakeServiceBridge.setAppForeground(true);
    return () => {
      shakeServiceBridge.setAppForeground(false);
    };
  }, []);

  // Handle Deep Linking & Notification Click (from background native ShakeService / push)
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url && (url.includes('shake-open') || url.includes('add-expense') || url.includes('expenza://'))) {
        console.log('[ShakeContext] Deep link received:', url);
        triggerAddExpense(true);
      }
    };

    // Check initial URL if app was launched via deep link
    Linking.getInitialURL()
      .then((url) => {
        if (url && (url.includes('shake-open') || url.includes('add-expense') || url.includes('expenza://'))) {
          console.log('[ShakeContext] App launched via deep link:', url);
          triggerAddExpense(true);
        }
      })
      .catch(() => {});

    const linkingSub = Linking.addEventListener('url', handleDeepLink);

    // Also listen for expo-notifications click interactions
    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[ShakeContext] Notification response received:', response);
      triggerAddExpense(true);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        console.log('[ShakeContext] App opened from notification response:', response);
        triggerAddExpense(true);
      }
    }).catch(() => {});

    return () => {
      linkingSub.remove();
      notifSub.remove();
    };
  }, [triggerAddExpense]);

  // Foreground Accelerometer Sensor Listener
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

      // 20Hz update rate
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

        // Threshold based on sensitivity - Default is LOW
        const threshold =
          settingsRef.current.shakeSensitivity === 'low'
            ? 3.0 // Low sensitivity: requires deliberate shake to prevent accidental popups
            : settingsRef.current.shakeSensitivity === 'high'
            ? 1.4 // High sensitivity
            : 2.0; // Medium sensitivity

        if (delta > threshold) {
          triggerAddExpense(true);
        }
      });
    };

    // App state changes handling (Foreground vs Background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[ShakeContext] App active: enabling foreground accelerometer and syncing state');
        shakeServiceBridge.setAppForeground(true);
        setupAccelerometer();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[ShakeContext] App backgrounded: switching to native service');
        shakeServiceBridge.setAppForeground(false);
        if (sensorSubscription) {
          sensorSubscription.remove();
          sensorSubscription = null;
        }
        // Ensure background service is running on Android if enabled
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
  }, [settings.shakeEnabled, settings.shakeSensitivity, triggerAddExpense]);

  return (
    <ShakeContext.Provider
      value={{
        isQuickAddModalOpen,
        openQuickAddModal,
        closeQuickAddModal,
        triggeredByShake,
        editingExpense,
        simulateShake,
        lastShakeTimestamp,
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
