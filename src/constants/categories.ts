import { CategoryInfo, CategoryType, CurrencyConfig } from '../types/expense';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'Food',
    label: 'Food & Dining',
    icon: 'Utensils',
    color: '#D97706', // Warm Amber
    bgColor: '#FEF3C7',
  },
  {
    id: 'Transport',
    label: 'Transport',
    icon: 'Car',
    color: '#2563EB', // Blue
    bgColor: '#EFF6FF',
  },
  {
    id: 'Shopping',
    label: 'Shopping',
    icon: 'ShoppingBag',
    color: '#BE185D', // Deep Rose
    bgColor: '#FCE7F3',
  },
  {
    id: 'Bills',
    label: 'Bills & Utilities',
    icon: 'Zap',
    color: '#7C3AED', // Muted Violet
    bgColor: '#F5F3FF',
  },
  {
    id: 'Entertainment',
    label: 'Entertainment',
    icon: 'Film',
    color: '#EA580C', // Orange
    bgColor: '#FFEDD5',
  },
  {
    id: 'Health',
    label: 'Health & Medical',
    icon: 'HeartPulse',
    color: '#E11D48', // Ruby
    bgColor: '#FFE4E6',
  },
  {
    id: 'Travel',
    label: 'Travel',
    icon: 'Plane',
    color: '#0D9488', // Deep Teal
    bgColor: '#CCFBF1',
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
    color: '#525252', // Neutral Charcoal
    bgColor: '#F5F5F5',
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
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar' },
];
