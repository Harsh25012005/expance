/**
 * NotificationService — intentionally empty.
 *
 * Background shake detection is now handled by a native Android ForegroundService
 * (ShakeService.kt) that runs the accelerometer at the OS level.
 *
 * The native service communicates with JS via deep links (Linking API),
 * not notifications. See ShakeContext.tsx and shakeServiceBridge.ts.
 */
export class NotificationService {}
