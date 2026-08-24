// NotificationService is intentionally minimal.
// All notification behavior is now handled inside ShakeContext.tsx.
// The app uses a LOW-priority tray notification only as a keep-alive
// so the accelerometer can detect shake when the app is in the background.
// Shake ALWAYS opens a direct modal popup — never a notification popup.
export class NotificationService {}
