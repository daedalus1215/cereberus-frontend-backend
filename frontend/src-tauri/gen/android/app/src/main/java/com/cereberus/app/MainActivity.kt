package com.cereberus.app

import android.Manifest
import android.app.ActivityManager
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.io.File
import java.util.Date

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // No FLAG_SECURE in the spike, so its results can be screenshotted.
    // Light icons over the dark window background (themes.xml), whatever the
    // phone's own theme: Cereberus is always dark.
    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
      navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
    )
    super.onCreate(savedInstanceState)
    // Android 15+ draws apps edge to edge, but the web app doesn't lay itself
    // out around the status bar, navigation bar or keyboard. Keep the WebView
    // clear of them; the window background shows behind the bars.
    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or
          WindowInsetsCompat.Type.displayCutout() or
          WindowInsetsCompat.Type.ime()
      )
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      WindowInsetsCompat.CONSUMED
    }
    recordHowRecentRunsEnded()
  }

  override fun onResume() {
    super.onResume()
    if (Build.VERSION.SDK_INT >= 33 &&
      checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
    } else {
      SpikeNotification.post(this, "Swipe the app away from recent apps, then tap Run S1.")
    }
  }

  // Logs aren't available, so this is how the screen can say why something crashed.
  private fun recordHowRecentRunsEnded() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
    val exits = getSystemService(ActivityManager::class.java)
      .getHistoricalProcessExitReasons(packageName, 0, 6)
    File(filesDir, "last-exit.txt").writeText(
      exits.joinToString("\n") {
        "${Date(it.timestamp)} ${it.processName} reason ${it.reason} status ${it.status}: ${it.description}"
      } + "\n"
    )
  }
}
