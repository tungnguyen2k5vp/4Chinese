"""Build a Vietnamese, non-technical 4Chinese overview DOCX for sharing."""

from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Mm, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "BAO_CAO_4CHINESE_DE_HIEU_2026-10-07.docx"

BLUE = "2457D6"
NAVY = "172033"
MUTED = "626B7B"
PALE_BLUE = "E9EFFF"
PALE_AMBER = "FFF4D6"
PALE_GREEN = "E7F7F0"
GREEN = "218A67"
AMBER = "B66A00"
WHITE = "FFFFFF"
GRID = "DFE5EF"


def set_language(run) -> None:
    properties = run._element.get_or_add_rPr()
    tag = properties.find(qn("w:lang"))
    if tag is None:
        tag = OxmlElement("w:lang")
        properties.append(tag)
    tag.set(qn("w:val"), "vi-VN")


def add_page_field(paragraph) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("4Chinese  ·  Báo cáo tổng quan  ·  ")
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MUTED)
    set_language(run)
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), "PAGE")
    paragraph._p.append(field)


def configure(document: Document) -> None:
    section = document.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.top_margin = Inches(0.7)
    section.bottom_margin = Inches(0.7)
    section.left_margin = Inches(0.76)
    section.right_margin = Inches(0.76)
    section.header_distance = Inches(0.32)
    section.footer_distance = Inches(0.32)

    styles = document.styles
    normal = styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(10)
    normal.font.color.rgb = RGBColor.from_string(NAVY)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.12

    for name, size, color in (
        ("Title", 28, NAVY),
        ("Heading 1", 18, NAVY),
        ("Heading 2", 13, BLUE),
        ("Heading 3", 11, NAVY),
    ):
        style = styles[name]
        style.font.name = "Aptos Display" if name in ("Title", "Heading 1") else "Aptos"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
        style.paragraph_format.space_before = Pt(12 if name != "Title" else 0)
        style.paragraph_format.space_after = Pt(6)
        style.paragraph_format.keep_with_next = True

    for style_name in ("List Bullet", "List Number"):
        styles[style_name].paragraph_format.space_after = Pt(4)
        styles[style_name].paragraph_format.line_spacing = 1.08

    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = header.add_run("4CHINESE  /  GIỚI THIỆU ỨNG DỤNG")
    run.bold = True
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(BLUE)
    set_language(run)
    add_page_field(section.footer.paragraphs[0])

    settings = document.settings.element
    update_fields = OxmlElement("w:updateFields")
    update_fields.set(qn("w:val"), "true")
    settings.append(update_fields)


def set_cell_shading(cell, fill: str) -> None:
    properties = cell._tc.get_or_add_tcPr()
    shading = properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        properties.append(shading)
    shading.set(qn("w:fill"), fill)


def set_cell_border(cell) -> None:
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
        element.set(qn("w:color"), GRID)


def repeat_header(row) -> None:
    properties = row._tr.get_or_add_trPr()
    header = OxmlElement("w:tblHeader")
    header.set(qn("w:val"), "true")
    properties.append(header)


def prevent_split(row) -> None:
    row._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))


def add_callout(document, label: str, text: str, *, fill=PALE_BLUE, label_color=BLUE) -> None:
    table = document.add_table(rows=1, cols=1)
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    set_cell_border(cell)
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_before = Pt(7)
    paragraph.paragraph_format.space_after = Pt(7)
    lead = paragraph.add_run(f"{label}  ")
    lead.bold = True
    lead.font.color.rgb = RGBColor.from_string(label_color)
    set_language(lead)
    body = paragraph.add_run(text)
    set_language(body)
    spacer = document.add_paragraph()
    spacer.paragraph_format.space_after = Pt(1)


def add_table(document, headers: list[str], rows: list[list[str]], *, widths=None, font_size=8.7) -> None:
    table = document.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.style = "Table Grid"
    repeat_header(table.rows[0])
    prevent_split(table.rows[0])

    for index, value in enumerate(headers):
        cell = table.rows[0].cells[index]
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_shading(cell, BLUE)
        cell.text = ""
        paragraph = cell.paragraphs[0]
        paragraph.paragraph_format.space_before = Pt(3)
        paragraph.paragraph_format.space_after = Pt(3)
        run = paragraph.add_run(value)
        run.bold = True
        run.font.size = Pt(font_size)
        run.font.color.rgb = RGBColor.from_string(WHITE)
        set_language(run)
        set_cell_border(cell)

    for row_index, values in enumerate(rows):
        row = table.add_row()
        prevent_split(row)
        for index, value in enumerate(values):
            cell = row.cells[index]
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            cell.text = ""
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_before = Pt(3)
            paragraph.paragraph_format.space_after = Pt(3)
            paragraph.paragraph_format.line_spacing = 1.04
            run = paragraph.add_run(value)
            run.font.size = Pt(font_size)
            set_language(run)
            if row_index % 2 == 0:
                set_cell_shading(cell, "F7F9FD")
            set_cell_border(cell)

    if widths:
        for row in table.rows:
            for index, width in enumerate(widths):
                row.cells[index].width = Inches(width)
    document.add_paragraph().paragraph_format.space_after = Pt(1)


def add_bullets(document, items: list[str]) -> None:
    for item in items:
        paragraph = document.add_paragraph(style="List Bullet")
        paragraph.paragraph_format.keep_together = True
        run = paragraph.add_run(item)
        set_language(run)


def add_paragraph(document, text: str) -> None:
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.widow_control = True
    run = paragraph.add_run(text)
    set_language(run)


def add_cover(document) -> None:
    kicker = document.add_paragraph()
    kicker.paragraph_format.space_before = Pt(58)
    kicker.paragraph_format.space_after = Pt(10)
    run = kicker.add_run("BÁO CÁO TỔNG QUAN DÀNH CHO NGƯỜI ĐỌC")
    run.bold = True
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor.from_string(BLUE)
    set_language(run)

    title = document.add_paragraph(style="Title")
    title.paragraph_format.space_after = Pt(12)
    title.add_run("4Chinese\nỨng dụng học tiếng Trung có gì?")

    subtitle = document.add_paragraph()
    subtitle.paragraph_format.space_after = Pt(18)
    run = subtitle.add_run("Giới thiệu chức năng, cách sử dụng và những điểm còn nên kiểm tra")
    run.font.size = Pt(14)
    run.font.color.rgb = RGBColor.from_string(MUTED)
    set_language(run)

    add_callout(
        document,
        "Báo cáo này dành cho bạn",
        "Bạn không cần biết lập trình hay cách làm ứng dụng. Tài liệu mô tả 4Chinese theo góc nhìn của người học: có thể làm gì, phần nào cần Internet/quyền thiết bị, và điều gì nên được kiểm tra tiếp.",
    )

    info = document.add_table(rows=3, cols=2)
    info.alignment = WD_TABLE_ALIGNMENT.LEFT
    entries = [
        ("Ngày tổng hợp", "07/10/2026"),
        ("Bản ứng dụng được rà soát", "0.1.34"),
        ("Ứng dụng", "4Chinese · học tiếng Trung cho người Việt"),
    ]
    for index, (label, value) in enumerate(entries):
        left, right = info.rows[index].cells
        set_cell_shading(left, "F0F3FA")
        set_cell_border(left)
        set_cell_border(right)
        left.text = label
        right.text = value
        for cell in (left, right):
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.size = Pt(9)
                    set_language(run)
        for run in left.paragraphs[0].runs:
            run.bold = True
            run.font.color.rgb = RGBColor.from_string(NAVY)
    info.columns[0].width = Inches(1.65)
    info.columns[1].width = Inches(4.9)

    document.add_paragraph()
    add_table(
        document,
        ["Kho từ", "Mức HSK", "Các kỹ năng", "Bản kiểm tra gần nhất"],
        [["11.828 mục", "HSK 1–9", "Nghe · nói · đọc · viết", "863 bài kiểm tra tự động đạt"]],
        widths=[1.5, 1.25, 2.05, 1.8],
        font_size=8.2,
    )
    note = document.add_paragraph()
    note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    note.paragraph_format.space_before = Pt(2)
    run = note.add_run("Con số kiểm tra tự động được ghi nhận ở đợt QA trước; không thay cho việc thử mọi màn hình.")
    run.italic = True
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MUTED)
    set_language(run)
    document.add_page_break()


def add_contents(document) -> None:
    document.add_heading("Mục lục", level=1)
    items = [
        "1. Tóm tắt nhanh",
        "2. 4Chinese giúp người học làm gì?",
        "3. Các chức năng, giải thích dễ hiểu",
        "4. Một lộ trình sử dụng mẫu",
        "5. Kho từ và nội dung học",
        "6. Phần nào cần Internet hoặc quyền trên điện thoại?",
        "7. Đã kiểm tra được gì, còn gì chưa chắc?",
        "8. Nên hoàn thiện theo thứ tự nào?",
        "9. Câu hỏi thường gặp",
        "10. Giải thích vài từ thường gặp",
        "Kết luận",
    ]
    add_bullets(document, items)
    add_callout(document, "Cách đọc", "Bảng ‘đã có’ nói rằng app có khu vực/chức năng tương ứng. Bảng ‘cần kiểm tra’ nói rằng chưa có đủ bằng chứng để khẳng định mọi trường hợp đều hoạt động tốt.")
    document.add_page_break()


def build_report() -> Path:
    document = Document()
    configure(document)
    document.core_properties.title = "4Chinese – Ứng dụng học tiếng Trung có gì?"
    document.core_properties.subject = "Tổng quan chức năng và đề xuất hoàn thiện, viết cho độc giả không chuyên"
    document.core_properties.author = "4Chinese · Báo cáo dự án"
    document.core_properties.keywords = "4Chinese, học tiếng Trung, HSK, báo cáo dễ hiểu"
    document.core_properties.language = "vi-VN"

    add_cover(document)
    add_contents(document)

    document.add_heading("1. Tóm tắt nhanh", level=1)
    add_paragraph(document, "4Chinese là ứng dụng giúp người Việt học tiếng Trung từ vựng, luyện nghe-nói-đọc-viết và theo dõi thói quen học. Ứng dụng đã có nhiều phần hơn flashcard thông thường: ngoài tra từ và ôn bài còn có ngữ pháp, lộ trình, truyện, luyện viết, thi thử, bộ từ cá nhân và một số tiện ích trực tuyến.")
    add_callout(document, "Điều quan trọng nhất", "Danh sách chức năng khá đầy đủ. Việc cần ưu tiên tiếp theo là thử kỹ các luồng trên điện thoại và xác nhận những phần dùng Internet như AI, sao lưu và đồng bộ — không nhất thiết phải thêm thật nhiều màn hình mới ngay.", fill=PALE_GREEN, label_color=GREEN)
    add_paragraph(document, "Báo cáo này phân biệt ‘đã có phần tương ứng trong ứng dụng’ với ‘đã kiểm tra sử dụng thành công’. Hai điều đó không giống nhau: một lựa chọn có thể xuất hiện trên màn hình nhưng vẫn cần thử các tình huống như mất mạng, từ chối quyền micro, dữ liệu trống hoặc khôi phục sau khi đổi điện thoại.")

    document.add_heading("2. 4Chinese giúp người học làm gì?", level=1)
    add_bullets(document, [
        "Bắt đầu theo trình độ: chọn mục tiêu/HSK và xem khu vực học chính từ trang chủ.",
        "Tra và học từ: xem chữ Hán, cách đọc, nghĩa và ví dụ; lưu từ vào danh sách cá nhân.",
        "Ôn bài có lịch: ứng dụng nhắc lại từ đã học sau những khoảng thời gian phù hợp, thay vì bắt người học tự nhớ lịch.",
        "Luyện nhiều kỹ năng: có các phần nghe, nói, phát âm, viết chữ, đọc truyện/tài liệu và ngữ pháp.",
        "Theo dõi quá trình: xem thống kê, từ yếu/từ hay sai, mục tiêu và thành tích.",
        "Dùng một số dịch vụ trực tuyến: hội thoại AI, chia sẻ, đồng bộ hoặc sao lưu; các phần này cần được xác nhận đang hoạt động với tài khoản và kết nối thật.",
    ])
    add_table(
        document,
        ["Khu vực chính", "Bạn sẽ dùng để làm gì?"],
        [
            ["Trang chủ", "Xem việc học hôm nay, tiến độ và đường tắt tới các bài luyện."],
            ["HSK", "Chọn cấp độ và tìm nội dung gắn với mục tiêu HSK."],
            ["Từ vựng", "Tìm từ, xem thông tin và tiến độ nhớ từ."],
            ["Thống kê", "Theo dõi lịch sử và kết quả học."],
            ["Hồ sơ/Cài đặt", "Quản lý lựa chọn và một số thiết lập của ứng dụng."],
        ],
        widths=[1.55, 5.05],
    )

    document.add_heading("3. Các chức năng, giải thích dễ hiểu", level=1)
    feature_groups = [
        ("3.1 Học từ và tra cứu HSK", [
            "Có kho 11.828 mục từ theo dữ liệu được ghi nhận; nội dung trải từ HSK 1 đến nhóm HSK 7–9.",
            "Có thể tìm theo chữ Hán, cách đọc pinyin hoặc nghĩa; xem ví dụ, thông tin từ và nghe phát âm ở nơi có hỗ trợ.",
            "Có khu vực xem các từ dễ nhầm lẫn để người học phân biệt những từ giống nhau.",
            "Có syllabus/lộ trình tham chiếu HSK. Ứng dụng không tự động trở thành đơn vị cấp chứng chỉ HSK chính thức.",
        ]),
        ("3.2 Học từ mới và ôn lại", [
            "Có phiên học từ mới, bài luyện và các lượt ôn nhiều lần.",
            "Lịch ôn lặp lại ngắt quãng giúp đưa từ trở lại sau một khoảng thời gian; trả lời sai có thể khiến ứng dụng cho ôn sớm hơn.",
            "Có danh sách từ đến hạn, từ yếu và sổ lỗi để tập trung vào những phần người học đang gặp khó.",
            "Bài tập thay đổi cách hỏi như nhớ nghĩa, nhận mặt chữ, pinyin, nghe chọn đáp án hoặc viết chữ.",
        ]),
        ("3.3 Bộ từ của riêng bạn", [
            "Tạo bộ từ theo chủ đề, thêm hoặc sửa từ, và nhập nhiều từ cùng lúc.",
            "Có thể luyện riêng một bộ bằng cách nghe, làm quiz hoặc tập phát âm.",
            "Có thùng rác/khôi phục cho bộ từ; tính năng chia sẻ cần kết nối dịch vụ trực tuyến.",
        ]),
        ("3.4 Ngữ pháp và lộ trình", [
            "Có danh sách điểm ngữ pháp, phần giải thích/chi tiết, ví dụ và chế độ tập trung luyện một nội dung.",
            "Có lộ trình học theo khóa, đơn vị và bài; một bài có thể kết hợp từ vựng, nghe, nói, đọc, viết và ôn tập.",
            "Độ bao phủ và độ chuẩn của từng bài vẫn cần người có chuyên môn tiếng Trung rà soát định kỳ.",
        ]),
        ("3.5 Nghe, nói và phát âm", [
            "Có khu luyện nghe, thanh điệu, cặp âm dễ nhầm và shadowing — nghe mẫu rồi nói nhắc theo.",
            "Có thể ghi âm và nghe lại một số bài nói.",
            "Có phần hội thoại với AI theo tình huống và luồng chấm phát âm; chất lượng phụ thuộc Internet, quyền micro và dịch vụ phía sau.",
            "Ứng dụng có cách xử lý khi không cấp quyền micro ở một số luồng, nhưng cần thử thêm nhiều máy và điều kiện thực tế.",
        ]),
        ("3.6 Viết chữ Hán", [
            "Có khu vực luyện viết và xem hướng dẫn nét chữ.",
            "Trên một số bản Android, ứng dụng dùng công nghệ nhận dạng nét viết trên thiết bị. Đây là chức năng cần cài bản app Android phù hợp; không phải mọi cách mở ứng dụng đều có đủ hỗ trợ.",
        ]),
        ("3.7 Đọc truyện và tài liệu", [
            "Có truyện ngắn, câu hỏi đọc hiểu và khu đọc tài liệu/đoạn văn.",
            "Có dữ liệu từ vựng trong ngữ cảnh đọc để người học kết hợp đọc với tra từ.",
            "Cần tiếp tục kiểm tra thao tác với văn bản dài, cỡ chữ và việc nhập/mở tài liệu.",
        ]),
        ("3.8 Thi thử và đánh giá", [
            "Có màn hình chọn kỹ năng, xem mức sẵn sàng, làm phiên thi thử và xem kết quả.",
            "Một số bài gồm nói hoặc viết có giới hạn thời gian.",
            "Đây là bài luyện trong ứng dụng; không nên hiểu là đề thi chính thức hay lời đảm bảo sẽ đạt một cấp HSK.",
        ]),
        ("3.9 Thống kê, mục tiêu và thành tích", [
            "Có các màn hình thống kê, mục tiêu, thành tích và điểm kinh nghiệm (XP).",
            "Có dữ liệu theo dõi ngày học và kết quả ôn; cần kiểm tra riêng cách tính ở tài khoản mới/chưa có dữ liệu.",
            "Ứng dụng có phần nhắc học/thông báo; cần thử khi người dùng không cấp quyền thông báo.",
        ]),
        ("3.10 Lưu trực tuyến và AI", [
            "Dự án có chức năng dự kiến cho chia sẻ bộ từ, đồng bộ nhiều thiết bị, sao lưu và khôi phục.",
            "Có phần kết nối dịch vụ AI cho hội thoại và chấm phát âm.",
            "Có các phần này trong ứng dụng chưa đủ để khẳng định máy chủ, tài khoản, hạn mức và quy trình khôi phục đang hoạt động hoàn chỉnh. Cần thử trên tài khoản thật với dữ liệu an toàn.",
        ]),
    ]
    for title, bullets in feature_groups:
        document.add_heading(title, level=2)
        add_bullets(document, bullets)

    document.add_heading("4. Một lộ trình sử dụng mẫu", level=1)
    add_paragraph(document, "Một người mới có thể bắt đầu theo trình tự dưới đây. Đây là gợi ý dễ thử, không phải yêu cầu bắt buộc:")
    add_bullets(document, [
        "Chọn mục tiêu hoặc cấp độ HSK gần với trình độ hiện tại.",
        "Mở trang chủ để xem nội dung học trong ngày.",
        "Học một nhóm từ mới và nghe cách phát âm.",
        "Làm bài luyện để thử nhớ nghĩa, nhận mặt chữ hoặc nghe từ.",
        "Quay lại ôn từ đến hạn; xem từ nào hay sai để luyện thêm.",
        "Chọn thêm một hoạt động ngắn như ngữ pháp, nghe, đọc hoặc luyện viết.",
        "Cuối buổi xem thống kê để biết mình đã học được gì.",
    ])
    add_callout(document, "Mẹo đánh giá app", "Khi thử trên điện thoại, hãy kiểm tra không chỉ màn hình đầu tiên mà cả thao tác lưu, thoát ứng dụng rồi mở lại — để chắc chắn tiến độ vẫn còn.", fill=PALE_GREEN, label_color=GREEN)

    document.add_heading("5. Kho từ và nội dung học", level=1)
    add_paragraph(document, "Báo cáo kiểm tra dữ liệu gần nhất ghi nhận 11.828 mục từ. Phân bố được lưu trong bản kiểm tra ngày 02/10/2026 như sau:")
    add_table(
        document,
        ["Cấp độ", "Số mục từ", "Cấp độ", "Số mục từ"],
        [
            ["HSK 1", "508", "HSK 5", "1.461"],
            ["HSK 2", "751", "HSK 6", "1.242"],
            ["HSK 3", "963", "HSK 7–9", "5.916"],
            ["HSK 4", "987", "Tổng", "11.828"],
        ],
        widths=[1.5, 1.7, 1.5, 1.7],
    )
    add_callout(document, "Cách hiểu con số", "Lần kiểm tra dữ liệu được ghi nhận không phát hiện lỗi cấu trúc. Điều này có nghĩa dữ liệu vượt qua kiểm tra tự động cơ bản; không có nghĩa mọi nghĩa tiếng Việt, ví dụ và cách phân cấp đã được chuyên gia đọc lại từng dòng.", fill=PALE_AMBER, label_color=AMBER)

    document.add_heading("6. Phần nào cần Internet hoặc quyền trên điện thoại?", level=1)
    add_table(
        document,
        ["Nhóm chức năng", "Có thể cần gì?", "Điểm cần thử"],
        [
            ["Tra từ và học cơ bản", "Nhiều dữ liệu được lưu trên máy; phần học cốt lõi được thiết kế ưu tiên dùng tại chỗ.", "Thử bật chế độ máy bay để biết chính xác phần nào vẫn dùng được."],
            ["AI và chấm phát âm", "Kết nối Internet; đôi khi cần tài khoản và quyền micro.", "Thử mạng yếu, từ chối micro, giới hạn sử dụng và lỗi máy chủ."],
            ["Nhận diện giọng nói", "Micro và dịch vụ nhận dạng giọng nói có trên thiết bị.", "Khả năng hỗ trợ có thể khác nhau theo máy và cài đặt Android."],
            ["Viết tay", "Bản cài Android có thành phần nhận dạng nét phù hợp.", "Thử trên điện thoại thật; không chỉ dựa vào bản xem trước."],
            ["Đồng bộ/sao lưu/chia sẻ", "Internet và dịch vụ lưu trữ trực tuyến đã được cài đặt.", "Thử sao lưu rồi khôi phục trên máy khác, kiểm tra không mất/nhân đôi tiến độ."],
            ["Thông báo nhắc học", "Quyền thông báo và thiết lập của điện thoại.", "Thử cả khi người dùng từ chối quyền."],
        ],
        widths=[1.35, 2.45, 2.6],
        font_size=8.2,
    )

    document.add_heading("7. Đã kiểm tra được gì, còn gì chưa chắc?", level=1)
    add_paragraph(document, "Trong đợt kiểm tra gần nhất được ghi lại, nhiều bài kiểm tra tự động đã đạt và bản Android được chạy thử trên điện thoại ảo. Một bản cài thử cũng đã được cài/mở trên điện thoại thật trong phiên làm việc trước. Ảnh đã chụp bao phủ nhiều màn hình và trạng thái, nhưng không phải mọi trang và mọi thao tác.")
    add_table(
        document,
        ["Đã có bằng chứng gần nhất", "Chưa thể khẳng định hoàn toàn"],
        [
            ["Ứng dụng Android đã được build và mở thử.", "Mọi màn hình chi tiết, mọi nút và mọi phiên học/thi đều hoạt động hoàn hảo."],
            ["Các nhóm chính như trang chủ, từ vựng, nghe, lộ trình và nói đã được xem/kiểm tra ở một số trạng thái.", "Mọi cỡ màn hình, chế độ tối, chữ lớn và bàn phím đã được kiểm tra trên mọi trang."],
            ["Các kiểm tra tự động gần nhất báo cáo 863 trường hợp đạt.", "Người học sẽ không bao giờ gặp lỗi khi dùng dữ liệu thật hoặc mạng yếu."],
            ["Có xử lý một số trường hợp quyền micro và fallback.", "TalkBack (đọc màn hình cho người khiếm thị), quyền thông báo và nhận diện viết tay đã được rà soát toàn diện."],
            ["Có các chức năng cloud/AI trong dự án.", "Sao lưu/khôi phục, đồng bộ tài khoản và AI đang hoạt động ổn định với máy chủ production."],
            ["Có cài đặt Android/iOS/web trong dự án.", "Các phiên bản iPhone và web đã được kiểm tra kỹ như Android."],
        ],
        widths=[3.2, 3.2],
        font_size=8.2,
    )
    add_callout(document, "Nói ngắn gọn", "App đã có nhiều phần để học và đã qua các kiểm tra quan trọng, nhưng mức kiểm thử hiện tại là ‘đại diện’, chưa phải chứng nhận mọi tính năng trên mọi máy.", fill=PALE_AMBER, label_color=AMBER)

    document.add_heading("8. Nên hoàn thiện theo thứ tự nào?", level=1)
    add_table(
        document,
        ["Ưu tiên", "Việc nên làm", "Khi nào xem là đạt?"],
        [
            ["1 · Rất nên làm", "Thử trọn các luồng chính trên điện thoại: bắt đầu học, lưu từ, ôn, đóng app rồi mở lại.", "Tiến độ vẫn đúng; lỗi/đường đi cụt được ghi lại và sửa."],
            ["2 · Rất nên làm", "Thử sao lưu, đổi thiết bị/khôi phục và xử lý khi mạng ngắt.", "Không mất dữ liệu, không tạo bản ghi trùng; người dùng biết dữ liệu nào được lưu online."],
            ["3 · Nên làm", "Kiểm tra quyền micro/thông báo, nói, nghe, viết tay và cỡ chữ lớn.", "Có hướng dẫn dễ hiểu khi thiếu quyền hoặc thiết bị không hỗ trợ."],
            ["4 · Nên làm", "Rà soát nghĩa, ví dụ và mức HSK của nội dung học.", "Có người kiểm tra nội dung; phần thi thử được ghi rõ không phải đề/chứng nhận chính thức."],
            ["5 · Nên làm", "Giải thích rõ AI sử dụng dữ liệu nào và cần Internet khi nào.", "Có thông báo quyền riêng tư, giới hạn sử dụng và cách học tiếp khi AI không khả dụng."],
            ["6 · Sau đó", "Chọn tính năng mới dựa trên phản hồi người học.", "Ưu tiên vấn đề người dùng thực sự gặp thay vì thêm chức năng chỉ để tăng số lượng."],
        ],
        widths=[1.05, 2.8, 2.55],
        font_size=8.1,
    )

    document.add_heading("9. Câu hỏi thường gặp", level=1)
    faq = [
        ("Có cần Internet để học không?", "Một số nội dung học cơ bản được thiết kế để lưu trên điện thoại. AI, đồng bộ, chia sẻ và sao lưu cần Internet. Muốn biết chính xác tính năng nào dùng offline, hãy thử trong chế độ máy bay."),
        ("Đây có phải ứng dụng thi HSK chính thức không?", "Ứng dụng có nội dung luyện tập/thi thử, nhưng báo cáo hiện có không xác nhận đây là đề thi chính thức hoặc chứng nhận kết quả HSK."),
        ("Đổi điện thoại có lấy lại tiến độ không?", "Ứng dụng có các phần dành cho sao lưu/đồng bộ. Cần thử luồng sao lưu và khôi phục thật trước khi dựa vào đó để chuyển máy."),
        ("AI có luôn chấm đúng không?", "Không nên mặc định như vậy. Chấm phát âm/hội thoại cần được thử với nhiều giọng, môi trường và điều kiện mạng; AI cũng có thể không sẵn sàng."),
        ("Có nên thêm thật nhiều tính năng ngay không?", "Chưa phải ưu tiên đầu tiên. Nên xác nhận những luồng quan trọng đang dễ dùng và giữ tiến độ an toàn, rồi mới chọn tính năng mới."),
    ]
    for question, answer in faq:
        document.add_heading(question, level=2)
        add_paragraph(document, answer)

    document.add_heading("10. Giải thích vài từ thường gặp", level=1)
    add_table(
        document,
        ["Từ", "Giải thích không chuyên"],
        [
            ["Mã nguồn", "Bộ hướng dẫn và tệp mà đội phát triển dùng để tạo nên ứng dụng. Người dùng bình thường không cần mở hay hiểu các tệp này."],
            ["Kiểm tra tự động", "Máy tự chạy nhiều phép thử để tìm lỗi. Hữu ích nhưng không thay thế việc người thật dùng app."],
            ["Điện thoại ảo", "Một chiếc điện thoại mô phỏng chạy trên máy tính, dùng để thử ứng dụng."],
            ["Ôn lặp lại ngắt quãng", "Cách nhắc lại bài sau các khoảng thời gian để hỗ trợ ghi nhớ lâu hơn."],
            ["Đồng bộ", "Đưa một phần dữ liệu qua Internet để dùng tiếp trên thiết bị khác."],
            ["Sao lưu và khôi phục", "Tạo một bản dự phòng rồi dùng bản đó lấy lại dữ liệu khi cần."],
            ["AI", "Dịch vụ phần mềm có thể trò chuyện/đánh giá tự động; cần kiểm tra độ chính xác và dữ liệu được gửi đi."],
        ],
        widths=[1.65, 4.75],
    )

    document.add_heading("Kết luận", level=1)
    add_paragraph(document, "4Chinese hiện bao phủ phần lớn nhu cầu học tiếng Trung trong một ứng dụng: học và ôn từ, HSK, ngữ pháp, nghe-nói, viết, đọc, lộ trình, thi thử và theo dõi tiến độ. Điều còn cần làm rõ không phải là ‘có thêm bao nhiêu màn hình’, mà là các luồng này có ổn định, dễ hiểu, an toàn dữ liệu và hoạt động đúng trên điện thoại của người học hay không.")
    add_callout(document, "Đề xuất", "Dùng báo cáo này làm danh sách để người học hoặc người phụ trách sản phẩm đánh dấu: ‘đã thử’, ‘có lỗi’, ‘chưa dùng’ sau khi thao tác thật. Sau đó mới quyết định cần sửa gì hoặc phát triển thêm gì.", fill=PALE_GREEN, label_color=GREEN)

    document.save(OUTPUT)
    reopened = Document(OUTPUT)
    if len(reopened.paragraphs) < 80 or len(reopened.tables) < 8:
        raise RuntimeError("Kiểm tra DOCX thất bại: tài liệu có vẻ thiếu nội dung.")
    print(f"Created and checked: {OUTPUT}")
    print(f"Paragraphs: {len(reopened.paragraphs)} | Tables: {len(reopened.tables)}")
    return OUTPUT


if __name__ == "__main__":
    build_report()
