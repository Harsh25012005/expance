import { CATEGORIES } from '../constants/categories';
import { CategoryItem } from '../types/expense';

export function formatCurrency(amount: number, symbol: string = '₹'): string {
  if (isNaN(amount)) return `${symbol}0`;
  return `${symbol}${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `Today, ${timeStr}`;
    }
    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }) + `, ${timeStr}`;
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export function getCategoryDetails(categoryId: string): CategoryItem {
  const match = CATEGORIES.find(
    (c) => c.id.toLowerCase() === categoryId?.toLowerCase() || c.name.toLowerCase() === categoryId?.toLowerCase()
  );
  if (match) return match;
  return CATEGORIES[CATEGORIES.length - 1]; // 'other'
}

export function generateUUID(): string {
  return 'exp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
}
