import { CategoryItem } from '../types/expense';

export const CATEGORIES: CategoryItem[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    icon: 'UtensilsCrossed',
    color: '#f59e0b', // Amber
    bgColor: '#fef3c7',
    textColor: '#b45309',
  },
  {
    id: 'groceries',
    name: 'Groceries & Daily',
    icon: 'ShoppingBag',
    color: '#10b981', // Emerald
    bgColor: '#d1fae5',
    textColor: '#047857',
  },
  {
    id: 'transport',
    name: 'Transport & Fuel',
    icon: 'Car',
    color: '#3b82f6', // Blue
    bgColor: '#dbeafe',
    textColor: '#1d4ed8',
  },
  {
    id: 'shopping',
    name: 'Shopping & Clothes',
    icon: 'ShoppingBag',
    color: '#ec4899', // Pink
    bgColor: '#fce7f3',
    textColor: '#be185d',
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    icon: 'Receipt',
    color: '#8b5cf6', // Violet
    bgColor: '#ede9fe',
    textColor: '#6d28d9',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'Film',
    color: '#06b6d4', // Cyan
    bgColor: '#cffafe',
    textColor: '#0e7490',
  },
  {
    id: 'health',
    name: 'Health & Medical',
    icon: 'HeartPulse',
    color: '#ef4444', // Red
    bgColor: '#fee2e2',
    textColor: '#b91c1c',
  },
  {
    id: 'work',
    name: 'Work & Business',
    icon: 'Briefcase',
    color: '#6366f1', // Indigo
    bgColor: '#e0e7ff',
    textColor: '#4338ca',
  },
  {
    id: 'personal',
    name: 'Personal & Gifts',
    icon: 'Gift',
    color: '#14b8a6', // Teal
    bgColor: '#ccfbf1',
    textColor: '#0f766e',
  },
  {
    id: 'other',
    name: 'Other Expense',
    icon: 'CreditCard',
    color: '#64748b', // Slate
    bgColor: '#f1f5f9',
    textColor: '#334155',
  },
];

export const QUICK_REMARKS = [
  'Coffee & Snacks',
  'Lunch / Dinner',
  'Uber / Cab',
  'Grocery Run',
  'Supermarket',
  'Petrol / Fuel',
  'Electricity Bill',
  'Mobile Recharge',
  'Amazon / FlipKart',
  'Pharmacy / Meds',
  'Movie & Popcorn',
  'Tea & Chai',
];

export const CURRENCY_SYMBOLS = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'AED', symbol: 'د.إ', label: 'AED (د.إ)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
];
