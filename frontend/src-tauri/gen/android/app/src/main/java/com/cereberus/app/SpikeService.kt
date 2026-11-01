package com.cereberus.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Process
import androidx.core.app.NotificationCompat
import java.io.File
import java.util.Date
import kotlin.concurrent.thread

/**
 * Spike S1 (specs/encrypted-vault-sync/spec-1-crypto-core.md): Rust reached from a
 * service, in a process of its own (android:process in the manifest), so neither
 * MainActivity nor Tauri has run there. Throwaway.
 */
class SpikeService : Service() {
  private external fun nativeRoundTrip(): String

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    thread {
      val result = try {
        System.loadLibrary("app_lib")
        nativeRoundTrip()
      } catch (t: Throwable) {
        "FAILED: $t"
      }
      val process = if (Build.VERSION.SDK_INT >= 28) Application.getProcessName() else "unknown"
      File(filesDir, "s1.txt").writeText("${Date()}\nprocess $process, pid ${Process.myPid()}\n$result\n")
      SpikeNotification.post(this, result)
      stopSelf(startId)
    }
    return START_NOT_STICKY
  }
}

object SpikeNotification {
  private const val CHANNEL = "spike"

  fun post(context: Context, text: String) {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL, "Spike", NotificationManager.IMPORTANCE_DEFAULT)
      )
    }
    val run = PendingIntent.getService(
      context,
      0,
      Intent(context, SpikeService::class.java),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val notification = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(R.mipmap.ic_launcher_monochrome)
      .setContentTitle("Cereberus S1")
      .setContentText(text)
      .setStyle(NotificationCompat.BigTextStyle().bigText(text))
      .addAction(0, "Run S1", run)
      .setOnlyAlertOnce(true)
      .build()
    manager.notify(1, notification)
  }
}
