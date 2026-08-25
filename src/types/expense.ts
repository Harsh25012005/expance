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
  userName?: string;
  onboardingCompleted: boolean;
  trackingStyle?: string;
  shakeEnabled: boolean;
  shakeSensitivity: ShakeSensitivity;
  currency: string;
  currencyCode: string;
  hapticsEnabled: boolean;
  monthlyBudget?: number; // 0 or undefined when not set
  dailyReminderEnabled?: boolean;
  reminderTime?: string; // e.g. '20:00'
}

export type TabScreen = 'home' | 'expenses' | 'analytics' | 'settings';

export interface CategoryInfo {
  id: CategoryType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export type BudgetStatus = 'no_budget' | 'healthy' | 'near_limit' | 'over_budget';

export interface BudgetStats {
  monthlyBudget: number;
  spent: number;
  remaining: number;
  overAmount: number;
  percentageUsed: number;
  status: BudgetStatus;
  hasBudget: boolean;
}

export type MoneyMoodType = 'Comfortable' | 'Moderate' | 'Tight';

export interface MoneyMoodInfo {
  mood: MoneyMoodType;
  title: string;
  description: string;
  badgeColor: string;
  textColor: string;
  bgColor: string;
}

export interface StreakStats {
  trackingStreak: number;
  noSpendStreak: number;
  underBudgetStreak: number;
  totalSpendingDaysThisMonth: number;
  totalNoSpendDaysThisMonth: number;
}

export interface MoneyReplayData {
  monthName: string;
  year: number;
  totalSpent: number;
  topCategory: { category: CategoryType; amount: number; percentage: number } | null;
  spendingDaysCount: number;
  noSpendDaysCount: number;
  biggestExpense: Expense | null;
  budgetPercentage: number | null;
  hasBudget: boolean;
  hasExpenses: boolean;
}
