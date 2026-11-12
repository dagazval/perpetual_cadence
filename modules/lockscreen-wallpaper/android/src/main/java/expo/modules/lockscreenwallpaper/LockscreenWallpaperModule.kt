package expo.modules.lockscreenwallpaper

import android.app.WallpaperManager
import android.graphics.BitmapFactory
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class LockscreenWallpaperModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LockscreenWallpaper")

    AsyncFunction("setLockscreenAsync") { fileUri: String ->
      val context = appContext.reactContext ?: throw Exception("React context unavailable")
      val cleanPath = Uri.parse(fileUri).path ?: fileUri.removePrefix("file://")
      val file = File(cleanPath)
      if (!file.exists()) {
        throw Exception("Wallpaper image not found at: $cleanPath")
      }

      val bitmap = BitmapFactory.decodeFile(file.absolutePath)
        ?: throw Exception("Failed to decode PNG bitmap")

      val wallpaperManager = WallpaperManager.getInstance(context)
      wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
      return@AsyncFunction true
    }
  }
}