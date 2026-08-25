import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationMessage {
  title: string;
  body: string;
}

export const NOTIFICATION_MESSAGES: NotificationMessage[] = [
  {
    title: 'Add an expense',
    body: 'Tap to quickly record what you just spent.',
  },
  {
    title: 'Quick expense entry',
    body: 'Ready to record your latest expense?',
  },
  {
    title: 'Record your spending',
    body: 'Add the expense before you forget it.',
  },
  {
    title: 'Expense ready to add',
    body: 'Record your spending in just a few seconds.',
  },
  {
    title: 'Track your spending',
    body: 'Tap here to add your expense.',
  },
  {
    title: 'Quick expense capture',
    body: 'Keep your spending history up to date.',
  },
  {
    title: 'Add your latest expense',
    body: 'Quickly add what you just spent.',
  },
  {
    title: "Don't forget this expense",
    body: 'Your expense tracker is ready for a new entry.',
  },
];

export const SHAKE_EXPENSE_CATEGORY_ID = 'shake_expense_category';

let lastMessageIndex = -1;

export function getNextNotificationMessage(): NotificationMessage {
  const size = NOTIFICATION_MESSAGES.length;
  let nextIndex = Math.floor(Math.random() * size);
  if (nextIndex === lastMessageIndex && size > 1) {
    nextIndex = (nextIndex + 1) % size;
  }
  lastMessageIndex = nextIndex;
  return NOTIFICATION_MESSAGES[nextIndex];
}

// Configure notification handler so notifications appear in all states
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let isConfigured = false;

export async function setupNotificationChannel(): Promise<void> {
  if (isConfigured) return;

  // 1. Setup notification action button ("Add Expense" without emoji)
  try {
    await Notifications.setNotificationCategoryAsync(SHAKE_EXPENSE_CATEGORY_ID, [
      {
        identifier: 'ADD_EXPENSE_ACTION',
        buttonTitle: 'Add Expense',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  } catch (err) {
    console.warn('[SHAKE] Error creating notification category:', err);
  }

  // 2. Setup Android notification channel
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('expense_tracking_channel', {
        name: 'Expense Tracking',
        description: 'Notifications for quick expense entry.',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 150, 80, 150],
        lightColor: '#2563EB',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });
    } catch (err) {
      console.warn('[SHAKE] Error creating notification channel:', err);
    }
  }

  isConfigured = true;
}

export async function showShakeExpenseNotification(): Promise<void> {
  const message = getNextNotificationMessage();
  console.log('[SHAKE] Creating notification');
  console.log(`[SHAKE] Notification title: ${message.title}`);
  console.log(`[SHAKE] Notification body: ${message.body}`);

  await setupNotificationChannel();

  try {
    if (Platform.OS === 'android') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { action: 'ADD_EXPENSE', url: 'expenza://add-expense' },
          categoryIdentifier: SHAKE_EXPENSE_CATEGORY_ID,
          sound: true,
        },
        trigger: {
          channelId: 'expense_tracking_channel',
        },
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { action: 'ADD_EXPENSE', url: 'expenza://add-expense' },
          categoryIdentifier: SHAKE_EXPENSE_CATEGORY_ID,
          sound: true,
        },
        trigger: null,
      });
    }
  } catch (err) {
    console.warn('[SHAKE] Error sending shake notification:', err);
  }
}
