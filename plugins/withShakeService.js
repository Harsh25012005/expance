/**
 * Expo Config Plugin: withShakeService
 *
 * Injects the native Android ShakeService foreground service, ShakeServiceModule,
 * and ShakeServicePackage into the generated android/ directory during expo prebuild.
 *
 * This is required because the android/ directory is gitignored and regenerated
 * by EAS Build. Without this plugin, the native Kotlin files would be lost.
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
        private const val CHANNEL_ID = "shake_service_channel"
        private const val NOTIFICATION_ID = 9001
        private const val SHAKE_DEBOUNCE_MS = 1500L
        var shakeThreshold: Float = 15.0f
        var isRunning: Boolean = false
            private set

        fun start(context: Context, threshold: Float = 15.0f) {
            shakeThreshold = threshold
            val intent = Intent(context, ShakeService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, ShakeService::class.java))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "ShakeService onCreate")
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ShakeExpense::ShakeSensorWakeLock").apply { acquire() }
        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        if (accelerometer != null) {
            sensorManager?.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL)
            Log.d(TAG, "Accelerometer registered (threshold=\$shakeThreshold)")
        } else {
            Log.e(TAG, "No accelerometer found")
        }
        isRunning = true
    }

    override fun onDestroy() {
        Log.d(TAG, "ShakeService onDestroy")
        sensorManager?.unregisterListener(this)
        wakeLock?.let { if (it.isHeld) it.release() }
        isRunning = false
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(TAG, "App removed from recents — stopping")
        stopSelf()
        super.onTaskRemoved(rootIntent)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_NOT_STICKY

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type != Sensor.TYPE_ACCELEROMETER) return
        val x = event.values[0]; val y = event.values[1]; val z = event.values[2]
        if (!initialized) { lastX = x; lastY = y; lastZ = z; initialized = true; return }
        val delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ)
        lastX = x; lastY = y; lastZ = z
        if (delta > shakeThreshold) {
            val now = System.currentTimeMillis()
            if (now - lastShakeTime > SHAKE_DEBOUNCE_MS) {
                lastShakeTime = now
                Log.d(TAG, "Shake detected! delta=\$delta")
                onShakeDetected()
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun onShakeDetected() {
        try {
            val intent = Intent(this, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse("exp+expense://shake-open")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch MainActivity", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Shake Expense Listener", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Listening for shake gestures"
                setShowBadge(false); enableVibration(false); enableLights(false)
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val tapIntent = PendingIntent.getActivity(this, 0,
            Intent(this, MainActivity::class.java).apply { addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP) },
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val iconRes = resources.getIdentifier("notification_icon", "drawable", packageName)
        val icon = if (iconRes != 0) iconRes else android.R.drawable.ic_dialog_info
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("\\u26A1 ShakeExpense Active")
            .setContentText("Shake your phone to log an expense")
            .setSmallIcon(icon).setContentIntent(tapIntent)
            .setOngoing(true).setPriority(NotificationCompat.PRIORITY_LOW).setSilent(true).build()
    }
}`;

// ─── ShakeServiceModule.kt source ────────────────────────────────────────────
const SHAKE_SERVICE_MODULE_KT = `package {{PACKAGE}}

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.util.Log

class ShakeServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object { private const val TAG = "ShakeServiceModule" }
    override fun getName(): String = "ShakeServiceModule"

    @ReactMethod
    fun startService(sensitivity: String) {
        val threshold = when (sensitivity) { "low" -> 22.0f; "medium" -> 15.0f; "high" -> 10.0f; else -> 15.0f }
        Log.d(TAG, "Starting ShakeService sensitivity=\$sensitivity threshold=\$threshold")
        ShakeService.start(reactApplicationContext, threshold)
    }

    @ReactMethod
    fun stopService() { Log.d(TAG, "Stopping ShakeService"); ShakeService.stop(reactApplicationContext) }

    @ReactMethod
    fun isRunning(promise: Promise) { promise.resolve(ShakeService.isRunning) }
}`;

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
}`;

// ─── Helper: resolve package directory path ──────────────────────────────────
function getPackageDirPath(config) {
  const pkg =
    config.android?.package || config.extra?.eas?.projectId || "com.harsh.expense";
  const pkgDir = pkg.replace(/\./g, "/");
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

      // Ensure the directory exists
      fs.mkdirSync(javaDir, { recursive: true });

      // Write each Kotlin file
      const files = {
        "ShakeService.kt": SHAKE_SERVICE_KT,
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

// ─── 2. Register ShakeService in AndroidManifest.xml ─────────────────────────
function withShakeServiceManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return config;

    // Check if service is already declared
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
              "android:name":
                "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
              "android:value":
                "Accelerometer-based shake gesture detection for instant expense logging while app is in background",
            },
          },
        ],
      });
      app.service = services;
      console.log("[withShakeService] Registered ShakeService in AndroidManifest.xml");
    }

    return config;
  });
}

// ─── 3. Register ShakeServicePackage in MainApplication ──────────────────────
function withShakeServiceMainApplication(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    // Add import if not present
    if (!contents.includes("ShakeServicePackage")) {
      // Add the package to the packages list
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
      // Add import for Intent
      if (!contents.includes("import android.content.Intent")) {
        contents = contents.replace(
          "import android.os.Bundle",
          "import android.content.Intent\nimport android.os.Bundle"
        );
      }

      // Add onNewIntent override after onCreate
      const onCreateEnd = contents.indexOf("super.onCreate(null)");
      if (onCreateEnd !== -1) {
        const insertPos = contents.indexOf("}", onCreateEnd) + 1;
        const onNewIntentMethod = `

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
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
