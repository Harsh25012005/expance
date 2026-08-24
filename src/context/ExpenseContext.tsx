import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { AppSettings, CategoryType, Expense, ShakeSensitivity } from '../types/expense';
import {
  clearAllStoredData,
  DEFAULT_SETTINGS,
  loadStoredExpenses,
  loadStoredSettings,
  saveStoredExpenses,
  saveStoredSettings,
} from '../services/storage';
import { shakeServiceBridge } from '../services/shakeServiceBridge';

interface ExpenseStats {
  totalSpending: number;
  thisMonthSpending: number;
  lastMonthSpending: number;
  percentageChange: number | null; // vs last month
  todaySpending: number;
  thisWeekSpending: number;
  categoryTotals: Record<CategoryType, number>;
  topCategory: { category: CategoryType; amount: number } | null;
  averageExpense: number;
  totalCount: number;
}

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  settings: AppSettings;
  stats: ExpenseStats;
  addExpense: (expenseData: { name: string; category: CategoryType; amount: number; notes?: string; date?: string }) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<{ name: string; category: CategoryType; amount: number; notes?: string; date?: string }>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  clearAllExpenses: () => Promise<void>;
  eraseAllData: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  completeOnboarding: (onboardingData: { userName: string; currency: string; currencyCode: string; shakeSensitivity: ShakeSensitivity; trackingStyle?: string }) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize from storage on mount
  useEffect(() => {
    async function init() {
      try {
        const [loadedExpenses, loadedSettings] = await Promise.all([
          loadStoredExpenses(),
          loadStoredSettings(),
        ]);
        setExpenses(loadedExpenses);
        setSettings(loadedSettings);

        // Sync native shake service with loaded settings
        if (loadedSettings.shakeEnabled) {
          shakeServiceBridge.startService(loadedSettings.shakeSensitivity);
        } else {
          shakeServiceBridge.stopService();
        }
      } catch (e) {
        console.error('Failed to initialize expense store:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const addExpense = useCallback(
    async (expenseData: {
      name: string;
      category: CategoryType;
      amount: number;
      notes?: string;
      date?: string;
    }): Promise<Expense> => {
      const now = new Date().toISOString();
      const newExpense: Expense = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: expenseData.name.trim(),
        category: expenseData.category,
        amount: Number(expenseData.amount),
        createdAt: expenseData.date || now,
        updatedAt: now,
        notes: expenseData.notes?.trim() || undefined,
      };

      const updated = [newExpense, ...expenses];
      setExpenses(updated);
      await saveStoredExpenses(updated);
      return newExpense;
    },
    [expenses]
  );

  const updateExpense = useCallback(
    async (
      id: string,
      updates: Partial<{
        name: string;
        category: CategoryType;
        amount: number;
        notes?: string;
        date?: string;
      }>
    ): Promise<void> => {
      const updated = expenses.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            ...(updates.name !== undefined && { name: updates.name.trim() }),
            ...(updates.category !== undefined && { category: updates.category }),
            ...(updates.amount !== undefined && { amount: Number(updates.amount) }),
            ...(updates.notes !== undefined && { notes: updates.notes.trim() }),
            ...(updates.date !== undefined && { createdAt: updates.date }),
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      });

      setExpenses(updated);
      await saveStoredExpenses(updated);
    },
    [expenses]
  );

  const deleteExpense = useCallback(
    async (id: string): Promise<void> => {
      const updated = expenses.filter((item) => item.id !== id);
      setExpenses(updated);
      await saveStoredExpenses(updated);
    },
    [expenses]
  );

  const clearAllExpenses = useCallback(async (): Promise<void> => {
    setExpenses([]);
    await saveStoredExpenses([]);
  }, []);

  const eraseAllData = useCallback(async (): Promise<void> => {
    try {
      shakeServiceBridge.stopService();
      setExpenses([]);
      setSettings(DEFAULT_SETTINGS);
      await clearAllStoredData();
    } catch (e) {
      console.error('Error erasing all data:', e);
      throw e;
    }
  }, []);

  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>): Promise<void> => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await saveStoredSettings(updated);

      // Handle Shake Service state changes
      if (newSettings.shakeEnabled !== undefined || newSettings.shakeSensitivity !== undefined) {
        if (updated.shakeEnabled) {
          shakeServiceBridge.startService(updated.shakeSensitivity);
        } else {
          shakeServiceBridge.stopService();
        }
      }
    },
    [settings]
  );

  const completeOnboarding = useCallback(
    async (onboardingData: {
      userName: string;
      currency: string;
      currencyCode: string;
      shakeSensitivity: ShakeSensitivity;
      trackingStyle?: string;
    }): Promise<void> => {
      const updated: AppSettings = {
        ...settings,
        userName: onboardingData.userName.trim(),
        currency: onboardingData.currency,
        currencyCode: onboardingData.currencyCode,
        shakeSensitivity: onboardingData.shakeSensitivity,
        trackingStyle: onboardingData.trackingStyle || 'Personal',
        onboardingCompleted: true,
      };
      setSettings(updated);
      await saveStoredSettings(updated);

      if (updated.shakeEnabled) {
        shakeServiceBridge.startService(updated.shakeSensitivity);
      }
    },
    [settings]
  );

  const resetOnboarding = useCallback(async (): Promise<void> => {
    const updated: AppSettings = {
      ...settings,
      onboardingCompleted: false,
    };
    setSettings(updated);
    await saveStoredSettings(updated);
  }, [settings]);

  // Compute live analytics based ONLY on genuine local records
  const stats = useMemo<ExpenseStats>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

    let totalSpending = 0;
    let thisMonthSpending = 0;
    let lastMonthSpending = 0;
    let todaySpending = 0;
    let thisWeekSpending = 0;

    const categoryTotals: Record<CategoryType, number> = {
      Food: 0,
      Transport: 0,
      Shopping: 0,
      Bills: 0,
      Entertainment: 0,
      Health: 0,
      Travel: 0,
      Education: 0,
      Other: 0,
    };

    for (const exp of expenses) {
      const expDate = new Date(exp.createdAt);
      const expTime = expDate.getTime();
      const amount = Number(exp.amount) || 0;

      totalSpending += amount;

      if (categoryTotals[exp.category] !== undefined) {
        categoryTotals[exp.category] += amount;
      } else {
        categoryTotals.Other += amount;
      }

      if (expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth) {
        thisMonthSpending += amount;
      } else if (expDate.getFullYear() === lastMonthYear && expDate.getMonth() === lastMonth) {
        lastMonthSpending += amount;
      }

      if (expTime >= startOfToday) {
        todaySpending += amount;
      }

      if (expTime >= sevenDaysAgo) {
        thisWeekSpending += amount;
      }
    }

    let percentageChange: number | null = null;
    if (lastMonthSpending > 0) {
      percentageChange = ((thisMonthSpending - lastMonthSpending) / lastMonthSpending) * 100;
    }

    // Top Category
    let topCategory: { category: CategoryType; amount: number } | null = null;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
      if (amt > 0 && (!topCategory || amt > topCategory.amount)) {
        topCategory = { category: cat as CategoryType, amount: amt };
      }
    }

    const totalCount = expenses.length;
    const averageExpense = totalCount > 0 ? totalSpending / totalCount : 0;

    return {
      totalSpending,
      thisMonthSpending,
      lastMonthSpending,
      percentageChange,
      todaySpending,
      thisWeekSpending,
      categoryTotals,
      topCategory,
      averageExpense,
      totalCount,
    };
  }, [expenses]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        loading,
        settings,
        stats,
        addExpense,
        updateExpense,
        deleteExpense,
        clearAllExpenses,
        eraseAllData,
        updateSettings,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = (): ExpenseContextType => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};
