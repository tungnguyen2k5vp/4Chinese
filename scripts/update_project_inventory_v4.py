"""Append verified V4 changes to the existing inventory, never rebuild its baseline.

Usage: python scripts/update_project_inventory_v4.py
Preserves a byte-for-byte pre-update copy and validates the generated DOCX before replace.
"""
import json
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile

from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.shared import Inches, Pt, RGBColor

from generate_project_inventory_report import (
    BLUE, NAVY, WHITE, OUTPUT, ROOT, add_bullet, add_heading,
    prevent_row_split, set_cell_shading, set_repeat_table_header,
)

UPDATE_TITLE = "11. Cập nhật V4 — tính năng, giao diện và tương tác mới"
BACKUP = OUTPUT.with_name(OUTPUT.stem + "_TRUOC_CAP_NHAT_V4.docx")
STAGING = OUTPUT.with_name(OUTPUT.stem + "_v4_staging.docx")


def paragraphs_including_tables(document):
    yield from document.paragraphs
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                yield from cell.paragraphs


def replace_text(paragraph, old, new):
    if old not in paragraph.text:
        return False
    for run in paragraph.runs:
        if old in run.text:
            run.text = run.text.replace(old, new)
            return True
    # Targeted baseline paragraphs contain plain text; preserve paragraph style.
    value = paragraph.text.replace(old, new)
    if paragraph.runs:
        paragraph.runs[0].text = value
        for run in paragraph.runs[1:]:
            run.text = ""
    else:
        paragraph.add_run(value)
    return True


def table_styles(document):
    for name, header in [("V4 Table Text", False), ("V4 Table Header", True)]:
        style = document.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        style.base_style = document.styles["Normal"]
        style.font.size = Pt(9)
        style.font.bold = header
        style.font.color.rgb = RGBColor.from_string(WHITE if header else NAVY)
        style.paragraph_format.space_before = Pt(3)
        style.paragraph_format.space_after = Pt(3)


def table(document, headers, rows, widths):
    result = document.add_table(rows=1, cols=len(headers))
    result.style = "Table Grid"
    result.autofit = False
    set_repeat_table_header(result.rows[0])
    for row_index, values in enumerate([headers, *rows]):
        row = result.rows[0] if row_index == 0 else result.add_row()
        prevent_row_split(row)
        for index, value in enumerate(values):
            cell = row.cells[index]
            cell.width = Inches(widths[index])
            paragraph = cell.paragraphs[0]
            paragraph.style = "V4 Table Header" if row_index == 0 else "V4 Table Text"
            paragraph.add_run(str(value))
            if row_index == 0:
                set_cell_shading(cell, BLUE)
            elif row_index % 2:
                set_cell_shading(cell, "F7F8FC")
    document.add_paragraph()
    return result


def markdown_table(text, after_heading):
    section = text.split(after_heading, 1)[1].split("\n## ", 1)[0]
    rows = []
    for line in section.splitlines():
        if line.startswith("|"):
            values = [value.strip() for value in line.strip().strip("|").split("|")]
            if all(re.fullmatch(r"[-: ]+", value) for value in values):
                continue
            rows.append(values)
    return rows[0], rows[1:]


def feature(document, title, items):
    add_heading(document, title, 2)
    for item in items:
        add_bullet(document, item)


def build_update():
    counts = json.loads((ROOT / "docs/V4_CONTENT_COUNTS.json").read_text(encoding="utf-8"))
    smoke = json.loads((ROOT / "docs/V4_WEB_SMOKE.json").read_text(encoding="utf-8"))
    report = (ROOT / "docs/V4_FINAL_REPORT.md").read_text(encoding="utf-8")
    if smoke["passed"] is not True or smoke["errors"]:
        raise RuntimeError("Browser evidence does not support a passing verification claim")
    tests = re.search(r"(\d+) files/(\d+) tests đạt", report)
    if not tests:
        raise RuntimeError("Missing test evidence in final report")
    test_files, test_count = map(int, tests.groups())
    routes = sorted((ROOT / "src/app").rglob("*.tsx"))
    layouts = sum(path.name == "_layout.tsx" for path in routes)
    route_summary = f"{len(routes)} ({len(routes) - layouts} màn hình + {layouts} layout)"
    document = Document(OUTPUT)
    if any(paragraph.text == UPDATE_TITLE for paragraph in document.paragraphs):
        raise RuntimeError("V4 chapter already exists; inspect it before updating again")
    if BACKUP.exists():
        raise RuntimeError("Pre-update copy already exists; do not overwrite it")
    baseline_paragraphs = len(document.paragraphs)
    baseline_tables = len(document.tables)
    replacements = {
        "43 (41 màn hình + 2 layout)": route_summary,
        "28 cấu trúc · HSK 1–6": f"{counts['grammarPoints']} cấu trúc · HSK 1–6",
        "Có 14 lối tắt học nhanh: bộ từ riêng, học từ mới, ôn tập, HSK, ngữ pháp, lộ trình, từ cần củng cố, lịch ôn sắp tới, luyện viết, luyện nghe, nghe-nói, đọc-tra từ, truyện ngắn và sổ lỗi.":
            "Home được gom gọn còn bốn lối tắt Bộ từ riêng, Học từ mới, HSK, Lộ trình và hai hub Luyện tập/Thư viện. Các công cụ cũ vẫn truy cập được trong hub; giữ nguyên năm tab chính.",
        "Seed hiện tại có 28 cấu trúc: 7 cấu trúc nền và 21 cấu trúc bổ sung; trải từ HSK 1 đến HSK 6.":
            "Seed hiện tại có 40 cấu trúc: 28 cấu trúc cũ và 12 đối chiếu Việt–Trung mới. Phân bố HSK 1–6 lần lượt 10/8/10/6/3/3; nhóm 7–9 chưa có ngữ pháp. Không đồng nghĩa đầy đủ syllabus thi.",
        "Expo Router; 43 route files gồm tab, học/ôn, từ, bộ từ, khóa học, đọc, viết, nói, tài khoản.":
            f"Expo Router; {len(routes)} route files gồm {len(routes) - layouts} màn hình và {layouts} layout. Bổ sung Luyện tập, Thư viện, luyện thi, bài viết/dịch/nói, ôn ngữ pháp theo lỗi và từ dễ nhầm.",
        "ĐÃ CHẠY: 92/92 test files và 324/324 tests passed (01/10/2026).":
            f"ĐÃ CHẠY sau cập nhật V4: {test_files}/{test_files} test files, {test_count}/{test_count} tests passed (01/10/2026).",
        "Lần cập nhật trước đã báo npm run check pass (lint, typecheck, test và Expo Android export); lượt kiểm kê này chạy lại Vitest riêng.":
            "Đã chạy npm run check sau cập nhật: lint sạch, TypeScript đạt, toàn bộ tests đạt và Expo Android export đạt; web export được chạy riêng và đạt.",
        "Theo trạng thái cập nhật gần nhất: APK 0.1.25 / versionCode 27 đã cài và mở được trên điện thoại Android. Đây không phải walkthrough mọi màn hình.":
            "Bản APK thử V4 0.1.25 / versionCode 27 đã build, chữ ký debug v2 được xác minh. CHƯA CÀI bản V4 lên điện thoại theo yêu cầu người dùng; bản đang cài trước đó không chứng minh cập nhật V4 đã được nghiệm thu thiết bị.",
        "Có cấu hình Expo web, lệnh export và local static server; người dùng từng báo màn localhost trắng. Báo cáo này không mở trình duyệt để xác nhận lỗi đó đã hết, nên web runtime được đánh dấu CHƯA KIỂM CHỨNG.":
            f"Web export đạt; {len(smoke['results'])} hành trình Edge đạt, không pageerror trong các luồng đã kiểm tra. Đã sửa startup OPFS lock/blank screen, thêm loading/recovery và chặn tab thứ hai mở cùng database. Chưa chứng minh toàn bộ web, microphone hoặc AI.",
        "28 cấu trúc và 18 truyện là dữ liệu seed hiện có; không đủ căn cứ quảng bá như bao phủ toàn bộ kiến thức thi HSK.":
            "40 cấu trúc và 18 truyện là dữ liệu seed hiện có; chưa có ngữ pháp/truyện đầy đủ HSK 7–9 hoặc căn cứ bao phủ toàn bộ kiến thức thi HSK.",
        "Mở lại web build trên trình duyệt và sửa/đánh dấu trạng thái blank screen bằng smoke test.":
            "Web startup đã sửa và qua 11 smoke journeys. Tiếp tục nghiệm thu browser khác, microphone và AI; không quảng bá mọi browser đã hỗ trợ.",
        "Có công cụ serve và báo cáo lỗi trắng trước đó; Android export không kiểm chứng giao diện web.":
            "Đã có bằng chứng Edge cho các luồng V4, nhưng browser smoke vẫn không thay native/device hoặc toàn bộ web E2E.",
        "28 cấu trúc và 18 truyện hiện chỉ là nội dung khởi đầu, không đại diện toàn bộ syllabus.":
            "40 cấu trúc và 18 truyện vẫn không đại diện toàn bộ syllabus; nội dung mới chưa thẩm định độc lập.",
        "Cập nhật README và các tài liệu phát hành.":
            "README đã cập nhật version và localhost; tiếp tục cập nhật tài liệu khi các gate phát hành thật được nghiệm thu.",
        "README hiện ghi version 0.1.17 trong khi package/app là 0.1.25; phần mô tả Supabase/dataset không bao quát đầy đủ các chức năng hiện hành.":
            "Bản thử V4 chưa cài, chưa push GitHub; phải tách số liệu kiểm thử, nội dung chưa xác minh và trạng thái release.",
        "\\u9abd": "鵙",
    }
    changed = 0
    for paragraph in list(paragraphs_including_tables(document)):
        for old, new in replacements.items():
            changed += int(replace_text(paragraph, old, new))

    # Cover notice retains baseline content and directs readers to the new detail.
    scope = next(p for p in paragraphs_including_tables(document) if p.text.startswith("Phạm vi"))
    scope.add_run(" Bổ sung cập nhật V4 tại mục 11: số liệu tổng quan/kiểm chứng đã được làm mới; danh mục route mục 9 được bổ sung bằng các route mới ở mục 11.8. Bản V4 chưa cài lên điện thoại.")
    summary = next(p for p in document.paragraphs if p.text.startswith("Kết luận ngắn"))
    summary.add_run(" V4 bổ sung mini test, viết/dịch/nói có thời gian, đối chiếu ngữ pháp, từ dễ nhầm, readiness nội bộ và khôi phục web. Các giới hạn về official alignment, full sync và AI end-to-end vẫn còn.")
    table_styles(document)
    document.add_page_break()
    add_heading(document, UPDATE_TITLE, 1)
    document.add_paragraph("Bổ sung sau đợt thống kê gốc ngày 01/10/2026. Đây là tính năng có source và bằng chứng kiểm tra, không phải tuyên bố toàn bộ V4 đã hoàn tất. Không cài APK hoặc thay đổi dữ liệu trên điện thoại trong lượt cập nhật báo cáo này.")
    table(document, ["Hạng mục", "Cập nhật thực tế"], [
        ["Điều hướng", route_summary + "; giữ năm tab chính"],
        ["Kho từ", f"{counts['vocabularyRows']:,} mục nội bộ; không tự coi là official HSK completeness"],
        ["Ngữ pháp", f"{counts['grammarPoints']} mục; thêm {counts['vietnameseContrasts']} đối chiếu Việt–Trung"],
        ["Mini test", f"{counts['miniTestProfiles']} bài gốc, {counts['miniTestQuestions']} câu; không phải full mock chính thức"],
        ["Viết/dịch", f"{counts['writingTasks']} bài viết + {counts['translationTasks']} bài dịch, có nháp/lịch sử"],
        ["Nói có thời gian", f"{counts['speakingPrompts']} đề tự luyện; native ghi âm tạm, web có fallback"],
        ["Từ dễ nhầm", f"{counts['confusablePairs']} cặp, {counts['confusableQuestions']} câu ngữ cảnh, lưu offline và nối Sổ lỗi"],
        ["Kiểm thử", f"{test_files} files / {test_count} tests; {len(smoke['results'])} hành trình web đạt"],
        ["Android", "Build APK thử đạt; debug-signed; CHƯA CÀI lên điện thoại"],
    ], [1.6, 5.35])

    feature(document, "11.1 Home, Luyện tập, Thư viện và khu HSK", [
        "Trang chủ giữ Tiếp tục học, ôn đến hạn, phiên nhanh và kế hoạch ngày. Bốn shortcut và hai hub thay dãy dài công cụ; không xóa chức năng cũ hoặc thay luồng học của bộ tự tạo.",
        "Luyện tập gom ôn/SRS, nghe/nói, thanh điệu, shadowing, viết, ngữ pháp, lỗi, từ dễ nhầm và bài luyện. Mỗi mục có tiêu đề, mô tả, chevron và phản hồi khi nhấn.",
        "Thư viện gom Truyện ngắn, Đọc & tra từ, bộ từ riêng, kho từ và tra cấu trúc ngữ pháp. Router push giữ khả năng quay lại hub; browser back đã kiểm thử.",
        "Tab HSK có ba hướng Học / Ôn thi / Syllabus; từ Ôn thi đi tới trung tâm mini test, readiness và bài viết/dịch/nói. Không thêm bottom tab mới.",
        "Theme sáng/tối và giảm chuyển động được giữ; viewport 360px/dark/reduced-motion không tràn ngang trong luồng được thử. Chưa kiểm tra toàn bộ màn ở font-scale lớn hoặc TalkBack.",
    ])
    feature(document, "11.2 Trung tâm mini test và kết quả", [
        "Chọn band 1–6 hoặc nhóm 7–9 để mở một bài luyện gốc bốn câu đọc/ngữ pháp trong ngữ cảnh, thời lượng 5 hoặc 10 phút. Không mô phỏng cấu trúc đề thi chính thức và không quy đổi sang điểm HSK.",
        "Chọn đáp án bằng radio, đi câu trước/tiếp, đánh dấu xem lại, theo dõi số câu và đồng hồ. Đáp án/cờ/vị trí lưu trên máy từng thao tác; tải lại hoặc mở tiếp giữ dữ liệu đã lưu.",
        "Đồng hồ theo deadline thực, rời app không tạm dừng. Hết hạn tự nộp khi mở lại; nộp có cơ chế chống ghi trùng. Modal Xác nhận nộp/Làm tiếp dùng trên native và web.",
        "Kết quả hiển thị đúng/tổng, phần trăm luyện nội bộ, thời gian sử dụng, từng phần, đáp án đã chọn/đáp án đúng và giải thích Việt. Không dự đoán chắc chắn đỗ.",
        "Exam mode ít xao nhãng: không thêm mascot lớn, confetti hoặc XP popup khi trả lời. Lịch sử/resume ở trung tâm luyện thi giúp quay lại attempt đã lưu.",
        "Engine hỗ trợ section-timed/data-driven profile và snapshot bất biến, CAS chống ghi stale. Đây là framework có tests; chưa có full mock bank/profile được kiểm chứng để dùng như đề thi thật.",
    ])
    feature(document, "11.3 Viết và dịch: bản nháp, lịch sử, tự đối chiếu", [
        "Vào /exam/skills, chọn tab Luyện viết hoặc Luyện dịch, mở bài/tiếp tục bản nháp. Có một bài mỗi dạng cho mỗi band, tổng 14 bài gốc.",
        "Nhập bài trong ô tối đa 12.000 ký tự. Autosave sau 800ms ngừng gõ; báo đang lưu/đã lưu/lỗi và cho thử lại. Tải lại giữ nháp; rời khi còn thay đổi có xác nhận lưu trước khi rời.",
        "Đối chiếu kiểm tra độ dài, từ yêu cầu có xuất hiện và dấu kết câu, rồi hiện bài mẫu/checklist. Khác mẫu không đồng nghĩa sai. Không chấm ngữ nghĩa, độ tự nhiên hay điểm chính thức.",
        "Bài đã tự đối chiếu được đóng băng; làm lại tạo nháp mới thay vì ghi đè bài trước. Lịch sử và snapshots lưu SQLite, có trong backup mới; backup cũ thiếu trường mới không xóa nháp hiện tại.",
        "Nội dung giữ trạng thái chưa thẩm định độc lập. Module hiện không gửi bài lên AI; chưa có rubric/chấm semantic hoặc curriculum tự luận đầy đủ.",
    ])
    feature(document, "11.4 Luyện nói có thời gian", [
        "Vào /exam/speaking, chọn một trong bảy đề: đọc, kể sinh hoạt, chỉ đường, kể trải nghiệm, nêu ý kiến, kể lại hoặc lập luận. Cấp là ước lượng tự luyện, không phải HSK/HSKK mock chính thức.",
        "Chuẩn bị 10–30 giây, bấm ghi âm, tự dừng theo giới hạn 30–120 giây. Native dùng quyền mic khi ghi; có phát lại và checklist tự đối chiếu.",
        "Bản ghi tạm cục bộ, không upload/backup; rời màn, chạy nền hoặc ghi lại sẽ dọn tài nguyên. Gián đoạn yêu cầu bắt đầu lại. Chưa lưu lịch sử attempt nói bền vững.",
        "Web hiển thị đề/checklist và thông báo không hỗ trợ ghi âm ở module này; không giả đã thu giọng. Chưa kiểm tra quyền mic/interruption trên Android/iOS thật trong V4.",
        "Tách khỏi chat Gemini, Shadowing và Tone Trainer cũ. Không coi speech-to-text hoặc checklist là điểm phát âm, điểm nói chính thức.",
    ])
    feature(document, "11.5 Ngữ pháp Việt–Trung và ôn ngắn theo lỗi", [
        "40 mục ngữ pháp gồm 28 mục cũ và 12 đối chiếu mới: 的/地/得; 再/又; 了/过; 会/能/可以; 是…的; 把; 被; bổ ngữ hướng 来/去; bổ ngữ kết quả; 二/两/lượng từ; nơi chốn; thời gian/thời lượng.",
        "Mỗi đối chiếu có giải thích Việt, lỗi người Việt dễ gặp, câu sai/câu sửa và lý do, ví dụ Trung–pinyin–Việt–Anh và bài luyện. Lộ trình thêm 12 bài ngữ pháp; IDs/progress cũ được bảo toàn.",
        "Ôn ngắn theo lỗi ở /grammar/focus xét tối đa 2.000 events trong 30 ngày. Chỉ gợi ý khi có ít nhất 5 events, 3 sai, hai dạng bài và độ đúng dưới 70%; không kết luận từ một lỗi.",
        "Ưu tiên tối đa ba khái niệm cần củng cố. Ba câu đúng gần nhất ngừng gợi ý. Không sửa lịch SRS; mới là grammar-only micro lessons, chưa diagnosis đa kỹ năng.",
        "Phân bố nội bộ HSK 1/2/3/4/5/6: 10/8/10/6/3/3; nhóm 7–9: 0. Nội dung mới chưa thẩm định độc lập, chưa đủ để quảng bá đầy đủ kiến thức thi.",
    ])
    feature(document, "11.6 Từ dễ nhầm: chọn theo ngữ cảnh", [
        "Vào Luyện tập → Từ dễ nhầm → chọn một cặp: 知道/认识, 觉得/认为, 再/又, 刚/刚才, 二/两, 还是/或者. Mỗi cặp có hai câu, tổng 12 câu gốc.",
        "Chọn từ và bấm Kiểm tra câu này để xem đúng/sai cùng giải thích dùng từ trong câu. Có pinyin, nghĩa/ghi chú dùng từ và bảng so sánh; không chỉ hiện một đáp án trống.",
        "Mỗi attempt có ID/content version, thời điểm, lựa chọn và trạng thái đã xem gợi ý. Retry cùng ID không đếm hai lần; lỗi được ghi đồng transaction vào Sổ lỗi, nhấn lỗi quay lại đúng cặp.",
        "Xem bảng so sánh rồi ẩn vẫn tính có gợi ý; luyện lại sau khi đã biết đáp án cũng vậy. Ba lần đúng có gợi ý không tự khắc phục lỗi. Thống kê chỉ số lượt, không gọi hai câu là mastery.",
        "Ô tự đặt câu phục vụ luyện cá nhân, chưa lưu khi rời và không chấm tự động; UI nêu rõ. Attempts offline/backup tương thích, không đổi cấp nhớ, hạn ôn hoặc lịch sử SRS.",
    ])
    feature(document, "11.7 Readiness, dữ liệu HSK, backup và nguồn âm thanh", [
        "Readiness hiển thị chỉ số học nội bộ và các chiều còn thiếu; không suy raw row count thành official coverage, không gọi là điểm thi hay chứng nhận sẵn sàng đỗ.",
        "Schema 32–35 bổ sung version chuẩn, reference/crosswalk bốn chiều, exam attempts, written practice và confusable attempts. Import/restore có validation và transaction rollback; không rekey/xóa dữ liệu người học.",
        "Chưa có reference official/license và independent review đủ để xác định matched/missing/extra/level-conflicts. Không coi unknown là 0; chưa cấp nào được gắn HSK Exam Ready hoặc Content Complete.",
        "Backup mới chứa attempts/nháp mới; backup cũ không có các trường này không xóa bảng mới. SQLite tests bao gồm dữ liệu cũ, stale revisions, snapshot giả, corruption và rollback.",
        "Audio-source model tách SYSTEM_TTS, CLOUD_TTS, NATIVE_RECORDING, LICENSED_RECORDING và kiểm tra manifest. Chưa bundle native/licensed audio pack thật hoặc downloader; không gọi TTS là native audio.",
        "Reader có lớp lưu chunks tới 100.000 ký tự ở repository, nhưng UI nhập tay/TXT hiện vẫn giới hạn 2.000. Chưa long-document ingestion hoàn chỉnh, EPUB/PDF/article import hoặc context flashcards.",
        "Cloud vẫn chỉ manual-sync SETTINGS và DECK metadata. Backup ZIP là luồng riêng, không đồng nghĩa đầy đủ sync custom words/membership/notes/SRS/history/path giữa hai thiết bị.",
    ])

    add_heading(document, "11.8 Route bổ sung và tương tác vào/ra", 2)
    new_routes = [
        ["/practice", "Home → Luyện tập", "Nhóm công cụ; mở màn bằng push, back về hub."],
        ["/library", "Home → Thư viện", "Truyện/Reader/bộ riêng/tra cứu; back về hub."],
        ["/exam", "HSK Ôn thi / Luyện tập", "Chọn mini test, mở/resume/history, đi tới skill/readiness."],
        ["/exam/session", "Bắt đầu/tiếp tục bài", "Đáp án, timer, cờ, navigation, xác nhận nộp/rời."],
        ["/exam/result", "Nộp bài", "Kết quả/từng câu/giải thích; không điểm official."],
        ["/exam/readiness", "Trung tâm luyện thi", "Chỉ số chuẩn bị nội bộ và phần dữ liệu chưa biết."],
        ["/exam/skills", "Viết và dịch", "Tabs, danh sách bài và nháp/lịch sử."],
        ["/exam/written", "Mở bài/nháp", "Autosave, lưu/rời, tự đối chiếu, bài mẫu."],
        ["/exam/speaking", "Luyện nói có thời gian", "Chuẩn bị, ghi tạm, replay/checklist; web fallback."],
        ["/grammar/focus", "Ôn ngắn theo lỗi", "Gợi ý micro lesson đủ ngưỡng, mở cấu trúc liên quan."],
        ["/confusables", "Luyện tập → Từ dễ nhầm", "Sáu cặp và thống kê attempts."],
        ["/confusables/[id]", "Chọn cặp / Sổ lỗi", "Trả lời, so sánh, giải thích, làm lại, đặt câu."],
    ]
    table(document, ["Route", "Lối vào", "Tương tác"], new_routes, [1.8, 1.8, 3.35])
    document.add_paragraph("Các 43 route cũ được giữ trong mục 9; 12 route trên bổ sung thành 55 tệp hiện tại. Error/loading/ownership gate là component root, không phải route mới.")

    feature(document, "11.9 Sửa web trắng và trải nghiệm khôi phục", [
        "Lỗi OPFS file lock đã tái hiện khi hard-navigation/reload liên tiếp. Root nay có màn đang mở dữ liệu và ErrorBoundary hiển thị thông báo đã lọc, không lộ SQL/path/secret/stack.",
        "Tab thứ hai thấy Dữ liệu đang mở ở tab khác thay vì mở SQLite đồng thời. Đóng tab đang học → Tải lại trang, giữ dữ liệu; browser test xác nhận tiến độ từ dễ nhầm còn nguyên khi chuyển owner.",
        "Worker preflight chờ handle cũ được nhả với giới hạn; không ghi, tạo, truncate hoặc xóa file. Không reset site data/database hoặc đánh cắp lock. Trình duyệt thiếu API hiện trạng thái không hỗ trợ.",
        "Web thử tại http://localhost:8084, chỉ bind localhost, không phải hosting công khai. Dữ liệu web tách với điện thoại; đổi origin/port tạo kho web khác.",
    ])
    add_heading(document, "11.10 Kết quả kiểm tra và trạng thái cài đặt", 2)
    table(document, ["Bằng chứng", "Kết quả / giới hạn"], [
        ["npm run check", f"Lint sạch, TypeScript, {test_files} files/{test_count} tests, Android export đạt."],
        ["Web export", "Đạt; Edge QA ở 412×915 và 360×800, dark/reduced-motion."],
        ["Browser regression", f"{len(smoke['results'])} hành trình đạt; errors rỗng. Artifact lúc {smoke['at']}; không đại diện mọi browser/mic/AI."],
        ["APK thử", "Gradle assembleRelease đạt; 0.1.25/code27, universal ~204,36 MiB, debug v2 signature hợp lệ. Chưa production signing/version bump."],
        ["Điện thoại", "CHƯA CÀI cập nhật V4. Theo yêu cầu người dùng, chỉ cập nhật file thống kê; không force-stop hoặc thay dữ liệu trên máy."],
        ["Chưa kiểm chứng", "Native mic quyền/gián đoạn, TalkBack/VoiceOver/font-scale, device update/data retention, Gemini auth/model E2E, sync hai thiết bị."],
    ], [1.5, 5.45])
    table(document, ["Hành trình web đã kiểm tra"], [[item] for item in [
        "Đáp án và cờ mini test giữ qua reload", "Nộp có xác nhận và xem kết quả", "Bản nháp viết giữ qua reload/tự đối chiếu",
        "Tab dịch hiện bảy bài", "Fallback nói và checklist trên web", "Readiness và ngữ pháp focus hiển thị",
        "Hub Luyện tập/Thư viện và browser back", "Giải thích từ dễ nhầm/tiến độ lưu sau reload",
        "Hai tab bị chặn an toàn; chuyển owner giữ attempts", "360px/dark/reduced-motion không tràn ngang trong hub",
        "Đi từ Thư viện sang Truyện offline trong app",
    ]], [6.95])

    add_heading(document, "11.11 Ma trận nghiệm thu và phần chưa hoàn tất", 2)
    headers, rows = markdown_table(report, "## 20 câu nghiệm thu")
    table(document, headers, rows, [0.35, 1.45, 5.15])
    headers, rows = markdown_table(report, "## Trạng thái phase A–R")
    table(document, headers, rows, [0.7, 6.25])
    for item in [
        "Cần tiếp: full cloud sync event-aware/history/tombstones; curriculum tình huống; nội dung sense/examples/ngữ pháp/truyện nâng cao được review; personal context cards/global search/reader import.",
        "Cần tiếp: official/licensed references, profile/cấu trúc thi và full question bank/rubrics; native audio packs thật; Gemini roleplay goals/quota/history/E2E và device release QA.",
        "Không gọi các mục còn thiếu là hoàn tất chỉ vì đã có interfaces, unit tests hoặc bản APK build được. Báo cáo này là cập nhật thống kê, không đánh dấu toàn bộ V4 xong.",
    ]:
        add_bullet(document, item)
    add_heading(document, "11.12 Nguồn và cách tái tạo bản cập nhật", 2)
    for item in [
        "docs/V4_FINAL_REPORT.md, V4_IMPLEMENTATION_STATUS.md, V4_CONTENT_COUNTS.json, V4_WEB_SMOKE.json",
        "docs/CONFUSABLE_WORDS.md, WRITING_CENTER.md, SPEAKING_EXAM.md, VIETNAMESE_LEARNER_DESIGN.md",
        "docs/UX_INFORMATION_ARCHITECTURE.md, HSK_SYLLABUS_ALIGNMENT.md, V4_ANDROID_BUILD.md, V4_WEB_RECOVERY.md, READER_V4.md",
        "Source route/app/db/services là nguồn sự thật. Số route và nội dung được lấy từ source/artifact hiện có; không đọc .env hoặc đưa API keys vào báo cáo.",
        "Script scripts/update_project_inventory_v4.py cập nhật tài liệu cũ, không rebuild/xóa các chương cũ. Có bản sao nguyên trạng trước cập nhật; nếu chapter V4 đã tồn tại, script dừng để tránh ghi đè sửa tay hoặc nhân đôi phụ lục.",
    ]:
        add_bullet(document, item)

    document.core_properties.modified = datetime.now(timezone.utc)
    document.core_properties.subject = "Kiểm kê hiện trạng 4Chinese, bổ sung V4 chưa cài lên điện thoại"
    shutil.copy2(OUTPUT, BACKUP)
    document.save(STAGING)
    with ZipFile(STAGING) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("Invalid DOCX ZIP")
    reopened = Document(STAGING)
    all_text = "\n".join(p.text for p in paragraphs_including_tables(reopened))
    for expected in [UPDATE_TITLE, "111 files/377 tests", "CHƯA CÀI", "/confusables/[id]", "HSK Exam Ready", "知道/认识"]:
        if expected not in all_text:
            raise RuntimeError(f"Missing required update: {expected}")
    for chapter in range(1, 11):
        if not any(p.text.startswith(f"{chapter}. ") for p in reopened.paragraphs):
            raise RuntimeError(f"Baseline chapter {chapter} was lost")
    if len(reopened.paragraphs) <= baseline_paragraphs or len(reopened.tables) <= baseline_tables:
        raise RuntimeError("Update did not preserve and expand inventory")
    if re.search(r"\\u[0-9a-fA-F]{4}|\ufffd", all_text):
        raise RuntimeError("Escaped Unicode or replacement character in report")
    os.replace(STAGING, OUTPUT)
    print(json.dumps({"updated": str(OUTPUT), "backup": str(BACKUP), "targeted_text_updates": changed,
        "paragraphs": len(reopened.paragraphs), "tables": len(reopened.tables), "route_files": len(routes),
        "test_files": test_files, "tests": test_count, "browser_journeys": len(smoke['results']),
        "docx_validation": "passed", "installed_on_phone": False}, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    build_update()
