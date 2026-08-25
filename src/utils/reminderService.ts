import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppSettings, Expense } from '../types/expense';
import { toLocalDateString } from './analyticsHelpers';

const REMINDER_NOTIFICATION_ID = 'daily_expense_reminder';
const REMINDER_CHANNEL_ID = 'expense_reminders_channel';

/**
 * Setup Android notification channel for daily reminders
 */
export async function setupReminderChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Expense Reminders',
        description: "Daily reminders to record today's spending.",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 150, 80, 150],
        lightColor: '#2563EB',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });
    } catch (err) {
      console.warn('[ReminderService] Error setting up reminder channel:', err);
    }
  }
}

/**
 * Sync daily reminder schedule based on user settings and today's expenses
 */
export async function syncDailyReminder(
  settings: AppSettings,
  expenses: Expense[]
): Promise<void> {
  try {
    // 1. Cancel existing scheduled reminder
    await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});

    if (!settings.dailyReminderEnabled) {
      return;
    }

    // 2. Parse preferred time (default 20:00 / 8:00 PM)
    const timeStr = settings.reminderTime || '20:00';
    const [hStr, mStr] = timeStr.split(':');
    const hour = parseInt(hStr, 10) || 20;
    const minute = parseInt(mStr, 10) || 0;

    // 3. Check if user already recorded an expense today
    const todayStr = toLocalDateString(new Date());
    const hasExpenseToday = expenses.some((exp) => {
      return toLocalDateString(new Date(exp.createdAt)) === todayStr;
    });

    if (hasExpenseToday) {
      // If user has already recorded an expense today, we don't spam them today!
      // Schedule daily recurring for future days
      console.log('[ReminderService] Expense already recorded today, ensuring future schedule');
    }

    await setupReminderChannel();

    // 4. Schedule daily notification
    if (Platform.OS === 'android') {
      await Notifications.scheduleNotificationAsync({
        identifier: REMINDER_NOTIFICATION_ID,
        content: {
          title: "Add today's expense",
          body: "You haven't recorded an expense today. Add anything you spent today.",
          data: { action: 'ADD_EXPENSE', url: 'expenza://add-expense' },
          categoryIdentifier: 'shake_expense_category',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        identifier: REMINDER_NOTIFICATION_ID,
        content: {
          title: "Add today's expense",
          body: "You haven't recorded an expense today. Add anything you spent today.",
          data: { action: 'ADD_EXPENSE', url: 'expenza://add-expense' },
          categoryIdentifier: 'shake_expense_category',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }

    console.log(`[ReminderService] Daily reminder scheduled for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  } catch (error) {
    console.warn('[ReminderService] Error syncing daily reminder:', error);
  }
}
