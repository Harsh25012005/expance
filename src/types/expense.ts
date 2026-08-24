export interface ExpenseItem {
  id: string;
  remark: string;
  amount: number;
  category: string;
  date: string; // ISO string or YYYY-MM-DD
  timestamp: number;
  syncedToSheet: boolean;
  paymentMethod?: string;
  notes?: string;
  sheetRowIndex?: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export interface GoogleSheetConfig {
  webAppUrl: string;
  sheetName: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  isConnected: boolean;
  sheetUrl?: string;
}

export type ShakeSensitivity = 'low' | 'medium' | 'high';

export interface ShakeSettings {
  enabled: boolean;
  sensitivity: ShakeSensitivity;
  hapticFeedback: boolean;
  backgroundAccess: boolean;
}

export type DateFilterType = 'today' | 'week' | 'month' | 'year' | 'all';
export type SyncFilterType = 'all' | 'synced' | 'pending';
export type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';
