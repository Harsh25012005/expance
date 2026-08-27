import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, Linking } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useExpenses } from './ExpenseContext';
import { Expense, TabScreen } from '../types/expense';
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
  isSetBudgetModalOpen: boolean;
  openSetBudgetModal: () => void;
  closeSetBudgetModal: () => void;
  navigationTarget: TabScreen | null;
  clearNavigationTarget: () => void;
}

const ShakeContext = createContext<ShakeContextType | undefined>(undefined);

// 1.0-second cooldown debounce for reliable repeated shakes
const SHAKE_COOLDOWN_MS = 1000;

export const ShakeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useExpenses();
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState<boolean>(false);
  const [isSetBudgetModalOpen, setIsSetBudgetModalOpen] = useState<boolean>(false);
  const [navigationTarget, setNavigationTarget] = useState<TabScreen | null>(null);
  const [triggeredByShake, setTriggeredByShake] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [lastShakeTimestamp, setLastShakeTimestamp] = useState<number>(0);

  // Refs to avoid stale closures in event listeners
  const settingsRef = useRef(settings);
  const lastShakeTimeRef = useRef<number>(0);
  const lastXRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const lastZRef = useRef<number>(0);
  const initializedRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const shakePeaksRef = useRef<number>(0);
  const shakeWindowStartRef = useRef<number>(0);

  useEffect(() => {
    const prevEnabled = settingsRef.current.shakeEnabled;
    settingsRef.current = settings;

    if (prevEnabled !== settings.shakeEnabled) {
      console.log(`[SHAKE SETTINGS] enabled = ${settings.shakeEnabled}`);
      if (settings.shakeEnabled) {
        if (Platform.OS === 'android') {
          shakeServiceBridge.startService(settings.shakeSensitivity);
        }
      } else {
        shakeServiceBridge.stopService();
      }
    }
  }, [settings]);

  // Request notification permissions, setup channel and ensure service on mount
  useEffect(() => {
    setupNotificationChannel();
    if (settingsRef.current.shakeEnabled && Platform.OS === 'android') {
      shakeServiceBridge.startService(settingsRef.current.shakeSensitivity);
    }
  }, []);

  const openAddExpensePopup = useCallback((options?: OpenModalOptions) => {
    console.log('[ADD EXPENSE] openAddExpensePopup() called');
    setTriggeredByShake(options?.triggeredByShake ?? false);
    setEditingExpense(options?.initialExpense ?? null);
    setIsQuickAddModalOpen(true);
  }, []);

  const openQuickAddModal = openAddExpensePopup;

  const closeQuickAddModal = useCallback(() => {
    setIsQuickAddModalOpen(false);
    setTriggeredByShake(false);
    setEditingExpense(null);
  }, []);

  const openSetBudgetModal = useCallback(() => {
    setIsSetBudgetModalOpen(true);
  }, []);

  const closeSetBudgetModal = useCallback(() => {
    setIsSetBudgetModalOpen(false);
  }, []);

  const clearNavigationTarget = useCallback(() => {
    setNavigationTarget(null);
  }, []);

  const handleShakeDetected = useCallback(() => {
    // 1. Strict Shake OFF Verification
    if (!settingsRef.current.shakeEnabled) {
      console.log('[SHAKE] DISABLED — ignoring event');
      return;
    }

    const currentAppState = AppState.currentState;
    const now = Date.now();

    // 2. Debounce Protection (Only 1 notification / modal per shake gesture within 1s)
    if (now - lastShakeTimeRef.current < SHAKE_COOLDOWN_MS) {
      console.log(`[SHAKE] Debounce active (${now - lastShakeTimeRef.current}ms), ignoring duplicate event`);
      return;
    }

    lastShakeTimeRef.current = now;
    setLastShakeTimestamp(now);

    console.log('[SHAKE] DETECTED');
    console.log(`[SHAKE] APP STATE: ${currentAppState}`);

    if (settingsRef.current.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    }

    // Always show notification on every shake in all app states
    showShakeExpenseNotification().catch((err) => {
      console.warn('[SHAKE] Notification dispatch failed:', err);
    });

    if (currentAppState === 'active') {
      console.log('[SHAKE] Opening Add Expense popup');
      openAddExpensePopup({ triggeredByShake: true });
    }
  }, [openAddExpensePopup]);

  const openAddExpenseFromShake = handleShakeDetected;

  const simulateShake = useCallback(() => {
    if (!settingsRef.current.shakeEnabled) {
      console.log('[SHAKE] DISABLED — ignoring simulateShake');
      return;
    }
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

  // 3. Notification Tap & Deep Link Listener (Dispatches to Add Expense, Set Budget, or Today's Expenses)
  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[SHAKE] Notification tapped');
      console.log('[SHAKE] ADD_EXPENSE action requested');
      const data = response.notification.request.content.data;
      const action = data?.action;
      const url = data?.url as string | undefined;

      if (url?.includes('set-budget') || action === 'OPEN_SET_BUDGET') {
        openSetBudgetModal();
      } else if (url?.includes('breakdown') || action === 'VIEW_ANALYTICS') {
        setNavigationTarget('analytics');
      } else if (url?.includes('today') || url?.includes('expenses') || action === 'VIEW_TODAY_EXPENSES') {
        setNavigationTarget('expenses');
      } else {
        openAddExpensePopup({ triggeredByShake: false });
      }
    });

    const processDeepLink = (url: string | null) => {
      if (!url) return;
      console.log(`[DEEP LINK] Received: ${url}`);
      if (url.includes('add-expense') || url.includes('shake-open')) {
        console.log('[SHAKE] Notification tapped');
        console.log('[SHAKE] ADD_EXPENSE action requested');
        openAddExpensePopup({ triggeredByShake: false });
      } else if (url.includes('set-budget')) {
        openSetBudgetModal();
      } else if (url.includes('breakdown')) {
        setNavigationTarget('analytics');
      } else if (url.includes('today') || url.includes('expenses')) {
        setNavigationTarget('expenses');
      }
    };

    Linking.getInitialURL().then(processDeepLink).catch(() => {});
    const linkingSub = Linking.addEventListener('url', (event) => processDeepLink(event.url));

    return () => {
      responseSub.remove();
      linkingSub.remove();
    };
  }, [openAddExpensePopup, openSetBudgetModal]);

  // 4. Foreground Accelerometer & AppState Lifecycle Management
  useEffect(() => {
    let sensorSubscription: { remove: () => void } | null = null;

    const setupAccelerometer = () => {
      if (sensorSubscription) {
        sensorSubscription.remove();
        sensorSubscription = null;
      }

      if (!settings.shakeEnabled) {
        console.log('[SHAKE SETTINGS] enabled = false — Accelerometer listener stopped');
        return;
      }

      Accelerometer.setUpdateInterval(50);

      sensorSubscription = Accelerometer.addListener((data) => {
        if (!settingsRef.current.shakeEnabled) {
          console.log('[SHAKE] DISABLED — ignoring event');
          return;
        }

        const { x, y, z } = data;

        if (!initializedRef.current) {
          lastXRef.current = x;
          lastYRef.current = y;
          lastZRef.current = z;
          initializedRef.current = true;
          return;
        }

        const now = Date.now();
        const deltaX = Math.abs(x - lastXRef.current);
        const deltaY = Math.abs(y - lastYRef.current);
        const deltaZ = Math.abs(z - lastZRef.current);
        const delta = deltaX + deltaY + deltaZ;

        lastXRef.current = x;
        lastYRef.current = y;
        lastZRef.current = z;

        // Intentional peak thresholds (Gs)
        const threshold =
          settingsRef.current.shakeSensitivity === 'low'
            ? 3.6
            : settingsRef.current.shakeSensitivity === 'high'
            ? 2.0
            : 2.8;

        // Multi-direction shake algorithm: Requires 2-3 rapid reversals within 550ms
        const requiredPeaks = settingsRef.current.shakeSensitivity === 'low' ? 3 : 2;

        if (delta > threshold) {
          if (shakePeaksRef.current === 0 || now - shakeWindowStartRef.current > 550) {
            shakeWindowStartRef.current = now;
            shakePeaksRef.current = 1;
          } else {
            shakePeaksRef.current += 1;
          }

          if (shakePeaksRef.current >= requiredPeaks) {
            shakePeaksRef.current = 0;
            emitShakeEvent();
          }
        }
      });
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;

      if (nextAppState === 'active') {
        shakeServiceBridge.setAppForeground(true);
        setupAccelerometer();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        shakeServiceBridge.setAppForeground(false);
        if (sensorSubscription) {
          sensorSubscription.remove();
          sensorSubscription = null;
        }
        if (settingsRef.current.shakeEnabled && Platform.OS === 'android') {
          shakeServiceBridge.startService(settingsRef.current.shakeSensitivity);
        } else if (!settingsRef.current.shakeEnabled) {
          shakeServiceBridge.stopService();
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
        isSetBudgetModalOpen,
        openSetBudgetModal,
        closeSetBudgetModal,
        navigationTarget,
        clearNavigationTarget,
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
