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
  receiptUri?: string; // Optional local URI of receipt photo
  tags?: string[];
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
  darkMode?: boolean; // Dark mode theme toggle
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

// 🏺 Savings Goal Jar (Sinking Fund)
export interface SavingsJar {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  categoryIcon: string;
  color: string;
  deadlineDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ⚖️ 50 / 30 / 20 Rule Stats
export interface Rule503020Stats {
  needsAmount: number;
  needsPercentage: number;
  wantsAmount: number;
  wantsPercentage: number;
  savingsAmount: number;
  savingsPercentage: number;
  totalAmount: number;
  score: number; // 0 - 100
  statusText: string;
  recommendation: string;
}

// 🟩 Heatmap Day Data
export interface HeatmapDayData {
  dateString: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6
  amount: number;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // 0=none, 1=low, 2=med, 3=high, 4=very high
}
