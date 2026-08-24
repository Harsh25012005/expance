/**
 * JS bridge to the native Android ShakeService foreground service.
 *
 * On Android: communicates with ShakeServiceModule (Kotlin) via NativeModules.
 * On iOS/Web: no-op — background shake detection requires native code per platform.
 */
import { NativeModules, Platform } from 'react-native';
import { ShakeSensitivity } from '../types/expense';

const ShakeServiceModule = Platform.OS === 'android'
  ? NativeModules.ShakeServiceModule
  : null;

export const ShakeServiceBridge = {
  /**
   * Start the native foreground service that listens for shake gestures
   * even when the app is in the background.
   */
  start(sensitivity: ShakeSensitivity = 'medium'): void {
    if (ShakeServiceModule) {
      try {
        ShakeServiceModule.startService(sensitivity);
        console.log('[ShakeServiceBridge] Native service started with sensitivity:', sensitivity);
      } catch (e) {
        console.warn('[ShakeServiceBridge] Failed to start native service:', e);
      }
    }
  },

  /**
   * Stop the native foreground service.
   */
  stop(): void {
    if (ShakeServiceModule) {
      try {
        ShakeServiceModule.stopService();
        console.log('[ShakeServiceBridge] Native service stopped');
      } catch (e) {
        console.warn('[ShakeServiceBridge] Failed to stop native service:', e);
      }
    }
  },

  /**
   * Check if the native service is currently running.
   */
  async isRunning(): Promise<boolean> {
    if (ShakeServiceModule) {
      try {
        return await ShakeServiceModule.isRunning();
      } catch {
        return false;
      }
    }
    return false;
  },

  /**
   * Whether the native bridge is available on this platform.
   */
  isAvailable: Platform.OS === 'android' && ShakeServiceModule != null,
};
