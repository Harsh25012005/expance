import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, Linking } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useExpenses } from './ExpenseContext';
import { Expense } from '../types/expense';
import { shakeServiceBridge } from '../services/shakeServiceBridge';
import { addShakeListener, emitShakeEvent } from '../utils/shakeEvents';

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
  openAddExpenseFromShake: () => void;
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
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    isModalOpenRef.current = isQuickAddModalOpen;
    if (isQuickAddModalOpen) {
      console.log('[ADD_EXPENSE] visible = true');
    }
  }, [isQuickAddModalOpen]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Track AppState properly via subscription
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  /**
   * openAddExpenseFromShake — THE single function that opens the popup from shake.
   * This is the ONLY entry point for shake → popup. No notifications involved.
   * Works in both foreground and when resuming from background (via deep link/intent).
   */
  const openAddExpenseFromShake = useCallback(() => {
    const currentAppState = appStateRef.current;
    console.log('[SHAKE] DETECTED');
    console.log(`[SHAKE] APP_STATE: ${currentAppState}`);
    console.log('[SHAKE] FOREGROUND PATH');

    const now = Date.now();
    if (now - lastShakeTimeRef.current < SHAKE_COOLDOWN_MS) {
      console.log('[SHAKE] Cooldown active, ignoring');
      return; // Within debounce cooldown — STOP
    }
    lastShakeTimeRef.current = now;
    setLastShakeTimestamp(now);

    console.log('[SHAKE] OPENING ADD EXPENSE');

    if (settingsRef.current.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    }

    // Only open if not already open
    if (!isModalOpenRef.current) {
      setTriggeredByShake(true);
      setEditingExpense(null);
      setIsQuickAddModalOpen(true);
    }
  }, []);

  const triggerAddExpense = useCallback((fromShake: boolean = true) => {
    if (fromShake) {
      openAddExpenseFromShake();
      return;
    }

    // Non-shake manual trigger (e.g., from a button)
    const now = Date.now();
    lastShakeTimeRef.current = now;
    setLastShakeTimestamp(now);

    if (settingsRef.current.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    }

    if (!isModalOpenRef.current) {
      setTriggeredByShake(false);
      setEditingExpense(null);
      setIsQuickAddModalOpen(true);
    }
  }, [openAddExpenseFromShake]);

  const openQuickAddModal = useCallback((options?: OpenModalOptions) => {
    console.log('[SHAKE DEBUG] Programmatic openQuickAddModal called');
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
    console.log('[SHAKE DEBUG] simulateShake called');
    emitShakeEvent();
  }, []);

  // 1. Global Shake Event Bus listener (receives events from Native Android bridge & JS)
  useEffect(() => {
    const sub = addShakeListener(() => {
      openAddExpenseFromShake();
    });
    return () => {
      sub.remove();
    };
  }, [openAddExpenseFromShake]);

  // 2. Sync foreground state with native ShakeService
  useEffect(() => {
    shakeServiceBridge.setAppForeground(true);
    return () => {
      shakeServiceBridge.setAppForeground(false);
    };
  }, []);

  // 3. Handle Deep Linking (from background native ShakeService intent)
  //    NO notification listeners here — notifications are removed from foreground path
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url && (url.includes('shake-open') || url.includes('add-expense') || url.includes('expenza://'))) {
        console.log('[SHAKE DEBUG] Deep link received:', url);
        emitShakeEvent();
      }
    };

    // Check initial URL if app was launched via deep link
    Linking.getInitialURL()
      .then((url) => {
        if (url && (url.includes('shake-open') || url.includes('add-expense') || url.includes('expenza://'))) {
          console.log('[SHAKE DEBUG] Cold start deep link:', url);
          emitShakeEvent();
        }
      })
      .catch(() => {});

    const linkingSub = Linking.addEventListener('url', handleDeepLink);

    return () => {
      linkingSub.remove();
    };
  }, []);

  // 4. Foreground Accelerometer Sensor Listener (Calibrated for G-force units)
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

        // Calibrated G-force thresholds — higher = requires stronger shake
        // Low sensitivity = hardest to trigger (firm deliberate shake only)
        const threshold =
          settingsRef.current.shakeSensitivity === 'low'
            ? 3.0 // Low sensitivity: requires a firm deliberate physical shake
            : settingsRef.current.shakeSensitivity === 'high'
            ? 1.5 // High sensitivity
            : 2.2; // Medium sensitivity

        if (delta > threshold) {
          console.log(`[SHAKE] Accelerometer delta=${delta.toFixed(2)}, threshold=${threshold}`);
          // Emit event → goes to the global listener → calls openAddExpenseFromShake()
          emitShakeEvent();
        }
      });
    };

    // App state changes handling (Foreground vs Background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[SHAKE] AppState changed to active');
        shakeServiceBridge.setAppForeground(true);
        setupAccelerometer();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log(`[SHAKE] AppState changed to ${nextAppState}`);
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
  }, [settings.shakeEnabled, settings.shakeSensitivity]);

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
