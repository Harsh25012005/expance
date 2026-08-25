/**
 * Expo Config Plugin: withShakeService
 *
 * Injects the native Android ShakeService foreground service, ShakeServiceModule,
 * ShakeServicePackage, BootReceiver, ReminderReceiver, and 6 Home Screen AppWidgets:
 * 1. Total Spent & Budget (ExpenzaAppWidgetProvider)
 * 2. Today's Spending (TodaySpendingWidgetProvider)
 * 3. Monthly Budget Progress (MonthlyBudgetWidgetProvider)
 * 4. Quick Add Action (QuickAddWidgetProvider)
 * 5. Where Did It Go? Spending Breakdown (WhereDidItGoWidgetProvider)
 * 6. Money Mood / Spending Status (MoneyMoodWidgetProvider)
 *
 * Configures output APK naming to Expenza-v1.0.0.apk and handles all native lifecycles.
 */
const {
  withAndroidManifest,
  withMainApplication,
  withMainActivity,
  withAppBuildGradle,
  withStringsXml,
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
        private const val SHAKE_DEBOUNCE_MS = 2000L

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

        var shakeThreshold: Float = 24.0f
        var isRunning: Boolean = false
            private set

        var isAppInForeground: Boolean = false

        private fun getNextNotificationMessage(): NotificationMessage {
            val size = NOTIFICATION_MESSAGES.size
            var nextIndex = (0 until size).random()
            if (nextIndex == lastMessageIndex && size > 1) {
                nextIndex = (nextIndex + 1) % size
            }
            lastMessageIndex = nextIndex
            return NOTIFICATION_MESSAGES[nextIndex]
        }

        fun start(context: Context, threshold: Float = 24.0f) {
            shakeThreshold = threshold
            val intent = Intent(context, ShakeService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
                Log.d(TAG, "Native ShakeService start requested with threshold=$threshold")
            } catch (e: Exception) {
                Log.e(TAG, "Error starting ShakeService", e)
            }
        }

        fun stop(context: Context) {
            try {
                context.stopService(Intent(context, ShakeService::class.java))
                Log.d(TAG, "Native ShakeService stopped")
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping ShakeService", e)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Sensor service onCreate (native foreground service)")
        createNotificationChannels()
        startForeground(ONGOING_NOTIFICATION_ID, createOngoingNotification())

        try {
            val pm = getSystemService(POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Expenza::ShakeSensorWakeLock").apply {
                acquire()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error acquiring wake lock", e)
        }

        registerSensorListener()
        isRunning = true
    }

    private fun registerSensorListener() {
        if (sensorManager == null) {
            sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        }
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        if (accelerometer != null) {
            sensorManager?.unregisterListener(this)
            sensorManager?.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_UI)
            Log.d(TAG, "Accelerometer registered with threshold=$shakeThreshold")
        } else {
            Log.e(TAG, "No accelerometer sensor found on device")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "ShakeService onStartCommand")
        registerSensorListener()
        return START_STICKY
    }

    override fun onDestroy() {
        Log.d(TAG, "ShakeService onDestroy")
        try {
            sensorManager?.unregisterListener(this)
            wakeLock?.let { if (it.isHeld) it.release() }
        } catch (e: Exception) {
            Log.e(TAG, "Error in onDestroy cleanup", e)
        }
        isRunning = false
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(TAG, "App task removed from recents - maintaining service for background shake detection")
        isAppInForeground = false
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
            Log.e(TAG, "Error maintaining service on task removed", e)
        }
        super.onTaskRemoved(rootIntent)
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
                    Log.d(TAG, "[SHAKE] DETECTED (app foreground)")
                    val emitted = ShakeServiceModule.emitShakeToJS()
                    if (!emitted) {
                        Log.d(TAG, "[SHAKE] JS not ready in foreground, showing notification fallback")
                        showExpenseNotification()
                    }
                    return
                }

                // BACKGROUND / CLOSED APP: show native curated notification directly
                Log.d(TAG, "[SHAKE] DETECTED (app closed/background)")
                showExpenseNotification()
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun showExpenseNotification() {
        val message = getNextNotificationMessage()
        Log.d(TAG, "[SHAKE] Posting notification: " + message.title + " - " + message.body)

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
            val icon = R.mipmap.ic_launcher

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
            Log.e(TAG, "Failed to post expense notification", e)
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
        val icon = R.mipmap.ic_launcher

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
            Log.d(TAG, "Device booted ($action) - starting ShakeService")
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
                    Log.d(TAG, "Emitting SHAKE_TO_ADD_EXPENSE to React Native DeviceEventEmitter")
                    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("SHAKE_TO_ADD_EXPENSE", null)
                    true
                } else {
                    Log.d(TAG, "React instance not active for direct JS emit")
                    false
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error emitting to JS", e)
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
            "low" -> 32.0f
            "medium" -> 24.0f
            "high" -> 16.0f
            else -> 32.0f
        }
        Log.d(TAG, "startService called with sensitivity=$sensitivity (threshold=$threshold)")
        ShakeService.start(reactApplicationContext, threshold)
    }

    @ReactMethod
    fun stopService() {
        Log.d(TAG, "stopService called")
        ShakeService.stop(reactApplicationContext)
    }

    @ReactMethod
    fun updateSensitivity(sensitivity: String) {
        val threshold = when (sensitivity.lowercase()) {
            "low" -> 32.0f
            "medium" -> 24.0f
            "high" -> 16.0f
            else -> 32.0f
        }
        ShakeService.shakeThreshold = threshold
        Log.d(TAG, "updateSensitivity updated threshold to $threshold")
    }

    @ReactMethod
    fun setAppForeground(isForeground: Boolean) {
        ShakeService.isAppInForeground = isForeground
        Log.d(TAG, "setAppForeground called with isForeground=$isForeground")
    }

    @ReactMethod
    fun requestAppResume() {
        try {
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
            Log.d(TAG, "requestAppResume started MainActivity")
        } catch (e: Exception) {
            Log.e(TAG, "requestAppResume failed", e)
        }
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(ShakeService.isRunning)
    }

    @ReactMethod
    fun updateWidgetData(
        todaySpent: Double,
        todayCount: Double,
        todayTopCat: String,
        monthlyBudget: Double,
        monthSpent: Double,
        monthName: String,
        currency: String,
        cat1Name: String,
        cat1Amount: Double,
        cat1Pct: Double,
        cat2Name: String,
        cat2Amount: Double,
        cat2Pct: Double,
        cat3Name: String,
        cat3Amount: Double,
        cat3Pct: Double,
        moodStatus: String,
        moodSubtitle: String,
        moodPct: Double
    ) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(ExpenzaAppWidgetProvider.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            prefs.edit().apply {
                putFloat(ExpenzaAppWidgetProvider.KEY_TODAY_SPENT, todaySpent.toFloat())
                putInt(ExpenzaAppWidgetProvider.KEY_TODAY_COUNT, todayCount.toInt())
                putString(ExpenzaAppWidgetProvider.KEY_TODAY_TOP_CAT, todayTopCat)
                putFloat(ExpenzaAppWidgetProvider.KEY_MONTHLY_BUDGET, monthlyBudget.toFloat())
                putFloat(ExpenzaAppWidgetProvider.KEY_MONTH_SPENT, monthSpent.toFloat())
                putString(ExpenzaAppWidgetProvider.KEY_MONTH_NAME, monthName)
                putString(ExpenzaAppWidgetProvider.KEY_CURRENCY, currency)

                putString(ExpenzaAppWidgetProvider.KEY_CAT1_NAME, cat1Name)
                putFloat(ExpenzaAppWidgetProvider.KEY_CAT1_AMOUNT, cat1Amount.toFloat())
                putInt(ExpenzaAppWidgetProvider.KEY_CAT1_PCT, cat1Pct.toInt())

                putString(ExpenzaAppWidgetProvider.KEY_CAT2_NAME, cat2Name)
                putFloat(ExpenzaAppWidgetProvider.KEY_CAT2_AMOUNT, cat2Amount.toFloat())
                putInt(ExpenzaAppWidgetProvider.KEY_CAT2_PCT, cat2Pct.toInt())

                putString(ExpenzaAppWidgetProvider.KEY_CAT3_NAME, cat3Name)
                putFloat(ExpenzaAppWidgetProvider.KEY_CAT3_AMOUNT, cat3Amount.toFloat())
                putInt(ExpenzaAppWidgetProvider.KEY_CAT3_PCT, cat3Pct.toInt())

                putString(ExpenzaAppWidgetProvider.KEY_MOOD_STATUS, moodStatus)
                putString(ExpenzaAppWidgetProvider.KEY_MOOD_SUBTITLE, moodSubtitle)
                putInt(ExpenzaAppWidgetProvider.KEY_MOOD_PCT, moodPct.toInt())
                apply()
            }
            ExpenzaAppWidgetProvider.updateAllWidgets(context)
            Log.d(TAG, "Successfully synced enriched widget data: today=$todaySpent, month=$monthSpent, budget=$monthlyBudget")
        } catch (e: Exception) {
            Log.e(TAG, "Error updating widget data", e)
        }
    }

    @ReactMethod
    fun scheduleDailyReminder(hour: Double, minute: Double) {
        try {
            ReminderReceiver.scheduleAlarm(reactApplicationContext, hour.toInt(), minute.toInt())
            Log.d(TAG, "Native scheduled exact alarm for \${hour.toInt()}:\${minute.toInt()}")
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling native reminder alarm", e)
        }
    }

    @ReactMethod
    fun cancelDailyReminder() {
        try {
            ReminderReceiver.cancelAlarm(reactApplicationContext)
            Log.d(TAG, "Native cancelled reminder alarm")
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling native reminder alarm", e)
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

        scheduleAlarm(context, hour, minute)

        val prefs = context.getSharedPreferences(ExpenzaAppWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
        val todayCount = prefs.getInt(ExpenzaAppWidgetProvider.KEY_TODAY_COUNT, 0)

        if (todayCount > 0) {
            Log.d(TAG, "[REMINDER] User has already logged $todayCount expenses today. Skipping reminder notification.")
            return
        }

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
            action = "ADD_EXPENSE"
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
            .addAction(android.R.drawable.ic_input_add, "Add Expense", pendingIntent)
            .build()

        notificationManager.notify(NOTIFICATION_ID, notification)
        Log.d(TAG, "[REMINDER] Posted daily reminder notification successfully")
    }
}
`;

// ─── TodaySpendingWidgetProvider.kt source ──────────────────────────────────
const TODAY_SPENDING_WIDGET_PROVIDER_KT = `package {{PACKAGE}}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import java.util.Locale

class TodaySpendingWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "TodaySpendingWidget"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, TodaySpendingWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                    val provider = TodaySpendingWidgetProvider()
                    provider.onUpdate(context, appWidgetManager, appWidgetIds)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating today spending widgets", e)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(ExpenzaAppWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
        val todaySpent = prefs.getFloat(ExpenzaAppWidgetProvider.KEY_TODAY_SPENT, 0f).toDouble()
        val todayCount = prefs.getInt(ExpenzaAppWidgetProvider.KEY_TODAY_COUNT, 0)
        val todayTopCat = prefs.getString(ExpenzaAppWidgetProvider.KEY_TODAY_TOP_CAT, "") ?: ""
        val currency = prefs.getString(ExpenzaAppWidgetProvider.KEY_CURRENCY, "₹") ?: "₹"

        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val openTodayIntent = Intent(context, MainActivity::class.java).apply {
            action = "VIEW_TODAY_EXPENSES"
            data = Uri.parse("expenza://today")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("action", "VIEW_TODAY_EXPENSES")
        }
        val pendingIntent = PendingIntent.getActivity(context, 201, openTodayIntent, pendingFlags)

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_today_spending)

                val amountStr = if (todaySpent == 0.0) {
                    "\${currency}0"
                } else if (todaySpent == todaySpent.toLong().toDouble()) {
                    String.format(Locale.getDefault(), "%s%,d", currency, todaySpent.toLong())
                } else {
                    String.format(Locale.getDefault(), "%s%,.2f", currency, todaySpent)
                }
                views.setTextViewText(R.id.widget_today_amount, amountStr)

                val countStr = when (todayCount) {
                    0 -> "No expenses today"
                    1 -> "1 expense"
                    else -> "$todayCount expenses"
                }
                views.setTextViewText(R.id.widget_today_count, countStr)

                views.setTextViewText(R.id.widget_today_subbreakdown, todayTopCat)

                views.setOnClickPendingIntent(R.id.widget_today_root, pendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering TodaySpendingWidget", e)
            }
        }
    }
}
`;

// ─── MonthlyBudgetWidgetProvider.kt source ──────────────────────────────────
const MONTHLY_BUDGET_WIDGET_PROVIDER_KT = `package {{PACKAGE}}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import java.util.Locale
import kotlin.math.abs
import kotlin.math.min

class MonthlyBudgetWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "MonthlyBudgetWidget"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, MonthlyBudgetWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                    val provider = MonthlyBudgetWidgetProvider()
                    provider.onUpdate(context, appWidgetManager, appWidgetIds)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating monthly budget widgets", e)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(ExpenzaAppWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
        val monthlyBudget = prefs.getFloat(ExpenzaAppWidgetProvider.KEY_MONTHLY_BUDGET, 0f).toDouble()
        val monthSpent = prefs.getFloat(ExpenzaAppWidgetProvider.KEY_MONTH_SPENT, 0f).toDouble()
        val currency = prefs.getString(ExpenzaAppWidgetProvider.KEY_CURRENCY, "₹") ?: "₹"

        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val openBudgetIntent = Intent(context, MainActivity::class.java).apply {
            action = "OPEN_SET_BUDGET"
            data = Uri.parse("expenza://set-budget")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("action", "OPEN_SET_BUDGET")
        }
        val pendingIntent = PendingIntent.getActivity(context, 202, openBudgetIntent, pendingFlags)

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_monthly_budget)

                if (monthlyBudget > 0) {
                    val remaining = monthlyBudget - monthSpent
                    val percentage = ((monthSpent / monthlyBudget) * 100).toInt()
                    val progressVal = min(percentage, 100)

                    val spentFormatted = String.format(Locale.getDefault(), "%s%,d", currency, monthSpent.toLong())
                    val budgetFormatted = String.format(Locale.getDefault(), "%s%,d", currency, monthlyBudget.toLong())
                    val valuesStr = "$spentFormatted / $budgetFormatted"
                    views.setTextViewText(R.id.widget_budget_values, valuesStr)

                    views.setProgressBar(R.id.widget_budget_circle_progress, 100, progressVal, false)
                    views.setTextViewText(R.id.widget_budget_circle_pct, "$percentage%")

                    if (remaining >= 0) {
                        val leftFormatted = String.format(Locale.getDefault(), "%s%,d", currency, remaining.toLong())
                        views.setTextViewText(R.id.widget_budget_subtext, "$leftFormatted left")
                        views.setTextColor(R.id.widget_budget_subtext, 0xFF4F46E5.toInt())
                    } else {
                        val overFormatted = String.format(Locale.getDefault(), "%s%,d", currency, abs(remaining).toLong())
                        views.setTextViewText(R.id.widget_budget_subtext, "$overFormatted over budget")
                        views.setTextColor(R.id.widget_budget_subtext, 0xFFDC2626.toInt())
                    }
                } else {
                    views.setTextViewText(R.id.widget_budget_values, "Set your budget")
                    views.setProgressBar(R.id.widget_budget_circle_progress, 100, 0, false)
                    views.setTextViewText(R.id.widget_budget_circle_pct, "0%")
                    views.setTextViewText(R.id.widget_budget_subtext, "Tap to set monthly target")
                    views.setTextColor(R.id.widget_budget_subtext, 0xFF4F46E5.toInt())
                }

                views.setOnClickPendingIntent(R.id.widget_budget_root, pendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering MonthlyBudgetWidget", e)
            }
        }
    }
}
`;

// ─── QuickAddWidgetProvider.kt source ───────────────────────────────────────
const QUICK_ADD_WIDGET_PROVIDER_KT = `package {{PACKAGE}}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import android.widget.RemoteViews

class QuickAddWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "QuickAddWidget"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, QuickAddWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                    val provider = QuickAddWidgetProvider()
                    provider.onUpdate(context, appWidgetManager, appWidgetIds)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating quick add widgets", e)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val addExpenseIntent = Intent(context, MainActivity::class.java).apply {
            action = "ADD_EXPENSE"
            data = Uri.parse("expenza://add-expense")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("action", "ADD_EXPENSE")
        }
        val pendingIntent = PendingIntent.getActivity(context, 203, addExpenseIntent, pendingFlags)

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_quick_add)
                views.setOnClickPendingIntent(R.id.widget_quick_add_root, pendingIntent)
                views.setOnClickPendingIntent(R.id.widget_quick_add_btn, pendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering QuickAddWidget", e)
            }
        }
    }
}
`;

// ─── WhereDidItGoWidgetProvider.kt source ───────────────────────────────────
const WHERE_DID_IT_GO_WIDGET_PROVIDER_KT = `package {{PACKAGE}}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import java.util.Locale

class WhereDidItGoWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "WhereDidItGoWidget"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, WhereDidItGoWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                    val provider = WhereDidItGoWidgetProvider()
                    provider.onUpdate(context, appWidgetManager, appWidgetIds)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating where did it go widgets", e)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(ExpenzaAppWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
        val monthName = prefs.getString(ExpenzaAppWidgetProvider.KEY_MONTH_NAME, "This Month") ?: "This Month"
        val currency = prefs.getString(ExpenzaAppWidgetProvider.KEY_CURRENCY, "₹") ?: "₹"

        val cat1Name = prefs.getString(ExpenzaAppWidgetProvider.KEY_CAT1_NAME, "") ?: ""
        val cat1Amount = prefs.getFloat(ExpenzaAppWidgetProvider.KEY_CAT1_AMOUNT, 0f).toDouble()
        val cat1Pct = prefs.getInt(ExpenzaAppWidgetProvider.KEY_CAT1_PCT, 0)

        val cat2Name = prefs.getString(ExpenzaAppWidgetProvider.KEY_CAT2_NAME, "") ?: ""
        val cat2Amount = prefs.getFloat(ExpenzaAppWidgetProvider.KEY_CAT2_AMOUNT, 0f).toDouble()
        val cat2Pct = prefs.getInt(ExpenzaAppWidgetProvider.KEY_CAT2_PCT, 0)

        val cat3Name = prefs.getString(ExpenzaAppWidgetProvider.KEY_CAT3_NAME, "") ?: ""
        val cat3Amount = prefs.getFloat(ExpenzaAppWidgetProvider.KEY_CAT3_AMOUNT, 0f).toDouble()
        val cat3Pct = prefs.getInt(ExpenzaAppWidgetProvider.KEY_CAT3_PCT, 0)

        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            action = "VIEW_ANALYTICS"
            data = Uri.parse("expenza://breakdown")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("action", "VIEW_ANALYTICS")
        }
        val pendingIntent = PendingIntent.getActivity(context, 204, openAppIntent, pendingFlags)

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_where_did_it_go)
                views.setTextViewText(R.id.widget_breakdown_month, monthName)

                if (cat1Name.isEmpty() && cat2Name.isEmpty() && cat3Name.isEmpty()) {
                    views.setViewVisibility(R.id.widget_breakdown_empty, View.VISIBLE)
                    views.setViewVisibility(R.id.widget_breakdown_list, View.GONE)
                } else {
                    views.setViewVisibility(R.id.widget_breakdown_empty, View.GONE)
                    views.setViewVisibility(R.id.widget_breakdown_list, View.VISIBLE)

                    // Cat 1
                    if (cat1Name.isNotEmpty()) {
                        views.setViewVisibility(R.id.widget_cat1_row, View.VISIBLE)
                        views.setTextViewText(R.id.widget_cat1_name, cat1Name)
                        val amountFormatted = String.format(Locale.getDefault(), "%s%,d", currency, cat1Amount.toLong())
                        views.setTextViewText(R.id.widget_cat1_amount, amountFormatted)
                        views.setProgressBar(R.id.widget_cat1_bar, 100, cat1Pct, false)
                    } else {
                        views.setViewVisibility(R.id.widget_cat1_row, View.GONE)
                    }

                    // Cat 2
                    if (cat2Name.isNotEmpty()) {
                        views.setViewVisibility(R.id.widget_cat2_row, View.VISIBLE)
                        views.setTextViewText(R.id.widget_cat2_name, cat2Name)
                        val amountFormatted = String.format(Locale.getDefault(), "%s%,d", currency, cat2Amount.toLong())
                        views.setTextViewText(R.id.widget_cat2_amount, amountFormatted)
                        views.setProgressBar(R.id.widget_cat2_bar, 100, cat2Pct, false)
                    } else {
                        views.setViewVisibility(R.id.widget_cat2_row, View.GONE)
                    }

                    // Cat 3
                    if (cat3Name.isNotEmpty()) {
                        views.setViewVisibility(R.id.widget_cat3_row, View.VISIBLE)
                        views.setTextViewText(R.id.widget_cat3_name, cat3Name)
                        val amountFormatted = String.format(Locale.getDefault(), "%s%,d", currency, cat3Amount.toLong())
                        views.setTextViewText(R.id.widget_cat3_amount, amountFormatted)
                        views.setProgressBar(R.id.widget_cat3_bar, 100, cat3Pct, false)
                    } else {
                        views.setViewVisibility(R.id.widget_cat3_row, View.GONE)
                    }
                }

                views.setOnClickPendingIntent(R.id.widget_breakdown_root, pendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering WhereDidItGoWidget", e)
            }
        }
    }
}
`;

// ─── MoneyMoodWidgetProvider.kt source ──────────────────────────────────────
const MONEY_MOOD_WIDGET_PROVIDER_KT = `package {{PACKAGE}}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import java.util.Locale

class MoneyMoodWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "MoneyMoodWidget"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, MoneyMoodWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                    val provider = MoneyMoodWidgetProvider()
                    provider.onUpdate(context, appWidgetManager, appWidgetIds)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating money mood widgets", e)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(ExpenzaAppWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
        val status = prefs.getString(ExpenzaAppWidgetProvider.KEY_MOOD_STATUS, "On Track") ?: "On Track"
        val subtitle = prefs.getString(ExpenzaAppWidgetProvider.KEY_MOOD_SUBTITLE, "Spending is healthy") ?: "Spending is healthy"
        val progressPct = prefs.getInt(ExpenzaAppWidgetProvider.KEY_MOOD_PCT, 50)
        val monthSpent = prefs.getFloat(ExpenzaAppWidgetProvider.KEY_MONTH_SPENT, 0f).toDouble()
        val monthlyBudget = prefs.getFloat(ExpenzaAppWidgetProvider.KEY_MONTHLY_BUDGET, 0f).toDouble()
        val currency = prefs.getString(ExpenzaAppWidgetProvider.KEY_CURRENCY, "₹") ?: "₹"

        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            action = "VIEW_HOME"
            data = Uri.parse("expenza://home")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("action", "VIEW_HOME")
        }
        val pendingIntent = PendingIntent.getActivity(context, 205, openAppIntent, pendingFlags)

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_money_mood)

                views.setTextViewText(R.id.widget_mood_status, status)
                views.setTextViewText(R.id.widget_mood_subtitle, subtitle)
                views.setProgressBar(R.id.widget_mood_progress, 100, progressPct, false)

                val spentFormatted = String.format(Locale.getDefault(), "%s%,d", currency, monthSpent.toLong())
                val budgetFormatted = String.format(Locale.getDefault(), "%s%,d", currency, monthlyBudget.toLong())
                val detailsStr = if (monthlyBudget > 0) "$spentFormatted of $budgetFormatted" else "$spentFormatted spent"
                views.setTextViewText(R.id.widget_mood_details, detailsStr)

                if (monthlyBudget > 0 && monthSpent > monthlyBudget) {
                    views.setTextColor(R.id.widget_mood_details, 0xFFDC2626.toInt())
                } else {
                    views.setTextColor(R.id.widget_mood_details, 0xFF4F46E5.toInt())
                }

                views.setOnClickPendingIntent(R.id.widget_mood_root, pendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering MoneyMoodWidget", e)
            }
        }
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
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import java.util.Locale
import kotlin.math.abs
import kotlin.math.min

class ExpenzaAppWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "ExpenzaAppWidget"
        const val PREFS_NAME = "expenza_widget_data"
        const val KEY_TODAY_SPENT = "today_spent"
        const val KEY_TODAY_COUNT = "today_count"
        const val KEY_TODAY_TOP_CAT = "today_top_cat"
        const val KEY_MONTHLY_BUDGET = "monthly_budget"
        const val KEY_MONTH_SPENT = "month_spent"
        const val KEY_MONTH_NAME = "month_name"
        const val KEY_CURRENCY = "currency"

        const val KEY_CAT1_NAME = "cat1_name"
        const val KEY_CAT1_AMOUNT = "cat1_amount"
        const val KEY_CAT1_PCT = "cat1_pct"
        const val KEY_CAT2_NAME = "cat2_name"
        const val KEY_CAT2_AMOUNT = "cat2_amount"
        const val KEY_CAT2_PCT = "cat2_pct"
        const val KEY_CAT3_NAME = "cat3_name"
        const val KEY_CAT3_AMOUNT = "cat3_amount"
        const val KEY_CAT3_PCT = "cat3_pct"

        const val KEY_MOOD_STATUS = "mood_status"
        const val KEY_MOOD_SUBTITLE = "mood_subtitle"
        const val KEY_MOOD_PCT = "mood_pct"

        fun updateAllWidgets(context: Context) {
            try {
                TodaySpendingWidgetProvider.updateAllWidgets(context)
                MonthlyBudgetWidgetProvider.updateAllWidgets(context)
                QuickAddWidgetProvider.updateAllWidgets(context)
                WhereDidItGoWidgetProvider.updateAllWidgets(context)
                MoneyMoodWidgetProvider.updateAllWidgets(context)

                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, ExpenzaAppWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                    val provider = ExpenzaAppWidgetProvider()
                    provider.onUpdate(context, appWidgetManager, appWidgetIds)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in updateAllWidgets", e)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val monthSpent = prefs.getFloat(KEY_MONTH_SPENT, 0f).toDouble()
        val monthlyBudget = prefs.getFloat(KEY_MONTHLY_BUDGET, 0f).toDouble()
        val monthName = prefs.getString(KEY_MONTH_NAME, "This month") ?: "This month"
        val currency = prefs.getString(KEY_CURRENCY, "₹") ?: "₹"

        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val openAppPendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, pendingFlags)

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_expenza)

                val amountStr = if (monthSpent == 0.0) {
                    "\${currency}0"
                } else if (monthSpent == monthSpent.toLong().toDouble()) {
                    String.format(Locale.getDefault(), "%s%,d", currency, monthSpent.toLong())
                } else {
                    String.format(Locale.getDefault(), "%s%,.2f", currency, monthSpent)
                }
                views.setTextViewText(R.id.widget_main_amount, amountStr)

                if (monthlyBudget > 0) {
                    val remaining = monthlyBudget - monthSpent
                    val percentage = ((monthSpent / monthlyBudget) * 100).toInt()
                    val progressVal = min(percentage, 100)

                    views.setProgressBar(R.id.widget_main_circle_progress, 100, progressVal, false)
                    views.setTextViewText(R.id.widget_main_percentage, "$percentage%")

                    val budgetFormatted = if (monthlyBudget >= 1000) {
                        String.format(Locale.getDefault(), "%s%dK", currency, (monthlyBudget / 1000).toLong())
                    } else {
                        String.format(Locale.getDefault(), "%s%d", currency, monthlyBudget.toLong())
                    }
                    views.setTextViewText(R.id.widget_main_budget_label, "$budgetFormatted BUDGET")

                    if (remaining >= 0) {
                        val leftFormatted = String.format(Locale.getDefault(), "%s%,d", currency, remaining.toLong())
                        views.setTextViewText(R.id.widget_main_month_left, "$monthName \u2022 $leftFormatted left")
                        views.setTextColor(R.id.widget_main_month_left, 0xFF4F46E5.toInt())
                    } else {
                        val overFormatted = String.format(Locale.getDefault(), "%s%,d", currency, abs(remaining).toLong())
                        views.setTextViewText(R.id.widget_main_month_left, "$monthName \u2022 $overFormatted over")
                        views.setTextColor(R.id.widget_main_month_left, 0xFFDC2626.toInt())
                    }
                } else {
                    views.setProgressBar(R.id.widget_main_circle_progress, 100, 0, false)
                    views.setTextViewText(R.id.widget_main_percentage, "0%")
                    views.setTextViewText(R.id.widget_main_budget_label, "SET BUDGET")
                    views.setTextViewText(R.id.widget_main_month_left, "$monthName \u2022 Tap to set budget")
                    views.setTextColor(R.id.widget_main_month_left, 0xFF4F46E5.toInt())
                }

                views.setOnClickPendingIntent(R.id.widget_main_root, openAppPendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering ExpenzaAppWidget", e)
            }
        }
    }
}
`;

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

// ─── Widget XML Sources ──────────────────────────────────────────────────────
const WIDGET_BACKGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <corners android:radius="16dp" />
    <stroke
        android:width="1dp"
        android:color="#E5E7EB" />
</shape>`;

const WIDGET_BTN_BG_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#4F46E5" />
    <corners android:radius="10dp" />
</shape>`;

const WIDGET_BADGE_BG_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#F1F5F9" />
    <corners android:radius="6dp" />
</shape>`;

const WIDGET_PROGRESS_DRAWABLE_XML = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:id="@android:id/background">
        <shape>
            <corners android:radius="4dp" />
            <solid android:color="#F3F4F6" />
        </shape>
    </item>
    <item android:id="@android:id/progress">
        <clip>
            <shape>
                <corners android:radius="4dp" />
                <solid android:color="#4F46E5" />
            </shape>
        </clip>
    </item>
</layer-list>`;

const WIDGET_CIRCULAR_PROGRESS_DRAWABLE_XML = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:id="@android:id/background">
        <shape
            android:innerRadiusRatio="2.7"
            android:shape="ring"
            android:thickness="3.5dp"
            android:useLevel="false">
            <solid android:color="#EEF2F6" />
        </shape>
    </item>
    <item android:id="@android:id/progress">
        <rotate
            android:fromDegrees="270"
            android:toDegrees="270">
            <shape
                android:innerRadiusRatio="2.7"
                android:shape="ring"
                android:thickness="3.5dp"
                android:useLevel="true">
                <solid android:color="#4F46E5" />
            </shape>
        </rotate>
    </item>
</layer-list>`;

const EXPENZA_WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="70dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_expenza"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_main_description">
</appwidget-provider>`;

const TODAY_SPENDING_WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="140dp"
    android:minHeight="70dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_today_spending"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_today_spending_description">
</appwidget-provider>`;

const MONTHLY_BUDGET_WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="140dp"
    android:minHeight="70dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_monthly_budget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_monthly_budget_description">
</appwidget-provider>`;

const QUICK_ADD_WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="140dp"
    android:minHeight="55dp"
    android:targetCellWidth="2"
    android:targetCellHeight="1"
    android:updatePeriodMillis="0"
    android:initialLayout="@layout/widget_quick_add"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_quick_add_description">
</appwidget-provider>`;

const WHERE_DID_IT_GO_WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="85dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_where_did_it_go"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_breakdown_description">
</appwidget-provider>`;

const MONEY_MOOD_WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="140dp"
    android:minHeight="70dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_money_mood"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_money_mood_description">
</appwidget-provider>`;

const WIDGET_EXPENZA_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_main_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="13dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:id="@+id/widget_main_title"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="TOTAL SPENT"
                android:textColor="#6B7280"
                android:textSize="10sp"
                android:textStyle="bold"
                android:letterSpacing="0.04" />

            <TextView
                android:id="@+id/widget_main_amount"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="₹0"
                android:textColor="#111827"
                android:textSize="22sp"
                android:textStyle="bold"
                android:layout_marginTop="2dp" />

            <TextView
                android:id="@+id/widget_main_month_left"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="This month • Set budget"
                android:textColor="#4F46E5"
                android:textSize="11sp"
                android:textStyle="bold"
                android:layout_marginTop="4dp" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:gravity="center_horizontal"
            android:layout_marginStart="8dp">

            <FrameLayout
                android:layout_width="52dp"
                android:layout_height="52dp">

                <ProgressBar
                    android:id="@+id/widget_main_circle_progress"
                    style="?android:attr/progressBarStyleHorizontal"
                    android:layout_width="match_parent"
                    android:layout_height="match_parent"
                    android:indeterminate="false"
                    android:max="100"
                    android:progress="0"
                    android:progressDrawable="@drawable/widget_circular_progress_drawable" />

                <TextView
                    android:id="@+id/widget_main_percentage"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_gravity="center"
                    android:text="0%"
                    android:textColor="#111827"
                    android:textSize="12sp"
                    android:textStyle="bold" />
            </FrameLayout>

            <TextView
                android:id="@+id/widget_main_budget_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="BUDGET"
                android:textColor="#6B7280"
                android:textSize="9sp"
                android:textStyle="bold"
                android:layout_marginTop="2dp" />
        </LinearLayout>

    </LinearLayout>

</LinearLayout>`;

const WIDGET_TODAY_SPENDING_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_today_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="13dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_today_label"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="TODAY'S SPENDING"
            android:textColor="#6B7280"
            android:textSize="10sp"
            android:textStyle="bold"
            android:letterSpacing="0.04" />

        <TextView
            android:id="@+id/widget_today_badge"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Today"
            android:textColor="#9CA3AF"
            android:textSize="10sp" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_today_amount"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="₹0"
        android:textColor="#111827"
        android:textSize="22sp"
        android:textStyle="bold"
        android:layout_marginTop="3dp" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="4dp"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_today_count"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="No expenses today"
            android:textColor="#6B7280"
            android:textSize="11sp" />

        <TextView
            android:id="@+id/widget_today_subbreakdown"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text=""
            android:textColor="#4F46E5"
            android:textSize="11sp"
            android:textStyle="bold"
            android:gravity="end" />
    </LinearLayout>

</LinearLayout>`;

const WIDGET_MONTHLY_BUDGET_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_budget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="13dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="horizontal"
        android:gravity="center_vertical">

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
                android:textColor="#6B7280"
                android:textSize="10sp"
                android:textStyle="bold"
                android:letterSpacing="0.04" />

            <TextView
                android:id="@+id/widget_budget_values"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Set your budget"
                android:textColor="#111827"
                android:textSize="15sp"
                android:textStyle="bold"
                android:layout_marginTop="2dp" />

            <TextView
                android:id="@+id/widget_budget_subtext"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Tap to set monthly target"
                android:textColor="#4F46E5"
                android:textSize="11sp"
                android:textStyle="bold"
                android:layout_marginTop="3dp" />
        </LinearLayout>

        <FrameLayout
            android:layout_width="54dp"
            android:layout_height="54dp"
            android:layout_marginStart="8dp">

            <ProgressBar
                android:id="@+id/widget_budget_circle_progress"
                style="?android:attr/progressBarStyleHorizontal"
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:indeterminate="false"
                android:max="100"
                android:progress="0"
                android:progressDrawable="@drawable/widget_circular_progress_drawable" />

            <TextView
                android:id="@+id/widget_budget_circle_pct"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_gravity="center"
                android:text="0%"
                android:textColor="#111827"
                android:textSize="13sp"
                android:textStyle="bold" />
        </FrameLayout>

    </LinearLayout>

</LinearLayout>`;

const WIDGET_QUICK_ADD_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_quick_add_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:gravity="center_vertical">

    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical">

        <TextView
            android:id="@+id/widget_quick_add_title"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="ADD EXPENSE"
            android:textColor="#6B7280"
            android:textSize="10sp"
            android:textStyle="bold"
            android:letterSpacing="0.04" />

        <TextView
            android:id="@+id/widget_quick_add_subtext"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Record what you spent"
            android:textColor="#111827"
            android:textSize="13sp"
            android:textStyle="bold"
            android:layout_marginTop="2dp" />
    </LinearLayout>

    <LinearLayout
        android:id="@+id/widget_quick_add_btn"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:background="@drawable/widget_btn_bg"
        android:paddingStart="14dp"
        android:paddingTop="8dp"
        android:paddingEnd="14dp"
        android:paddingBottom="8dp"
        android:gravity="center">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="+ Add"
            android:textColor="#FFFFFF"
            android:textSize="13sp"
            android:textStyle="bold" />
    </LinearLayout>

</LinearLayout>`;

const WIDGET_WHERE_DID_IT_GO_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_breakdown_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_breakdown_title"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="WHERE DID IT GO?"
            android:textColor="#6B7280"
            android:textSize="10sp"
            android:textStyle="bold"
            android:letterSpacing="0.04" />

        <TextView
            android:id="@+id/widget_breakdown_month"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="This Month"
            android:textColor="#9CA3AF"
            android:textSize="10sp" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_breakdown_empty"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="No spending recorded yet"
        android:textColor="#9CA3AF"
        android:textSize="12sp"
        android:layout_marginTop="8dp"
        android:visibility="gone" />

    <LinearLayout
        android:id="@+id/widget_breakdown_list"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:layout_marginTop="6dp">

        <LinearLayout
            android:id="@+id/widget_cat1_row"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:layout_marginBottom="4dp">

            <TextView
                android:id="@+id/widget_cat1_name"
                android:layout_width="64dp"
                android:layout_height="wrap_content"
                android:text="Food"
                android:textColor="#111827"
                android:textSize="11sp"
                android:textStyle="bold"
                android:ellipsize="end"
                android:maxLines="1" />

            <ProgressBar
                android:id="@+id/widget_cat1_bar"
                style="?android:attr/progressBarStyleHorizontal"
                android:layout_width="0dp"
                android:layout_height="5dp"
                android:layout_weight="1"
                android:layout_marginStart="6dp"
                android:layout_marginEnd="6dp"
                android:max="100"
                android:progress="60"
                android:progressDrawable="@drawable/widget_progress_drawable" />

            <TextView
                android:id="@+id/widget_cat1_amount"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="₹0"
                android:textColor="#111827"
                android:textSize="11sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:id="@+id/widget_cat2_row"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:layout_marginBottom="4dp">

            <TextView
                android:id="@+id/widget_cat2_name"
                android:layout_width="64dp"
                android:layout_height="wrap_content"
                android:text="Shopping"
                android:textColor="#111827"
                android:textSize="11sp"
                android:textStyle="bold"
                android:ellipsize="end"
                android:maxLines="1" />

            <ProgressBar
                android:id="@+id/widget_cat2_bar"
                style="?android:attr/progressBarStyleHorizontal"
                android:layout_width="0dp"
                android:layout_height="5dp"
                android:layout_weight="1"
                android:layout_marginStart="6dp"
                android:layout_marginEnd="6dp"
                android:max="100"
                android:progress="40"
                android:progressDrawable="@drawable/widget_progress_drawable" />

            <TextView
                android:id="@+id/widget_cat2_amount"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="₹0"
                android:textColor="#111827"
                android:textSize="11sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:id="@+id/widget_cat3_row"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical">

            <TextView
                android:id="@+id/widget_cat3_name"
                android:layout_width="64dp"
                android:layout_height="wrap_content"
                android:text="Transport"
                android:textColor="#111827"
                android:textSize="11sp"
                android:textStyle="bold"
                android:ellipsize="end"
                android:maxLines="1" />

            <ProgressBar
                android:id="@+id/widget_cat3_bar"
                style="?android:attr/progressBarStyleHorizontal"
                android:layout_width="0dp"
                android:layout_height="5dp"
                android:layout_weight="1"
                android:layout_marginStart="6dp"
                android:layout_marginEnd="6dp"
                android:max="100"
                android:progress="25"
                android:progressDrawable="@drawable/widget_progress_drawable" />

            <TextView
                android:id="@+id/widget_cat3_amount"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="₹0"
                android:textColor="#111827"
                android:textSize="11sp"
                android:textStyle="bold" />
        </LinearLayout>

    </LinearLayout>

</LinearLayout>`;

const WIDGET_MONEY_MOOD_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_mood_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="13dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_mood_label"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="MONEY MOOD"
            android:textColor="#6B7280"
            android:textSize="10sp"
            android:textStyle="bold"
            android:letterSpacing="0.04" />

        <TextView
            android:id="@+id/widget_mood_indicator"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Status"
            android:textColor="#9CA3AF"
            android:textSize="10sp" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_mood_status"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Comfortable"
        android:textColor="#111827"
        android:textSize="17sp"
        android:textStyle="bold"
        android:layout_marginTop="3dp" />

    <TextView
        android:id="@+id/widget_mood_subtitle"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Spending is on track"
        android:textColor="#6B7280"
        android:textSize="11sp"
        android:layout_marginTop="1dp" />

    <ProgressBar
        android:id="@+id/widget_mood_progress"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="5dp"
        android:layout_marginTop="6dp"
        android:layout_marginBottom="4dp"
        android:max="100"
        android:progress="60"
        android:progressDrawable="@drawable/widget_progress_drawable" />

    <TextView
        android:id="@+id/widget_mood_details"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="₹0 spent of ₹0"
        android:textColor="#4F46E5"
        android:textSize="10sp"
        android:textStyle="bold" />

</LinearLayout>`;

// ─── Helper: resolve package directory path ──────────────────────────────────
function getPackageDirPath(config) {
  const pkg = config.android?.package || "com.harsh.expense";
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
        "TodaySpendingWidgetProvider.kt": TODAY_SPENDING_WIDGET_PROVIDER_KT,
        "MonthlyBudgetWidgetProvider.kt": MONTHLY_BUDGET_WIDGET_PROVIDER_KT,
        "QuickAddWidgetProvider.kt": QUICK_ADD_WIDGET_PROVIDER_KT,
        "WhereDidItGoWidgetProvider.kt": WHERE_DID_IT_GO_WIDGET_PROVIDER_KT,
        "MoneyMoodWidgetProvider.kt": MONEY_MOOD_WIDGET_PROVIDER_KT,
        "ReminderReceiver.kt": REMINDER_RECEIVER_KT,
      };

      for (const [filename, content] of Object.entries(files)) {
        const filepath = path.join(javaDir, filename);
        fs.writeFileSync(filepath, content.replace(/\{\{PACKAGE\}\}/g, pkg));
      }

      const resFiles = [
        { path: path.join(resDir, "xml", "expenza_widget_info.xml"), content: EXPENZA_WIDGET_INFO_XML },
        { path: path.join(resDir, "xml", "today_spending_widget_info.xml"), content: TODAY_SPENDING_WIDGET_INFO_XML },
        { path: path.join(resDir, "xml", "monthly_budget_widget_info.xml"), content: MONTHLY_BUDGET_WIDGET_INFO_XML },
        { path: path.join(resDir, "xml", "quick_add_widget_info.xml"), content: QUICK_ADD_WIDGET_INFO_XML },
        { path: path.join(resDir, "xml", "where_did_it_go_widget_info.xml"), content: WHERE_DID_IT_GO_WIDGET_INFO_XML },
        { path: path.join(resDir, "xml", "money_mood_widget_info.xml"), content: MONEY_MOOD_WIDGET_INFO_XML },
        { path: path.join(resDir, "layout", "widget_expenza.xml"), content: WIDGET_EXPENZA_LAYOUT_XML },
        { path: path.join(resDir, "layout", "widget_today_spending.xml"), content: WIDGET_TODAY_SPENDING_LAYOUT_XML },
        { path: path.join(resDir, "layout", "widget_monthly_budget.xml"), content: WIDGET_MONTHLY_BUDGET_LAYOUT_XML },
        { path: path.join(resDir, "layout", "widget_quick_add.xml"), content: WIDGET_QUICK_ADD_LAYOUT_XML },
        { path: path.join(resDir, "layout", "widget_where_did_it_go.xml"), content: WIDGET_WHERE_DID_IT_GO_LAYOUT_XML },
        { path: path.join(resDir, "layout", "widget_money_mood.xml"), content: WIDGET_MONEY_MOOD_LAYOUT_XML },
        { path: path.join(resDir, "drawable", "widget_background.xml"), content: WIDGET_BACKGROUND_XML },
        { path: path.join(resDir, "drawable", "widget_btn_bg.xml"), content: WIDGET_BTN_BG_XML },
        { path: path.join(resDir, "drawable", "widget_badge_bg.xml"), content: WIDGET_BADGE_BG_XML },
        { path: path.join(resDir, "drawable", "widget_progress_drawable.xml"), content: WIDGET_PROGRESS_DRAWABLE_XML },
        { path: path.join(resDir, "drawable", "widget_circular_progress_drawable.xml"), content: WIDGET_CIRCULAR_PROGRESS_DRAWABLE_XML },
      ];

      for (const { path: rPath, content } of resFiles) {
        fs.writeFileSync(rPath, content);
      }

      return config;
    },
  ]);
}

// ─── 2. Register ShakeService, Receivers, and permissions in AndroidManifest.xml ──
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
          "android:stopWithTask": "false",
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
    }

    const receivers = app.receiver || [];

    function addReceiver(receiverName, label, resource) {
      const exists = receivers.some((r) => r.$?.["android:name"] === receiverName);
      if (!exists) {
        const obj = {
          $: {
            "android:name": receiverName,
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
                "android:resource": resource,
              },
            },
          ],
        };
        if (label) {
          obj.$["android:label"] = label;
        }
        receivers.push(obj);
      }
    }

    // Register all 6 Home Screen Widgets
    addReceiver(".ExpenzaAppWidgetProvider", "@string/widget_main_title", "@xml/expenza_widget_info");
    addReceiver(".TodaySpendingWidgetProvider", "@string/widget_today_spending_title", "@xml/today_spending_widget_info");
    addReceiver(".MonthlyBudgetWidgetProvider", "@string/widget_monthly_budget_title", "@xml/monthly_budget_widget_info");
    addReceiver(".QuickAddWidgetProvider", "@string/widget_quick_add_title", "@xml/quick_add_widget_info");
    addReceiver(".WhereDidItGoWidgetProvider", "@string/widget_breakdown_title", "@xml/where_did_it_go_widget_info");
    addReceiver(".MoneyMoodWidgetProvider", "@string/widget_money_mood_title", "@xml/money_mood_widget_info");

    // Register BootReceiver
    if (!receivers.some((r) => r.$?.["android:name"] === ".BootReceiver")) {
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
    }

    // Register ReminderReceiver
    if (!receivers.some((r) => r.$?.["android:name"] === ".ReminderReceiver")) {
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
    }

    app.receiver = receivers;

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
    }

    return config;
  });
}

// ─── 4. Add onResume/onPause/onNewIntent to MainActivity ─────────────────────
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
        const methods = `

  override fun onResume() {
    super.onResume()
    ShakeService.isAppInForeground = true
  }

  override fun onPause() {
    super.onPause()
    ShakeService.isAppInForeground = false
  }

  override fun onDestroy() {
    super.onDestroy()
    ShakeService.isAppInForeground = false
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleLaunchIntent(intent, "onNewIntent")
  }

  private fun handleLaunchIntent(intent: Intent?, source: String) {
    if (intent == null) return
    val uri = intent.dataString
    val action = intent.getStringExtra("action") ?: intent.action
    if (action == "ADD_EXPENSE" || (uri != null && (uri.contains("add-expense") || uri.contains("shake-open")))) {
      ShakeServiceModule.emitShakeToJS()
    }
  }`;
        contents =
          contents.slice(0, insertPos) +
          methods +
          contents.slice(insertPos);
      }

      config.modResults.contents = contents;
    }

    return config;
  });
}

// ─── 5. Add string resources for widgets and app ───────────────────────────
function withShakeServiceStrings(config) {
  return withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string || [];

    const stringMap = {
      app_name: "Expenza",
      widget_main_title: '"Total Spent & Budget"',
      widget_main_description: '"Overview of monthly spending and budget progress ring"',
      widget_today_spending_title: '"Today\'s Spending"',
      widget_today_spending_description: '"Glance at what you\'ve spent today"',
      widget_monthly_budget_title: '"Monthly Budget"',
      widget_monthly_budget_description: '"Track your monthly budget and remaining spend"',
      widget_quick_add_title: '"Quick Add Expense"',
      widget_quick_add_description: '"Quickly log a new expense in Expenza"',
      widget_breakdown_title: '"Where Did It Go?"',
      widget_breakdown_description: '"Top category spending breakdown with progress bars"',
      widget_money_mood_title: '"Money Mood"',
      widget_money_mood_description: '"Real-time spending health and budget track"',
    };

    for (const [name, value] of Object.entries(stringMap)) {
      const existing = strings.find((s) => s.$?.name === name);
      if (existing) {
        existing._ = value;
      } else {
        strings.push({
          $: { name },
          _: value,
        });
      }
    }

    config.modResults.resources.string = strings;
    return config;
  });
}

// ─── 6. Configure build.gradle with lint and APK naming ──────────────────────
function withShakeServiceBuildGradle(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes("Expenza-v")) {
      contents = contents.replace(
        /android\s*\{/,
        `android {\n    lint {\n        abortOnError false\n        checkReleaseBuilds false\n        disable 'Instantiatable'\n    }\n    applicationVariants.all { variant ->\n        variant.outputs.all { output ->\n            outputFileName = "Expenza-v\${variant.versionName}.apk"\n        }\n    }\n`
      );
      config.modResults.contents = contents;
    }
    return config;
  });
}

// ─── Export combined plugin ──────────────────────────────────────────────────
function withShakeService(config) {
  config = withShakeServiceFiles(config);
  config = withShakeServiceStrings(config);
  config = withShakeServiceManifest(config);
  config = withShakeServiceBuildGradle(config);
  config = withShakeServiceMainApplication(config);
  config = withShakeServiceMainActivity(config);
  return config;
}

module.exports = withShakeService;
