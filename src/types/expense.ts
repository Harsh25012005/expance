export type CategoryType =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Bills'
  | 'Entertainment'
  | 'Health'
  | 'Travel'
  | 'Education'
  | 'Other';

export interface Expense {
  id: string;
  name: string;
  category: CategoryType;
  amount: number;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
  notes?: string;
}

export type ShakeSensitivity = 'low' | 'medium' | 'high';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export interface AppSettings {
  shakeEnabled: boolean;
  shakeSensitivity: ShakeSensitivity;
  currency: string;
  currencyCode: string;
  hapticsEnabled: boolean;
}

export type TabScreen = 'home' | 'expenses' | 'analytics' | 'settings';

export interface CategoryInfo {
  id: CategoryType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}
