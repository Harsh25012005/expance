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

const SHAKE_COOLDOWN_MS = 1500;

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

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Request notification permissions and setup channel on mount
  useEffect(() => {
    setupNotificationChannel();
    Notifications.requestPermissionsAsync().catch(() => {});
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
      console.log('[SHAKE] APP STATE: active -> Opening Add Expense popup');
      openAddExpensePopup({ triggeredByShake: true });
    } else {
      console.log(`[SHAKE] APP STATE: ${currentAppState} -> Posting notification`);
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

  // 3. Notification Tap & Deep Link Listener (Dispatches to Add Expense, Set Budget, or Today's Expenses)
  useEffect(() => {
    // A. Handle notification click response (from expo-notifications)
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const action = data?.action;
      const url = data?.url as string | undefined;

      if (url?.includes('set-budget') || action === 'OPEN_SET_BUDGET') {
        openSetBudgetModal();
      } else if (url?.includes('today') || url?.includes('expenses') || action === 'VIEW_TODAY_EXPENSES') {
        setNavigationTarget('expenses');
      } else {
        openAddExpensePopup({ triggeredByShake: false });
      }
    });

    // B. Handle deep links
    const processDeepLink = (url: string | null) => {
      if (!url) return;
      console.log(`[DEEP LINK] Received: ${url}`);
      if (url.includes('set-budget')) {
        openSetBudgetModal();
      } else if (url.includes('today') || url.includes('expenses')) {
        setNavigationTarget('expenses');
      } else if (url.includes('add-expense') || url.includes('shake-open')) {
        openAddExpensePopup({ triggeredByShake: false });
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
        return;
      }

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

        const threshold =
          settingsRef.current.shakeSensitivity === 'low'
            ? 3.0
            : settingsRef.current.shakeSensitivity === 'high'
            ? 1.5
            : 2.2;

        if (delta > threshold) {
          emitShakeEvent();
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
