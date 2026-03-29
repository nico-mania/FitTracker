package com.manikarov.fittracker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import java.io.File
import java.util.Calendar

class StepForegroundService : Service(), SensorEventListener {

  companion object {
    const val CHANNEL_ID = "fittracker_step_channel"
    const val NOTIFICATION_ID = 1101
    const val PREFS_NAME = "FitTrackerPrefs"
    const val STEPS_KEY = "stepsToday"
    const val LAST_DAY_KEY = "lastDayKey"
    const val RESET_HOUR_KEY = "resetHour"
  }

  private lateinit var sensorManager: SensorManager
  private lateinit var sharedPreferences: SharedPreferences
  private var stepCounterSensor: Sensor? = null
  private var stepsToday = 0

  // TYPE_STEP_COUNTER is cumulative since boot — we track a base to compute deltas
  private var stepsAtServiceStart = 0   // stepsToday value when this service instance started
  private var baseStepCount: Long = -1  // hardware counter value at first sensor event
  private var lastHardwareCount: Long = -1 // most recent hardware counter, used during resets

  private val handler = Handler(Looper.getMainLooper())

  // Returns the day key adjusted for the user's reset hour.
  private fun getCurrentDayKey(resetHour: Int): String {
    val cal = Calendar.getInstance()
    if (cal.get(Calendar.HOUR_OF_DAY) < resetHour) {
      cal.add(Calendar.DATE, -1)
    }
    val y = cal.get(Calendar.YEAR)
    val m = String.format("%02d", cal.get(Calendar.MONTH) + 1)
    val d = String.format("%02d", cal.get(Calendar.DAY_OF_MONTH))
    return "$y-$m-$d"
  }

  // Read reset hour from JS-written file; fall back to SharedPreferences.
  private fun getResetHour(): Int {
    try {
      val file = File(filesDir, "reset_hour.txt")
      if (file.exists()) {
        val h = file.readText().trim().toIntOrNull()
        if (h != null && h in 0..23) {
          sharedPreferences.edit().putInt(RESET_HOUR_KEY, h).apply()
          return h
        }
      }
    } catch (_: Exception) {}
    return sharedPreferences.getInt(RESET_HOUR_KEY, 4)
  }

  override fun onCreate() {
    super.onCreate()
    sharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    val resetHour = getResetHour()
    val currentDayKey = getCurrentDayKey(resetHour)
    val lastDayKey = sharedPreferences.getString(LAST_DAY_KEY, currentDayKey)

    if (lastDayKey != currentDayKey) {
      // New tracking period — reset
      stepsToday = 0
      sharedPreferences.edit()
        .putInt(STEPS_KEY, 0)
        .putString(LAST_DAY_KEY, currentDayKey)
        .apply()
    } else {
      if (checkResetSignal(currentDayKey)) {
        stepsToday = 0
      } else {
        stepsToday = sharedPreferences.getInt(STEPS_KEY, 0)
      }
    }

    // Remember what stepsToday was when this service instance started,
    // so we can add the TYPE_STEP_COUNTER delta on top of it
    stepsAtServiceStart = stepsToday

    writeStepsToFile(stepsToday, currentDayKey)

    sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
    // TYPE_STEP_COUNTER: cumulative hardware counter — much more reliable in
    // the background than TYPE_STEP_DETECTOR (which requires CPU to be awake)
    stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    if (stepCounterSensor != null) {
      sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_NORMAL)
    }

    createNotificationChannel()
    startForegroundCompat()

    // Periodically check for day rollover and reset signal (every 5 s)
    schedulePeriodicCheck()
  }

  private fun schedulePeriodicCheck() {
    handler.postDelayed({
      val resetHour = getResetHour()
      val currentDayKey = getCurrentDayKey(resetHour)
      val lastDayKey = sharedPreferences.getString(LAST_DAY_KEY, currentDayKey)

      if (lastDayKey != currentDayKey) {
        // Day rolled over — reset and re-anchor the counter base
        applyReset(currentDayKey)
      } else if (checkResetSignal(currentDayKey)) {
        // JS sent a reset signal
        applyReset(currentDayKey)
      }
      // Always sync from JS and refresh notification every tick,
      // regardless of whether a reset just happened
      syncFromJsSteps(currentDayKey)

      schedulePeriodicCheck()
    }, 5_000L)
  }

  // Resets step count and re-anchors the hardware counter base so that
  // the next sensor event correctly produces a delta of 0.
  private fun applyReset(currentDayKey: String) {
    stepsToday = 0
    stepsAtServiceStart = 0
    if (lastHardwareCount >= 0) baseStepCount = lastHardwareCount
    sharedPreferences.edit()
      .putInt(STEPS_KEY, 0)
      .putString(LAST_DAY_KEY, currentDayKey)
      .apply()
    writeStepsToFile(0, currentDayKey)
    updateNotification()
  }

  // Returns true and cleans up if a JS reset signal file exists.
  private fun checkResetSignal(currentDayKey: String): Boolean {
    return try {
      val signalFile = File(filesDir, "reset_signal.txt")
      if (signalFile.exists()) {
        signalFile.delete()
        sharedPreferences.edit()
          .putInt(STEPS_KEY, 0)
          .putString(LAST_DAY_KEY, currentDayKey)
          .apply()
        true
      } else false
    } catch (_: Exception) { false }
  }

  // Read JS-written step count and adopt it if higher than current service count.
  // This keeps the notification in sync with what the app actually displays.
  private fun syncFromJsSteps(currentDayKey: String) {
    try {
      val stepsFile = File(filesDir, "js_steps.txt")
      val dateFile  = File(filesDir, "js_steps_date.txt")
      if (!stepsFile.exists() || !dateFile.exists()) { updateNotification(); return }
      val jsDate  = dateFile.readText().trim()
      val jsSteps = stepsFile.readText().trim().toIntOrNull()
      if (jsSteps != null && jsDate == currentDayKey && jsSteps > stepsToday) {
        stepsToday = jsSteps
        stepsAtServiceStart = jsSteps
        // Re-anchor base so next sensor delta starts from the synced value
        if (lastHardwareCount >= 0) baseStepCount = lastHardwareCount
        sharedPreferences.edit().putInt(STEPS_KEY, stepsToday).apply()
        writeStepsToFile(stepsToday, currentDayKey)
      }
    } catch (_: Exception) {}
    updateNotification()
  }

  // Write steps.txt and day.txt for JS to read.
  private fun writeStepsToFile(steps: Int, dayKey: String) {
    try {
      File(filesDir, "steps.txt").writeText(steps.toString())
      File(filesDir, "day.txt").writeText(dayKey)
    } catch (_: Exception) {}
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForegroundCompat()
    // Sync JS step count immediately when app (re)opens — JS may have written
    // js_steps.txt from a previous session or just written it on this launch
    val currentDayKey = getCurrentDayKey(getResetHour())
    syncFromJsSteps(currentDayKey)
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    sensorManager.unregisterListener(this)
    stopForeground(true)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onSensorChanged(event: SensorEvent?) {
    if (event?.sensor?.type != Sensor.TYPE_STEP_COUNTER) return
    if (event.values.isEmpty()) return

    val hardwareCount = event.values[0].toLong()
    lastHardwareCount = hardwareCount

    // Anchor the base on the very first event after (re)start
    if (baseStepCount < 0) {
      baseStepCount = hardwareCount
    }

    val resetHour = sharedPreferences.getInt(RESET_HOUR_KEY, 4)
    val currentDayKey = getCurrentDayKey(resetHour)
    val lastDayKey = sharedPreferences.getString(LAST_DAY_KEY, currentDayKey)

    if (lastDayKey != currentDayKey) {
      // Day rolled over mid-session — re-anchor so delta restarts from 0
      stepsAtServiceStart = 0
      baseStepCount = hardwareCount
      sharedPreferences.edit().putString(LAST_DAY_KEY, currentDayKey).apply()
    }

    // Delta from the hardware counter since this service instance started,
    // added on top of the saved steps from before the service started
    val delta = (hardwareCount - baseStepCount).coerceAtLeast(0).toInt()
    stepsToday = stepsAtServiceStart + delta

    sharedPreferences.edit().putInt(STEPS_KEY, stepsToday).apply()
    writeStepsToFile(stepsToday, currentDayKey)
    updateNotification()
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "FitTracker Schritt Service",
        NotificationManager.IMPORTANCE_LOW
      )
      channel.description = "Pedometer Foreground Service"
      (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
        .createNotificationChannel(channel)
    }
  }

  private fun startForegroundCompat() {
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun buildNotification(): Notification {
    val intent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val pendingIntent = PendingIntent.getActivity(
      this, 0, intent,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("FitTracker läuft")
      .setContentText("Schrittzähler aktiv")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentIntent(pendingIntent)
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .build()
  }

  private fun updateNotification() {
    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
      .notify(NOTIFICATION_ID, buildNotification())
  }
}
