/**
 * Expo Config Plugin: withShakeService
 *
 * Injects the native Android ShakeService foreground service, ShakeServiceModule,
 * ShakeServicePackage, BootReceiver, ReminderReceiver, WidgetChartUtils, and all 5 Home Screen AppWidgets:
 * 1. Budget Usage & Controls (BudgetWidgetProvider - Ref 1)
 * 2. Monthly Total Spent (QuickAddWidgetProvider - Ref 2)
 * 3. Today's Spending (TodaySpendingWidgetProvider - Ref 3)
 * 4. Where Did It Go? Concentric Rings (WhereDidItGoWidgetProvider - Ref 4)
 * 5. Daily Activity Equalizer (BudgetProgressWidgetProvider - Ref 5)
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

// ─── WidgetChartUtils.kt source ──────────────────────────────────────────────
const WIDGET_CHART_UTILS_KT = `package {{PACKAGE}}

import android.content.Context
import android.graphics.*
import kotlin.math.cos
import kotlin.math.sin

object WidgetChartUtils {

    private fun dpToPx(context: Context, dp: Float): Float {
        return dp * context.resources.displayMetrics.density
    }

    fun drawGradientArcGauge(
        context: Context,
        progressPct: Int,
        widthDp: Float = 170f,
        heightDp: Float = 120f,
        strokeWidthDp: Float = 13f
    ): Bitmap {
        val widthPx = dpToPx(context, widthDp).toInt().coerceAtLeast(1)
        val heightPx = dpToPx(context, heightDp).toInt().coerceAtLeast(1)

        val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val strokePx = dpToPx(context, strokeWidthDp)
        val padding = strokePx / 2f + dpToPx(context, 4f)
        val arcSize = (widthPx - padding * 2).coerceAtMost(heightPx * 1.5f)

        val rect = RectF(
            (widthPx - arcSize) / 2f,
            padding,
            (widthPx + arcSize) / 2f,
            padding + arcSize
        )

        val startAngle = 140f
        val totalAngle = 260f

        val paintTrack = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#25FFFFFF")
            style = Paint.Style.STROKE
            strokeWidth = strokePx
            strokeCap = Paint.Cap.ROUND
        }
        canvas.drawArc(rect, startAngle, totalAngle, false, paintTrack)

        val activeSweep = ((progressPct.coerceIn(0, 100) / 100f) * totalAngle).coerceAtLeast(4f)
        val colors = intArrayOf(
            Color.parseColor("#38BDF8"),
            Color.parseColor("#818CF8"),
            Color.parseColor("#FB7185")
        )
        val positions = floatArrayOf(0f, 0.5f, 1f)

        val gradient = LinearGradient(
            rect.left, rect.top, rect.right, rect.bottom,
            colors, positions, Shader.TileMode.CLAMP
        )

        val paintProgress = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = gradient
            style = Paint.Style.STROKE
            strokeWidth = strokePx
            strokeCap = Paint.Cap.ROUND
        }
        canvas.drawArc(rect, startAngle, activeSweep, false, paintProgress)

        val endAngleRad = Math.toRadians((startAngle + activeSweep).toDouble())
        val radius = arcSize / 2f
        val centerX = rect.centerX()
        val centerY = rect.centerY()
        val notchX = (centerX + radius * cos(endAngleRad)).toFloat()
        val notchY = (centerY + radius * sin(endAngleRad)).toFloat()

        val paintNotch = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            style = Paint.Style.FILL
        }
        canvas.drawCircle(notchX, notchY, dpToPx(context, 4.5f), paintNotch)

        return bitmap
    }

    fun drawMiniProgressRing(
        context: Context,
        count: Int,
        maxCount: Int = 10,
        sizeDp: Float = 34f
    ): Bitmap {
        val sizePx = dpToPx(context, sizeDp).toInt().coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val strokePx = dpToPx(context, 3f)
        val padding = strokePx / 2f + dpToPx(context, 1f)
        val rect = RectF(padding, padding, sizePx - padding, sizePx - padding)

        val paintTrack = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#1E3A5F")
            style = Paint.Style.STROKE
            strokeWidth = strokePx
        }
        canvas.drawArc(rect, 0f, 360f, false, paintTrack)

        val ratio = (count.toFloat() / maxCount.coerceAtLeast(1).toFloat()).coerceIn(0.1f, 1f)
        val sweepAngle = ratio * 360f

        val paintProgress = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#0075FF")
            style = Paint.Style.STROKE
            strokeWidth = strokePx
            strokeCap = Paint.Cap.ROUND
        }
        canvas.drawArc(rect, -90f, sweepAngle, false, paintProgress)

        val paintText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            textSize = dpToPx(context, 11f)
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        val textY = (sizePx / 2f) - ((paintText.descent() + paintText.ascent()) / 2f)
        canvas.drawText(count.toString(), sizePx / 2f, textY, paintText)

        return bitmap
    }

    data class ConcentricSlice(val name: String, val percent: Int, val colorHex: String)

    fun drawConcentricRings(
        context: Context,
        slices: List<ConcentricSlice>,
        sizeDp: Float = 110f
    ): Bitmap {
        val sizePx = dpToPx(context, sizeDp).toInt().coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val center = sizePx / 2f
        val ringWidth = dpToPx(context, 5.5f)
        val gap = dpToPx(context, 4f)

        val defaultColors = listOf("#A78BFA", "#60A5FA", "#22D3EE", "#FB923C")

        for (i in 0 until 4) {
            val radius = (center - dpToPx(context, 8f)) - (i * (ringWidth + gap))
            if (radius <= 0) continue

            val rect = RectF(center - radius, center - radius, center + radius, center + radius)
            val slice = if (i < slices.size) slices[i] else null
            val pct = slice?.percent ?: (30 - i * 5)
            val colorHex = slice?.colorHex ?: defaultColors[i % defaultColors.size]

            val parsedColor = try {
                Color.parseColor(colorHex)
            } catch (e: Exception) {
                Color.parseColor(defaultColors[i % defaultColors.size])
            }

            val paintTrack = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.argb(45, Color.red(parsedColor), Color.green(parsedColor), Color.blue(parsedColor))
                style = Paint.Style.STROKE
                strokeWidth = ringWidth
            }
            canvas.drawArc(rect, 0f, 360f, false, paintTrack)

            val sweepAngle = ((pct.coerceIn(5, 100) / 100f) * 360f).coerceAtLeast(12f)
            val paintActive = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = parsedColor
                style = Paint.Style.STROKE
                strokeWidth = ringWidth
                strokeCap = Paint.Cap.ROUND
            }
            canvas.drawArc(rect, -90f, sweepAngle, false, paintActive)
        }

        return bitmap
    }

    fun drawEqualizerBars(
        context: Context,
        barRatios: FloatArray,
        widthDp: Float = 260f,
        heightDp: Float = 68f
    ): Bitmap {
        val widthPx = dpToPx(context, widthDp).toInt().coerceAtLeast(1)
        val heightPx = dpToPx(context, heightDp).toInt().coerceAtLeast(1)

        val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val totalBars = 20
        val spacing = dpToPx(context, 3.5f)
        val totalSpacing = spacing * (totalBars - 1)
        val barWidth = (widthPx - totalSpacing) / totalBars
        val radius = barWidth / 2f

        val paintBar = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#84CC16")
            style = Paint.Style.FILL
        }

        val defaultPattern = floatArrayOf(
            0.25f, 0.65f, 0.45f, 0.55f, 0.3f, 0.7f, 0.5f, 0.2f, 0.12f, 0.35f,
            0.6f, 0.3f, 0.55f, 0.9f, 0.85f, 0.6f, 0.45f, 0.6f, 0.88f, 0.75f
        )

        for (i in 0 until totalBars) {
            val ratio = if (i < barRatios.size && barRatios[i] > 0f) {
                barRatios[i].coerceIn(0.1f, 1f)
            } else {
                defaultPattern[i % defaultPattern.size]
            }

            val minHeightPx = dpToPx(context, 8f)
            val barHeight = minHeightPx + (ratio * (heightPx - minHeightPx))

            val left = i * (barWidth + spacing)
            val right = left + barWidth
            val top = heightPx - barHeight
            val bottom = heightPx.toFloat()

            val rect = RectF(left, top, right, bottom)
            canvas.drawRoundRect(rect, radius, radius, paintBar)
        }

        return bitmap
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
        const val PREFS_NAME = "expenza_widget_data"
        const val KEY_TODAY_SPENT = "today_spent"
        const val KEY_TODAY_COUNT = "today_count"
        const val KEY_CURRENCY = "currency"

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
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val todaySpent = prefs.getFloat(KEY_TODAY_SPENT, 0f).toDouble()
        val todayCount = prefs.getInt(KEY_TODAY_COUNT, 0)
        val currency = prefs.getString(KEY_CURRENCY, "₹") ?: "₹"

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
        val pendingIntent = PendingIntent.getActivity(context, 304, addExpenseIntent, pendingFlags)

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_today_spending)

                val amountStr = if (todaySpent == 0.0) {
                    "$currency 0"
                } else if (todaySpent == todaySpent.toLong().toDouble()) {
                    String.format(Locale.getDefault(), "%s %,d", currency, todaySpent.toLong())
                } else {
                    String.format(Locale.getDefault(), "%s %,.2f", currency, todaySpent)
                }
                views.setTextViewText(R.id.widget_today_amount, amountStr)

                val ringBitmap = WidgetChartUtils.drawMiniProgressRing(context, todayCount, 10, 32f)
                views.setImageViewBitmap(R.id.widget_today_mini_ring, ringBitmap)

                views.setOnClickPendingIntent(R.id.widget_today_root, pendingIntent)
                views.setOnClickPendingIntent(R.id.widget_today_btn, pendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering TodaySpendingWidget", e)
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
import java.util.Locale

class QuickAddWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "QuickAddWidget"
        const val PREFS_NAME = "expenza_widget_data"
        const val KEY_MONTH_SPENT = "month_spent"
        const val KEY_CURRENCY = "currency"

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
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val monthSpent = prefs.getFloat(KEY_MONTH_SPENT, 0f).toDouble()
        val currency = prefs.getString(KEY_CURRENCY, "₹") ?: "₹"

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
        val pendingIntent = PendingIntent.getActivity(context, 303, addExpenseIntent, pendingFlags)

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_quick_add)

                val amountStr = if (monthSpent >= 1000) {
                    String.format(Locale.getDefault(), "%s%,d", currency, monthSpent.toLong())
                } else {
                    String.format(Locale.getDefault(), "%s%d", currency, monthSpent.toLong())
                }
                views.setTextViewText(R.id.widget_quick_add_amount, amountStr)
                views.setTextViewText(R.id.widget_quick_add_trend, "↑ Active Tracking")

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

// ─── BudgetWidgetProvider.kt source ─────────────────────────────────────────
const BUDGET_WIDGET_PROVIDER_KT = `package {{PACKAGE}}

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

class BudgetWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "BudgetWidget"
        const val PREFS_NAME = "expenza_widget_data"
        const val KEY_MONTHLY_BUDGET = "monthly_budget"
        const val KEY_MONTH_SPENT = "month_spent"
        const val KEY_CURRENCY = "currency"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, BudgetWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                    val provider = BudgetWidgetProvider()
                    provider.onUpdate(context, appWidgetManager, appWidgetIds)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating budget widgets", e)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val monthlyBudget = prefs.getFloat(KEY_MONTHLY_BUDGET, 0f).toDouble()
        val monthSpent = prefs.getFloat(KEY_MONTH_SPENT, 0f).toDouble()
        val currency = prefs.getString(KEY_CURRENCY, "₹") ?: "₹"

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
        val addPendingIntent = PendingIntent.getActivity(context, 301, addExpenseIntent, pendingFlags)

        val openBudgetIntent = Intent(context, MainActivity::class.java).apply {
            action = "OPEN_SET_BUDGET"
            data = Uri.parse("expenza://set-budget")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("action", "OPEN_SET_BUDGET")
        }
        val budgetPendingIntent = PendingIntent.getActivity(context, 302, openBudgetIntent, pendingFlags)

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_budget)

                val percentage = if (monthlyBudget > 0) {
                    ((monthSpent / monthlyBudget) * 100).toInt()
                } else {
                    0
                }

                views.setTextViewText(R.id.widget_budget_pct, "$percentage%")

                val spentFormatted = if (monthSpent >= 1000) {
                    String.format(Locale.getDefault(), "%s%,d spent", currency, monthSpent.toLong())
                } else {
                    String.format(Locale.getDefault(), "%s%d spent", currency, monthSpent.toLong())
                }
                views.setTextViewText(R.id.widget_budget_sub, spentFormatted)

                val gaugeBitmap = WidgetChartUtils.drawGradientArcGauge(context, percentage, 170f, 115f, 13f)
                views.setImageViewBitmap(R.id.widget_budget_gauge, gaugeBitmap)

                views.setOnClickPendingIntent(R.id.widget_budget_root, budgetPendingIntent)
                views.setOnClickPendingIntent(R.id.widget_budget_btn_minus, addPendingIntent)
                views.setOnClickPendingIntent(R.id.widget_budget_btn_add, addPendingIntent)
                views.setOnClickPendingIntent(R.id.widget_budget_btn_more, budgetPendingIntent)

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering BudgetWidget", e)
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
import android.widget.RemoteViews

class WhereDidItGoWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "WhereDidItGoWidget"
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
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val cat1Name = prefs.getString(KEY_CAT1_NAME, "FOOD")?.takeIf { it.isNotEmpty() } ?: "FOOD"
        val cat1Pct = prefs.getInt(KEY_CAT1_PCT, 26)
        val cat1Color = prefs.getString(KEY_CAT1_COLOR, "#A78BFA") ?: "#A78BFA"

        val cat2Name = prefs.getString(KEY_CAT2_NAME, "SHOP")?.takeIf { it.isNotEmpty() } ?: "SHOP"
        val cat2Pct = prefs.getInt(KEY_CAT2_PCT, 19)
        val cat2Color = prefs.getString(KEY_CAT2_COLOR, "#60A5FA") ?: "#60A5FA"

        val cat3Name = prefs.getString(KEY_CAT3_NAME, "TRANS")?.takeIf { it.isNotEmpty() } ?: "TRANS"
        val cat3Pct = prefs.getInt(KEY_CAT3_PCT, 15)
        val cat3Color = prefs.getString(KEY_CAT3_COLOR, "#22D3EE") ?: "#22D3EE"

        val cat4Name = prefs.getString(KEY_CAT4_NAME, "BILLS")?.takeIf { it.isNotEmpty() } ?: "BILLS"
        val cat4Pct = prefs.getInt(KEY_CAT4_PCT, 13)
        val cat4Color = prefs.getString(KEY_CAT4_COLOR, "#FB923C") ?: "#FB923C"

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
        val pendingIntent = PendingIntent.getActivity(context, 305, openAppIntent, pendingFlags)

        val slices = listOf(
            WidgetChartUtils.ConcentricSlice(cat1Name, cat1Pct, cat1Color),
            WidgetChartUtils.ConcentricSlice(cat2Name, cat2Pct, cat2Color),
            WidgetChartUtils.ConcentricSlice(cat3Name, cat3Pct, cat3Color),
            WidgetChartUtils.ConcentricSlice(cat4Name, cat4Pct, cat4Color)
        )

        fun shortenLabel(name: String): String {
            return when (name.uppercase()) {
                "FOOD", "FOOD & DRINK", "GROCERIES" -> "FOOD"
                "SHOPPING" -> "SHOP"
                "TRANSPORTATION", "TRAVEL" -> "TRANS"
                "BILLS", "UTILITIES" -> "BILLS"
                "ENTERTAINMENT" -> "FUN"
                "HEALTH" -> "HLTH"
                else -> if (name.length > 5) name.substring(0, 4).uppercase() else name.uppercase()
            }
        }

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_where_did_it_go)

                val ringsBitmap = WidgetChartUtils.drawConcentricRings(context, slices, 106f)
                views.setImageViewBitmap(R.id.widget_breakdown_rings, ringsBitmap)

                views.setTextViewText(R.id.widget_cat1_label, shortenLabel(cat1Name))
                views.setTextViewText(R.id.widget_cat1_pct, "$cat1Pct%")

                views.setTextViewText(R.id.widget_cat2_label, shortenLabel(cat2Name))
                views.setTextViewText(R.id.widget_cat2_pct, "$cat2Pct%")

                views.setTextViewText(R.id.widget_cat3_label, shortenLabel(cat3Name))
                views.setTextViewText(R.id.widget_cat3_pct, "$cat3Pct%")

                views.setTextViewText(R.id.widget_cat4_label, shortenLabel(cat4Name))
                views.setTextViewText(R.id.widget_cat4_pct, "$cat4Pct%")

                views.setOnClickPendingIntent(R.id.widget_breakdown_root, pendingIntent)
                views.setOnClickPendingIntent(R.id.widget_breakdown_btn, pendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering WhereDidItGoWidget", e)
            }
        }
    }
}
`;

// ─── BudgetProgressWidgetProvider.kt source ─────────────────────────────────
const BUDGET_PROGRESS_WIDGET_PROVIDER_KT = `package {{PACKAGE}}

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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class BudgetProgressWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "BudgetProgressWidget"
        const val PREFS_NAME = "expenza_widget_data"
        const val KEY_TODAY_SPENT = "today_spent"
        const val KEY_TODAY_BARS = "today_bars"
        const val KEY_CURRENCY = "currency"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, BudgetProgressWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
                    val provider = BudgetProgressWidgetProvider()
                    provider.onUpdate(context, appWidgetManager, appWidgetIds)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating budget progress widgets", e)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val todaySpent = prefs.getFloat(KEY_TODAY_SPENT, 0f).toDouble()
        val barsRaw = prefs.getString(KEY_TODAY_BARS, "") ?: ""
        val currency = prefs.getString(KEY_CURRENCY, "₹") ?: "₹"

        val barValues = if (barsRaw.isNotEmpty()) {
            try {
                barsRaw.split(",").map { it.trim().toFloatOrNull() ?: 0f }.toFloatArray()
            } catch (e: Exception) {
                floatArrayOf()
            }
        } else {
            floatArrayOf()
        }

        val dateFormat = SimpleDateFormat("dd.MM", Locale.getDefault())
        val dateStr = dateFormat.format(Date())

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
        val pendingIntent = PendingIntent.getActivity(context, 306, openTodayIntent, pendingFlags)

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_budget_progress)

                views.setTextViewText(R.id.widget_budget_prog_month, dateStr)

                val amountStr = if (todaySpent == 0.0) {
                    "0"
                } else if (todaySpent == todaySpent.toLong().toDouble()) {
                    String.format(Locale.getDefault(), "%,d", todaySpent.toLong())
                } else {
                    String.format(Locale.getDefault(), "%,.2f", todaySpent)
                }
                views.setTextViewText(R.id.widget_budget_prog_remaining, amountStr)
                views.setTextViewText(R.id.widget_budget_prog_target, " $currency")

                val equalizerBitmap = WidgetChartUtils.drawEqualizerBars(context, barValues, 260f, 68f)
                views.setImageViewBitmap(R.id.widget_budget_prog_gauge, equalizerBitmap)

                views.setOnClickPendingIntent(R.id.widget_budget_prog_root, pendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering BudgetProgressWidget", e)
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
                TodaySpendingWidgetProvider.updateAllWidgets(context)
                QuickAddWidgetProvider.updateAllWidgets(context)
                BudgetWidgetProvider.updateAllWidgets(context)
                WhereDidItGoWidgetProvider.updateAllWidgets(context)
                BudgetProgressWidgetProvider.updateAllWidgets(context)
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
                putFloat(TodaySpendingWidgetProvider.KEY_TODAY_SPENT, todaySpent.toFloat())
                putInt(TodaySpendingWidgetProvider.KEY_TODAY_COUNT, todayCount.toInt())
                putString(BudgetProgressWidgetProvider.KEY_TODAY_BARS, todayBars)
                putString(TodaySpendingWidgetProvider.KEY_CURRENCY, currency)

                putFloat(BudgetWidgetProvider.KEY_MONTHLY_BUDGET, monthlyBudget.toFloat())
                putFloat(BudgetWidgetProvider.KEY_MONTH_SPENT, monthSpent.toFloat())
                putFloat(QuickAddWidgetProvider.KEY_MONTH_SPENT, monthSpent.toFloat())

                putString(WhereDidItGoWidgetProvider.KEY_CAT1_NAME, cat1Name)
                putInt(WhereDidItGoWidgetProvider.KEY_CAT1_PCT, cat1Pct.toInt())
                putString(WhereDidItGoWidgetProvider.KEY_CAT1_COLOR, cat1Color)

                putString(WhereDidItGoWidgetProvider.KEY_CAT2_NAME, cat2Name)
                putInt(WhereDidItGoWidgetProvider.KEY_CAT2_PCT, cat2Pct.toInt())
                putString(WhereDidItGoWidgetProvider.KEY_CAT2_COLOR, cat2Color)

                putString(WhereDidItGoWidgetProvider.KEY_CAT3_NAME, cat3Name)
                putInt(WhereDidItGoWidgetProvider.KEY_CAT3_PCT, cat3Pct.toInt())
                putString(WhereDidItGoWidgetProvider.KEY_CAT3_COLOR, cat3Color)

                putString(WhereDidItGoWidgetProvider.KEY_CAT4_NAME, cat4Name)
                putInt(WhereDidItGoWidgetProvider.KEY_CAT4_PCT, cat4Pct.toInt())
                putString(WhereDidItGoWidgetProvider.KEY_CAT4_COLOR, cat4Color)

                apply()
            }
            updateAllWidgets(context)
            Log.d(TAG, "Successfully synced 5-widget data: today=$todaySpent, month=$monthSpent, budget=$monthlyBudget")
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
        val todayCount = prefs.getInt(TodaySpendingWidgetProvider.KEY_TODAY_COUNT, 0)

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

// ─── Layout & Drawable XMLs ──────────────────────────────────────────────────
const XML_WIDGET_BUDGET = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_budget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_navy_gradient_bg"
    android:padding="16dp"
    android:gravity="center_horizontal">

    <TextView
        android:id="@+id/widget_budget_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="BUDGET USAGE"
        android:textColor="#8AB4F8"
        android:textSize="11sp"
        android:textStyle="bold"
        android:letterSpacing="0.08" />

    <FrameLayout
        android:layout_width="170dp"
        android:layout_height="115dp"
        android:layout_marginTop="2dp"
        android:layout_marginBottom="2dp">

        <ImageView
            android:id="@+id/widget_budget_gauge"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:scaleType="fitCenter" />

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:orientation="vertical"
            android:gravity="center"
            android:layout_marginTop="10dp">

            <TextView
                android:id="@+id/widget_budget_pct"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="61%"
                android:textColor="#FFFFFF"
                android:textSize="34sp"
                android:textStyle="bold"
                android:includeFontPadding="false" />

            <TextView
                android:id="@+id/widget_budget_sub"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="₹18,450 spent"
                android:textColor="#8AB4F8"
                android:textSize="11sp"
                android:textStyle="bold"
                android:layout_marginTop="1dp" />
        </LinearLayout>
    </FrameLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="44dp"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginTop="8dp">

        <FrameLayout
            android:id="@+id/widget_budget_btn_minus"
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:background="@drawable/widget_pill_navy_btn"
            android:layout_marginEnd="6dp">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_gravity="center"
                android:text="−"
                android:textColor="#FFFFFF"
                android:textSize="20sp"
                android:textStyle="bold" />
        </FrameLayout>

        <FrameLayout
            android:id="@+id/widget_budget_btn_add"
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1.2"
            android:background="@drawable/widget_pill_accent_btn"
            android:layout_marginEnd="6dp">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_gravity="center"
                android:text="⚡"
                android:textColor="#FFFFFF"
                android:textSize="16sp" />
        </FrameLayout>

        <FrameLayout
            android:id="@+id/widget_budget_btn_more"
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:background="@drawable/widget_pill_navy_btn">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_gravity="center"
                android:text="+"
                android:textColor="#FFFFFF"
                android:textSize="20sp"
                android:textStyle="bold" />
        </FrameLayout>
    </LinearLayout>
</LinearLayout>
`;

const XML_WIDGET_QUICK_ADD = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_quick_add_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_blue_gradient_bg"
    android:padding="20dp"
    android:gravity="center_horizontal">

    <TextView
        android:id="@+id/widget_quick_add_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="MONTHLY SPENT"
        android:textColor="#D1E9FF"
        android:textSize="11sp"
        android:textStyle="bold"
        android:letterSpacing="0.1" />

    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="vertical"
        android:gravity="center">

        <TextView
            android:id="@+id/widget_quick_add_amount"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="₹18,450"
            android:textColor="#FFFFFF"
            android:textSize="36sp"
            android:textStyle="bold"
            android:letterSpacing="-0.02" />

        <TextView
            android:id="@+id/widget_quick_add_trend"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="↑ 4.2% vs last month"
            android:textColor="#00FF66"
            android:textSize="12sp"
            android:textStyle="bold"
            android:layout_marginTop="2dp" />
    </LinearLayout>

    <FrameLayout
        android:id="@+id/widget_quick_add_btn"
        android:layout_width="match_parent"
        android:layout_height="46dp"
        android:background="@drawable/widget_pill_blue_btn">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:text="+ Add Expense"
            android:textColor="#FFFFFF"
            android:textSize="14.5sp"
            android:textStyle="bold" />
    </FrameLayout>
</LinearLayout>
`;

const XML_WIDGET_TODAY = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_today_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_midnight_gradient_bg"
    android:padding="20dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_today_app_name"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Expenza"
            android:textColor="#FFFFFF"
            android:textSize="15sp"
            android:textStyle="bold" />

        <ImageView
            android:id="@+id/widget_today_mini_ring"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:scaleType="fitCenter" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="vertical"
        android:gravity="center">

        <TextView
            android:id="@+id/widget_today_label"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="TODAY\'S SPENT"
            android:textColor="#9CA3AF"
            android:textSize="12sp"
            android:textStyle="bold"
            android:letterSpacing="0.08" />

        <TextView
            android:id="@+id/widget_today_amount"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="₹ 780"
            android:textColor="#FFFFFF"
            android:textSize="36sp"
            android:textStyle="bold"
            android:letterSpacing="0.04"
            android:layout_marginTop="2dp" />
    </LinearLayout>

    <FrameLayout
        android:id="@+id/widget_today_btn"
        android:layout_width="match_parent"
        android:layout_height="46dp"
        android:background="@drawable/widget_pill_accent_btn">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:text="+ QUICK ADD"
            android:textColor="#FFFFFF"
            android:textSize="14.5sp"
            android:textStyle="bold"
            android:letterSpacing="0.04" />
    </FrameLayout>
</LinearLayout>
`;

const XML_WIDGET_BREAKDOWN = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_breakdown_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_purple_gradient_bg"
    android:padding="16dp"
    android:gravity="center_horizontal">

    <TextView
        android:id="@+id/widget_breakdown_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="WHERE DID IT GO?"
        android:textColor="#A78BFA"
        android:textSize="11sp"
        android:textStyle="bold"
        android:letterSpacing="0.08" />

    <ImageView
        android:id="@+id/widget_breakdown_rings"
        android:layout_width="106dp"
        android:layout_height="106dp"
        android:layout_marginTop="2dp"
        android:layout_marginBottom="4dp"
        android:scaleType="fitCenter" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginBottom="8dp">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center">

            <TextView
                android:id="@+id/widget_cat1_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="FOOD"
                android:textColor="#A78BFA"
                android:textSize="8.5sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_cat1_pct"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="26%"
                android:textColor="#FFFFFF"
                android:textSize="12sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center">

            <TextView
                android:id="@+id/widget_cat2_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="SHOP"
                android:textColor="#A78BFA"
                android:textSize="8.5sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_cat2_pct"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="19%"
                android:textColor="#FFFFFF"
                android:textSize="12sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center">

            <TextView
                android:id="@+id/widget_cat3_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="TRANS"
                android:textColor="#A78BFA"
                android:textSize="8.5sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_cat3_pct"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="15%"
                android:textColor="#FFFFFF"
                android:textSize="12sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center">

            <TextView
                android:id="@+id/widget_cat4_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="BILLS"
                android:textColor="#A78BFA"
                android:textSize="8.5sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_cat4_pct"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="13%"
                android:textColor="#FFFFFF"
                android:textSize="12sp"
                android:textStyle="bold" />
        </LinearLayout>
    </LinearLayout>

    <FrameLayout
        android:id="@+id/widget_breakdown_btn"
        android:layout_width="match_parent"
        android:layout_height="42dp"
        android:background="@drawable/widget_pill_purple_btn">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:text="View Breakdown ↗"
            android:textColor="#FFFFFF"
            android:textSize="13.5sp"
            android:textStyle="bold" />
    </FrameLayout>
</LinearLayout>
`;

const XML_WIDGET_EQUALIZER = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_budget_prog_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_forest_green_bg"
    android:paddingTop="20dp"
    android:paddingStart="18dp"
    android:paddingEnd="18dp"
    android:gravity="center_horizontal">

    <TextView
        android:id="@+id/widget_budget_prog_month"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="25.08"
        android:textColor="#9AE600"
        android:textSize="12.5sp"
        android:textStyle="bold"
        android:letterSpacing="0.04" />

    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="vertical"
        android:gravity="center"
        android:layout_marginTop="6dp">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="TODAY\'S SPENDING"
            android:textColor="#9AE600"
            android:textSize="10.5sp"
            android:textStyle="bold"
            android:letterSpacing="0.1" />

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="bottom"
            android:layout_marginTop="2dp">

            <TextView
                android:id="@+id/widget_budget_prog_remaining"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="780"
                android:textColor="#F7FCEB"
                android:textSize="40sp"
                android:textStyle="bold"
                android:letterSpacing="-0.02"
                android:includeFontPadding="false" />

            <TextView
                android:id="@+id/widget_budget_prog_target"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text=" ₹"
                android:textColor="#9AE600"
                android:textSize="18sp"
                android:textStyle="bold"
                android:layout_marginBottom="4dp" />
        </LinearLayout>
    </LinearLayout>

    <ImageView
        android:id="@+id/widget_budget_prog_gauge"
        android:layout_width="match_parent"
        android:layout_height="68dp"
        android:scaleType="fitXY" />
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
        "WidgetChartUtils.kt": WIDGET_CHART_UTILS_KT,
        "TodaySpendingWidgetProvider.kt": TODAY_SPENDING_WIDGET_PROVIDER_KT,
        "QuickAddWidgetProvider.kt": QUICK_ADD_WIDGET_PROVIDER_KT,
        "BudgetWidgetProvider.kt": BUDGET_WIDGET_PROVIDER_KT,
        "WhereDidItGoWidgetProvider.kt": WHERE_DID_IT_GO_WIDGET_PROVIDER_KT,
        "BudgetProgressWidgetProvider.kt": BUDGET_PROGRESS_WIDGET_PROVIDER_KT,
        "ReminderReceiver.kt": REMINDER_RECEIVER_KT,
      };

      for (const [filename, content] of Object.entries(files)) {
        const filepath = path.join(javaDir, filename);
        fs.writeFileSync(filepath, content.replace(/\{\{PACKAGE\}\}/g, pkg));
      }

      // Layout XMLs
      fs.writeFileSync(path.join(resDir, "layout", "widget_budget.xml"), XML_WIDGET_BUDGET);
      fs.writeFileSync(path.join(resDir, "layout", "widget_quick_add.xml"), XML_WIDGET_QUICK_ADD);
      fs.writeFileSync(path.join(resDir, "layout", "widget_today_spending.xml"), XML_WIDGET_TODAY);
      fs.writeFileSync(path.join(resDir, "layout", "widget_where_did_it_go.xml"), XML_WIDGET_BREAKDOWN);
      fs.writeFileSync(path.join(resDir, "layout", "widget_budget_progress.xml"), XML_WIDGET_EQUALIZER);

      // Widget Provider Info XMLs
      const makeWidgetInfoXml = (layoutName, descRes) => `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="160dp"
    android:minHeight="160dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:description="${descRes}"
    android:previewImage="@mipmap/ic_launcher"
    android:initialLayout="@layout/${layoutName}"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
`;

      fs.writeFileSync(path.join(resDir, "xml", "budget_widget_info.xml"), makeWidgetInfoXml("widget_budget", "@string/widget_budget_description"));
      fs.writeFileSync(path.join(resDir, "xml", "quick_add_widget_info.xml"), makeWidgetInfoXml("widget_quick_add", "@string/widget_quick_add_description"));
      fs.writeFileSync(path.join(resDir, "xml", "today_spending_widget_info.xml"), makeWidgetInfoXml("widget_today_spending", "@string/widget_today_spending_description"));
      fs.writeFileSync(path.join(resDir, "xml", "where_did_it_go_widget_info.xml"), makeWidgetInfoXml("widget_where_did_it_go", "@string/widget_breakdown_description"));
      fs.writeFileSync(path.join(resDir, "xml", "budget_progress_widget_info.xml"), makeWidgetInfoXml("widget_budget_progress", "@string/widget_budget_progress_description"));

      // Drawables
      const drawables = {
        "widget_navy_gradient_bg.xml": `<shape xmlns:android="http://schemas.android.com/apk/res/android"><gradient android:type="linear" android:angle="270" android:startColor="#11325A" android:endColor="#061930"/><corners android:radius="26dp"/><stroke android:width="1dp" android:color="#1E4472"/></shape>`,
        "widget_blue_gradient_bg.xml": `<shape xmlns:android="http://schemas.android.com/apk/res/android"><gradient android:type="linear" android:angle="315" android:startColor="#20A2F7" android:endColor="#0057FF"/><corners android:radius="26dp"/></shape>`,
        "widget_midnight_gradient_bg.xml": `<shape xmlns:android="http://schemas.android.com/apk/res/android"><gradient android:type="linear" android:angle="270" android:startColor="#0C335F" android:endColor="#000103"/><corners android:radius="26dp"/><stroke android:width="1dp" android:color="#1A4068"/></shape>`,
        "widget_purple_gradient_bg.xml": `<shape xmlns:android="http://schemas.android.com/apk/res/android"><gradient android:type="linear" android:angle="270" android:startColor="#2B1865" android:endColor="#190B44"/><corners android:radius="26dp"/><stroke android:width="1dp" android:color="#3D267E"/></shape>`,
        "widget_forest_green_bg.xml": `<shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="#193102"/><corners android:radius="26dp"/><stroke android:width="1dp" android:color="#2D5208"/></shape>`,
        "widget_pill_navy_btn.xml": `<shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="#0E488F"/><corners android:radius="14dp"/></shape>`,
        "widget_pill_accent_btn.xml": `<shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="#0075FF"/><corners android:radius="14dp"/></shape>`,
        "widget_pill_blue_btn.xml": `<shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="#0075FF"/><corners android:radius="24dp"/><stroke android:width="1.5dp" android:color="#4DA6FF"/></shape>`,
        "widget_pill_purple_btn.xml": `<shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="#6D4DE3"/><corners android:radius="24dp"/><stroke android:width="1dp" android:color="#8B6EF3"/></shape>`,
      };

      for (const [filename, content] of Object.entries(drawables)) {
        fs.writeFileSync(path.join(resDir, "drawable", filename), content);
      }

      // Colors with theme primary colors
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

    addReceiver(".TodaySpendingWidgetProvider", "@string/widget_today_spending_title", "@xml/today_spending_widget_info");
    addReceiver(".QuickAddWidgetProvider", "@string/widget_quick_add_title", "@xml/quick_add_widget_info");
    addReceiver(".BudgetWidgetProvider", "@string/widget_budget_title", "@xml/budget_widget_info");
    addReceiver(".WhereDidItGoWidgetProvider", "@string/widget_breakdown_title", "@xml/where_did_it_go_widget_info");
    addReceiver(".BudgetProgressWidgetProvider", "@string/widget_budget_progress_title", "@xml/budget_progress_widget_info");

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
      widget_today_spending_title: '"Today\'s Spending"',
      widget_today_spending_description: '"Glance at what you\'ve spent today"',
      widget_quick_add_title: '"Monthly Spending"',
      widget_quick_add_description: '"View monthly total and quickly log expenses"',
      widget_budget_title: '"Budget"',
      widget_budget_description: '"View current monthly budget usage"',
      widget_breakdown_title: '"Where Did It Go?"',
      widget_breakdown_description: '"Monthly category spending breakdown"',
      widget_budget_progress_title: '"Daily Activity"',
      widget_budget_progress_description: '"Track daily spending equalizer histogram"',
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
