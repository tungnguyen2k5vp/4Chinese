"""Generate the current 4Chinese feature, workflow and UI interaction report.

This is intentionally a source-backed handoff document. It separates active
product behavior from draft content and from checks that still require a real
device or a live provider.
"""

from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "TONG_QUAN_TINH_NANG_GIAO_DIEN_TUONG_TAC_4CHINESE_2026-10-02_CURRENT.docx"

BLUE = "2457D6"
NAVY = "172033"
MUTED = "626B7B"
PALE_BLUE = "E9EFFF"
PALE_GREEN = "E7F7F0"
PALE_AMBER = "FFF4D6"
GREEN = "218A67"
AMBER = "B66A00"
RED = "B42318"
WHITE = "FFFFFF"
GRID = "E1E6F0"


def set_cell_shading(cell, fill: str) -> None:
    properties = cell._tc.get_or_add_tcPr()
    shading = properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        properties.append(shading)
    shading.set(qn("w:fill"), fill)


def set_cell_border(cell, color: str = GRID) -> None:
    properties = cell._tc.get_or_add_tcPr()
    borders = properties.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        properties.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "4")
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def repeat_header(row) -> None:
    properties = row._tr.get_or_add_trPr()
    header = OxmlElement("w:tblHeader")
    header.set(qn("w:val"), "true")
    properties.append(header)


def prevent_row_split(row) -> None:
    properties = row._tr.get_or_add_trPr()
    properties.append(OxmlElement("w:cantSplit"))


def set_cell_text(cell, value, *, bold=False, color=NAVY, size=8.5) -> None:
    cell.text = ""
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_before = Pt(2)
    paragraph.paragraph_format.space_after = Pt(2)
    paragraph.paragraph_format.line_spacing = 1.04
    run = paragraph.add_run(str(value))
    run.bold = bold
    run.font.name = "Aptos"
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
    set_cell_border(cell)


def add_table(document, headers, rows, widths=None, size=8.25):
    table = document.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    header = table.rows[0]
    repeat_header(header)
    prevent_row_split(header)
    for index, title in enumerate(headers):
        set_cell_shading(header.cells[index], BLUE)
        set_cell_text(header.cells[index], title, bold=True, color=WHITE, size=size)
    for row_index, row_data in enumerate(rows):
        row = table.add_row()
        prevent_row_split(row)
        for index, value in enumerate(row_data):
            cell = row.cells[index]
            set_cell_text(cell, value, size=size)
            if row_index % 2 == 0:
                set_cell_shading(cell, "F7F9FD")
    if widths:
        for row in table.rows:
            for index, width in enumerate(widths):
                row.cells[index].width = Inches(width)
    document.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


def add_bullet(document, text, level=0):
    style = "List Bullet" if level == 0 else "List Bullet 2"
    paragraph = document.add_paragraph(style=style)
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.paragraph_format.line_spacing = 1.06
    paragraph.add_run(text)
    return paragraph


def add_number(document, text):
    paragraph = document.add_paragraph(style="List Number")
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.paragraph_format.line_spacing = 1.06
    paragraph.add_run(text)
    return paragraph


def add_note(document, label, text, fill=PALE_BLUE, label_color=BLUE):
    table = document.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    set_cell_border(cell, fill)
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_before = Pt(5)
    paragraph.paragraph_format.space_after = Pt(5)
    paragraph.paragraph_format.line_spacing = 1.06
    lead = paragraph.add_run(f"{label}  ")
    lead.bold = True
    lead.font.color.rgb = RGBColor.from_string(label_color)
    paragraph.add_run(text)
    document.add_paragraph().paragraph_format.space_after = Pt(1)


def add_heading(document, text, level=1):
    paragraph = document.add_heading(text, level=level)
    paragraph.paragraph_format.keep_with_next = True
    return paragraph


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("4Chinese  ·  Báo cáo hiện trạng  ·  ")
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MUTED)
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), "PAGE")
    paragraph._p.append(field)


def configure_document(document):
    section = document.sections[0]
    section.top_margin = Inches(0.66)
    section.bottom_margin = Inches(0.66)
    section.left_margin = Inches(0.70)
    section.right_margin = Inches(0.70)
    section.header_distance = Inches(0.30)
    section.footer_distance = Inches(0.30)

    styles = document.styles
    normal = styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(9.5)
    normal.font.color.rgb = RGBColor.from_string(NAVY)
    normal._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.08

    for name, size, color in (
        ("Title", 28, NAVY),
        ("Heading 1", 18, NAVY),
        ("Heading 2", 12.5, BLUE),
        ("Heading 3", 10.5, NAVY),
    ):
        style = styles[name]
        style.font.name = "Aptos Display" if name in ("Title", "Heading 1") else "Aptos"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
        style.paragraph_format.space_before = Pt(12 if name != "Title" else 0)
        style.paragraph_format.space_after = Pt(5)

    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = header.add_run("4CHINESE  /  PRODUCT + UX + ENGINEERING INVENTORY")
    run.bold = True
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(BLUE)
    add_page_number(section.footer.paragraphs[0])


def add_title_page(document):
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(66)
    kicker = paragraph.add_run("BÁO CÁO KIỂM KÊ HIỆN TẠI")
    kicker.bold = True
    kicker.font.size = Pt(10)
    kicker.font.color.rgb = RGBColor.from_string(BLUE)

    title = document.add_paragraph(style="Title")
    title.paragraph_format.space_before = Pt(10)
    title.add_run("4Chinese")

    subtitle = document.add_paragraph()
    subtitle.paragraph_format.space_after = Pt(18)
    run = subtitle.add_run("Toàn bộ tính năng · luồng nghiệp vụ · tương tác giao diện")
    run.font.size = Pt(16)
    run.font.color.rgb = RGBColor.from_string(MUTED)

    add_note(
        document,
        "Phạm vi",
        "Báo cáo lấy mã nguồn, route, database, service, dữ liệu audit và cấu hình hiện tại của repository HocTiengTrungApp làm nguồn sự thật. Mốc báo cáo: 02/10/2026. Tài liệu phân biệt rõ tính năng có trong code, nội dung đang hoạt động, nội dung nháp và phần chưa nghiệm thu native/provider.",
    )
    add_table(
        document,
        ["Chỉ số", "Hiện trạng", "Chỉ số", "Hiện trạng"],
        [
            ["Phiên bản", "0.1.31 · Android code 33", "SQLite", "Schema 40"],
            ["Route", "60 file · 58 màn hình + 2 layout", "Tab chính", "5"],
            ["Từ vựng", "11.330 raw · 11.379 canonical", "Ngữ pháp active", "40 cấu trúc"],
            ["Truyện active", "18 · HSK 1–3", "Chủ đề học từ", "9 chủ đề"],
            ["Bộ thủ", "50 bộ phổ biến", "SRS", "6 cấp nhớ"],
            ["Kiểm thử", "146 file · 820 test", "Audit v5", "PASS"],
        ],
        widths=[1.35, 2.25, 1.35, 2.25],
    )
    add_note(
        document,
        "Kết luận nhanh",
        "4Chinese hiện là ứng dụng học tiếng Trung offline-first với kho từ, học mới, SRS, HSK, ngữ pháp, viết, nghe-nói, đọc, truyện, luyện thi, bộ từ riêng, thống kê và sao lưu. Candidate 0.1.31 đã qua các kiểm tra JavaScript/TypeScript/data nhưng chưa được cài lên điện thoại; native APK release hiện chưa đạt ở bước react-native-worklets CMake.",
        fill=PALE_AMBER,
        label_color=AMBER,
    )
    document.add_page_break()


def add_contents(document):
    add_heading(document, "Mục lục báo cáo", 1)
    for item in (
        "1. Tổng quan sản phẩm và phạm vi",
        "2. Danh mục tính năng theo nhóm",
        "3. Bản đồ route và tương tác màn hình",
        "4. Luồng nghiệp vụ end-to-end",
        "5. Hệ thống giao diện và trạng thái tương tác",
        "6. Kiến trúc dữ liệu, dịch vụ và bảo toàn dữ liệu",
        "7. Kiểm kê nội dung và chất lượng dữ liệu",
        "8. So sánh với bản Word trước và cập nhật mới nhất",
        "9. Kiểm chứng, trạng thái build và giới hạn",
        "10. Danh sách việc còn lại và kết luận",
    ):
        add_bullet(document, item)
    add_note(
        document,
        "Nguyên tắc đọc",
        "Một interface, test hoặc bản build thành công không tự động chứng minh provider thật, microphone, TTS, TalkBack, hiệu năng thiết bị hoặc độ đầy đủ học thuật. Các ranh giới này được ghi riêng ở phần 9.",
    )


def add_feature_sections(document):
    sections = [
        (
            "2.1 Trang chủ, onboarding và kế hoạch ngày",
            [
                "Onboarding cho phép chọn trình độ HSK và mục tiêu từ mới; lựa chọn được lưu cục bộ.",
                "Trang chủ hiển thị streak, XP, tiến độ hôm nay, số từ mới, số từ đến hạn và số phút tập trung.",
                "Tự làm mới theo ngày địa phương; nhiệm vụ ngày gồm ôn SRS, học từ mới và giữ nhịp học.",
                "Có phiên nhanh 3/5/10 phút; hệ thống ưu tiên từ đến hạn, sau đó từ mới và bài củng cố.",
                "Home có các hub gọn hơn: Bộ từ riêng, Học từ mới, HSK, Lộ trình, Luyện tập, Thư viện; các công cụ cũ vẫn truy cập được trong hub.",
            ],
        ),
        (
            "2.2 Kho từ HSK, tìm kiếm và chi tiết từ",
            [
                "Kho offline tìm theo Hán tự, phồn/giản thể, pinyin, nghĩa Việt/Anh và nghĩa Việt không dấu.",
                "Bộ lọc gồm tất cả, chưa học, đã học, đến hạn, đã lưu, đã biết, bỏ qua và cấp nhớ 1–5/Nhớ sâu.",
                "Thẻ từ hiển thị Hán tự, pinyin, nghĩa, HSK, từ loại, trạng thái, phát âm và nút lưu.",
                "Chi tiết từ có Tổng quan, Cách viết, Ví dụ, Ghi chú; xem nghĩa song ngữ, ví dụ, từ liên quan, bộ thủ, mẹo nhớ và minh họa.",
                "Có thể sửa nghĩa, ghi chú cá nhân, nghe lại, lưu/bỏ lưu và thêm từ vào bất kỳ bộ từ riêng nào.",
                "Khi chuyển sang từ khác, trạng thái loading/error được kiểm soát để không hiển thị dữ liệu cũ của từ trước.",
            ],
        ),
        (
            "2.3 Bộ từ riêng và nhập từ hàng loạt",
            [
                "Tạo, mở, đổi tên, tìm kiếm, xóa mềm và khôi phục bộ từ; dữ liệu từ và lịch SRS được giữ khi khôi phục.",
                "Thêm/sửa thủ công Hán tự, phồn thể, pinyin, nghĩa Việt/Anh, từ loại, HSK, ảnh và ví dụ Trung–pinyin–Việt.",
                "Nhập tối đa 100 dòng bằng Hán tự, pinyin hoặc nghĩa tiếng Việt; nhận diện từ kho offline và cho phép đổi ứng viên.",
                "Danh sách preview cho phép sửa nghĩa hoặc loại bỏ từng dòng bằng nút × trước khi thêm.",
                "Ô nhập theo dõi vị trí con trỏ khi bàn phím mở, tự cuộn vùng nội dung để dòng mới không bị che.",
                "Chi tiết bộ có học từ mới, ôn đến hạn, lọc cấp nhớ, luyện nghe, quiz, AI phát âm, chia sẻ và thùng rác.",
            ],
        ),
        (
            "2.4 Học từ mới",
            [
                "Luồng HSK yêu cầu chọn một trong chín chủ đề: con người, ăn uống, học tập/công việc, địa điểm/đi lại, thời gian/số đếm, sức khỏe, đời sống, hành động/miêu tả và giao tiếp.",
                "Luồng bộ từ tự tạo vẫn độc lập: người dùng chọn từ trong bộ, không bị chuyển sang chủ đề HSK.",
                "Mặt học hiển thị Hán tự, pinyin, nghĩa, HSK, ví dụ ngữ cảnh, hình minh họa và loa.",
                "Có tự phát âm khi từ xuất hiện, nghe lại thủ công, viết tay, nhập pinyin, chọn Hán tự và nhận dạng giọng nói khi thiết bị hỗ trợ.",
                "Buổi học đi qua ba lượt; lượt đầu có hỗ trợ, lượt sau giảm gợi ý. Có Đã biết và Bỏ qua.",
                "Kết thúc từ bộ tự tạo quay lại chi tiết bộ; kết thúc phiên HSK đi tới kết quả học.",
            ],
        ),
        (
            "2.5 Ôn tập SRS",
            [
                "Có sáu cấp: 1, 2, 3, 4, 5 và Nhớ sâu; biểu đồ cấp nhớ có thể chạm để lọc danh sách.",
                "Lịch mặc định: 30 phút, 1 ngày, 2 ngày, 3 ngày, 5 ngày và các mốc Nhớ sâu 8/16/30/60/120 ngày.",
                "Sai sẽ hạ cấp/xếp lại sớm; dùng gợi ý có thể rút ngắn khoảng ôn.",
                "Bài tập được chọn theo cấp nhớ: nghĩa/Hán tự, pinyin, ghép Hán tự, nghe chọn, viết hoặc điền từ trong câu.",
                "Sau khi trả lời có phản hồi, đáp án, phát âm, gợi ý, tiến độ phiên và cập nhật lịch.",
                "Lượt đầu hiển thị pinyin sau khi đúng để gợi nhớ; lượt sau ẩn pinyin để tăng độ khó.",
            ],
        ),
        (
            "2.6 Luyện nghe, quiz, từ yếu và sổ lỗi",
            [
                "Luyện nghe phát âm Trung rồi chọn nghĩa Việt hoặc ghép cặp; kết quả ghi độ chính xác nhưng không tự thay đổi SRS.",
                "Quiz bộ từ yêu cầu điền Hán tự còn thiếu trong câu ví dụ; có đáp án, pinyin, nghĩa và làm lại.",
                "Sổ lỗi gom lỗi từ vựng/ngữ pháp; bài củng cố yêu cầu ba câu đúng liên tiếp không dùng gợi ý.",
                "Từ yếu là danh sách khuyến nghị riêng, không tự sửa lịch ôn.",
            ],
        ),
        (
            "2.7 Lộ trình HSK và trung tâm luyện thi",
            [
                "Có lộ trình HSK 1–6 và nhóm HSK 7–9; hiển thị XP, thời lượng, tiến độ và khóa/mở bài.",
                "Hoạt động lộ trình gồm xem từ, đọc/tra, ngữ pháp, viết, nghe, nói, đọc và tổng ôn.",
                "Hệ thống chỉ đánh dấu hoàn thành sau khi ghi nhận bằng chứng thao tác phù hợp; bài sau mở theo điều kiện bài trước.",
                "Trung tâm mini test có band HSK, timer 5/10 phút, radio, điều hướng, đánh dấu xem lại, resume, nộp bài và kết quả.",
                "Có luyện viết/dịch có autosave, snapshot, checklist tự đối chiếu và luyện nói có thời gian, ghi âm tạm, phát lại.",
                "Readiness chỉ là chỉ số nội bộ; không quy đổi thành điểm thi hay chứng nhận đỗ.",
            ],
        ),
        (
            "2.8 Ngữ pháp và ôn theo lỗi",
            [
                "40 cấu trúc active, phân bố HSK 1/2/3/4/5/6 là 10/8/10/6/3/3.",
                "Chi tiết có mẫu câu, giải thích Việt, ví dụ Hán tự/pinyin/Việt/Anh, nghe và năm dạng bài luyện.",
                "Grammar focus xét sự kiện lỗi trong 30 ngày, chỉ gợi ý khi đủ ngưỡng lỗi và độ đúng thấp.",
                "Ba câu đúng gần nhất có thể dừng gợi ý; grammar focus không thay đổi lịch SRS từ vựng.",
                "24 cấu trúc mở rộng và 4 cấu trúc nâng cao hiện vẫn PENDING/DRAFT, chưa coi là nội dung học chính thức.",
            ],
        ),
        (
            "2.9 Luyện viết, bộ thủ và stroke data",
            [
                "Danh sách 50 bộ thủ có tìm kiếm, ý nghĩa, cách dùng và từ liên quan.",
                "Chi tiết bộ thủ có hoạt ảnh nét, phát lại, gợi ý mờ, tẩy nét cuối và xóa trang.",
                "Bảng viết hỗ trợ nhiều trang, chọn ứng viên, nhận diện cả từ, nhập thủ công và điều hướng.",
                "ML Kit Digital Ink phụ thuộc native Android build; Expo Go không bảo đảm đủ module.",
                "Sáu chữ 搾、獃、秊、薙、颿、骽 vẫn thiếu dữ liệu nét hợp lệ; app dùng fallback font/chế độ viết tự do, không bịa nét.",
            ],
        ),
        (
            "2.10 Nghe, nói và AI",
            [
                "Hội thoại Gemini theo nhiều tình huống, nhận câu tiếng Trung, pinyin, dịch, góp ý và gợi ý đáp lại.",
                "Roleplay nội bộ có 13 scene và 42 mục tiêu trao đổi; có thể chạy luồng tự luyện offline theo dữ liệu có sẵn.",
                "Shadowing cho phép nghe mẫu, ghi âm, phát lại và tự đối chiếu.",
                "Luyện thanh/cặp thanh và 10 bài phân biệt âm có TTS, ghi âm ngắn và nghe lại; không phải chấm âm học AI.",
                "Thư viện bản ghi lưu cục bộ 7 ngày, 30 ngày hoặc tới khi tự xóa; có nghe, dọn hết hạn và xóa từng bản.",
                "Gemini Edge Function đọc secret Supabase `4Chinese_Key_Gemini`; live provider call chưa được nghiệm thu end-to-end.",
            ],
        ),
        (
            "2.11 Truyện, đọc và tra từ trong ngữ cảnh",
            [
                "18 truyện active offline: 6 HSK 1, 6 HSK 2, 6 HSK 3; có chi tiết truyện và câu hỏi đọc hiểu.",
                "Trình đọc hỗ trợ dán/nhập TXT, EPUB subset, OCR khi nền tảng có native module, tách token theo kho từ.",
                "Người dùng bật/tắt pinyin/nghĩa, điều chỉnh TTS, dừng/phát, chạm từ xem nghĩa, nghe, lưu và thêm vào bộ.",
                "Có độ phủ vốn từ, độ khó ước tính, lưu/tiếp tục bài đọc và kết quả tự kiểm tra.",
                "EPUB fixed-layout/DRM, PDF, URL và thư viện audio người bản xứ chưa hoàn tất.",
            ],
        ),
        (
            "2.12 Thống kê, thành tích, cài đặt và cloud",
            [
                "Thống kê thời gian học, từ mới, lượt ôn, cấp nhớ, tiến độ HSK, kỹ năng, bản đồ kỹ năng và lịch hoạt động 7/14/28 ngày.",
                "Thành tích có XP, XP hôm nay, streak hiện tại/tốt nhất, mục tiêu tuần và bộ sưu tập huy hiệu.",
                "Cài đặt pinyin, màu thanh điệu, âm thanh, tự phát âm, tốc độ 0.6×/0.8×/1.0×/1.2×, rung, theme và reduced motion.",
                "Backup thiết bị xuất ZIP, nhập/khôi phục, tạo restore point và hoàn tác lần khôi phục gần nhất.",
                "Supabase hỗ trợ Auth, cloud backup, chia sẻ bộ từ và manual sync; sync hiện chỉ áp dụng SETTINGS và DECK metadata, chưa sync đầy đủ SRS/nội dung từ/ghi chú.",
            ],
        ),
    ]
    for title, bullets in sections:
        add_heading(document, title, 2)
        for bullet in bullets:
            add_bullet(document, bullet)


def add_route_map(document):
    add_heading(document, "3. Bản đồ route và tương tác màn hình", 1)
    add_note(
        document,
        "Quy mô route",
        "Mã nguồn hiện có 60 file trong src/app: 58 màn hình và 2 layout. Bản Word trước ghi 55; năm màn hình được kiểm kê rõ hơn ở bản hiện tại là search, listening, speaking/pairs, speaking/recordings và stories/[id].",
    )
    rows = [
        ["Khởi tạo", "/, /onboarding", "Bootstrap SQLite, kiểm tra onboarding, chọn trình độ/mục tiêu."],
        ["Tab chính", "/(tabs)/index", "Trang chủ, tiến độ, nhiệm vụ ngày, mở hành động ưu tiên."],
        ["Tab chính", "/(tabs)/hsk", "Chọn cấp HSK, mở kho và lộ trình."],
        ["Tab chính", "/(tabs)/vocabulary", "Tìm/lọc kho từ, chọn cấp nhớ và mở chi tiết."],
        ["Tab chính", "/(tabs)/stats", "Biểu đồ, thời gian học, tiến độ và kỹ năng."],
        ["Tab chính", "/(tabs)/profile", "Cài đặt, theme, âm thanh, backup và cloud."],
        ["Kế hoạch", "/daily, /achievements", "Phiên hôm nay, phiên nhanh, XP, streak, mục tiêu và huy hiệu."],
        ["Tìm kiếm", "/search", "Tìm tối đa theo nhóm từ vựng, ngữ pháp, truyện, bài học, từ dễ nhầm; retry và back giữ từ khóa."],
        ["Bộ từ", "/decks, /decks/[id], /decks/word", "CRUD bộ, chi tiết, thêm/sửa từ, học, ôn, chia sẻ."],
        ["Bộ từ", "/decks/bulk-add, /decks/trash", "Nhập preview tối đa 100 dòng, bỏ từng dòng, khôi phục xóa mềm."],
        ["Bài tập bộ", "/decks/listening, /decks/quiz, /decks/pronunciation", "Nghe-ghép nghĩa, quiz ví dụ, chấm phát âm."],
        ["Học mới", "/learn/setup, /learn/session", "Chọn chủ đề/bộ, chọn từ, ba lượt, viết/pinyin/nói, Đã biết/Bỏ qua."],
        ["Ôn tập", "/review, /review/session, /review/result", "Chọn phiên, trả lời SRS, đánh giá, xem kết quả."],
        ["Ôn tập", "/review/upcoming, /review/weak", "Đếm ngược lịch ôn và danh sách từ yếu."],
        ["HSK path", "/path, /path/[courseId], /path/lesson/[lessonId]", "Khóa/chặng, bài học, hoạt động, bằng chứng và mở khóa."],
        ["Ngữ pháp", "/grammar, /grammar/[id], /grammar/focus", "Danh sách, chi tiết, luyện năm dạng bài, micro lesson theo lỗi."],
        ["Sổ lỗi", "/mistakes, /mistakes/practice", "Xem lỗi chưa khắc phục và luyện tới điều kiện đạt."],
        ["Luyện viết", "/writing, /writing/[character]", "Tìm bộ thủ, xem nét, phát lại, viết và gợi ý."],
        ["Nghe-nói", "/speaking, /speaking/ai", "Chọn bài, hội thoại Gemini, nhập/nói, nghe lại và đáp tiếp."],
        ["Nghe-nói", "/speaking/shadowing, /speaking/tones", "Nhại câu, luyện thanh/cặp thanh, ghi âm và tự đối chiếu."],
        ["Nghe-nói", "/speaking/pairs, /speaking/recordings", "10 cặp âm tự luyện; quản lý bản ghi cục bộ, nghe/xóa/dọn hết hạn."],
        ["Nghe hiểu", "/listening", "Chọn bài, phát TTS, chọn đáp án, mở transcript/giải thích sau khi trả lời."],
        ["Đọc", "/reader", "Nhập TXT/EPUB/OCR, tách token, tra/nghe/lưu và theo dõi độ phủ."],
        ["Truyện", "/stories, /stories/[id]", "Chọn theo cấp, đọc theo câu, pinyin/nghĩa/TTS, trả lời câu hỏi."],
        ["Luyện thi", "/exam, /exam/session, /exam/result", "Chọn bài, timer, radio, cờ, điều hướng, nộp, kết quả."],
        ["Luyện thi", "/exam/readiness, /exam/skills, /exam/written, /exam/speaking", "Readiness, viết/dịch autosave, nói có thời gian/checklist."],
        ["Từ", "/word/[id]", "Chi tiết, cách viết, ví dụ, ghi chú, lưu, phát âm, thêm vào bộ."],
        ["Cloud", "/cloud", "Đăng nhập, upload/list/restore/xóa cloud backup và đăng xuất."],
        ["Layout", "/_layout, /(tabs)/_layout", "Khởi tạo app/SQLite và bottom navigation 5 tab."],
    ]
    add_table(document, ["Nhóm", "Route", "Vai trò và tương tác chính"], rows, widths=[1.05, 2.25, 3.8], size=7.7)


def add_workflows(document):
    add_heading(document, "4. Luồng nghiệp vụ end-to-end", 1)
    workflows = [
        ["Khởi động lần đầu", "Mở app → bootstrap SQLite → kiểm tra onboarding → chọn trình độ/mục tiêu → lưu settings → vào Trang chủ."],
        ["Học từ HSK", "Trang chủ/Học từ mới → chọn 1/9 chủ đề → chọn từ → từ xuất hiện và phát âm → nghe/viết/pinyin/nói → hoàn tất 3 lượt → ghi nhận SRS → kết quả phiên."],
        ["Học bộ tự tạo", "Bộ từ riêng → chọn bộ → chọn từ mới → học theo luồng riêng → hoàn thành → quay lại chi tiết bộ, không quay về Học từ mới của Trang chủ."],
        ["Ôn SRS", "Ôn tập → lấy từ đến hạn → chọn dạng bài theo cấp nhớ → trả lời/dùng gợi ý → hiện phản hồi → đánh giá → cập nhật cấp/lịch kế tiếp → kết quả."],
        ["Thêm một từ HSK vào bộ", "Kho từ → chi tiết từ → nút + → chọn bất kỳ bộ riêng → xác nhận → sao chép dữ liệu pinyin/nghĩa/ví dụ theo chính sách bộ."],
        ["Nhập hàng loạt", "Bộ từ → Thêm hàng loạt → nhập tối đa 100 dòng → Nhận diện → kiểm tra ứng viên → sửa nghĩa/chọn lại/xóa × → thêm các dòng phù hợp → nhận thông báo kết quả."],
        ["Hoàn thành lộ trình", "HSK → Lộ trình → mở khóa/chặng → mở từng hoạt động → hệ thống ghi bằng chứng → quay lại bài → đủ hoạt động → Hoàn thành bài học → mở bài tiếp."],
        ["Ngữ pháp theo lỗi", "Ngữ pháp → Focus → đọc tín hiệu lỗi 30 ngày → mở micro lesson → làm bài → đúng liên tiếp → dừng gợi ý; không thay đổi SRS từ vựng."],
        ["Luyện nghe hiểu", "Luyện nghe → chọn bài → phát mẫu → chọn đáp án → bấm kiểm tra → xem đúng/sai, transcript/giải thích → chuyển câu/bài tiếp."],
        ["Chat Gemini", "Nghe & nói → AI → chọn HSK/tình huống → đồng ý chính sách/cấu hình Cloud nếu cần → nhập hoặc nói → nhận câu trả lời/pinyin/dịch/góp ý → nghe lại/đáp tiếp."],
        ["Đọc truyện", "Truyện → chọn cấp → mở chi tiết → phát/dừng TTS, bật pinyin/nghĩa → chạm từ tra cứu → trả lời câu hỏi → lưu kết quả/tiếp tục."],
        ["Luyện thi", "Trung tâm luyện thi → chọn band/bài → chọn thời lượng → bắt đầu → trả lời/cờ/điều hướng → resume nếu rời → xác nhận nộp → xem kết quả và giải thích."],
        ["Backup/restore", "Cài đặt → xuất ZIP hoặc chọn ZIP khôi phục → xác nhận thay dữ liệu → tạo restore point → import transaction → kiểm tra → hoàn tác lần gần nhất nếu cần."],
    ]
    add_table(document, ["Luồng", "Các bước nghiệp vụ"], workflows, widths=[1.55, 5.55], size=8.0)


def add_ui_system(document):
    add_heading(document, "5. Hệ thống giao diện và trạng thái tương tác", 1)
    rows = [
        ["Visual system", "Màu chính #2457D6; nền sáng/tối/theo hệ thống; thẻ trắng; trạng thái success/warning/error; token spacing, radius, typography dùng chung."],
        ["Điều hướng", "Bottom tab cố định 5 mục, safe-area inset, ẩn khi bàn phím mở; route con dùng push/back để giữ ngữ cảnh."],
        ["Component dùng lại", "Screen, PrimaryButton, SearchBar, VocabularyCard, AudioButton, ProgressRing, MasteryChart, HanziHandwritingPad, PinyinHanziComposer, ShadowingPlayer, EmptyState."],
        ["Motion", "MotionPressable, progress animation, PulseRing, mascot/learning guide, haptic và UI sound theo feature flag; hỗ trợ đầy đủ/giảm/tắt hiệu ứng."],
        ["Loading", "Activity indicator hoặc skeleton/disabled action khi đang tải; nút thao tác chống gửi trùng trong trạng thái bận."],
        ["Empty", "Thông báo rõ khi chưa có từ, chưa có bản ghi, chưa có lỗi, chưa có nội dung hoặc chưa đủ dữ liệu để làm bài."],
        ["Error", "Thông báo lỗi thân thiện, thử lại, giữ input hợp lý; không lộ SQL/path/secret/stack ra giao diện."],
        ["Keyboard", "Theo dõi keyboard overlap/con trỏ cho nhập hàng loạt; bottom tab ẩn khi bàn phím mở; cần tiếp tục QA nhiều IME."],
        ["Accessibility", "accessibilityLabel, accessibilityRole, live region cho điều khiển/trạng thái quan trọng; chưa thay thế audit TalkBack/VoiceOver đầy đủ."],
        ["Responsive", "Có smoke viewport 360px/dark/reduced-motion ở web; font scale lớn và mọi thiết bị native chưa được kiểm chứng đầy đủ."],
    ]
    add_table(document, ["Nhóm", "Cách giao diện phản hồi"], rows, widths=[1.45, 5.65], size=8.1)


def add_architecture(document):
    add_heading(document, "6. Kiến trúc dữ liệu, dịch vụ và bảo toàn dữ liệu", 1)
    rows = [
        ["App/UI", "Expo SDK 57, React Native 0.86, React 19, TypeScript 6, Expo Router."],
        ["Local database", "Expo SQLite, migrations schema 40, repository, FTS5, SRS, history, decks, reading, grammar, stories, path, achievements, outbox."],
        ["Session state", "Zustand giữ queue/thiết lập tạm; dữ liệu bền được ghi SQLite."],
        ["Offline content", "Hán tự, giản/phồn, pinyin, nghĩa Việt/Anh, ví dụ, stroke data, 50 radicals, grammar/story seeds."],
        ["Audio/native", "expo-speech/TTS, expo-audio, speech recognition, pinyin composer, ML Kit Digital Ink khi native module có sẵn."],
        ["Cloud", "Supabase Auth/PostgREST/RPC, ZIP backup, sharing, manual sync và Edge Functions."],
        ["AI", "Gemini conversation Edge Function; OpenAI transcription Edge Function riêng cho pronunciation."],
        ["Data safety", "V40 chỉ patch bảy base dictionary IDs; bảo toàn custom words, decks, notes, SRS, review history, settings và audio."],
    ]
    add_table(document, ["Lớp", "Trách nhiệm hiện tại"], rows, widths=[1.45, 5.65], size=8.1)
    add_note(document, "Cloud boundary", "Manual sync hiện chỉ áp dụng SETTINGS và DECK metadata. Backup ZIP là luồng riêng; chưa đồng nghĩa full sync custom words, membership, notes, SRS, history và path giữa thiết bị.", fill=PALE_AMBER, label_color=AMBER)


def add_content_audit(document):
    add_heading(document, "7. Kiểm kê nội dung và chất lượng dữ liệu", 1)
    add_table(
        document,
        ["Khoản mục", "Số lượng hiện tại", "Trạng thái"],
        [
            ["Raw vocabulary JSON", "11.330", "Dữ liệu nguồn nội bộ; không phải official total."],
            ["Canonical offline vocabulary", "11.379", "Sau merge/corrections/supplemental surnames; không cộng custom words thiết bị."],
            ["Phân bố canonical", "HSK1 508 · HSK2 770 · HSK3 955 · HSK4 1.006 · HSK5 1.078 · HSK6 1.154 · HSK7–9 5.908", "Internal levels; official crosswalk chưa xác minh."],
            ["Active grammar", "40", "HSK1–6; HSK7–9 active chưa có."],
            ["Shared sentence seed", "47", "Nội dung seed hiện tại."],
            ["Active stories", "18", "6 truyện mỗi nhóm HSK1–3."],
            ["Draft stories", "14 truyện · 69 câu · 42 câu hỏi", "DRAFT, chưa publish."],
            ["Grammar drafts", "24 điểm · 48 ví dụ", "PENDING; không learner-visible như nội dung active."],
            ["Advanced grammar drafts", "4 điểm · 8 ví dụ", "DRAFT/UNVERIFIED; source-only."],
            ["Lexical drafts", "35 senses · 71 collocations · 35 examples", "DRAFT/PENDING; không phải 35 headwords mới."],
            ["Roleplay", "13 scenes · 42 goal exchanges", "Self-practice; chưa review độc lập."],
            ["Pronunciation pairs", "10 bài", "Self-practice; không acoustic scoring."],
            ["Playable reading questions", "28", "Original practice; chưa official verified."],
            ["Exam draft candidates", "84 · trong đó 24 TTS transcripts", "Bị chặn khỏi attempt learner."],
            ["Contextual draft lessons", "6 bài · 24 dialogue lines · 12 questions", "DRAFT/UNVERIFIED; chưa publish."],
        ],
        widths=[1.75, 2.25, 3.1],
        size=7.85,
    )
    add_note(document, "Audit conclusion", "Không có reference HSK chính thức đã xác minh, license/reference version, hoặc independent review đủ để gọi kho là Content Complete/Exam Ready. Internal review queue vẫn rộng; số đếm không chứng minh độ tự nhiên, đúng nghĩa, đúng cấp hoặc đủ syllabus.", fill=PALE_AMBER, label_color=AMBER)


def add_comparison(document):
    add_heading(document, "8. So sánh với bản Word trước và cập nhật mới nhất", 1)
    rows = [
        ["Phiên bản", "0.1.30 · code32 · schema39", "0.1.31 · code33 · schema40", "Đã tăng version và migration."],
        ["Route", "55 file theo Word", "60 file: 58 màn hình + 2 layout", "Bổ sung/kiểm kê rõ search, listening, pairs, recordings, story detail."],
        ["Vocabulary", "Word có cả mốc raw 11.330 và canonical 11.379", "Raw 11.330; canonical 11.379", "Không thêm 35 headwords; audit hiện tại thống nhất số canonical."],
        ["Polyphonic data", "Một số nghĩa/cách đọc còn chưa khớp", "Patch 7 base entries: 看/听/为/行/得/长/乐", "V40 sửa có giới hạn, không ghi đè dữ liệu người dùng."],
        ["Lexical drafts", "Word còn ghi 9 binding chưa khớp", "35/35 draft senses có canonical reading binding", "Vẫn DRAFT/PENDING, chưa tự publish."],
        ["Tests", "146 files / 819 tests", "146 files / 820 tests; focused 103 pass", "Thêm regression cho migration/lexical/stroke/Gemini."],
        ["Gemini", "Có contract/Edge Function", "Secret `4Chinese_Key_Gemini` được đọc; default model `gemini-3.8-flash`", "Provider call thật vẫn chưa E2E QA."],
        ["Stroke", "Thiếu 6 ký tự", "Vẫn thiếu đúng 6 ký tự", "Không thay nét giả; fallback font/free-writing."],
        ["Android", "Word ghi 0.1.30 build/cài lịch sử", "0.1.31 chưa cài; Gradle native candidate fail tại react-native-worklets CMake", "Expo export vẫn đạt; chưa phải APK phát hành."],
    ]
    add_table(document, ["Hạng mục", "Bản Word", "Mã nguồn hiện tại", "Ý nghĩa"], rows, widths=[1.2, 1.85, 2.3, 1.75], size=7.4)
    add_note(document, "Không có UI mới trong V40", "V40 là update dữ liệu/migration/test. Các route và luồng V5 lớn đã có trước đó; phần mới nhất chủ yếu sửa độ chính xác của từ đa âm và tăng bảo toàn dữ liệu khi nâng schema.")


def add_verification(document):
    add_heading(document, "9. Kiểm chứng, trạng thái build và giới hạn", 1)
    add_table(
        document,
        ["Hạng mục", "Kết quả hiện tại", "Giới hạn cần hiểu đúng"],
        [
            ["Focused tests", "103 passed", "Chỉ nhóm migration/lexical/stroke/Gemini; không thay thế device QA."],
            ["Full Vitest", "146 files / 820 tests passed", "Unit/integration; không bao phủ mọi native lifecycle."],
            ["Lint", "PASS", "Kiểm tra code style/lint."],
            ["TypeScript", "PASS", "Kiểm tra kiểu compile-time."],
            ["V5 audit check", "PASS", "Audit deterministic từ bundled seeds; không truy vấn database trên điện thoại."],
            ["Expo Android export", "PASS", "JavaScript bundle/export; chưa chứng minh APK native."],
            ["Gradle release candidate", "FAIL ở react-native-worklets CMake", "Chưa có APK 0.1.31 đủ điều kiện cài."],
            ["Web", "Có export/smoke artifacts lịch sử", "Không coi là mọi browser/mic/AI đã E2E."],
            ["Device", "Chưa cài 0.1.31", "Không có xác nhận mới cho mic, TTS, TalkBack, font scale, lifecycle, data retention."],
            ["Gemini live call", "Chưa chạy provider thật", "Cần Supabase deployment, auth QA session, quota/model/network."],
        ],
        widths=[1.55, 2.0, 3.55],
        size=7.9,
    )
    add_heading(document, "9.1 Giới hạn sản phẩm còn tồn tại", 2)
    for bullet in (
        "Chưa có reference HSK chính thức/licensed/versioned và independent academic review để xác nhận độ phủ.",
        "Ngữ pháp active mới ở HSK 1–6; nội dung HSK 7–9 đang ở dạng draft/source-only.",
        "Nội dung truyện active mới ở HSK 1–3; 14 truyện bổ sung chưa publish.",
        "Native/licensed audio pack chưa được bundle; SYSTEM_TTS không phải giọng bản xứ.",
        "Sáu chữ vẫn thiếu stroke data offline.",
        "Cloud sync chưa đồng bộ đầy đủ nội dung từ, membership, notes, SRS, history và path.",
        "Speech recognition, microphone, TTS, TalkBack/VoiceOver và font scale cần QA trên thiết bị thật.",
        "Mini test/readiness không phải đề thi HSK chính thức; chưa có nhãn Exam Ready.",
    ):
        add_bullet(document, bullet)


def add_next_steps(document):
    add_heading(document, "10. Việc còn lại và kết luận", 1)
    add_table(
        document,
        ["Ưu tiên", "Việc cần hoàn thiện", "Tiêu chí nghiệm thu"],
        [
            ["P0", "Sửa native Gradle/CMake để build được APK 0.1.31", "assembleRelease PASS, ký debug hợp lệ, không reset dữ liệu."],
            ["P1", "QA Android/iOS thật cho mic, keyboard, font scale, audio, TalkBack/VoiceOver, lifecycle", "Có checklist và artifact theo thiết bị/OS."],
            ["P1", "Chạy Gemini provider thật với Supabase secret `4Chinese_Key_Gemini`", "Auth, quota, timeout, model, lỗi mạng và retry được xác nhận."],
            ["P1", "Thiết kế full sync hoặc đổi nhãn phạm vi cloud", "Người dùng hiểu rõ cái gì sync, cái gì chỉ backup."],
            ["P2", "Bổ sung stroke data 6 chữ", "Hints offline có dữ liệu thật và regression pass."],
            ["P2", "Review độc lập grammar, examples, lexical senses, stories và exam bank", "Có nguồn, version, reviewer và trạng thái publish."],
            ["P2", "Mở rộng grammar HSK 7–9, truyện HSK 4–9, audio và reader PDF/URL", "Có content gate và kiểm thử riêng từng loại nội dung."],
        ],
        widths=[0.75, 3.2, 3.15],
        size=7.85,
    )
    add_note(
        document,
        "Kết luận",
        "Bản mã nguồn hiện tại đã có đầy đủ các nhánh sản phẩm lớn và nhiều cơ chế bảo toàn dữ liệu, nhưng vẫn cần tách biệt rõ giữa tính năng đã lập trình, nội dung draft, kiểm thử tự động, QA thiết bị và độ đầy đủ học thuật. Báo cáo này không đánh dấu toàn bộ V5 là hoàn tất và không xác nhận bản 0.1.31 đã được cài lên điện thoại.",
        fill=PALE_GREEN,
        label_color=GREEN,
    )
    add_heading(document, "Nguồn đối chiếu", 2)
    for source in (
        "package.json, app.json, src/app/**, src/components/**, src/db/**, src/services/**, src/data/**",
        "docs/V5_DATA_AUDIT.md và docs/V5_DATA_AUDIT.json",
        "docs/V5_V40_ADDENDUM.md",
        "supabase/functions/gemini-conversation/index.ts",
        "Không đưa API key, password, access token hoặc dữ liệu riêng tư vào tài liệu.",
    ):
        add_bullet(document, source)


def build_report():
    document = Document()
    configure_document(document)
    document.core_properties.title = "4Chinese — Toàn bộ tính năng, luồng nghiệp vụ và tương tác giao diện hiện tại"
    document.core_properties.subject = "Source-backed product and UX inventory for HocTiengTrungApp"
    document.core_properties.author = "4Chinese project inventory"
    document.core_properties.keywords = "4Chinese, HSK, vocabulary, UI, workflow, interaction, V5, schema 40"

    add_title_page(document)
    add_contents(document)
    document.add_page_break()

    add_heading(document, "1. Tổng quan sản phẩm và phạm vi", 1)
    add_bullet(document, "Sản phẩm: ứng dụng học tiếng Trung offline-first, có SQLite làm nguồn dữ liệu cục bộ cho từ vựng, SRS, lịch ôn, bộ từ, lịch sử, thống kê và nội dung học.")
    add_bullet(document, "Nền tảng code: Expo SDK 57, React Native 0.86, React 19, TypeScript 6 và Expo Router; có cấu hình Android, iOS và web export.")
    add_bullet(document, "Điều hướng chính: Trang chủ, HSK, Kho từ, Thống kê và Tài khoản; các công cụ chuyên sâu mở qua route riêng nhưng giữ khả năng quay lại ngữ cảnh trước.")
    add_bullet(document, "Candidate hiện tại: package/app version 0.1.31, Android versionCode 33, SQLite schema 40.")
    add_bullet(document, "Báo cáo này thống kê hiện trạng mã nguồn và dữ liệu bundled; không coi dữ liệu draft, test pass hoặc bản build là bằng chứng thay thế cho nghiệm thu học thuật/native/provider.")

    add_feature_sections(document)
    add_route_map(document)
    add_workflows(document)
    add_ui_system(document)
    add_architecture(document)
    add_content_audit(document)
    add_comparison(document)
    add_verification(document)
    add_next_steps(document)

    document.save(OUTPUT)
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    build_report()
