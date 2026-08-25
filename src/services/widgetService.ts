import { NativeModules, Platform } from 'react-native';
import { Expense, AppSettings } from '../types/expense';
import { toLocalDateString } from '../utils/analyticsHelpers';

const { ShakeServiceModule } = NativeModules;

import { CATEGORIES } from '../constants/categories';

const CATEGORY_COLOR_MAP: Record<string, string> = {
  Food: '#F59E0B',
  Transport: '#38BDF8',
  Shopping: '#EC4899',
  Bills: '#A78BFA',
  Entertainment: '#FB923C',
  Health: '#F43F5E',
  Travel: '#2DD4BF',
  Education: '#6366F1',
  Other: '#94A3B8',
};

const DEFAULT_CAT_CONFIGS = [
  { name: 'FOOD', pct: 52, color: '#F59E0B' },
  { name: 'SHOP', pct: 32, color: '#EC4899' },
  { name: 'TRANS', pct: 15, color: '#38BDF8' },
  { name: 'BILLS', pct: 77, color: '#A78BFA' },
];

export const widgetService = {
  /**
   * Synchronize spending data with the Category Android Home-Screen widget
   */
  syncWidget(expenses: Expense[], settings: AppSettings): void {
    if (Platform.OS !== 'android' || !ShakeServiceModule?.updateWidgetData) {
      return;
    }

    try {
      const now = new Date();
      const todayStr = toLocalDateString(now);
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
      const monthName = monthFormatter.format(now);

      let todaySpent = 0;
      let todayCount = 0;
      const todayHourlyBuckets: number[] = new Array(20).fill(0);

      let monthSpent = 0;
      const monthCategoryMap: Record<string, number> = {};

      for (const exp of expenses) {
        const amount = Number(exp.amount) || 0;
        const expDate = new Date(exp.createdAt);
        const cat = exp.category || 'Other';

        if (toLocalDateString(expDate) === todayStr) {
          todaySpent += amount;
          todayCount += 1;
          const hour = expDate.getHours();
          const bucketIndex = Math.min(Math.floor((hour / 24) * 20), 19);
          todayHourlyBuckets[bucketIndex] += amount;
        }

        if (expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth) {
          monthSpent += amount;
          monthCategoryMap[cat] = (monthCategoryMap[cat] || 0) + amount;
        }
      }

      const maxBucket = Math.max(...todayHourlyBuckets, 1);
      const todayBars = todayHourlyBuckets
        .map((b) => (b > 0 ? (b / maxBucket).toFixed(2) : '0.15'))
        .join(',');

      // Top 4 Month categories for Concentric Rings
      const monthSortedCats = Object.entries(monthCategoryMap).sort((a, b) => b[1] - a[1]);
      const totalMonthCatSpent = monthSpent > 0 ? monthSpent : 1;

      const getCatData = (index: number) => {
        if (index < monthSortedCats.length) {
          const [name, amt] = monthSortedCats[index];
          const pct = Math.max(1, Math.round((amt / totalMonthCatSpent) * 100));
          const catInfo = CATEGORIES.find((c) => c.id.toLowerCase() === name.toLowerCase() || c.label.toLowerCase() === name.toLowerCase());
          const color = catInfo?.color || CATEGORY_COLOR_MAP[name] || DEFAULT_CAT_CONFIGS[index]?.color || '#A78BFA';
          return { name, pct, color };
        }
        return DEFAULT_CAT_CONFIGS[index] || { name: 'OTHER', pct: 10, color: '#94A3B8' };
      };

      const cat1 = getCatData(0);
      const cat2 = getCatData(1);
      const cat3 = getCatData(2);
      const cat4 = getCatData(3);
      const cat5 = { name: '', pct: 0, color: '#A78BFA' };

      const monthlyBudget = Number(settings.monthlyBudget) || 0;
      const currency = settings.currency || '₹';

      ShakeServiceModule.updateWidgetData(
        todaySpent,
        todayCount,
        todayBars,
        monthlyBudget,
        monthSpent,
        monthName,
        currency,
        cat1.name,
        cat1.pct,
        cat1.color,
        cat2.name,
        cat2.pct,
        cat2.color,
        cat3.name,
        cat3.pct,
        cat3.color,
        cat4.name,
        cat4.pct,
        cat4.color,
        cat5.name,
        cat5.pct,
        cat5.color
      );
    } catch (err) {
      console.warn('[WidgetService] Error updating native home screen widget:', err);
    }
  },
};
