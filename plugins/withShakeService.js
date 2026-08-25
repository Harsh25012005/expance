/**
 * Expo Config Plugin: withShakeService
 *
 * Injects the native Android ShakeService foreground service, ShakeServiceModule,
 * ShakeServicePackage, BootReceiver, ReminderReceiver, RingRenderer, and the
 * single Category Concentric Rings Widget:
 * - CategoryWidgetProvider (with dynamic per-category colors)
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

                if (isAppInForeground) {
                    Log.d(TAG, "[SHAKE] DETECTED (app foreground)")
                    val emitted = ShakeServiceModule.emitShakeToJS()
                    if (!emitted) {
                        Log.d(TAG, "[SHAKE] JS not ready in foreground, showing notification fallback")
                        showExpenseNotification()
                    }
                    return
                }

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

// ─── RingRenderer.kt source ──────────────────────────────────────────────────
const RING_RENDERER_KT = `package {{PACKAGE}}

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF

object RingRenderer {

    private val defaultColors = listOf(
        "#F59E0B",
        "#EC4899",
        "#38BDF8",
        "#A78BFA"
    )

    fun draw(
        sizePx: Int,
        values: List<Float>,
        colors: List<String> = defaultColors,
        strokeWidthPx: Float = sizePx * 0.055f
    ): Bitmap {
        val safeValues = if (values.size >= 4) values else listOf(0.52f, 0.32f, 0.15f, 0.77f)

        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = strokeWidthPx
            strokeCap = Paint.Cap.ROUND
        }

        val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = strokeWidthPx
            strokeCap = Paint.Cap.ROUND
        }

        val gap = strokeWidthPx * 1.5f
        val center = sizePx / 2f
        var radius = center - strokeWidthPx
        val startAngle = -90f

        for (i in 0 until 4) {
            val rect = RectF(
                center - radius, center - radius,
                center + radius, center + radius
            )

            val colorHex = if (i < colors.size && colors[i].isNotEmpty()) colors[i] else defaultColors[i % defaultColors.size]
            val parsedColor = try {
                Color.parseColor(colorHex)
            } catch (e: Exception) {
                Color.parseColor(defaultColors[i % defaultColors.size])
            }

            trackPaint.color = Color.argb(
                55,
                Color.red(parsedColor),
                Color.green(parsedColor),
                Color.blue(parsedColor)
            )
            canvas.drawArc(rect, 0f, 360f, false, trackPaint)

            val pct = safeValues[i].coerceIn(0.04f, 1f)
            progressPaint.color = parsedColor
            canvas.drawArc(rect, startAngle, 360f * pct, false, progressPaint)

            radius -= gap
        }

        return bitmap
    }
}
`;

// ─── CategoryWidgetProvider.kt source ───────────────────────────────────────
const CATEGORY_WIDGET_PROVIDER_KT = `package {{PACKAGE}}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.util.Log
import android.widget.RemoteViews

class CategoryWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "CategoryWidgetProvider"
        const val PREFS_NAME = "expenza_widget_data"

        const val KEY_CAT1_NAME = "cat1_name"
        const val KEY_CAT1_PCT = "cat1_pct"
        const val KEY_CAT1_COLOR = "cat1_color"

        const val KEY_CAT2_NAME = "cat2_name"
        const val KEY_CAT2_PCT = "cat2_pct"
        const val KEY_CAT2_COLOR = "cat2_color"

        const val KEY_CAT3_NAME = "cat3_name"
        const val KEY_CAT3_PCT = "cat3_pct"
        const val KEY_CAT3_COLOR = "cat3_color"

        const val KEY_CAT4_NAME = "cat4_name"
        const val KEY_CAT4_PCT = "cat4_pct"
        const val KEY_CAT4_COLOR = "cat4_color"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, CategoryWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                    val provider = CategoryWidgetProvider()
                    provider.onUpdate(context, appWidgetManager, appWidgetIds)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating category widget", e)
            }
        }

        private fun shortenLabel(name: String): String {
            return when (name.uppercase()) {
                "FOOD", "FOOD & DRINK", "GROCERIES", "FOOD & DINING" -> "FOOD"
                "SHOPPING" -> "SHOP"
                "TRANSPORTATION", "TRAVEL", "TRANSPORT" -> "TRANS"
                "BILLS", "UTILITIES", "BILLS & UTILITIES" -> "BILLS"
                "ENTERTAINMENT" -> "FUN"
                "HEALTH", "HEALTH & MEDICAL" -> "HLTH"
                "EDUCATION" -> "EDU"
                else -> if (name.length > 5) name.substring(0, 4).uppercase() else name.uppercase()
            }
        }

        private fun parseColorSafe(colorHex: String, fallbackHex: String): Int {
            return try {
                Color.parseColor(colorHex)
            } catch (e: Exception) {
                Color.parseColor(fallbackHex)
            }
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val cat1Name = prefs.getString(KEY_CAT1_NAME, "FOOD")?.takeIf { it.isNotEmpty() } ?: "FOOD"
        val cat1Pct = prefs.getInt(KEY_CAT1_PCT, 52)
        val cat1Color = prefs.getString(KEY_CAT1_COLOR, "#F59E0B") ?: "#F59E0B"

        val cat2Name = prefs.getString(KEY_CAT2_NAME, "SHOP")?.takeIf { it.isNotEmpty() } ?: "SHOP"
        val cat2Pct = prefs.getInt(KEY_CAT2_PCT, 32)
        val cat2Color = prefs.getString(KEY_CAT2_COLOR, "#EC4899") ?: "#EC4899"

        val cat3Name = prefs.getString(KEY_CAT3_NAME, "TRANS")?.takeIf { it.isNotEmpty() } ?: "TRANS"
        val cat3Pct = prefs.getInt(KEY_CAT3_PCT, 15)
        val cat3Color = prefs.getString(KEY_CAT3_COLOR, "#38BDF8") ?: "#38BDF8"

        val cat4Name = prefs.getString(KEY_CAT4_NAME, "BILLS")?.takeIf { it.isNotEmpty() } ?: "BILLS"
        val cat4Pct = prefs.getInt(KEY_CAT4_PCT, 77)
        val cat4Color = prefs.getString(KEY_CAT4_COLOR, "#A78BFA") ?: "#A78BFA"

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
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
        val pendingIntent = PendingIntent.getActivity(context, 401, openAppIntent, flags)

        val ringValues = listOf(
            (cat1Pct / 100f).coerceIn(0.05f, 1f),
            (cat2Pct / 100f).coerceIn(0.05f, 1f),
            (cat3Pct / 100f).coerceIn(0.05f, 1f),
            (cat4Pct / 100f).coerceIn(0.05f, 1f)
        )

        val ringColors = listOf(cat1Color, cat2Color, cat3Color, cat4Color)

        val density = context.resources.displayMetrics.density
        val ringSizePx = (160 * density).toInt().coerceAtLeast(200)
        val bitmap = RingRenderer.draw(sizePx = ringSizePx, values = ringValues, colors = ringColors)

        for (widgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_category_card)

                views.setImageViewBitmap(R.id.widget_category_rings, bitmap)

                views.setTextViewText(R.id.widget_stat_deep_label, shortenLabel(cat1Name))
                views.setTextColor(R.id.widget_stat_deep_label, parseColorSafe(cat1Color, "#F59E0B"))
                views.setTextViewText(R.id.widget_stat_deep_value, "$cat1Pct%")

                views.setTextViewText(R.id.widget_stat_light_label, shortenLabel(cat2Name))
                views.setTextColor(R.id.widget_stat_light_label, parseColorSafe(cat2Color, "#EC4899"))
                views.setTextViewText(R.id.widget_stat_light_value, "$cat2Pct%")

                views.setTextViewText(R.id.widget_stat_awake_label, shortenLabel(cat3Name))
                views.setTextColor(R.id.widget_stat_awake_label, parseColorSafe(cat3Color, "#38BDF8"))
                views.setTextViewText(R.id.widget_stat_awake_value, "$cat3Pct%")

                views.setTextViewText(R.id.widget_stat_quality_label, shortenLabel(cat4Name))
                views.setTextColor(R.id.widget_stat_quality_label, parseColorSafe(cat4Color, "#A78BFA"))
                views.setTextViewText(R.id.widget_stat_quality_value, "$cat4Pct%")

                views.setOnClickPendingIntent(R.id.widget_category_root, pendingIntent)

                appWidgetManager.updateAppWidget(widgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error updating widgetId: $widgetId", e)
            }
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
        const val PREFS_NAME = "expenza_widget_data"

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

        fun updateAllWidgets(context: android.content.Context) {
            try {
                CategoryWidgetProvider.updateAllWidgets(context)
            } catch (e: Exception) {
                Log.e(TAG, "Error triggering updateAllWidgets", e)
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
        todayBars: String,
        monthlyBudget: Double,
        monthSpent: Double,
        monthName: String,
        currency: String,
        cat1Name: String,
        cat1Pct: Double,
        cat1Color: String,
        cat2Name: String,
        cat2Pct: Double,
        cat2Color: String,
        cat3Name: String,
        cat3Pct: Double,
        cat3Color: String,
        cat4Name: String,
        cat4Pct: Double,
        cat4Color: String,
        cat5Name: String,
        cat5Pct: Double,
        cat5Color: String
    ) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
            prefs.edit().apply {
                putFloat("today_spent", todaySpent.toFloat())
                putInt("today_count", todayCount.toInt())
                putFloat("monthly_budget", monthlyBudget.toFloat())
                putFloat("month_spent", monthSpent.toFloat())
                putString("currency", currency)

                putString(CategoryWidgetProvider.KEY_CAT1_NAME, cat1Name)
                putInt(CategoryWidgetProvider.KEY_CAT1_PCT, cat1Pct.toInt())
                putString(CategoryWidgetProvider.KEY_CAT1_COLOR, cat1Color)

                putString(CategoryWidgetProvider.KEY_CAT2_NAME, cat2Name)
                putInt(CategoryWidgetProvider.KEY_CAT2_PCT, cat2Pct.toInt())
                putString(CategoryWidgetProvider.KEY_CAT2_COLOR, cat2Color)

                putString(CategoryWidgetProvider.KEY_CAT3_NAME, cat3Name)
                putInt(CategoryWidgetProvider.KEY_CAT3_PCT, cat3Pct.toInt())
                putString(CategoryWidgetProvider.KEY_CAT3_COLOR, cat3Color)

                putString(CategoryWidgetProvider.KEY_CAT4_NAME, cat4Name)
                putInt(CategoryWidgetProvider.KEY_CAT4_PCT, cat4Pct.toInt())
                putString(CategoryWidgetProvider.KEY_CAT4_COLOR, cat4Color)

                apply()
            }
            updateAllWidgets(context)
            Log.d(TAG, "Successfully synced CategoryWidget data: $cat1Name $cat1Pct% ($cat1Color), $cat2Name $cat2Pct% ($cat2Color)")
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

        val prefs = context.getSharedPreferences(ShakeServiceModule.PREFS_NAME, Context.MODE_PRIVATE)
        val todayCount = prefs.getInt("today_count", 0)

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

// ─── Layout & Drawable XMLs ──────────────────────────────────────────────────
const XML_WIDGET_CATEGORY_CARD = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_category_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center_horizontal"
    android:background="@drawable/widget_card_bg_gradient"
    android:paddingTop="20dp"
    android:paddingBottom="18dp"
    android:paddingStart="16dp"
    android:paddingEnd="16dp">

    <TextView
        android:id="@+id/widget_category_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="CATEGORY"
        android:textColor="#C4B5FD"
        android:textSize="20sp"
        android:textStyle="bold"
        android:letterSpacing="0.05"
        android:layout_marginBottom="12dp" />

    <ImageView
        android:id="@+id/widget_category_rings"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:layout_gravity="center"
        android:scaleType="fitCenter" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="14dp"
        android:weightSum="4">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center_horizontal">
            <TextView
                android:id="@+id/widget_stat_deep_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="FOOD"
                android:textColor="#F59E0B"
                android:textSize="11sp"
                android:textStyle="bold" />
            <TextView
                android:id="@+id/widget_stat_deep_value"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="52%"
                android:textColor="#FFFFFF"
                android:textSize="17sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center_horizontal">
            <TextView
                android:id="@+id/widget_stat_light_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="SHOP"
                android:textColor="#EC4899"
                android:textSize="11sp"
                android:textStyle="bold" />
            <TextView
                android:id="@+id/widget_stat_light_value"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="32%"
                android:textColor="#FFFFFF"
                android:textSize="17sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center_horizontal">
            <TextView
                android:id="@+id/widget_stat_awake_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="TRANS"
                android:textColor="#38BDF8"
                android:textSize="11sp"
                android:textStyle="bold" />
            <TextView
                android:id="@+id/widget_stat_awake_value"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="15%"
                android:textColor="#FFFFFF"
                android:textSize="17sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center_horizontal">
            <TextView
                android:id="@+id/widget_stat_quality_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="BILLS"
                android:textColor="#A78BFA"
                android:textSize="11sp"
                android:textStyle="bold" />
            <TextView
                android:id="@+id/widget_stat_quality_value"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="77%"
                android:textColor="#FFFFFF"
                android:textSize="17sp"
                android:textStyle="bold" />
        </LinearLayout>

    </LinearLayout>
</LinearLayout>
`;

// ─── Helper: resolve package directory path ──────────────────────────────────
function getPackageDirPath(config) {
  const pkg = config.android?.package || "com.harsh.expense";
  const pkgDir = path.join(...pkg.split("."));
  return { pkg, pkgDir };
}

// ─── 1. Write Kotlin, Layouts, Drawables and XML files during prebuild ───────
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
      fs.mkdirSync(path.join(resDir, "values"), { recursive: true });
      fs.mkdirSync(path.join(resDir, "values-night"), { recursive: true });

      // Kotlin Source Files
      const files = {
        "ShakeService.kt": SHAKE_SERVICE_KT,
        "BootReceiver.kt": BOOT_RECEIVER_KT,
        "ShakeServiceModule.kt": SHAKE_SERVICE_MODULE_KT,
        "ShakeServicePackage.kt": SHAKE_SERVICE_PACKAGE_KT,
        "RingRenderer.kt": RING_RENDERER_KT,
        "CategoryWidgetProvider.kt": CATEGORY_WIDGET_PROVIDER_KT,
        "ReminderReceiver.kt": REMINDER_RECEIVER_KT,
      };

      for (const [filename, content] of Object.entries(files)) {
        const filepath = path.join(javaDir, filename);
        fs.writeFileSync(filepath, content.replace(/\{\{PACKAGE\}\}/g, pkg));
      }

      // Layout XML
      fs.writeFileSync(path.join(resDir, "layout", "widget_category_card.xml"), XML_WIDGET_CATEGORY_CARD);

      // Widget Provider Info XML
      const categoryWidgetInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="160dp"
    android:minHeight="160dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:description="@string/widget_category_description"
    android:previewImage="@mipmap/ic_launcher"
    android:initialLayout="@layout/widget_category_card"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
`;
      fs.writeFileSync(path.join(resDir, "xml", "category_widget_info.xml"), categoryWidgetInfoXml);

      // Drawables
      const drawables = {
        "widget_card_bg_gradient.xml": `<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><corners android:radius="28dp"/><gradient android:type="linear" android:angle="270" android:startColor="#241568" android:endColor="#150B3D"/></shape>`,
      };

      for (const [filename, content] of Object.entries(drawables)) {
        fs.writeFileSync(path.join(resDir, "drawable", filename), content);
      }

      // Colors
      const colorsXml = `<resources>
  <color name="colorPrimary">#4F46E5</color>
  <color name="colorPrimaryDark">#4338CA</color>
  <color name="colorAccent">#6366F1</color>
  <color name="splashscreen_background">#FFFFFF</color>
  <color name="iconBackground">#FFFFFF</color>
</resources>`;
      fs.writeFileSync(path.join(resDir, "values", "colors.xml"), colorsXml);
      fs.writeFileSync(path.join(resDir, "values-night", "colors.xml"), colorsXml);

      return config;
    },
  ]);
}

// ─── 2. Register ShakeService, CategoryWidgetProvider, and permissions ──────
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

    const receivers = [
      {
        $: {
          "android:name": ".CategoryWidgetProvider",
          "android:label": "@string/widget_category_title",
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
              "android:resource": "@xml/category_widget_info",
            },
          },
        ],
      },
      {
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
      },
      {
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
      },
    ];

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
      widget_category_title: '"Category"',
      widget_category_description: '"Monthly spending breakdown by category"',
      widget_rings_desc: '"Concentric category spending rings"',
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
