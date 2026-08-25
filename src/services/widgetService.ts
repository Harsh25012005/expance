import { NativeModules, Platform } from 'react-native';
import { Expense, AppSettings } from '../types/expense';
import { toLocalDateString } from '../utils/analyticsHelpers';

const { ShakeServiceModule } = NativeModules;

export const widgetService = {
  /**
   * Synchronize current spending and budget metrics with Android Home Screen AppWidget
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

      let todaySpent = 0;
      let monthSpent = 0;

      for (const exp of expenses) {
        const amount = Number(exp.amount) || 0;
        const expDate = new Date(exp.createdAt);

        // Check if created today
        if (toLocalDateString(expDate) === todayStr) {
          todaySpent += amount;
        }

        // Check if created in current month
        if (expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth) {
          monthSpent += amount;
        }
      }

      const monthlyBudget = Number(settings.monthlyBudget) || 0;
      const currency = settings.currency || '₹';

      ShakeServiceModule.updateWidgetData(
        todaySpent,
        monthlyBudget,
        monthSpent,
        currency
      );
    } catch (err) {
      console.warn('[WidgetService] Error updating native home screen widget:', err);
    }
  },
};
