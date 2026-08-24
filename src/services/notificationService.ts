import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior for Expo SDK 57
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const QUICK_ACCESS_NOTIFICATION_ID = 'shake-quick-access-notification';
const HEADS_UP_ALERT_ID = 'shake-heads-up-popup-alert';

export class NotificationService {
  /**
   * Request permissions and setup high-priority Heads-up overlay channels
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

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

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        // High priority channel for Heads-Up Alert on top of other apps
        await Notifications.setNotificationChannelAsync('shake-overlay-channel', {
          name: 'Shake Expense Popup (Heads-Up)',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 150, 300],
          lightColor: '#10b981',
          showBadge: true,
          enableLights: true,
          enableVibrate: true,
        });

        // Background persistent tray channel
        await Notifications.setNotificationChannelAsync('quick-expense-channel', {
          name: 'Quick Expense Background Tray',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200],
          lightColor: '#10b981',
          showBadge: false,
        });
      }

      // Configure interactive action buttons on the notification
      await Notifications.setNotificationCategoryAsync('EXPENSE_SHAKE_ACTION', [
        {
          identifier: 'OPEN_MODAL_ACTION',
          buttonTitle: '➕ Quick Add Expense',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'SHAKE_TRIGGER_ACTION',
          buttonTitle: '⚡ Shake to Save',
          options: {
            opensAppToForeground: true,
          },
        },
      ]).catch(() => {});

      return true;
    } catch (e) {
      console.warn('Error requesting notification permissions:', e);
      return false;
    }
  }

  /**
   * Pops up an instant Heads-Up banner / overlay alert in front of any active application
   */
  static async triggerHeadsUpShakeAlert(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      // Cancel previous alert if any
      await Notifications.dismissNotificationAsync(HEADS_UP_ALERT_ID).catch(() => {});

      // Schedule instant Heads-Up notification on top of other apps with action buttons
      await Notifications.scheduleNotificationAsync({
        identifier: HEADS_UP_ALERT_ID,
        content: {
          title: '⚡ Shake Detected! Save Expense',
          body: 'Tap button below to enter Remark & Amount for Google Sheets',
          data: { action: 'OPEN_SHAKE_MODAL', timestamp: Date.now() },
          badge: 1,
          categoryIdentifier: 'EXPENSE_SHAKE_ACTION',
          autoDismiss: true,
          ...(Platform.OS === 'android' ? { channelId: 'shake-overlay-channel' } : {}),
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Error triggering heads up shake alert:', e);
    }
  }

  /**
   * Show persistent or quick-access background notification with interactive buttons
   */
  static async showQuickAccessNotification(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      await Notifications.dismissNotificationAsync(QUICK_ACCESS_NOTIFICATION_ID).catch(() => {});

      await Notifications.scheduleNotificationAsync({
        identifier: QUICK_ACCESS_NOTIFICATION_ID,
        content: {
          title: '⚡ ShakeExpense Tracker (Active)',
          body: 'Shake device or tap buttons below to open expense popup',
          data: { action: 'OPEN_SHAKE_MODAL' },
          categoryIdentifier: 'EXPENSE_SHAKE_ACTION',
          sticky: Platform.OS === 'android',
          autoDismiss: true,
          ...(Platform.OS === 'android' ? { channelId: 'quick-expense-channel' } : {}),
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Error showing quick access notification:', e);
    }
  }

  /**
   * Dismiss background notifications
   */
  static async dismissQuickAccessNotification(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await Notifications.dismissNotificationAsync(QUICK_ACCESS_NOTIFICATION_ID);
      await Notifications.dismissNotificationAsync(HEADS_UP_ALERT_ID);
    } catch (e) {
      // safe fallback
    }
  }
}
