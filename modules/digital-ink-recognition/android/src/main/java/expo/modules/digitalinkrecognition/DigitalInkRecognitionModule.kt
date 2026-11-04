package expo.modules.digitalinkrecognition

import android.graphics.BitmapFactory
import android.media.ExifInterface
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.recognition.Ink
import expo.modules.kotlin.Promise
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

class DigitalInkRecognitionModule : Module() {
  private val ocrExecutor = Executors.newSingleThreadExecutor()
  private val ocrBusy = AtomicBoolean(false)
  private val disposed = AtomicBoolean(false)
  private val ocrGeneration = AtomicInteger(0)
  @Volatile private var imageRecognizer: TextRecognizer? = null
  private lateinit var practiceLauncher: AppContextActivityResultLauncher<String, PracticeResult?>
  private val practiceBusy = AtomicBoolean(false)

  override fun definition() = ModuleDefinition {
    Name("DigitalInkRecognition")

    RegisterActivityContracts {
      practiceLauncher = registerForActivityResult(PracticeContract()) { _, _ ->
        // NativePracticeActivity persisted the result before returning, including after process recreation.
      }
    }

    AsyncFunction("openPractice") Coroutine { target: String ->
      require(target.codePointCount(0, target.length) in 1..4 && target.none { it.isWhitespace() || Character.isISOControl(it) }
        && appContext.currentActivity != null) { "A current activity and 1–4 characters are required" }
      check(practiceBusy.compareAndSet(false, true)) { "Handwriting practice is already open" }
      try { practiceLauncher.launch(target)?.asMap() } finally { practiceBusy.set(false) }
    }

    AsyncFunction("getPendingPracticeResults") {
      PendingPracticeResults.list(requireNotNull(appContext.reactContext)).map { it.asMap() }
    }

    AsyncFunction("acknowledgePracticeResult") { id: String ->
      PendingPracticeResults.acknowledge(requireNotNull(appContext.reactContext), id)
    }

    OnDestroy {
      disposed.set(true)
      imageRecognizer?.close()
      imageRecognizer = null
      ocrExecutor.shutdownNow()
    }

    AsyncFunction("cancelImageText") {
      ocrGeneration.incrementAndGet()
      imageRecognizer?.close()
    }

    AsyncFunction("recognizeImageText") { uriString: String, promise: Promise ->
      if (!ocrBusy.compareAndSet(false, true)) {
        promise.reject("ERR_OCR_BUSY", "OCR is processing another image", null)
      } else {
        val generation = ocrGeneration.incrementAndGet()
        ocrExecutor.execute {
          var imageBitmap: android.graphics.Bitmap? = null
          try {
            val context = appContext.reactContext ?: throw IllegalStateException("No app context")
            val uri = Uri.parse(uriString)
            require(uri.scheme == "file") { "Only local cached images are supported" }
            val file = File(uri.path ?: "").canonicalFile
            val cacheRoot = context.cacheDir.canonicalPath + File.separator
            require(file.canonicalPath.startsWith(cacheRoot) && file.isFile && file.length() in 1..15_728_640) {
              "Image must be in app cache and smaller than 15 MB"
            }
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.path, bounds)
            require(bounds.outWidth > 0 && bounds.outHeight > 0) { "Unsupported image" }
            val options = BitmapFactory.Options().apply { inSampleSize = 1 }
            while (maxOf(bounds.outWidth, bounds.outHeight) / options.inSampleSize > 2048) options.inSampleSize *= 2
            val bitmap = BitmapFactory.decodeFile(file.path, options) ?: throw IllegalArgumentException("Invalid image")
            imageBitmap = bitmap
            val orientation = try { ExifInterface(file.path).getAttributeInt(ExifInterface.TAG_ORIENTATION, 1) } catch (_: Exception) { 1 }
            val rotation = when (orientation) { 3 -> 180; 6 -> 90; 8 -> 270; else -> 0 }
            if (disposed.get() || generation != ocrGeneration.get()) {
              bitmap.recycle(); ocrBusy.set(false)
              if (!disposed.get()) promise.reject("ERR_OCR_CANCELLED", "OCR cancelled", null)
              return@execute
            }
            val recognizer = TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
            imageRecognizer = recognizer
            recognizer.process(InputImage.fromBitmap(bitmap, rotation))
              .addOnSuccessListener { result ->
                if (!disposed.get()) promise.resolve(result.text.take(8000))
              }
              .addOnFailureListener { error ->
                if (!disposed.get()) promise.reject("ERR_OCR_RECOGNITION", "Unable to recognize this image", error)
              }
              .addOnCompleteListener {
                recognizer.close()
                imageRecognizer = null
                bitmap.recycle()
                ocrBusy.set(false)
              }
          } catch (error: Exception) {
            imageRecognizer?.close()
            imageRecognizer = null
            imageBitmap?.let { if (!it.isRecycled) it.recycle() }
            ocrBusy.set(false)
            if (!disposed.get()) promise.reject("ERR_OCR_IMAGE", "Select a valid image smaller than 15 MB", error)
          }
        }
      }
    }

    AsyncFunction("recognize") { strokes: List<Map<String, Any>>, width: Double, height: Double, languageTag: String, promise: Promise ->
      try {
        val identifier = DigitalInkRecognitionModelIdentifier.fromLanguageTag(languageTag)
          ?: throw IllegalArgumentException("Unsupported language tag: $languageTag")
        val model = DigitalInkRecognitionModel.builder(identifier).build()
        val recognizer = DigitalInkRecognition.getClient(
          DigitalInkRecognizerOptions.builder(model).build()
        )
        val inkBuilder = Ink.builder()
        strokes.forEach { strokeInput ->
          val points = strokeInput["points"] as? List<*> ?: emptyList<Any>()
          val strokeBuilder = Ink.Stroke.builder()
          points.forEach { pointValue ->
            val point = pointValue as? Map<*, *> ?: return@forEach
            val x = (point["x"] as? Number)?.toFloat() ?: return@forEach
            val y = (point["y"] as? Number)?.toFloat() ?: return@forEach
            val t = (point["t"] as? Number)?.toLong() ?: System.currentTimeMillis()
            strokeBuilder.addPoint(Ink.Point.create(x, y, t))
          }
          inkBuilder.addStroke(strokeBuilder.build())
        }
        val conditions = DownloadConditions.Builder().build()
        RemoteModelManager.getInstance().download(model, conditions)
          .addOnSuccessListener {
            recognizer.recognize(inkBuilder.build())
              .addOnSuccessListener { result ->
                promise.resolve(result.candidates.take(8).map { it.text })
                recognizer.close()
              }
              .addOnFailureListener { error ->
                recognizer.close()
                promise.reject("ERR_RECOGNITION", error.message, error)
              }
          }
          .addOnFailureListener { error ->
            recognizer.close()
            promise.reject("ERR_MODEL_DOWNLOAD", error.message, error)
          }
      } catch (error: Exception) {
        promise.reject("ERR_DIGITAL_INK", error.message, error)
      }
    }
  }
}
