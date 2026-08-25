import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppSettings, Expense } from '../types/expense';
import { toLocalDateString } from './analyticsHelpers';
import { shakeServiceBridge } from '../services/shakeServiceBridge';

const REMINDER_NOTIFICATION_ID = 'daily_expense_reminder';
const REMINDER_CHANNEL_ID = 'expense_reminders_channel';

/**
 * Configure global foreground notification presentation
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions from user
 */
export async function requestReminderPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('[ReminderService] Error requesting notification permissions:', e);
    return false;
  }
}

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
        lightColor: '#4F46E5',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
        sound: 'default',
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
    // 1. Cancel existing scheduled reminders (both Expo and Native Android Alarm)
    await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});
    shakeServiceBridge.cancelDailyReminder();

    if (!settings.dailyReminderEnabled) {
      console.log('[ReminderService] Daily reminder is disabled in settings');
      return;
    }

    // 2. Request permission if needed
    const granted = await requestReminderPermissions();
    if (!granted) {
      console.warn('[ReminderService] Notification permission not granted');
    }

    // 3. Parse preferred time (default 20:00 / 8:00 PM)
    const timeStr = settings.reminderTime || '20:00';
    const [hStr, mStr] = timeStr.split(':');
    const hour = parseInt(hStr, 10) || 20;
    const minute = parseInt(mStr, 10) || 0;

    await setupReminderChannel();

    // 4. Native Android Exact Alarm (Fires reliably via AlarmManager.setExactAndAllowWhileIdle)
    shakeServiceBridge.scheduleDailyReminder(hour, minute);

    // 5. Expo Notifications Schedule (Secondary layer)
    try {
      if (Platform.OS === 'android') {
        await Notifications.scheduleNotificationAsync({
          identifier: REMINDER_NOTIFICATION_ID,
          content: {
            title: "Add today's expense",
            body: "You haven't recorded an expense today. Add anything you spent today.",
            data: { action: 'ADD_EXPENSE', url: 'expenza://add-expense' },
            categoryIdentifier: 'shake_expense_category',
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            ...({ channelId: REMINDER_CHANNEL_ID } as any),
          },
          trigger: {
            hour,
            minute,
            repeats: true,
            channelId: REMINDER_CHANNEL_ID,
          } as any,
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
            hour,
            minute,
            repeats: true,
          } as any,
        });
      }
    } catch (schedErr) {
      console.warn('[ReminderService] Expo scheduler warning:', schedErr);
    }

    console.log(`[ReminderService] Daily reminder scheduled for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  } catch (error) {
    console.warn('[ReminderService] Error syncing daily reminder:', error);
  }
}
