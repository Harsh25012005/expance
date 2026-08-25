import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, Linking } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useExpenses } from './ExpenseContext';
import { Expense } from '../types/expense';
import { shakeServiceBridge } from '../services/shakeServiceBridge';
import { addShakeListener, emitShakeEvent } from '../utils/shakeEvents';

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

  // Track AppState properly via subscription
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
    });
    return () => sub.remove();
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
   * handleShakeDetected / openAddExpenseFromShake —
   * Authoritative foreground shake handler:
   * Shake detected -> Log state -> Call openAddExpensePopup() -> STOP (no notification code).
   */
  const handleShakeDetected = useCallback(() => {
    const currentAppState = appStateRef.current;
    console.log('[SHAKE] DETECTED');
    if (currentAppState === 'active') {
      console.log('[SHAKE] APP STATE: active');
    } else {
      console.log(`[SHAKE] APP STATE: ${currentAppState}`);
    }

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

    console.log('[SHAKE] CALLING openAddExpensePopup()');
    openAddExpensePopup({ triggeredByShake: true });
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

  // 2. Sync foreground state with native ShakeService
  useEffect(() => {
    shakeServiceBridge.setAppForeground(true);
    return () => {
      shakeServiceBridge.setAppForeground(false);
    };
  }, []);

  // 3. Handle Deep Linking (from background native ShakeService intent)
  //    Directly opens the popup when resumed via deep link
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url && (url.includes('shake-open') || url.includes('add-expense') || url.includes('expenza://'))) {
        console.log('[SHAKE DEBUG] Deep link received:', url);
        emitShakeEvent();
      }
    };

    // Check initial URL if app was cold started via deep link
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
