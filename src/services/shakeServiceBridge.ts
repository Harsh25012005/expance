import { NativeModules, Platform } from 'react-native';
import { ShakeSensitivity } from '../types/expense';

const { ShakeServiceModule } = NativeModules;

let isServiceRunningLocally = false;
let currentServiceSensitivity: ShakeSensitivity | null = null;

export const shakeServiceBridge = {
  isSupported(): boolean {
    return Platform.OS === 'android' && !!ShakeServiceModule;
  },

  startService(sensitivity: ShakeSensitivity = 'low'): void {
    if (this.isSupported()) {
      if (isServiceRunningLocally && currentServiceSensitivity === sensitivity) {
        return; // Idempotent: already running with desired sensitivity
      }
      try {
        ShakeServiceModule.startService(sensitivity);
        isServiceRunningLocally = true;
        currentServiceSensitivity = sensitivity;
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
        isServiceRunningLocally = false;
        currentServiceSensitivity = null;
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
          currentServiceSensitivity = sensitivity;
        } else {
          // Restart with new sensitivity
          ShakeServiceModule.startService(sensitivity);
          isServiceRunningLocally = true;
          currentServiceSensitivity = sensitivity;
        }
      } catch (err) {
        console.warn('[ShakeServiceBridge] Failed to update sensitivity:', err);
      }
    }
  },

  setAppForeground(isForeground: boolean): void {
    if (this.isSupported()) {
      try {
        if (ShakeServiceModule.setAppForeground) {
          ShakeServiceModule.setAppForeground(isForeground);
        }
      } catch (err) {
        console.warn('[ShakeServiceBridge] Failed to set app foreground state:', err);
      }
    }
  },

  requestAppResume(): void {
    if (this.isSupported()) {
      try {
        if (ShakeServiceModule.requestAppResume) {
          ShakeServiceModule.requestAppResume();
        }
      } catch (err) {
        console.warn('[ShakeServiceBridge] Failed to request app resume:', err);
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
