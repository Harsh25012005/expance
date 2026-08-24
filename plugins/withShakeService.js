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

    companion object {
        private const val TAG = "ShakeService"
        private const val ONGOING_CHANNEL_ID = "shake_service_channel"
        private const val ALERT_CHANNEL_ID = "shake_alert_channel"
        private const val NOTIFICATION_ID = 9001
        private const val ALERT_NOTIFICATION_ID = 9002
        private const val SHAKE_DEBOUNCE_MS = 2000L
        var shakeThreshold: Float = 20.0f
        var isRunning: Boolean = false
            private set
        var isAppInForeground: Boolean = true

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
        startForeground(NOTIFICATION_ID, createOngoingNotification())

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
                Log.d(TAG, "[SHAKE DEBUG] Shake detected in native sensor (delta=\$delta, threshold=\$shakeThreshold)")

                // FOREGROUND: open popup directly via JS event — NO notification
                if (isAppInForeground) {
                    Log.d(TAG, "[SHAKE] DETECTED")
                    Log.d(TAG, "[SHAKE] APP_STATE: active (foreground)")
                    Log.d(TAG, "[SHAKE] FOREGROUND PATH — emitting to JS, no notification")
                    val emitted = ShakeServiceModule.emitShakeToJS()
                    if (!emitted) {
                        Log.e(TAG, "[SHAKE ERROR] Failed to emit to JS while foreground — React instance not ready")
                    }
                    // STOP — do NOT fall through to notification
                    return
                }

                // BACKGROUND: app is not in foreground, use notification/intent fallback
                Log.d(TAG, "[SHAKE] DETECTED")
                Log.d(TAG, "[SHAKE] APP_STATE: background / inactive")
                // Try to emit to JS first (app may still have active React instance)
                val emittedToJS = ShakeServiceModule.emitShakeToJS()
                if (emittedToJS) {
                    Log.d(TAG, "[SHAKE] Emitted to JS from background — skipping notification")
                    return
                }
                Log.d(TAG, "[SHAKE] Launching intent and notification fallback")
                onShakeDetectedBackground()
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun onShakeDetectedBackground() {
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

        val shakeIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse("expenza://add-expense")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }

        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val fullScreenPendingIntent = PendingIntent.getActivity(this, 101, shakeIntent, pendingIntentFlags)

        // Try direct startActivity to bring app to foreground
        try {
            startActivity(shakeIntent)
            Log.d(TAG, "[SHAKE DEBUG] Direct startActivity called to bring Expenza to foreground")
        } catch (e: Exception) {
            Log.d(TAG, "[SHAKE DEBUG] Direct startActivity restricted by OS, falling back to FullScreen notification", e)
        }

        try {
            val iconRes = resources.getIdentifier("notification_icon", "drawable", packageName)
            val icon = if (iconRes != 0) iconRes else android.R.drawable.ic_input_add

            val alertNotification = NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setSmallIcon(icon)
                .setContentTitle("Shake Detected")
                .setContentText("Tap to quickly log an expense")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(fullScreenPendingIntent)
                .setAutoCancel(true)
                .setVibrate(longArrayOf(0, 150, 80, 150))
                .addAction(android.R.drawable.ic_input_add, "Add Expense", fullScreenPendingIntent)
                .build()

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.notify(ALERT_NOTIFICATION_ID, alertNotification)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to post alert notification", e)
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

            val alertChannel = NotificationChannel(
                ALERT_CHANNEL_ID,
                "Shake Expense Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Instant alerts when shake is detected"
                setShowBadge(true)
                enableVibration(true)
                enableLights(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }

            val nm = getSystemService(NotificationManager::class.java)
            nm?.createNotificationChannel(ongoingChannel)
            nm?.createNotificationChannel(alertChannel)
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
    fun setAppForeground(isForeground: Boolean) {
        ShakeService.isAppInForeground = isForeground
        Log.d(TAG, "[SHAKE DEBUG] Updated ShakeService isAppInForeground to \$isForeground")
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(ShakeService.isRunning)
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

// ─── Helper: resolve package directory path ──────────────────────────────────
function getPackageDirPath(config) {
  const pkg =
    config.android?.package || config.extra?.eas?.projectId || "com.harsh.expense";
  const pkgDir = path.join(...pkg.split("."));
  return { pkg, pkgDir };
}

// ─── 1. Write Kotlin files during prebuild ───────────────────────────────────
function withShakeServiceFiles(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const { pkg, pkgDir } = getPackageDirPath(config);
      const javaDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        pkgDir
      );

      fs.mkdirSync(javaDir, { recursive: true });

      const files = {
        "ShakeService.kt": SHAKE_SERVICE_KT,
        "BootReceiver.kt": BOOT_RECEIVER_KT,
        "ShakeServiceModule.kt": SHAKE_SERVICE_MODULE_KT,
        "ShakeServicePackage.kt": SHAKE_SERVICE_PACKAGE_KT,
      };

      for (const [filename, content] of Object.entries(files)) {
        const filepath = path.join(javaDir, filename);
        fs.writeFileSync(filepath, content.replace(/\{\{PACKAGE\}\}/g, pkg));
        console.log(`[withShakeService] Wrote ${filepath}`);
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
    val uri = intent.dataString
    if (uri != null && (uri.contains("add-expense") || uri.contains("shake-open"))) {
      Log.d("MainActivity", "[SHAKE DEBUG] onNewIntent received add-expense intent: \$uri")
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
