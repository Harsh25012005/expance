import { Expense } from '../types/expense';

export function formatCurrency(amount: number, symbol: string = '$'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  // Strip time for day comparison
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dNow.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7 && diffDays > 1) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export const formatDateHeader = formatDate;


export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatTimeDisplay(timeStr?: string): string {
  if (!timeStr) return '8:00 PM';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h)) return '8:00 PM';

  const period = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;

  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

export interface GroupedExpenses {
  title: string;
  data: Expense[];
}

export function groupExpensesByDate(expenses: Expense[]): GroupedExpenses[] {
  const groups: Record<string, Expense[]> = {};

  for (const exp of expenses) {
    const label = formatDate(exp.createdAt);
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(exp);
  }

  return Object.entries(groups).map(([title, data]) => ({
    title,
    data,
  }));
}
