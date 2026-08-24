import { CategoryInfo, CategoryType, CurrencyConfig } from '../types/expense';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'Food',
    label: 'Food & Dining',
    icon: 'Utensils',
    color: '#EA580C', // Warm Amber/Orange
    bgColor: '#FFF7ED',
  },
  {
    id: 'Transport',
    label: 'Transport',
    icon: 'Car',
    color: '#0284C7', // Sky Blue
    bgColor: '#F0F9FF',
  },
  {
    id: 'Shopping',
    label: 'Shopping',
    icon: 'ShoppingBag',
    color: '#DB2777', // Rose / Pink
    bgColor: '#FDF2F8',
  },
  {
    id: 'Bills',
    label: 'Bills & Utilities',
    icon: 'Zap',
    color: '#7C3AED', // Violet
    bgColor: '#F5F3FF',
  },
  {
    id: 'Entertainment',
    label: 'Entertainment',
    icon: 'Film',
    color: '#D97706', // Gold / Amber
    bgColor: '#FFFBEB',
  },
  {
    id: 'Health',
    label: 'Health & Medical',
    icon: 'HeartPulse',
    color: '#E11D48', // Crimson Red
    bgColor: '#FFF1F2',
  },
  {
    id: 'Travel',
    label: 'Travel',
    icon: 'Plane',
    color: '#0D9488', // Teal
    bgColor: '#F0FDFA',
  },
  {
    id: 'Education',
    label: 'Education',
    icon: 'GraduationCap',
    color: '#4F46E5', // Indigo
    bgColor: '#EEF2FF',
  },
  {
    id: 'Other',
    label: 'Other',
    icon: 'MoreHorizontal',
    color: '#475569', // Slate
    bgColor: '#F1F5F9',
  },
];

export const CATEGORY_MAP: Record<CategoryType, CategoryInfo> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  },
  {} as Record<CategoryType, CategoryInfo>
);

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AU$)' },
];
