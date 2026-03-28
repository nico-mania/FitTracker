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
  private var stepDetectorSensor: Sensor? = null
  private var stepsToday = 0
  private val handler = Handler(Looper.getMainLooper())

  // Returns the day key adjusted for the user's reset hour.
  // E.g. if reset is at 4:00 and it's 2:00, we're still "yesterday".
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
      // Check for a reset signal written by JS before restoring saved steps
      if (checkResetSignal(currentDayKey)) {
        stepsToday = 0
      } else {
        stepsToday = sharedPreferences.getInt(STEPS_KEY, 0)
      }
    }

    writeStepsToFile(stepsToday, currentDayKey)

    sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
    stepDetectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
    if (stepDetectorSensor != null) {
      sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_NORMAL)
    }

    createNotificationChannel()
    startForegroundCompat()

    // Periodically check for day rollover and reset signal (every 30 s)
    schedulePeriodicCheck()
  }

  private fun schedulePeriodicCheck() {
    handler.postDelayed({
      val resetHour = getResetHour()
      val currentDayKey = getCurrentDayKey(resetHour)
      val lastDayKey = sharedPreferences.getString(LAST_DAY_KEY, currentDayKey)

      when {
        lastDayKey != currentDayKey -> {
          // Day rolled over
          stepsToday = 0
          sharedPreferences.edit()
            .putInt(STEPS_KEY, 0)
            .putString(LAST_DAY_KEY, currentDayKey)
            .apply()
          writeStepsToFile(0, currentDayKey)
          updateNotification()
        }
        checkResetSignal(currentDayKey) -> {
          stepsToday = 0
          sharedPreferences.edit().putInt(STEPS_KEY, 0).apply()
          writeStepsToFile(0, currentDayKey)
          updateNotification()
        }
      }

      schedulePeriodicCheck()
    }, 5_000L)
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

  // Write steps.txt (step count) and day.txt (current day key) for JS to read.
  private fun writeStepsToFile(steps: Int, dayKey: String) {
    try {
      File(filesDir, "steps.txt").writeText(steps.toString())
      File(filesDir, "day.txt").writeText(dayKey)
    } catch (_: Exception) {}
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForegroundCompat()
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
    if (event?.sensor?.type != Sensor.TYPE_STEP_DETECTOR) return
    if (event.values.isEmpty() || event.values[0] != 1.0f) return

    val resetHour = sharedPreferences.getInt(RESET_HOUR_KEY, 4)
    val currentDayKey = getCurrentDayKey(resetHour)
    val lastDayKey = sharedPreferences.getString(LAST_DAY_KEY, currentDayKey)

    if (lastDayKey != currentDayKey) {
      // Day rolled over mid-session
      stepsToday = 0
      sharedPreferences.edit().putString(LAST_DAY_KEY, currentDayKey).apply()
    }

    stepsToday += 1
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
      .setContentText("Schritte heute: $stepsToday")
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
