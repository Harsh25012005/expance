import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  AppSettings,
  CategoryType,
  Expense,
  SavingsJar,
  ShakeSensitivity,
  Rule503020Stats,
} from '../types/expense';
import {
  clearAllStoredData,
  DEFAULT_SETTINGS,
  loadStoredExpenses,
  loadStoredSettings,
  loadStoredSavingsJars,
  saveStoredExpenses,
  saveStoredSettings,
  saveStoredSavingsJars,
} from '../services/storage';
import { shakeServiceBridge } from '../services/shakeServiceBridge';
import { syncDailyReminder } from '../utils/reminderService';
import { getAppTheme } from '../constants/theme';

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
  rule503020: Rule503020Stats;
}

interface ExpenseContextType {
  expenses: Expense[];
  savingsJars: SavingsJar[];
  loading: boolean;
  settings: AppSettings;
  isDark: boolean;
  theme: ReturnType<typeof getAppTheme>;
  stats: ExpenseStats;
  addExpense: (expenseData: {
    name: string;
    category: CategoryType;
    amount: number;
    notes?: string;
    date?: string;
    receiptUri?: string;
    tags?: string[];
  }) => Promise<Expense>;
  updateExpense: (
    id: string,
    updates: Partial<{
      name: string;
      category: CategoryType;
      amount: number;
      notes?: string;
      date?: string;
      receiptUri?: string;
      tags?: string[];
    }>
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  clearAllExpenses: () => Promise<void>;
  eraseAllData: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  completeOnboarding: (onboardingData: {
    userName: string;
    currency: string;
    currencyCode: string;
    shakeSensitivity: ShakeSensitivity;
    trackingStyle?: string;
  }) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  // Savings Jars
  addSavingsJar: (jarData: {
    title: string;
    targetAmount: number;
    initialAmount?: number;
    categoryIcon: string;
    color: string;
    deadlineDate?: string;
  }) => Promise<SavingsJar>;
  updateSavingsJar: (id: string, updates: Partial<SavingsJar>) => Promise<void>;
  deleteSavingsJar: (id: string) => Promise<void>;
  depositToJar: (id: string, amount: number) => Promise<void>;
  withdrawFromJar: (id: string, amount: number) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingsJars, setSavingsJars] = useState<SavingsJar[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize from storage on mount
  useEffect(() => {
    async function init() {
      try {
        const [loadedExpenses, loadedSettings, loadedJars] = await Promise.all([
          loadStoredExpenses(),
          loadStoredSettings(),
          loadStoredSavingsJars(),
        ]);
        setExpenses(loadedExpenses);
        setSettings(loadedSettings);
        setSavingsJars(loadedJars);

        // Sync native shake service with loaded persisted settings
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

  // Sync daily reminders whenever settings or expenses change
  useEffect(() => {
    if (!loading) {
      syncDailyReminder(settings, expenses);
    }
  }, [settings.dailyReminderEnabled, settings.reminderTime, expenses, loading]);

  const isDark = Boolean(settings.darkMode);
  const appTheme = useMemo(() => getAppTheme(isDark), [isDark]);

  const toggleDarkMode = useCallback(async () => {
    const updatedDark = !isDark;
    const newSettings = { ...settings, darkMode: updatedDark };
    setSettings(newSettings);
    await saveStoredSettings(newSettings);
  }, [isDark, settings]);

  const addExpense = useCallback(
    async (expenseData: {
      name: string;
      category: CategoryType;
      amount: number;
      notes?: string;
      date?: string;
      receiptUri?: string;
      tags?: string[];
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
        receiptUri: expenseData.receiptUri,
        tags: expenseData.tags,
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
        receiptUri?: string;
        tags?: string[];
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
            ...(updates.receiptUri !== undefined && { receiptUri: updates.receiptUri }),
            ...(updates.tags !== undefined && { tags: updates.tags }),
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
      setSavingsJars([]);
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

  // 🏺 SAVINGS JARS METHODS
  const addSavingsJar = useCallback(
    async (jarData: {
      title: string;
      targetAmount: number;
      initialAmount?: number;
      categoryIcon: string;
      color: string;
      deadlineDate?: string;
    }): Promise<SavingsJar> => {
      const now = new Date().toISOString();
      const newJar: SavingsJar = {
        id: `jar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: jarData.title.trim(),
        targetAmount: Math.max(1, Number(jarData.targetAmount)),
        currentAmount: Math.max(0, Number(jarData.initialAmount || 0)),
        categoryIcon: jarData.categoryIcon,
        color: jarData.color,
        deadlineDate: jarData.deadlineDate,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [newJar, ...savingsJars];
      setSavingsJars(updated);
      await saveStoredSavingsJars(updated);
      return newJar;
    },
    [savingsJars]
  );

  const updateSavingsJar = useCallback(
    async (id: string, updates: Partial<SavingsJar>): Promise<void> => {
      const updated = savingsJars.map((jar) => {
        if (jar.id === id) {
          return {
            ...jar,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return jar;
      });
      setSavingsJars(updated);
      await saveStoredSavingsJars(updated);
    },
    [savingsJars]
  );

  const deleteSavingsJar = useCallback(
    async (id: string): Promise<void> => {
      const updated = savingsJars.filter((jar) => jar.id !== id);
      setSavingsJars(updated);
      await saveStoredSavingsJars(updated);
    },
    [savingsJars]
  );

  const depositToJar = useCallback(
    async (id: string, amount: number): Promise<void> => {
      if (amount <= 0) return;
      const updated = savingsJars.map((jar) => {
        if (jar.id === id) {
          return {
            ...jar,
            currentAmount: jar.currentAmount + amount,
            updatedAt: new Date().toISOString(),
          };
        }
        return jar;
      });
      setSavingsJars(updated);
      await saveStoredSavingsJars(updated);
    },
    [savingsJars]
  );

  const withdrawFromJar = useCallback(
    async (id: string, amount: number): Promise<void> => {
      if (amount <= 0) return;
      const updated = savingsJars.map((jar) => {
        if (jar.id === id) {
          return {
            ...jar,
            currentAmount: Math.max(0, jar.currentAmount - amount),
            updatedAt: new Date().toISOString(),
          };
        }
        return jar;
      });
      setSavingsJars(updated);
      await saveStoredSavingsJars(updated);
    },
    [savingsJars]
  );

  // Compute live analytics based on genuine local records
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

    // 50 / 30 / 20 breakdown amounts for current month
    let thisMonthNeeds = 0;
    let thisMonthWants = 0;

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

      const isThisMonth =
        expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth;

      if (isThisMonth) {
        thisMonthSpending += amount;

        // Categorize into Needs vs Wants according to 50/30/20 standard
        if (
          exp.category === 'Food' ||
          exp.category === 'Transport' ||
          exp.category === 'Bills' ||
          exp.category === 'Health' ||
          exp.category === 'Education'
        ) {
          thisMonthNeeds += amount;
        } else {
          thisMonthWants += amount;
        }
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

    // 50 / 30 / 20 Rule Calculation
    // Total savings in jars + unspent monthly budget
    const totalJarSavings = savingsJars.reduce((sum, j) => sum + j.currentAmount, 0);
    const monthlyBudget = settings.monthlyBudget || 0;
    const unspentBudget = monthlyBudget > thisMonthSpending ? monthlyBudget - thisMonthSpending : 0;
    const savingsAmount = totalJarSavings > 0 ? totalJarSavings : unspentBudget;

    const baseFinancialVolume = Math.max(1, thisMonthSpending + savingsAmount);
    const needsPercentage = Math.round((thisMonthNeeds / baseFinancialVolume) * 100);
    const wantsPercentage = Math.round((thisMonthWants / baseFinancialVolume) * 100);
    const savingsPercentage = Math.max(0, 100 - needsPercentage - wantsPercentage);

    // Score calculation: Perfect is 50% Needs, 30% Wants, 20% Savings
    const needsDev = Math.abs(needsPercentage - 50);
    const wantsDev = Math.abs(wantsPercentage - 30);
    const savingsDev = Math.abs(savingsPercentage - 20);
    const totalPenalty = (needsDev + wantsDev + savingsDev) * 1.5;
    const healthScore = Math.max(20, Math.min(100, Math.round(100 - totalPenalty)));

    let statusText = 'Optimal Balance';
    let recommendation = 'Your spending aligns excellently with the 50/30/20 rule.';

    if (wantsPercentage > 45) {
      statusText = 'High Discretionary Spending';
      recommendation = `Wants account for ${wantsPercentage}% of your total outflow. Trimming dining out or shopping will build your safety net.`;
    } else if (needsPercentage > 65) {
      statusText = 'Heavy Fixed Commitments';
      recommendation = `Needs consume ${needsPercentage}% of funds. Look for ways to optimize recurring utility and grocery costs.`;
    } else if (savingsPercentage >= 20) {
      statusText = 'Strong Wealth Builder';
      recommendation = `Great job! You are reserving ${savingsPercentage}% for long-term goals and savings jars.`;
    }

    const rule503020: Rule503020Stats = {
      needsAmount: thisMonthNeeds,
      needsPercentage,
      wantsAmount: thisMonthWants,
      wantsPercentage,
      savingsAmount,
      savingsPercentage,
      totalAmount: baseFinancialVolume,
      score: healthScore,
      statusText,
      recommendation,
    };

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
      rule503020,
    };
  }, [expenses, savingsJars, settings.monthlyBudget]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        savingsJars,
        loading,
        settings,
        isDark,
        theme: appTheme,
        stats,
        addExpense,
        updateExpense,
        deleteExpense,
        clearAllExpenses,
        eraseAllData,
        updateSettings,
        toggleDarkMode,
        completeOnboarding,
        resetOnboarding,
        addSavingsJar,
        updateSavingsJar,
        deleteSavingsJar,
        depositToJar,
        withdrawFromJar,
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
