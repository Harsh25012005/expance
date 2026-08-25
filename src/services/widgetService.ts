import { NativeModules, Platform } from 'react-native';
import { Expense, AppSettings } from '../types/expense';
import { toLocalDateString } from '../utils/analyticsHelpers';

const { ShakeServiceModule } = NativeModules;

export const widgetService = {
  /**
   * Synchronize current spending, category breakdown, and budget metrics with Android Home Screen AppWidgets
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
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });
      const monthName = monthFormatter.format(now);

      let todaySpent = 0;
      let todayCount = 0;
      const todayCategoryMap: Record<string, number> = {};

      let monthSpent = 0;
      const monthCategoryMap: Record<string, number> = {};

      for (const exp of expenses) {
        const amount = Number(exp.amount) || 0;
        const expDate = new Date(exp.createdAt);
        const cat = exp.category || 'Other';

        // Check if created today
        if (toLocalDateString(expDate) === todayStr) {
          todaySpent += amount;
          todayCount += 1;
          todayCategoryMap[cat] = (todayCategoryMap[cat] || 0) + amount;
        }

        // Check if created in current month
        if (expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth) {
          monthSpent += amount;
          monthCategoryMap[cat] = (monthCategoryMap[cat] || 0) + amount;
        }
      }

      // Today top category string
      let todayTopCat = '';
      const todaySortedCats = Object.entries(todayCategoryMap).sort((a, b) => b[1] - a[1]);
      if (todaySortedCats.length > 0) {
        const [topCat, topAmt] = todaySortedCats[0];
        const formattedAmt = topAmt >= 1000 ? `${(topAmt / 1000).toFixed(1)}k` : `${Math.round(topAmt)}`;
        todayTopCat = `${topCat} ${settings.currency || '₹'}${formattedAmt}`;
      }

      // Top 3 Month categories
      const monthSortedCats = Object.entries(monthCategoryMap).sort((a, b) => b[1] - a[1]);
      const totalMonthCatSpent = monthSpent > 0 ? monthSpent : 1;

      const cat1 = monthSortedCats[0] || ['', 0];
      const cat2 = monthSortedCats[1] || ['', 0];
      const cat3 = monthSortedCats[2] || ['', 0];

      const cat1Name = cat1[0];
      const cat1Amount = cat1[1];
      const cat1Pct = Math.round((cat1Amount / totalMonthCatSpent) * 100);

      const cat2Name = cat2[0];
      const cat2Amount = cat2[1];
      const cat2Pct = Math.round((cat2Amount / totalMonthCatSpent) * 100);

      const cat3Name = cat3[0];
      const cat3Amount = cat3[1];
      const cat3Pct = Math.round((cat3Amount / totalMonthCatSpent) * 100);

      const monthlyBudget = Number(settings.monthlyBudget) || 0;
      const currency = settings.currency || '₹';

      // Money mood status calculation
      let moodStatus = 'Comfortable';
      let moodSubtitle = 'Spending is on track';
      let moodPct = 40;

      if (monthlyBudget > 0) {
        const spentRatio = monthSpent / monthlyBudget;
        const monthProgress = dayOfMonth / daysInMonth;

        if (spentRatio > 1.0) {
          moodStatus = 'Over Budget';
          moodSubtitle = 'Budget limit exceeded';
          moodPct = 100;
        } else if (spentRatio > 0.85) {
          moodStatus = 'Caution';
          moodSubtitle = 'Approaching monthly target';
          moodPct = 85;
        } else if (spentRatio > monthProgress + 0.15) {
          moodStatus = 'Watch Spending';
          moodSubtitle = 'Spending faster than usual';
          moodPct = 70;
        } else if (spentRatio > 0.5) {
          moodStatus = 'On Track';
          moodSubtitle = 'Well within monthly budget';
          moodPct = 50;
        } else {
          moodStatus = 'Comfortable';
          moodSubtitle = 'Spending is very healthy';
          moodPct = 25;
        }
      } else {
        if (monthSpent > 0) {
          moodStatus = 'On Track';
          moodSubtitle = 'Tracking monthly spending';
          moodPct = 50;
        } else {
          moodStatus = 'Comfortable';
          moodSubtitle = 'No spending recorded yet';
          moodPct = 15;
        }
      }

      ShakeServiceModule.updateWidgetData(
        todaySpent,
        todayCount,
        todayTopCat,
        monthlyBudget,
        monthSpent,
        monthName,
        currency,
        cat1Name,
        cat1Amount,
        cat1Pct,
        cat2Name,
        cat2Amount,
        cat2Pct,
        cat3Name,
        cat3Amount,
        cat3Pct,
        moodStatus,
        moodSubtitle,
        moodPct
      );
    } catch (err) {
      console.warn('[WidgetService] Error updating native home screen widget:', err);
    }
  },
};
