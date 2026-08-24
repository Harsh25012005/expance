import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpenseItem, GoogleSheetConfig, ShakeSettings } from '../types/expense';

const EXPENSES_KEY = '@shake_expense_items_v1';
const SHEET_CONFIG_KEY = '@shake_expense_sheet_config_v1';
const SHAKE_SETTINGS_KEY = '@shake_expense_shake_settings_v1';
const CURRENCY_KEY = '@shake_expense_currency_v1';

export const DEFAULT_SHEET_CONFIG: GoogleSheetConfig = {
  webAppUrl: '',
  sheetName: 'ShakeExpenses',
  autoSync: true,
  isConnected: false,
};

export const DEFAULT_SHAKE_SETTINGS: ShakeSettings = {
  enabled: true,
  sensitivity: 'medium',
  hapticFeedback: true,
  backgroundAccess: true,
};

export class StorageService {
  static async getExpenses(): Promise<ExpenseItem[]> {
    try {
      const data = await AsyncStorage.getItem(EXPENSES_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (e) {
      console.error('Error reading expenses from storage:', e);
      return [];
    }
  }

  static async saveExpenses(expenses: ExpenseItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error('Error saving expenses to storage:', e);
    }
  }

  static async getGoogleSheetConfig(): Promise<GoogleSheetConfig> {
    try {
      const data = await AsyncStorage.getItem(SHEET_CONFIG_KEY);
      if (data) {
        return { ...DEFAULT_SHEET_CONFIG, ...JSON.parse(data) };
      }
      return DEFAULT_SHEET_CONFIG;
    } catch (e) {
      return DEFAULT_SHEET_CONFIG;
    }
  }

  static async saveGoogleSheetConfig(config: GoogleSheetConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving sheet config to storage:', e);
    }
  }

  static async getShakeSettings(): Promise<ShakeSettings> {
    try {
      const data = await AsyncStorage.getItem(SHAKE_SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SHAKE_SETTINGS, ...JSON.parse(data) };
      }
      return DEFAULT_SHAKE_SETTINGS;
    } catch (e) {
      return DEFAULT_SHAKE_SETTINGS;
    }
  }

  static async saveShakeSettings(settings: ShakeSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SHAKE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving shake settings to storage:', e);
    }
  }

  static async getCurrency(): Promise<string> {
    try {
      const currency = await AsyncStorage.getItem(CURRENCY_KEY);
      return currency || '₹';
    } catch (e) {
      return '₹';
    }
  }

  static async saveCurrency(currency: string): Promise<void> {
    try {
      await AsyncStorage.setItem(CURRENCY_KEY, currency);
    } catch (e) {
      console.error('Error saving currency to storage:', e);
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([EXPENSES_KEY, SHEET_CONFIG_KEY, SHAKE_SETTINGS_KEY, CURRENCY_KEY]);
    } catch (e) {
      console.error('Error clearing storage:', e);
    }
  }
}
