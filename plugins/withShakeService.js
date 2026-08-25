/**
 * Expo Config Plugin: withShakeService
 *
 * Injects the native Android ShakeService foreground service, ShakeServiceModule,
 * ShakeServicePackage, and BootReceiver into the generated android/ directory during expo prebuild.
 *
 * This ensures background shake detection works reliably across all Android lifecycle states:
 * - App open / foreground
 * - App backgrounded / minimized
 * - App removed from recent tasks
 * - Device boot / restart
 *
 * Direct bridge to React Native DeviceEventEmitter ("SHAKE_TO_ADD_EXPENSE")
 * so physical shake opens the Add Expense popup immediately without notifications in foreground.
 */
const {
  withAndroidManifest,
  withMainApplication,
  withMainActivity,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// ─── ShakeService.kt source ─────────────────────────────────────────────────
const SHAKE_SERVICE_KT = `package {{PACKAGE}}

import android.app.*
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.Vibrator
import android.os.VibrationEffect
import android.util.Log
import androidx.core.app.NotificationCompat

class ShakeService : Service(), SensorEventListener {
    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var lastShakeTime: Long = 0
    private var lastX = 0f
    private var lastY = 0f
    private var lastZ = 0f
    private var initialized = false

    data class NotificationMessage(val title: String, val body: String)

    companion object {
        private const val TAG = "ShakeService"
        private const val ONGOING_CHANNEL_ID = "shake_service_channel"
        private const val EXPENSE_CHANNEL_ID = "expense_tracking_channel"
        private const val ONGOING_NOTIFICATION_ID = 9001
        private const val NOTIFICATION_BASE_ID = 9100
        private const val SHAKE_DEBOUNCE_MS = 1500L

        private val NOTIFICATION_MESSAGES = arrayOf(
            NotificationMessage("Add an expense", "Tap to quickly record what you just spent."),
            NotificationMessage("Quick expense entry", "Ready to record your latest expense?"),
            NotificationMessage("Record your spending", "Add the expense before you forget it."),
            NotificationMessage("Expense ready to add", "Record your spending in just a few seconds."),
            NotificationMessage("Track your spending", "Tap here to add your expense."),
            NotificationMessage("Quick expense capture", "Keep your spending history up to date."),
            NotificationMessage("Add your latest expense", "Quickly add what you just spent."),
            NotificationMessage("Don't forget this expense", "Your expense tracker is ready for a new entry.")
        )

        private var lastMessageIndex: Int = -1
        private var notificationCounter: Int = 0

        var shakeThreshold: Float = 20.0f
        var isRunning: Boolean = false
            private set
        var isAppInForeground: Boolean = true

        private fun getNextNotificationMessage(): NotificationMessage {
            val size = NOTIFICATION_MESSAGES.size
            var nextIndex = (0 until size).random()
            if (nextIndex == lastMessageIndex && size > 1) {
                nextIndex = (nextIndex + 1) % size
            }
            lastMessageIndex = nextIndex
            return NOTIFICATION_MESSAGES[nextIndex]
        }

        fun start(context: Context, threshold: Float = 20.0f) {
            shakeThreshold = threshold
            val intent = Intent(context, ShakeService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
                Log.d(TAG, "[SHAKE DEBUG] Native ShakeService started with threshold=\$threshold")
            } catch (e: Exception) {
                Log.e(TAG, "[SHAKE DEBUG] Error starting ShakeService", e)
            }
        }

        fun stop(context: Context) {
            try {
                context.stopService(Intent(context, ShakeService::class.java))
                Log.d(TAG, "[SHAKE DEBUG] Native ShakeService stopped")
            } catch (e: Exception) {
                Log.e(TAG, "[SHAKE DEBUG] Error stopping ShakeService", e)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "[SHAKE DEBUG] Sensor service started (native)")
        createNotificationChannels()
        startForeground(ONGOING_NOTIFICATION_ID, createOngoingNotification())

        try {
            val pm = getSystemService(POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ShakeExpense::ShakeSensorWakeLock").apply {
                acquire()
            }
        } catch (e: Exception) {
            Log.e(TAG, "[SHAKE DEBUG] Error acquiring wake lock", e)
        }

        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        if (accelerometer != null) {
            sensorManager?.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_UI)
            Log.d(TAG, "[SHAKE DEBUG] Accelerometer registered (threshold=\$shakeThreshold)")
        } else {
            Log.e(TAG, "[SHAKE DEBUG] No accelerometer sensor found on device")
        }
        isRunning = true
    }

    override fun onDestroy() {
        Log.d(TAG, "[SHAKE DEBUG] ShakeService onDestroy")
        try {
            sensorManager?.unregisterListener(this)
            wakeLock?.let { if (it.isHeld) it.release() }
        } catch (e: Exception) {
            Log.e(TAG, "[SHAKE DEBUG] Error in onDestroy cleanup", e)
        }
        isRunning = false
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(TAG, "[SHAKE DEBUG] App task removed from recents - maintaining service for background shake detection")
        try {
            val restartServiceIntent = Intent(applicationContext, ShakeService::class.java).also {
                it.setPackage(packageName)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(restartServiceIntent)
            } else {
                startService(restartServiceIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "[SHAKE DEBUG] Error restarting service on task removed", e)
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type != Sensor.TYPE_ACCELEROMETER) return
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]

        if (!initialized) {
            lastX = x
            lastY = y
            lastZ = z
            initialized = true
            return
        }

        val deltaX = Math.abs(x - lastX)
        val deltaY = Math.abs(y - lastY)
        val deltaZ = Math.abs(z - lastZ)
        val delta = deltaX + deltaY + deltaZ

        lastX = x
        lastY = y
        lastZ = z

        if (delta > shakeThreshold) {
            val now = System.currentTimeMillis()
            if (now - lastShakeTime > SHAKE_DEBOUNCE_MS) {
                lastShakeTime = now

                // FOREGROUND: open popup directly via JS event
                if (isAppInForeground) {
                    Log.d(TAG, "[SHAKE] DETECTED")
                    Log.d(TAG, "[SHAKE] APP STATE: active")
                    Log.d(TAG, "[SHAKE] Opening Add Expense popup")
                    val emitted = ShakeServiceModule.emitShakeToJS()
                    if (!emitted) {
                        Log.d(TAG, "[SHAKE] JS not ready in foreground, showing notification fallback")
                        showExpenseNotification()
                    }
                    return
                }

                // BACKGROUND / CLOSED: show reliable, curated notification
                Log.d(TAG, "[SHAKE] DETECTED")
                Log.d(TAG, "[SHAKE] APP STATE: background")
                showExpenseNotification()
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun showExpenseNotification() {
        val message = getNextNotificationMessage()
        Log.d(TAG, "[SHAKE] Creating notification")
        Log.d(TAG, "[SHAKE] Notification title: \${message.title}")
        Log.d(TAG, "[SHAKE] Notification body: \${message.body}")

        try {
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(150, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(150)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Vibration failed", e)
        }

        val tapIntent = Intent(this, MainActivity::class.java).apply {
            action = "ADD_EXPENSE"
            data = Uri.parse("expenza://add-expense")
            putExtra("action", "ADD_EXPENSE")
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
        }

        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val contentPendingIntent = PendingIntent.getActivity(this, 101, tapIntent, pendingIntentFlags)

        try {
            val iconRes = resources.getIdentifier("notification_icon", "drawable", packageName)
            val icon = if (iconRes != 0) iconRes else android.R.drawable.ic_input_add

            val notification = NotificationCompat.Builder(this, EXPENSE_CHANNEL_ID)
                .setSmallIcon(icon)
                .setContentTitle(message.title)
                .setContentText(message.body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(contentPendingIntent)
                .setAutoCancel(true)
                .setVibrate(longArrayOf(0, 150, 80, 150))
                .addAction(android.R.drawable.ic_input_add, "Add Expense", contentPendingIntent)
                .build()

            val notificationId = NOTIFICATION_BASE_ID + (notificationCounter++ % 20)
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.notify(notificationId, notification)
        } catch (e: Exception) {
            Log.e(TAG, "[SHAKE] Failed to post expense notification: " + e.javaClass.simpleName + ": " + e.message, e)
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ongoingChannel = NotificationChannel(
                ONGOING_CHANNEL_ID,
                "Shake Service Status",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps background shake detection active"
                setShowBadge(false)
                enableVibration(false)
                enableLights(false)
            }

            val expenseChannel = NotificationChannel(
                EXPENSE_CHANNEL_ID,
                "Expense Tracking",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for quick expense entry."
                setShowBadge(true)
                enableVibration(true)
                enableLights(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }

            val nm = getSystemService(NotificationManager::class.java)
            nm?.createNotificationChannel(ongoingChannel)
            nm?.createNotificationChannel(expenseChannel)
        }
    }

    private fun createOngoingNotification(): Notification {
        val tapIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getActivity(this, 0, tapIntent, flags)
        val iconRes = resources.getIdentifier("notification_icon", "drawable", packageName)
        val icon = if (iconRes != 0) iconRes else android.R.drawable.ic_dialog_info

        return NotificationCompat.Builder(this, ONGOING_CHANNEL_ID)
            .setContentTitle("Shake to Add Active")
            .setContentText("Shake your phone anytime to log an expense")
            .setSmallIcon(icon)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .build()
    }
}
`;

// ─── BootReceiver.kt source ──────────────────────────────────────────────────
const BOOT_RECEIVER_KT = `package {{PACKAGE}}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == Intent.ACTION_BOOT_COMPLETED || action == "android.intent.action.QUICKBOOT_POWERON" || action == "com.htc.intent.action.QUICKBOOT_POWERON") {
            Log.d(TAG, "[SHAKE DEBUG] Device booted (\$action) - starting ShakeService")
            ShakeService.start(context)
        }
    }
}
`;

// ─── ShakeServiceModule.kt source ────────────────────────────────────────────
const SHAKE_SERVICE_MODULE_KT = `package {{PACKAGE}}

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.util.Log

class ShakeServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        private const val TAG = "ShakeServiceModule"
        var reactContextInstance: ReactApplicationContext? = null

        fun emitShakeToJS(): Boolean {
            return try {
                val ctx = reactContextInstance
                if (ctx != null && ctx.hasActiveReactInstance()) {
                    Log.d(TAG, "[SHAKE DEBUG] Native emitting SHAKE_TO_ADD_EXPENSE to React Native DeviceEventEmitter")
                    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("SHAKE_TO_ADD_EXPENSE", null)
                    true
                } else {
                    Log.d(TAG, "[SHAKE DEBUG] React instance not active yet for emit")
                    false
                }
            } catch (e: Exception) {
                Log.e(TAG, "[SHAKE DEBUG] Error emitting to JS", e)
                false
            }
        }
    }

    init {
        reactContextInstance = reactContext
    }

    override fun getName(): String = "ShakeServiceModule"

    @ReactMethod
    fun startService(sensitivity: String) {
        val threshold = when (sensitivity.lowercase()) {
            "low" -> 28.0f
            "medium" -> 20.0f
            "high" -> 14.0f
            else -> 28.0f
        }
        Log.d(TAG, "[SHAKE DEBUG] Starting ShakeService with sensitivity=\$sensitivity (threshold=\$threshold)")
        ShakeService.start(reactApplicationContext, threshold)
    }

    @ReactMethod
    fun stopService() {
        Log.d(TAG, "[SHAKE DEBUG] Stopping ShakeService")
        ShakeService.stop(reactApplicationContext)
    }

    @ReactMethod
    fun updateSensitivity(sensitivity: String) {
        val threshold = when (sensitivity.lowercase()) {
            "low" -> 28.0f
            "medium" -> 20.0f
            "high" -> 14.0f
            else -> 28.0f
        }
        ShakeService.shakeThreshold = threshold
        Log.d(TAG, "[SHAKE DEBUG] Updated ShakeService threshold to \$threshold")
    }

    @ReactMethod
    fun requestAppResume() {
        try {
            Log.d("ShakeService", "[ANDROID SHAKE] DETECTED")
            Log.d("ShakeService", "[ANDROID SHAKE] APP IS BACKGROUND")
            Log.d("ShakeService", "[ANDROID SHAKE] Creating ADD_EXPENSE Intent")
            Log.d("ShakeService", "[ANDROID SHAKE] Target Activity = MainActivity")
            Log.d("ShakeService", "[ANDROID SHAKE] Calling startActivity()")

            val context = reactApplicationContext
            val intent = android.content.Intent(context, MainActivity::class.java).apply {
                action = "ADD_EXPENSE"
                data = android.net.Uri.parse("expenza://add-expense")
                putExtra("action", "ADD_EXPENSE")
                addFlags(
                    android.content.Intent.FLAG_ACTIVITY_NEW_TASK or
                    android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
            }

            context.startActivity(intent)
            Log.d("ShakeService", "[ANDROID SHAKE] startActivity() CALLED")
        } catch (e: Exception) {
            Log.e("ShakeService", "[ANDROID SHAKE] startActivity() FAILED: " + e.javaClass.simpleName + ": " + e.message, e)
        }
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(ShakeService.isRunning)
    }

    @ReactMethod
    fun updateWidgetData(todaySpent: Double, monthlyBudget: Double, monthSpent: Double, currency: String) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(ExpenzaAppWidgetProvider.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            prefs.edit().apply {
                putFloat(ExpenzaAppWidgetProvider.KEY_TODAY_SPENT, todaySpent.toFloat())
                putFloat(ExpenzaAppWidgetProvider.KEY_MONTHLY_BUDGET, monthlyBudget.toFloat())
                putFloat(ExpenzaAppWidgetProvider.KEY_MONTH_SPENT, monthSpent.toFloat())
                putString(ExpenzaAppWidgetProvider.KEY_CURRENCY, currency)
                apply()
            }
            ExpenzaAppWidgetProvider.updateAllWidgets(context)
            Log.d("ShakeServiceModule", "[WIDGET] Successfully updated widget data: today=$todaySpent, budget=$monthlyBudget, month=$monthSpent")
        } catch (e: Exception) {
            Log.e("ShakeServiceModule", "[WIDGET] Error updating widget data", e)
        }
    }

    @ReactMethod
    fun scheduleDailyReminder(hour: Double, minute: Double) {
        try {
            ReminderReceiver.scheduleAlarm(reactApplicationContext, hour.toInt(), minute.toInt())
            Log.d("ShakeServiceModule", "[REMINDER] Native scheduled alarm for $hour:$minute")
        } catch (e: Exception) {
            Log.e("ShakeServiceModule", "[REMINDER] Error scheduling native reminder alarm", e)
        }
    }

    @ReactMethod
    fun cancelDailyReminder() {
        try {
            ReminderReceiver.cancelAlarm(reactApplicationContext)
            Log.d("ShakeServiceModule", "[REMINDER] Native cancelled reminder alarm")
        } catch (e: Exception) {
            Log.e("ShakeServiceModule", "[REMINDER] Error cancelling native reminder alarm", e)
        }
    }
}
`;

// ─── ReminderReceiver.kt source ─────────────────────────────────────────────
const REMINDER_RECEIVER_KT = `package {{PACKAGE}}

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.Calendar

class ReminderReceiver : BroadcastReceiver() {
    companion object {
        const val TAG = "ReminderReceiver"
        const val CHANNEL_ID = "expense_reminders_channel"
        const val NOTIFICATION_ID = 8801
        const val PENDING_INTENT_REQUEST_CODE = 8800

        fun scheduleAlarm(context: Context, hour: Int, minute: Int) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, ReminderReceiver::class.java).apply {
                action = "com.harsh.expense.ACTION_TRIGGER_REMINDER"
                putExtra("hour", hour)
                putExtra("minute", minute)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                PENDING_INTENT_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val calendar = Calendar.getInstance().apply {
                timeInMillis = System.currentTimeMillis()
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                if (timeInMillis <= System.currentTimeMillis()) {
                    add(Calendar.DAY_OF_YEAR, 1)
                }
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.timeInMillis,
                        pendingIntent
                    )
                } else {
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        calendar.timeInMillis,
                        pendingIntent
                    )
                }
                Log.d(TAG, "[REMINDER] Exact alarm scheduled for " + calendar.time)
            } catch (e: Exception) {
                Log.e(TAG, "[REMINDER] Error setting exact alarm", e)
            }
        }

        fun cancelAlarm(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, ReminderReceiver::class.java).apply {
                action = "com.harsh.expense.ACTION_TRIGGER_REMINDER"
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                PENDING_INTENT_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                Log.d(TAG, "[REMINDER] Cancelled reminder alarm")
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "[REMINDER] onReceive triggered at " + java.util.Date())

        val hour = intent.getIntExtra("hour", 20)
        val minute = intent.getIntExtra("minute", 0)

        // Reschedule recurring alarm for tomorrow
        scheduleAlarm(context, hour, minute)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Expense Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Daily reminders to record today's spending."
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 150, 80, 150)
                enableLights(true)
                lightColor = 0xFF4F46E5.toInt()
            }
            notificationManager.createNotificationChannel(channel)
        }

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            action = "com.harsh.expense.ACTION_ADD_EXPENSE"
            data = Uri.parse("expenza://add-expense")
            putExtra("action", "ADD_EXPENSE")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            8802,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Add today's expense")
            .setContentText("You haven't recorded an expense today. Add anything you spent today.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent)
            .addAction(0, "+ Add Expense", pendingIntent)
            .build()

        notificationManager.notify(NOTIFICATION_ID, notification)
        Log.d(TAG, "[REMINDER] Posted reminder notification successfully")
    }
}
`;

// ─── ExpenzaAppWidgetProvider.kt source ─────────────────────────────────────
const EXPENZA_APP_WIDGET_PROVIDER_KT = `package {{PACKAGE}}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ExpenzaAppWidgetProvider : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "expenza_widget_data"
        const val KEY_TODAY_SPENT = "today_spent"
        const val KEY_MONTHLY_BUDGET = "monthly_budget"
        const val KEY_MONTH_SPENT = "month_spent"
        const val KEY_CURRENCY = "currency"

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, ExpenzaAppWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                val provider = ExpenzaAppWidgetProvider()
                provider.onUpdate(context, appWidgetManager, appWidgetIds)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val todaySpent = prefs.getFloat(KEY_TODAY_SPENT, 0f).toDouble()
        val monthlyBudget = prefs.getFloat(KEY_MONTHLY_BUDGET, 0f).toDouble()
        val monthSpent = prefs.getFloat(KEY_MONTH_SPENT, 0f).toDouble()
        val currency = prefs.getString(KEY_CURRENCY, "₹") ?: "₹"

        val dateFormat = SimpleDateFormat("EEEE, MMM d", Locale.getDefault())
        val formattedDate = dateFormat.format(Date())

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_expenza)

            // 1. Set Date
            views.setTextViewText(R.id.widget_date, formattedDate)

            // 2. Set Today's Spending
            val todayStr = String.format(Locale.getDefault(), "%s%,.2f", currency, todaySpent)
            views.setTextViewText(R.id.widget_today_spent, todayStr)

            // 3. Set Monthly Budget / Remaining
            if (monthlyBudget > 0) {
                val remaining = monthlyBudget - monthSpent
                if (remaining >= 0) {
                    views.setTextViewText(R.id.widget_budget_label, "REMAINING BUDGET")
                    val remStr = String.format(Locale.getDefault(), "%s%,.0f left", currency, remaining)
                    views.setTextViewText(R.id.widget_budget_value, remStr)
                    views.setTextColor(R.id.widget_budget_value, 0xFF4F46E5.toInt())
                } else {
                    views.setTextViewText(R.id.widget_budget_label, "OVER BUDGET")
                    val overStr = String.format(Locale.getDefault(), "%s%,.0f over", currency, Math.abs(remaining))
                    views.setTextViewText(R.id.widget_budget_value, overStr)
                    views.setTextColor(R.id.widget_budget_value, 0xFFDC2626.toInt())
                }
            } else {
                views.setTextViewText(R.id.widget_budget_label, "THIS MONTH")
                val monthStr = String.format(Locale.getDefault(), "%s%,.2f", currency, monthSpent)
                views.setTextViewText(R.id.widget_budget_value, monthStr)
                views.setTextColor(R.id.widget_budget_value, 0xFF737373.toInt())
            }

            // 4. Click Entire Widget -> Launch App Home
            val openAppIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val openAppPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, openAppPendingIntent)

            // 5. Click '+ Add' Button -> Direct deep link to Add Expense
            val addExpenseIntent = Intent(context, MainActivity::class.java).apply {
                action = "com.harsh.expense.ACTION_ADD_EXPENSE"
                data = Uri.parse("expenza://add-expense")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("action", "ADD_EXPENSE")
            }
            val addExpensePendingIntent = PendingIntent.getActivity(
                context,
                1,
                addExpenseIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_add, addExpensePendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
`;

// ─── Widget XML Sources ──────────────────────────────────────────────────────
const WIDGET_BACKGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <corners android:radius="18dp" />
    <stroke
        android:width="1dp"
        android:color="#E7E7E4" />
</shape>`;

const WIDGET_BTN_BG_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#4F46E5" />
    <corners android:radius="8dp" />
</shape>`;

const WIDGET_ICON_BADGE_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#EEF2FF" />
    <corners android:radius="6dp" />
</shape>`;

const WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="220dp"
    android:minHeight="90dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_expenza"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>`;

const WIDGET_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="16dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:id="@+id/widget_title"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Expenza"
                android:textColor="#171717"
                android:textSize="14sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_date"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Today"
                android:textColor="#737373"
                android:textSize="11sp"
                android:layout_marginTop="1dp" />
        </LinearLayout>

        <LinearLayout
            android:id="@+id/widget_btn_add"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/widget_btn_bg"
            android:gravity="center"
            android:paddingStart="12dp"
            android:paddingTop="7dp"
            android:paddingEnd="12dp"
            android:paddingBottom="7dp">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="+ Add"
                android:textColor="#FFFFFF"
                android:textSize="12sp"
                android:textStyle="bold" />
        </LinearLayout>
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="14dp"
        android:gravity="center_vertical">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="TODAY'S SPENT"
                android:textColor="#737373"
                android:textSize="10sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_today_spent"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="₹0.00"
                android:textColor="#171717"
                android:textSize="18sp"
                android:textStyle="bold"
                android:layout_marginTop="2dp" />
        </LinearLayout>

        <View
            android:layout_width="1dp"
            android:layout_height="32dp"
            android:background="#E7E7E4"
            android:layout_marginStart="12dp"
            android:layout_marginEnd="12dp" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:id="@+id/widget_budget_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="MONTHLY BUDGET"
                android:textColor="#737373"
                android:textSize="10sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_budget_value"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="No target set"
                android:textColor="#4F46E5"
                android:textSize="14sp"
                android:textStyle="bold"
                android:layout_marginTop="2dp" />
        </LinearLayout>
    </LinearLayout>

</LinearLayout>`;

// ─── ShakeServicePackage.kt source ───────────────────────────────────────────
const SHAKE_SERVICE_PACKAGE_KT = `package {{PACKAGE}}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ShakeServicePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ShakeServiceModule(reactContext))
    }
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
`;

// ─── Helper: resolve package directory path ──────────────────────────────────
function getPackageDirPath(config) {
  const pkg =
    config.android?.package || config.extra?.eas?.projectId || "com.harsh.expense";
  const pkgDir = path.join(...pkg.split("."));
  return { pkg, pkgDir };
}

// ─── 1. Write Kotlin and Resource files during prebuild ──────────────────────
function withShakeServiceFiles(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const { pkg, pkgDir } = getPackageDirPath(config);
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res"
      );
      const javaDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        pkgDir
      );

      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(path.join(resDir, "layout"), { recursive: true });
      fs.mkdirSync(path.join(resDir, "xml"), { recursive: true });
      fs.mkdirSync(path.join(resDir, "drawable"), { recursive: true });

      const files = {
        "ShakeService.kt": SHAKE_SERVICE_KT,
        "BootReceiver.kt": BOOT_RECEIVER_KT,
        "ShakeServiceModule.kt": SHAKE_SERVICE_MODULE_KT,
        "ShakeServicePackage.kt": SHAKE_SERVICE_PACKAGE_KT,
        "ExpenzaAppWidgetProvider.kt": EXPENZA_APP_WIDGET_PROVIDER_KT,
        "ReminderReceiver.kt": REMINDER_RECEIVER_KT,
      };

      for (const [filename, content] of Object.entries(files)) {
        const filepath = path.join(javaDir, filename);
        fs.writeFileSync(filepath, content.replace(/\{\{PACKAGE\}\}/g, pkg));
        console.log(`[withShakeService] Wrote ${filepath}`);
      }

      // Write layout, xml and drawable files
      const resFiles = [
        { path: path.join(resDir, "xml", "expenza_widget_info.xml"), content: WIDGET_INFO_XML },
        { path: path.join(resDir, "layout", "widget_expenza.xml"), content: WIDGET_LAYOUT_XML },
        { path: path.join(resDir, "drawable", "widget_background.xml"), content: WIDGET_BACKGROUND_XML },
        { path: path.join(resDir, "drawable", "widget_btn_bg.xml"), content: WIDGET_BTN_BG_XML },
        { path: path.join(resDir, "drawable", "widget_icon_badge.xml"), content: WIDGET_ICON_BADGE_XML },
      ];

      for (const { path: rPath, content } of resFiles) {
        fs.writeFileSync(rPath, content);
        console.log(`[withShakeService] Wrote resource ${rPath}`);
      }

      return config;
    },
  ]);
}

// ─── 2. Register ShakeService and permissions in AndroidManifest.xml ─────────
function withShakeServiceManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return config;

    const services = app.service || [];
    const alreadyExists = services.some(
      (s) => s.$?.["android:name"] === ".ShakeService"
    );

    if (!alreadyExists) {
      services.push({
        $: {
          "android:name": ".ShakeService",
          "android:exported": "false",
          "android:foregroundServiceType": "specialUse",
        },
        property: [
          {
            $: {
              "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
              "android:value":
                "Accelerometer-based shake gesture detection for instant expense logging while app is in background",
            },
          },
        ],
      });
      app.service = services;
      console.log("[withShakeService] Registered ShakeService in AndroidManifest.xml");
    }

    // Register BootReceiver
    const receivers = app.receiver || [];
    const receiverExists = receivers.some(
      (r) => r.$?.["android:name"] === ".BootReceiver"
    );

    if (!receiverExists) {
      receivers.push({
        $: {
          "android:name": ".BootReceiver",
          "android:enabled": "true",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
              { $: { "android:name": "android.intent.action.QUICKBOOT_POWERON" } },
              { $: { "android:name": "com.htc.intent.action.QUICKBOOT_POWERON" } },
            ],
          },
        ],
      });
      app.receiver = receivers;
      console.log("[withShakeService] Registered BootReceiver in AndroidManifest.xml");
    }

    // Register ExpenzaAppWidgetProvider
    const widgetReceiverExists = receivers.some(
      (r) => r.$?.["android:name"] === ".ExpenzaAppWidgetProvider"
    );

    if (!widgetReceiverExists) {
      receivers.push({
        $: {
          "android:name": ".ExpenzaAppWidgetProvider",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/expenza_widget_info",
            },
          },
        ],
      });
      app.receiver = receivers;
      console.log("[withShakeService] Registered ExpenzaAppWidgetProvider in AndroidManifest.xml");
    }

    // Register ReminderReceiver
    const reminderReceiverExists = receivers.some(
      (r) => r.$?.["android:name"] === ".ReminderReceiver"
    );

    if (!reminderReceiverExists) {
      receivers.push({
        $: {
          "android:name": ".ReminderReceiver",
          "android:exported": "false",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "com.harsh.expense.ACTION_TRIGGER_REMINDER" } },
            ],
          },
        ],
      });
      app.receiver = receivers;
      console.log("[withShakeService] Registered ReminderReceiver in AndroidManifest.xml");
    }

    const permissions = manifest.manifest["uses-permission"] || [];
    const requiredPermissions = [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
      "android.permission.WAKE_LOCK",
      "android.permission.VIBRATE",
      "android.permission.USE_FULL_SCREEN_INTENT",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.SCHEDULE_EXACT_ALARM",
      "android.permission.USE_EXACT_ALARM",
    ];

    for (const perm of requiredPermissions) {
      const exists = permissions.some((p) => p.$?.["android:name"] === perm);
      if (!exists) {
        permissions.push({
          $: { "android:name": perm },
        });
      }
    }
    manifest.manifest["uses-permission"] = permissions;

    return config;
  });
}

// ─── 3. Register ShakeServicePackage in MainApplication ──────────────────────
function withShakeServiceMainApplication(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("ShakeServicePackage")) {
      contents = contents.replace(
        /\/\/ Packages that cannot be autolinked yet can be added manually here.*\n.*\/\/ add\(MyReactNativePackage\(\)\)/,
        `// Packages that cannot be autolinked yet can be added manually here, for example:\n          // add(MyReactNativePackage())\n          add(ShakeServicePackage())`
      );
      config.modResults.contents = contents;
      console.log("[withShakeService] Added ShakeServicePackage to MainApplication");
    }

    return config;
  });
}

// ─── 4. Add onNewIntent to MainActivity ──────────────────────────────────────
function withShakeServiceMainActivity(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("onNewIntent")) {
      if (!contents.includes("import android.content.Intent")) {
        contents = contents.replace(
          "import android.os.Bundle",
          "import android.content.Intent\nimport android.os.Bundle"
        );
      }
      if (!contents.includes("import android.util.Log")) {
        contents = contents.replace(
          "import android.os.Bundle",
          "import android.os.Bundle\nimport android.util.Log"
        );
      }

      const onCreateEnd = contents.indexOf("super.onCreate(null)");
      if (onCreateEnd !== -1) {
        const insertPos = contents.indexOf("}", onCreateEnd) + 1;
        const onNewIntentMethod = `

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleLaunchIntent(intent, "onNewIntent")
  }

  private fun handleLaunchIntent(intent: Intent?, source: String) {
    if (intent == null) return
    val uri = intent.dataString
    val action = intent.getStringExtra("action") ?: intent.action
    if (action == "ADD_EXPENSE" || (uri != null && (uri.contains("add-expense") || uri.contains("shake-open") || uri.contains("expenza://")))) {
      Log.d("MainActivity", "[SHAKE] Notification tapped")
      Log.d("MainActivity", "[SHAKE] ADD_EXPENSE action requested")
      Log.d("MainActivity", "[SHAKE] Opening Add Expense")
      ShakeServiceModule.emitShakeToJS()
    }
  }`;
        contents =
          contents.slice(0, insertPos) +
          onNewIntentMethod +
          contents.slice(insertPos);
      }

      config.modResults.contents = contents;
      console.log("[withShakeService] Added onNewIntent to MainActivity");
    }

    return config;
  });
}

// ─── Export combined plugin ──────────────────────────────────────────────────
function withShakeService(config) {
  config = withShakeServiceFiles(config);
  config = withShakeServiceManifest(config);
  config = withShakeServiceMainApplication(config);
  config = withShakeServiceMainActivity(config);
  return config;
}

module.exports = withShakeService;
