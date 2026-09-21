package expo.modules.digitalinkrecognition

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.recognition.Ink
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DigitalInkRecognitionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DigitalInkRecognition")

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
