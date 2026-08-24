import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { ExpenseItem, GoogleSheetConfig } from '../types/expense';
import { StorageService, DEFAULT_SHEET_CONFIG } from '../services/storage';
import { GoogleSheetsService } from '../services/googleSheets';
import { INITIAL_SAMPLE_EXPENSES } from '../utils/sampleData';
import { generateUUID } from '../utils/formatters';

interface ExpenseContextType {
  expenses: ExpenseItem[];
  currency: string;
  sheetConfig: GoogleSheetConfig;
  isSyncing: boolean;
  syncStatusMessage: string;
  addExpense: (data: { remark: string; amount: number; category?: string; paymentMethod?: string }) => Promise<{ success: boolean; message: string }>;
  deleteExpense: (id: string) => Promise<void>;
  syncWithGoogleSheet: (pullLatest?: boolean) => Promise<{ success: boolean; message: string }>;
  updateSheetConfig: (config: Partial<GoogleSheetConfig>) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  resetToDemoData: () => Promise<void>;
  clearAllExpenses: () => Promise<void>;
  totalSpending: number;
  todaySpending: number;
  thisMonthSpending: number;
  categorySpendMap: Record<string, number>;
  unsyncedCount: number;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider = ({ children }: { children: ReactNode }) => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [currency, setCurrency] = useState<string>('₹');
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>(DEFAULT_SHEET_CONFIG);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>('Ready');

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const storedExpenses = await StorageService.getExpenses();
        const storedConfig = await StorageService.getGoogleSheetConfig();
        const storedCurrency = await StorageService.getCurrency();

        if (storedExpenses && storedExpenses.length > 0) {
          setExpenses(storedExpenses);
        } else {
          // Initialize with attractive sample data on first run
          setExpenses(INITIAL_SAMPLE_EXPENSES);
          await StorageService.saveExpenses(INITIAL_SAMPLE_EXPENSES);
        }

        setSheetConfig(storedConfig);
        setCurrency(storedCurrency);

        // If sheet is configured, do a silent sync
        if (storedConfig.webAppUrl && storedConfig.autoSync) {
          syncWithConfig(storedExpenses || INITIAL_SAMPLE_EXPENSES, storedConfig, false);
        }
      } catch (err) {
        console.error('Failed to load initial storage:', err);
      }
    };

    loadInitialData();
  }, []);

  const syncWithConfig = async (
    currentExpenses: ExpenseItem[],
    config: GoogleSheetConfig,
    pullFromSheet: boolean = true
  ): Promise<{ success: boolean; message: string }> => {
    if (!config.webAppUrl || !config.webAppUrl.trim()) {
      return { success: false, message: 'Google Sheet URL not configured' };
    }

    setIsSyncing(true);
    setSyncStatusMessage('Syncing with Google Sheet...');

    try {
      // 1. Check for unsynced local expenses and push them
      const unsynced = currentExpenses.filter((e) => !e.syncedToSheet);
      let updatedExpenses = [...currentExpenses];

      if (unsynced.length > 0) {
        const pushResult = await GoogleSheetsService.batchSyncExpenses(unsynced, config);
        if (pushResult.success) {
          updatedExpenses = currentExpenses.map((item) => ({
            ...item,
            syncedToSheet: true,
          }));
          setExpenses(updatedExpenses);
          await StorageService.saveExpenses(updatedExpenses);
        }
      }

      // 2. Pull from Google Sheet if requested
      if (pullFromSheet) {
        const pullResult = await GoogleSheetsService.fetchExpensesFromSheet(config);
        if (pullResult.success && pullResult.data) {
          // Merge items by ID
          const map = new Map<string, ExpenseItem>();
          // Put local first
          updatedExpenses.forEach((item) => map.set(item.id, item));
          // Overwrite / add from sheet
          pullResult.data.forEach((sheetItem) => {
            map.set(sheetItem.id, {
              ...sheetItem,
              syncedToSheet: true,
            });
          });

          const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
          setExpenses(merged);
          await StorageService.saveExpenses(merged);
        }
      }

      const updatedConfig = {
        ...config,
        isConnected: true,
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setSheetConfig(updatedConfig);
      await StorageService.saveGoogleSheetConfig(updatedConfig);

      setSyncStatusMessage('Synced with Google Sheet');
      setIsSyncing(false);
      return { success: true, message: 'Google Sheet synchronized successfully!' };
    } catch (err: any) {
      console.warn('Sync error:', err);
      setIsSyncing(false);
      setSyncStatusMessage('Offline / Sync error');
      return { success: false, message: err?.message || 'Sync failed' };
    }
  };

  const addExpense = async (data: {
    remark: string;
    amount: number;
    category?: string;
    paymentMethod?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const newExpense: ExpenseItem = {
      id: generateUUID(),
      remark: data.remark.trim() || 'Quick Expense',
      amount: Number(data.amount) || 0,
      category: data.category || 'other',
      date: new Date().toISOString(),
      timestamp: Date.now(),
      syncedToSheet: false,
      paymentMethod: data.paymentMethod || 'UPI',
    };

    // Save locally first for 100% instantaneous UX
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    await StorageService.saveExpenses(updated);

    // If Google Sheet is configured, sync in background
    if (sheetConfig.webAppUrl && sheetConfig.webAppUrl.trim()) {
      setIsSyncing(true);
      setSyncStatusMessage('Saving to Google Sheet...');
      
      try {
        const result = await GoogleSheetsService.saveExpenseToSheet(newExpense, sheetConfig);
        if (result.success) {
          const markedSynced = updated.map((item) =>
            item.id === newExpense.id ? { ...item, syncedToSheet: true } : item
          );
          setExpenses(markedSynced);
          await StorageService.saveExpenses(markedSynced);
          setSyncStatusMessage('Saved to Google Sheet');
          setIsSyncing(false);
          return { success: true, message: 'Saved to app & Google Sheet! ✨' };
        } else {
          setSyncStatusMessage('Saved locally (Sheet pending)');
          setIsSyncing(false);
          return { success: true, message: 'Saved locally (will sync to sheet when connected)' };
        }
      } catch {
        setIsSyncing(false);
        setSyncStatusMessage('Saved locally');
        return { success: true, message: 'Saved locally' };
      }
    }

    return { success: true, message: 'Expense added to app! ✨' };
  };

  const deleteExpense = async (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    await StorageService.saveExpenses(updated);
  };

  const syncWithGoogleSheet = async (pullLatest: boolean = true) => {
    return await syncWithConfig(expenses, sheetConfig, pullLatest);
  };

  const updateSheetConfig = async (newConfig: Partial<GoogleSheetConfig>) => {
    const updated = { ...sheetConfig, ...newConfig };
    setSheetConfig(updated);
    await StorageService.saveGoogleSheetConfig(updated);
  };

  const updateCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency);
    await StorageService.saveCurrency(newCurrency);
  };

  const resetToDemoData = async () => {
    setExpenses(INITIAL_SAMPLE_EXPENSES);
    await StorageService.saveExpenses(INITIAL_SAMPLE_EXPENSES);
  };

  const clearAllExpenses = async () => {
    setExpenses([]);
    await StorageService.saveExpenses([]);
  };

  // Derived metrics
  const totalSpending = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  const todaySpending = useMemo(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    return expenses
      .filter((e) => new Date(e.date).toDateString() === todayStr)
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  const thisMonthSpending = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  const categorySpendMap = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || 'other';
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });
    return map;
  }, [expenses]);

  const unsyncedCount = useMemo(() => {
    return expenses.filter((e) => !e.syncedToSheet).length;
  }, [expenses]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        currency,
        sheetConfig,
        isSyncing,
        syncStatusMessage,
        addExpense,
        deleteExpense,
        syncWithGoogleSheet,
        updateSheetConfig,
        updateCurrency,
        resetToDemoData,
        clearAllExpenses,
        totalSpending,
        todaySpending,
        thisMonthSpending,
        categorySpendMap,
        unsyncedCount,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
};
