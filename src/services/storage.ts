import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, Expense } from '../types/expense';

const EXPENSES_STORAGE_KEY = '@expense_app_expenses_v2';
const SETTINGS_STORAGE_KEY = '@expense_app_settings_v2';

export const DEFAULT_SETTINGS: AppSettings = {
  shakeEnabled: true,
  shakeSensitivity: 'medium',
  currency: '$',
  currencyCode: 'USD',
  hapticsEnabled: true,
};

export async function loadStoredExpenses(): Promise<Expense[]> {
  try {
    const raw = await AsyncStorage.getItem(EXPENSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Error reading stored expenses:', error);
    return [];
  }
}

export async function saveStoredExpenses(expenses: Expense[]): Promise<void> {
  try {
    await AsyncStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.error('Error saving expenses:', error);
    throw error;
  }
}

export async function loadStoredSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.error('Error reading stored settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveStoredSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export async function clearAllStoredData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EXPENSES_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing stored data:', error);
    throw error;
  }
}
