package expo.modules.digitalinkrecognition

import android.app.Activity
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import org.json.JSONObject

data class PracticeResult(val id: String, val target: String, val candidate: String, val strokeCount: Int, val completedAtMs: Long) {
  fun asMap(): Map<String, Any> = mapOf("id" to id, "target" to target, "candidate" to candidate,
    "strokeCount" to strokeCount, "completedAtMs" to completedAtMs)
  fun json(): String = JSONObject(asMap()).toString()

  companion object {
    fun parse(value: String): PracticeResult {
      val json = JSONObject(value)
      return PracticeResult(json.getString("id"), json.getString("target"), json.getString("candidate"),
        json.getInt("strokeCount"), json.getLong("completedAtMs"))
    }
  }
}

/** Keep a result until React Native confirms its SQLite transaction succeeded. */
object PendingPracticeResults {
  private fun prefs(context: Context) = context.getSharedPreferences("native-practice-pending", Context.MODE_PRIVATE)

  @Synchronized fun save(context: Context, result: PracticeResult) {
    check(result.completedAtMs > 0) { "Kiểm tra ngày giờ trên thiết bị trước khi lưu lượt luyện." }
    val prefs = prefs(context)
    check(prefs.contains(result.id) || prefs.all.size < 50) { "Quay lại ứng dụng để lưu lịch sử trước khi luyện tiếp." }
    check(prefs.edit().putString(result.id, result.json()).commit()) { "Chưa lưu được kết quả. Hãy thử lại." }
  }

  @Synchronized fun list(context: Context): List<PracticeResult> = prefs(context).all.values
    .map { PracticeResult.parse(it as String) }.sortedBy { it.completedAtMs }

  @Synchronized fun acknowledge(context: Context, id: String) {
    require(id.matches(Regex("[0-9a-fA-F-]{36}"))) { "Invalid practice id" }
    check(prefs(context).edit().remove(id).commit()) { "Cannot confirm saved practice" }
  }
}

class PracticeContract : AppContextActivityResultContract<String, PracticeResult?> {
  override fun createIntent(context: Context, input: String) = Intent(context, NativePracticeActivity::class.java).putExtra("target", input)
  override fun parseResult(input: String, resultCode: Int, intent: Intent?): PracticeResult? =
    if (resultCode == Activity.RESULT_OK) intent?.getStringExtra("practice_result")?.let(PracticeResult::parse) else null
}
