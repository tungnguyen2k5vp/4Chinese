package expo.modules.digitalinkrecognition

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.os.Bundle
import android.view.MotionEvent
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizer
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.recognition.Ink
import java.util.UUID

/** Guided practice records suggestions, never grades strokes or changes SRS progress. */
class NativePracticeActivity : Activity() {
  private lateinit var paper: InkPaper
  private lateinit var status: TextView
  private lateinit var recognize: Button
  private lateinit var download: Button
  private lateinit var undo: Button
  private lateinit var clear: Button
  private lateinit var suggestions: LinearLayout
  private lateinit var target: String
  private var candidateTexts = arrayListOf<String>()
  private var resultId = ""
  private var recognizer: DigitalInkRecognizer? = null
  private var ready = false
  private var busy = false
  private var closed = false
  private val model by lazy {
    DigitalInkRecognitionModel.builder(DigitalInkRecognitionModelIdentifier.fromLanguageTag("zh-Hani-CN")!!).build()
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
    val portrait = resources.configuration.orientation != Configuration.ORIENTATION_LANDSCAPE
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(20), dp(16), dp(20), dp(16))
      setBackgroundColor(Color.rgb(245, 247, 251))
      setOnApplyWindowInsetsListener { view, insets ->
        view.setPadding(dp(20) + insets.systemWindowInsetLeft, dp(12) + insets.systemWindowInsetTop,
          dp(20) + insets.systemWindowInsetRight, dp(12) + insets.systemWindowInsetBottom)
        insets
      }
    }
    fun text(value: String, size: Float) = TextView(this).apply {
      text = value; textSize = size; setTextColor(Color.rgb(23, 32, 51))
      setPadding(0, dp(7), 0, dp(7))
    }
    root.addView(Button(this).apply { text = "← Trở lại"; setOnClickListener { finish() } })
    if (portrait) root.addView(text("Luyện viết toàn màn hình", 22f))
    target = intent.getStringExtra("target")?.takeIf { it.codePointCount(0, it.length) in 1..4 } ?: "人"
    resultId = savedInstanceState?.getString("result_id") ?: UUID.randomUUID().toString()
    root.addView(text("Chữ tham khảo: $target", 28f))
    if (portrait) root.addView(text("Viết để đối chiếu. Nhận diện chữ không phải chấm thứ tự hoặc độ đúng của nét.", 14f))
    status = text("Đang kiểm tra mô hình…", 14f).apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
    suggestions = LinearLayout(this)
    paper = InkPaper(this) { count ->
      candidateTexts.clear(); suggestions.removeAllViews()
      if (!busy) status.text = "$count nét · tối đa 64 nét / 2.048 điểm"
    }
    savedInstanceState?.getDoubleArray("ink")?.let { paper.restore(it) }
    root.addView(paper, LinearLayout.LayoutParams(-1, 0, 1f))
    root.addView(status)
    val actions = LinearLayout(this)
    undo = Button(this).apply { text = "Hoàn tác"; setOnClickListener { paper.undo() } }
    clear = Button(this).apply { text = "Xóa hết"; setOnClickListener { paper.clear() } }
    recognize = Button(this).apply { text = "Nhận diện"; setOnClickListener { recognizeInk() } }
    listOf(undo, clear, recognize).forEach { actions.addView(it, LinearLayout.LayoutParams(0, -2, 1f)) }
    root.addView(actions)
    root.addView(suggestions)
    download = Button(this).apply {
      text = "Tải mô hình nhận diện (cần mạng)"
      setOnClickListener {
        updateBusy(true); status.text = "Đang tải mô hình; bạn có thể trở lại mà không mất tiến độ học."
        RemoteModelManager.getInstance().download(model, DownloadConditions.Builder().build())
          .addOnSuccessListener { if (!closed) { ready = true; updateBusy(false); status.text = "Mô hình sẵn sàng. Viết rồi nhấn Nhận diện." } }
          .addOnFailureListener { if (!closed) { updateBusy(false); status.text = "Chưa tải được mô hình. Bạn vẫn có thể luyện viết và đối chiếu." } }
      }
    }
    root.addView(download)
    savedInstanceState?.getStringArrayList("candidates")?.let { showCandidates(it) }
    setContentView(root)
    updateBusy(true)
    RemoteModelManager.getInstance().isModelDownloaded(model)
      .addOnSuccessListener { found -> if (!closed) {
        ready = found; updateBusy(false)
        status.text = "${paper.count()} nét · " + if (found) "mô hình sẵn sàng, có thể nhận diện ngoại tuyến." else "chưa có mô hình; luyện viết hoặc tải khi có mạng."
      } }
      .addOnFailureListener { if (!closed) { status.text = "Không kiểm tra được mô hình. Bạn vẫn có thể luyện viết."; updateBusy(false) } }
  }

  private fun updateBusy(value: Boolean) {
    busy = value; paper.isEnabled = !value
    undo.isEnabled = !value; clear.isEnabled = !value
    recognize.isEnabled = !value && ready
    download.isEnabled = !value && !ready
    download.visibility = if (ready) View.GONE else View.VISIBLE
    for (index in 0 until suggestions.childCount) suggestions.getChildAt(index).isEnabled = !value
  }

  private fun showCandidates(candidates: List<String>) {
    suggestions.removeAllViews()
    candidateTexts = ArrayList(candidates.map { it.trim() }.filter {
      it.codePointCount(0, it.length) in 1..16 && it.none { char -> char.isWhitespace() || Character.isISOControl(char) }
    }.distinct().take(5))
    for (candidate in candidateTexts) {
      suggestions.addView(Button(this).apply {
        text = candidate
        contentDescription = "Chọn gợi ý $candidate và lưu lượt luyện"
        setOnClickListener {
          if (busy || paper.count() == 0) return@setOnClickListener
          updateBusy(true)
          try {
            val result = PracticeResult(resultId, target, candidate, paper.count(), System.currentTimeMillis())
            PendingPracticeResults.save(this@NativePracticeActivity, result)
            setResult(RESULT_OK, Intent().putExtra("practice_result", result.json()))
            finish()
          } catch (error: Exception) {
            updateBusy(false); status.text = error.message ?: "Chưa lưu được kết quả. Hãy thử lại."
          }
        }
      }, LinearLayout.LayoutParams(0, -2, 1f))
    }
  }

  private fun recognizeInk() {
    val strokes = paper.snapshot()
    if (!ready || busy || strokes.isEmpty()) { status.text = "Hãy viết ít nhất một nét trước."; return }
    val ink = Ink.builder()
    for (stroke in strokes) {
      val builder = Ink.Stroke.builder()
      for (point in stroke) builder.addPoint(Ink.Point.create(point.x * paper.width, point.y * paper.height, point.t))
      ink.addStroke(builder.build())
    }
    val client = recognizer ?: DigitalInkRecognition.getClient(DigitalInkRecognizerOptions.builder(model).build()).also { recognizer = it }
    updateBusy(true); status.text = "Đang nhận diện…"
    client.recognize(ink.build())
      .addOnSuccessListener { result -> if (!closed) {
        updateBusy(false)
        showCandidates(result.candidates.map { it.text })
        status.text = if (candidateTexts.isEmpty()) "Chưa có kết quả. Thử viết lại rõ hơn." else "Chọn gợi ý để lưu lượt luyện và trở lại. Gợi ý không chấm đúng/sai."
      } }
      .addOnFailureListener { if (!closed) { updateBusy(false); status.text = "Không nhận diện được. Nét viết vẫn được giữ để thử lại." } }
  }

  override fun onSaveInstanceState(outState: Bundle) {
    outState.putDoubleArray("ink", paper.save())
    outState.putString("result_id", resultId)
    outState.putStringArrayList("candidates", candidateTexts)
    super.onSaveInstanceState(outState)
  }
  override fun onDestroy() {
    closed = true; recognizer?.close(); recognizer = null
    super.onDestroy()
  }
  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}

private data class InkSample(val x: Float, val y: Float, val t: Long)

private class InkPaper(context: Context, private val changed: (Int) -> Unit) : View(context) {
  private val strokes = mutableListOf<MutableList<InkSample>>()
  private var active: MutableList<InkSample>? = null
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(29, 47, 77); strokeWidth = 7f; strokeCap = Paint.Cap.ROUND; style = Paint.Style.STROKE }
  private val grid = Paint().apply { color = Color.rgb(213, 221, 232); strokeWidth = 2f }
  init { setBackgroundColor(Color.WHITE); contentDescription = "Vùng luyện viết Hán tự bằng ngón tay" }
  fun count() = strokes.size
  fun undo() { if (strokes.isNotEmpty()) strokes.removeAt(strokes.lastIndex); active = null; invalidate(); changed(count()) }
  fun clear() { strokes.clear(); active = null; invalidate(); changed(0) }
  fun snapshot(): List<List<InkSample>> = strokes.filter { it.isNotEmpty() }.map { it.toList() }
  fun save(): DoubleArray = strokes.flatMap { stroke -> listOf(Double.NaN) + stroke.flatMap { listOf(it.x.toDouble(), it.y.toDouble(), it.t.toDouble()) } }.toDoubleArray()
  fun restore(data: DoubleArray) {
    var i = 0; var points = 0
    while (i < data.size && points < 2048) {
      if (data[i].isNaN()) { if (strokes.size >= 64) break; strokes.add(mutableListOf()); i++; continue }
      if (i + 2 >= data.size || strokes.isEmpty()) break
      if (data[i].isFinite() && data[i+1].isFinite() && data[i+2].isFinite()) {
        strokes.last().add(InkSample(data[i].toFloat().coerceIn(0f, 1f), data[i+1].toFloat().coerceIn(0f, 1f), data[i+2].toLong())); points++
      }
      i += 3
    }
  }
  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    canvas.drawLine(width/2f, 0f, width/2f, height.toFloat(), grid)
    canvas.drawLine(0f, height/2f, width.toFloat(), height/2f, grid)
    for (stroke in strokes) {
      val first = stroke.firstOrNull() ?: continue
      if (stroke.size == 1) { canvas.drawPoint(first.x*width, first.y*height, paint); continue }
      val path = Path().apply { moveTo(first.x*width, first.y*height) }
      stroke.drop(1).forEach { path.lineTo(it.x*width, it.y*height) }
      canvas.drawPath(path, paint)
    }
  }
  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (!isEnabled || width <= 0 || height <= 0) return false
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        if (strokes.size >= 64 || strokes.sumOf { it.size } >= 2048) return false
        parent.requestDisallowInterceptTouchEvent(true)
        active = mutableListOf<InkSample>().also { strokes.add(it) }
      }
      MotionEvent.ACTION_CANCEL -> { active?.let { strokes.remove(it) }; active = null; parent.requestDisallowInterceptTouchEvent(false); invalidate(); changed(count()); return true }
    }
    if (strokes.sumOf { it.size } < 2048) active?.add(InkSample((event.x/width).coerceIn(0f,1f), (event.y/height).coerceIn(0f,1f), event.eventTime))
    if (event.actionMasked == MotionEvent.ACTION_UP) { active = null; parent.requestDisallowInterceptTouchEvent(false); performClick() }
    invalidate(); changed(count()); return true
  }
  override fun performClick(): Boolean { super.performClick(); return true }
}
