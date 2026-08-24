import { NativeModules, Platform } from 'react-native';
import { ShakeSensitivity } from '../types/expense';

const { ShakeServiceModule } = NativeModules;

export const shakeServiceBridge = {
  isSupported(): boolean {
    return Platform.OS === 'android' && !!ShakeServiceModule;
  },

  startService(sensitivity: ShakeSensitivity = 'medium'): void {
    if (this.isSupported()) {
      try {
        ShakeServiceModule.startService(sensitivity);
        console.log(`[ShakeServiceBridge] Started native background service with sensitivity=${sensitivity}`);
      } catch (err) {
        console.warn('[ShakeServiceBridge] Failed to start native service:', err);
      }
    } else {
      console.log(`[ShakeServiceBridge] Native background service not available on this platform/environment (${Platform.OS})`);
    }
  },

  stopService(): void {
    if (this.isSupported()) {
      try {
        ShakeServiceModule.stopService();
        console.log('[ShakeServiceBridge] Stopped native background service');
      } catch (err) {
        console.warn('[ShakeServiceBridge] Failed to stop native service:', err);
      }
    }
  },

  updateSensitivity(sensitivity: ShakeSensitivity): void {
    if (this.isSupported()) {
      try {
        if (ShakeServiceModule.updateSensitivity) {
          ShakeServiceModule.updateSensitivity(sensitivity);
        } else {
          // Restart with new sensitivity
          ShakeServiceModule.startService(sensitivity);
        }
      } catch (err) {
        console.warn('[ShakeServiceBridge] Failed to update sensitivity:', err);
      }
    }
  },

  async isRunning(): Promise<boolean> {
    if (this.isSupported()) {
      try {
        return await ShakeServiceModule.isRunning();
      } catch {
        return false;
      }
    }
    return false;
  },
};
