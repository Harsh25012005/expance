import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationMessage {
  title: string;
  body: string;
}

// 5 distinct non-emoji notification messages that cycle sequentially
export const NOTIFICATION_MESSAGES: NotificationMessage[] = [
  {
    title: 'Add an expense',
    body: 'Tap to record what you just spent.',
  },
  {
    title: 'Quick expense entry',
    body: 'Your latest expense is ready to record.',
  },
  {
    title: 'Track your spending',
    body: 'Add your expense before you forget.',
  },
  {
    title: 'Record your expense',
    body: 'Keep your spending history up to date.',
  },
  {
    title: 'Expense ready to add',
    body: 'Quickly record what you spent.',
  },
];

export const SHAKE_EXPENSE_CATEGORY_ID = 'shake_expense_category';
export const SHAKE_NOTIFICATION_IDENTIFIER = 'expenza_shake_notification';

let lastMessageIndex = -1;

export function getNextNotificationMessage(): NotificationMessage {
  const size = NOTIFICATION_MESSAGES.length;
  const nextIndex = (lastMessageIndex + 1) % size;
  lastMessageIndex = nextIndex;
  return NOTIFICATION_MESSAGES[nextIndex];
}

// Configure notification handler so notifications appear in all states (foreground, alert, banner, sound)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let isConfigured = false;

export async function ensureNotificationPermissions(): Promise<boolean> {
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
  } catch (err) {
    console.warn('[SHAKE] Error checking notification permissions:', err);
    return false;
  }
}

export async function setupNotificationChannel(): Promise<void> {
  if (isConfigured) return;

  // Proactively verify permissions
  await ensureNotificationPermissions();

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

  // 2. Setup Android notification channel with maximum visibility
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('expense_tracking_channel', {
        name: 'Expense Tracking',
        description: 'Notifications for quick expense entry on phone shake.',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 150, 80, 150],
        lightColor: '#4F46E5',
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
  console.log('[SHAKE] Creating notification:', message.title);

  await setupNotificationChannel();
  await ensureNotificationPermissions();

  try {
    // Dismiss previous shake notification if present to prevent clutter
    try {
      await Notifications.dismissNotificationAsync(SHAKE_NOTIFICATION_IDENTIFIER);
    } catch {}

    console.log('[SHAKE] Showing new shake notification');
    await Notifications.scheduleNotificationAsync({
      identifier: SHAKE_NOTIFICATION_IDENTIFIER,
      content: {
        title: message.title,
        body: message.body,
        data: { action: 'ADD_EXPENSE', url: 'expenza://add-expense' },
        categoryIdentifier: SHAKE_EXPENSE_CATEGORY_ID,
        sound: true,
        color: '#4F46E5',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[SHAKE] Error sending shake notification:', err);
  }
}

