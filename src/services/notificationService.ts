import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior when app is in foreground/background
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const QUICK_ACCESS_NOTIFICATION_ID = 'shake-quick-access-notification';

export class NotificationService {
  /**
   * Request permissions for notifications
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('quick-expense-channel', {
          name: 'Quick Expense Logger',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10b981',
          showBadge: false,
        });
      }

      return true;
    } catch (e) {
      console.warn('Error requesting notification permissions:', e);
      return false;
    }
  }

  /**
   * Show persistent or quick-access background notification
   */
  static async showQuickAccessNotification(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      // Cancel previous to prevent duplication
      await Notifications.dismissNotificationAsync(QUICK_ACCESS_NOTIFICATION_ID).catch(() => {});

      await Notifications.scheduleNotificationAsync({
        identifier: QUICK_ACCESS_NOTIFICATION_ID,
        content: {
          title: '⚡ Quick Shake Expense',
          body: 'Tap to instantly record Remark & Amount to Google Sheets',
          data: { action: 'OPEN_SHAKE_MODAL' },
          sound: false,
          sticky: false,
          autoDismiss: true,
        },
        trigger: null, // show immediately
      });
    } catch (e) {
      console.warn('Error showing quick access notification:', e);
    }
  }

  /**
   * Dismiss the quick access notification
   */
  static async dismissQuickAccessNotification(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await Notifications.dismissNotificationAsync(QUICK_ACCESS_NOTIFICATION_ID);
    } catch (e) {
      // safe fallback
    }
  }
}
