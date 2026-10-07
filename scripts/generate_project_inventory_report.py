from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "TONG_QUAN_TINH_NANG_GIAO_DIEN_TUONG_TAC_4CHINESE_2026-10-01.docx"

BLUE = "2457D6"
NAVY = "172033"
MUTED = "626B7B"
PALE = "E9EFFF"
PALE_GREEN = "E7F7F0"
GREEN = "218A67"
WHITE = "FFFFFF"
GRID = "E5E8F0"


def set_cell_shading(cell, fill):
    properties = cell._tc.get_or_add_tcPr()
    shading = properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        properties.append(shading)
    shading.set(qn("w:fill"), fill)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    repeat = OxmlElement("w:tblHeader")
    repeat.set(qn("w:val"), "true")
    tr_pr.append(repeat)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    tr_pr.append(OxmlElement("w:cantSplit"))


def set_cell_text(cell, text, *, bold=False, color=NAVY, size=8.5):
    cell.text = ""
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(2)
    paragraph.paragraph_format.space_before = Pt(2)
    run = paragraph.add_run(str(text))
    run.bold = bold
    run.font.name = "Aptos"
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")


def add_table(document, headers, rows, widths=None, size=8.3):
    table = document.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    table.autofit = False
    header = table.rows[0]
    set_repeat_table_header(header)
    prevent_row_split(header)
    for index, title in enumerate(headers):
        cell = header.cells[index]
        set_cell_shading(cell, BLUE)
        set_cell_text(cell, title, bold=True, color=WHITE, size=size)
    for row_data in rows:
        row = table.add_row()
        prevent_row_split(row)
        for index, value in enumerate(row_data):
            cell = row.cells[index]
            set_cell_text(cell, value, size=size)
            if len(table.rows) % 2 == 0:
                set_cell_shading(cell, "F7F8FC")
    if widths:
        for row in table.rows:
            for index, width in enumerate(widths):
                row.cells[index].width = Inches(width)
    document.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


def add_bullet(document, text, level=0):
    paragraph = document.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.add_run(text)
    return paragraph


def add_number(document, text):
    paragraph = document.add_paragraph(style="List Number")
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.add_run(text)
    return paragraph


def add_note(document, label, text, fill=PALE):
    table = document.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(4)
    lead = paragraph.add_run(label + "  ")
    lead.bold = True
    lead.font.color.rgb = RGBColor.from_string(BLUE if fill == PALE else GREEN)
    paragraph.add_run(text)
    document.add_paragraph().paragraph_format.space_after = Pt(1)


def add_heading(document, text, level=1):
    paragraph = document.add_heading(text, level=level)
    paragraph.paragraph_format.keep_with_next = True
    return paragraph


def add_page_field(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("4Chinese  ·  Kiểm kê hiện trạng  ·  ")
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MUTED)
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), "PAGE")
    paragraph._p.append(field)


def configure_document(document):
    section = document.sections[0]
    section.top_margin = Inches(0.68)
    section.bottom_margin = Inches(0.68)
    section.left_margin = Inches(0.72)
    section.right_margin = Inches(0.72)
    section.header_distance = Inches(0.32)
    section.footer_distance = Inches(0.34)

    styles = document.styles
    normal = styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(9.5)
    normal.font.color.rgb = RGBColor.from_string(NAVY)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.08

    for name, size, color in [
        ("Title", 30, NAVY),
        ("Heading 1", 18, NAVY),
        ("Heading 2", 12.5, BLUE),
        ("Heading 3", 10.5, NAVY),
    ]:
        style = styles[name]
        style.font.name = "Aptos Display" if name in ("Title", "Heading 1") else "Aptos"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
        style.paragraph_format.space_before = Pt(12 if name != "Title" else 0)
        style.paragraph_format.space_after = Pt(5)

    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = header.add_run("4CHINESE  /  BÁO CÁO SẢN PHẨM")
    run.bold = True
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(BLUE)
    add_page_field(section.footer.paragraphs[0])


def build_report():
    document = Document()
    configure_document(document)
    document.core_properties.title = "Tổng quan tính năng, giao diện và tương tác 4Chinese"
    document.core_properties.subject = "Kiểm kê implementation hiện tại của repository 4Chinese"
    document.core_properties.author = "4Chinese · Project inventory"
    document.core_properties.keywords = "4Chinese, tính năng, UI, tương tác, HSK, báo cáo"

    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(76)
    kicker = paragraph.add_run("BÁO CÁO KIỂM KÊ SẢN PHẨM")
    kicker.bold = True
    kicker.font.size = Pt(10)
    kicker.font.color.rgb = RGBColor.from_string(BLUE)

    title = document.add_paragraph(style="Title")
    title.paragraph_format.space_before = Pt(10)
    title.add_run("4Chinese")
    subtitle = document.add_paragraph()
    subtitle.paragraph_format.space_after = Pt(18)
    run = subtitle.add_run("Tổng quan tính năng · giao diện · tương tác")
    run.font.size = Pt(17)
    run.font.color.rgb = RGBColor.from_string(MUTED)

    add_note(
        document,
        "Phạm vi",
        "Kiểm kê repository HocTiengTrungApp tại ngày 01/10/2026. Nội dung được đối chiếu từ route, component, database, service, dữ liệu và cấu hình đang có; không coi tài liệu cũ hoặc mô tả UI là bằng chứng thay cho code.",
    )
    add_table(
        document,
        ["Quy mô", "Hiện trạng", "Quy mô", "Hiện trạng"],
        [
            ["Tệp route Expo Router", "43 (41 màn hình + 2 layout)", "Tab chính", "5"],
            ["Từ vựng offline", "11.330 mục · HSK 1–9", "Cấp nhớ SRS", "6"],
            ["Ngữ pháp seed", "28 cấu trúc · HSK 1–6", "Truyện ngắn", "18 · HSK 1–3"],
            ["Chủ đề học từ mới", "9 chủ đề", "Bộ thủ phổ biến", "50"],
        ],
        widths=[1.35, 2.35, 1.35, 2.35],
        size=8.2,
    )
    p = document.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.add_run("Kết luận ngắn").bold = True
    p.add_run(
        ": 4Chinese là ứng dụng học tiếng Trung offline-first, đã có các luồng học từ, ôn SRS, HSK, ngữ pháp, viết, nghe-nói, đọc, bộ từ cá nhân, thống kê và sao lưu. Các giới hạn quan trọng hiện tại là đồng bộ nhiều thiết bị chưa bao gồm nội dung/tiến độ từ vựng; kho ngữ pháp và truyện vẫn là tập nội dung hữu hạn; sáu ký tự thiếu stroke data; web và các dịch vụ AI cần kiểm tra end-to-end riêng."
    )
    document.add_page_break()

    add_heading(document, "1. Tóm tắt sản phẩm", 1)
    add_bullet(document, "Nền tảng: Expo SDK 57, React Native 0.86, React 19, TypeScript 6 và Expo Router; app cấu hình Android, iOS và web export.")
    add_bullet(document, "Ưu tiên lưu cục bộ: SQLite giữ kho từ, tiến độ, lịch ôn, cài đặt và nội dung cá nhân; phần học cơ bản tiếp tục dùng được khi offline.")
    add_bullet(document, "Điều hướng chính gồm Trang chủ, HSK, Kho từ, Thống kê và Tài khoản; các công cụ học chuyên sâu mở qua route riêng.")
    add_bullet(document, "Giao diện dùng tông xanh 4Chinese (#2457D6), nền sáng/tối, thẻ nội dung, thanh tiến độ, biểu đồ và thành phần thao tác dùng lại.")
    add_note(document, "Cách đọc báo cáo", "“Có trong code” không đồng nghĩa mọi trạng thái đã được kiểm thử thủ công trên điện thoại. Các dịch vụ cần mạng, quyền hệ thống hoặc API được đánh dấu riêng ở phần kiểm chứng.")

    add_heading(document, "2. Danh mục chức năng", 1)
    feature_sections = [
        ("2.1 Trang chủ và phiên học hôm nay", [
            "Hiển thị streak, XP trong ngày, mục tiêu từ mới, thời lượng học và một hành động ưu tiên được chọn từ lịch ôn, khóa học, từ mới hoặc tiến độ.",
            "Có 14 lối tắt học nhanh: bộ từ riêng, học từ mới, ôn tập, HSK, ngữ pháp, lộ trình, từ cần củng cố, lịch ôn sắp tới, luyện viết, luyện nghe, nghe-nói, đọc-tra từ, truyện ngắn và sổ lỗi.",
            "Có phiên học nhanh 3/5/10 phút; kế hoạch ưu tiên từ đến hạn trước, sau đó mới đến từ mới và bài củng cố.",
            "Thẻ nhiệm vụ ngày theo dõi ôn SRS, học từ mới và số phút tập trung; từ gợi ý trong ngày có nút phát âm.",
        ]),
        ("2.2 Kho từ HSK và tìm kiếm", [
            "Dữ liệu kiểm định gần nhất: 11.330 mục, trạng thái valid=true, không có lỗi cấu trúc trong báo cáo tạo 29/09/2026.",
            "Phân bố dữ liệu: HSK 1: 507; HSK 2: 750; HSK 3: 955; HSK 4: 979; HSK 5: 1.078; HSK 6: 1.154; HSK 7–9: 5.907.",
            "Tìm theo Hán tự, giản thể/phồn thể, pinyin và nghĩa; có lọc tất cả, chưa học, đã học, đến hạn, đã lưu, đã biết/đã bỏ qua cùng lọc theo cấp nhớ.",
            "Thẻ từ cho biết Hán tự, pinyin, nghĩa Việt/Anh, HSK, trạng thái, từ loại; có phát âm và lưu/bỏ lưu.",
            "Chi tiết từ có các tab Tổng quan, Cách viết, Ví dụ, Ghi chú; xem nghĩa Việt-Anh, ví dụ, từ liên quan, minh họa, phân tích thành phần/mẹo nhớ, nghe âm thanh, sửa nghĩa và ghi chú cá nhân.",
            "Từ HSK có thể được sao chép vào bất kỳ bộ từ riêng nào; hộp chọn hiển thị bộ đích và xác nhận thao tác.",
        ]),
        ("2.3 Bộ từ riêng và quản lý từ", [
            "Tạo, mở, đổi tên, tìm trong bộ, xóa mềm bộ từ và khôi phục từ thùng rác; bộ bị xóa mềm giữ nguyên từ và lịch ôn.",
            "Thêm/chỉnh sửa thủ công: Hán tự, phồn thể, pinyin, nghĩa tiếng Việt/Anh, từ loại, HSK, ảnh và các câu ví dụ Trung–pinyin–Việt.",
            "Có thể tìm từ theo nghĩa để chọn ứng viên từ kho offline; nhập pinyin/Hán tự cũng hỗ trợ tìm ứng viên.",
            "Nhập hàng loạt tối đa 100 dòng: nhận diện từ kho offline, xem trước từng kết quả, chọn lại ứng viên/biến thể, đổi nghĩa hoặc bỏ từng mục bằng nút × trước khi lưu; mục chưa tìm thấy có thể nhập thủ công.",
            "Chia sẻ/nhận bộ từ qua mã ngắn 8 ký tự khi cấu hình Supabase.",
            "Chi tiết bộ có lọc cấp nhớ, số từ theo cấp, bắt đầu học tối đa 10 từ mới, ôn các từ đến hạn, luyện nghe, quiz, AI chấm phát âm và thùng rác bộ.",
        ]),
        ("2.4 Học từ mới", [
            "Học từ HSK bắt đầu bằng chọn một trong 9 chủ đề: Con người & quan hệ; Ăn uống; Học tập & công việc; Địa điểm & đi lại; Thời gian & số đếm; Cơ thể & sức khỏe; Thiên nhiên & đời sống; Hành động & miêu tả; Giao tiếp thông dụng.",
            "Sau khi chọn chủ đề, người học chọn từ cho phiên; bộ từ tự tạo vẫn có luồng riêng để chọn từ trong bộ.",
            "Mặt học hiển thị Hán tự, pinyin, nghĩa, cấp HSK, ví dụ ngữ cảnh, hình minh họa và loa. Tự phát âm theo cài đặt khi từ mới xuất hiện.",
            "Từ mới học qua ba lượt: lượt đầu có hướng dẫn/đáp án, các lượt tiếp theo yêu cầu tự nhớ; chỉ sau hoàn tất lượt mới từ mới được ghi nhận vào lịch ôn.",
            "Có hành động Đã biết, Bỏ qua; phiên từ bộ tự tạo kết thúc quay lại chi tiết bộ, phiên HSK đi đến kết quả học.",
            "Có thể viết trên bảng, nhập pinyin để chọn Hán tự, chọn ứng viên từ bộ gõ, hoặc nói để nhận pinyin/Hán tự nếu dịch vụ nhận dạng trên thiết bị hoạt động.",
        ]),
        ("2.5 Ôn tập SRS", [
            "Sáu trạng thái: cấp 1–5 và Nhớ sâu; màn Kho từ và chi tiết bộ từ có biểu đồ để chạm cấp và lọc danh sách.",
            "Khoảng lịch mặc định trong scheduler: lần đầu 30 phút; cấp 2: 1 ngày; cấp 3: 2 ngày; cấp 4: 3 ngày; cấp 5: 5 ngày; Nhớ sâu: 8/16/30/60/120 ngày.",
            "Khi sai, từ hạ cấp và được xếp lại sớm; mặc định sai lại sau 30 phút, từ khó có thể quay lại sau 5 phút; dùng gợi ý làm ngắn khoảng ôn.",
            "Chế độ bài tập được chọn theo cấp nhớ: nhớ nghĩa/Hán tự, nhớ pinyin, ghép Hán tự từ pinyin, nghe chọn nghĩa/Hán tự, viết và điền từ trong câu. Có thể thay bằng tự đánh giá hai nút hoặc tự chấm bốn mức.",
            "Câu trả lời đúng có phản hồi và cập nhật lịch; có gợi ý, phát âm, theo dõi đáp án đã chọn, tiến độ phiên và màn kết quả.",
            "Các màn phụ: từ đến hạn, lịch ôn sắp tới với đồng hồ đếm ngược, từ yếu, kết quả phiên.",
        ]),
        ("2.6 Luyện nghe, quiz và sổ lỗi", [
            "Luyện nghe trong bộ: phát âm thanh Trung, chọn nghĩa Việt tương ứng, ghép cặp nhiều vòng; kết quả ghi độ chính xác nhưng không tự thay đổi SRS.",
            "Quiz bộ từ: điền Hán tự còn thiếu trong câu ví dụ của chính bộ; yêu cầu ít nhất hai từ có ví dụ; có lựa chọn, đánh dấu đúng/sai, đáp án/pinyin/nghĩa và làm lượt khác.",
            "Sổ lỗi gom lỗi ôn từ và ngữ pháp; bài củng cố dùng dạng hỏi phù hợp, yêu cầu ba câu đúng liên tiếp không dùng gợi ý để đánh dấu đã khắc phục.",
            "Từ yếu là danh sách gợi ý riêng, không tự làm thay đổi lịch SRS.",
        ]),
        ("2.7 Lộ trình học HSK", [
            "Có khóa HSK 1–6 và nhóm HSK 7–9; lộ trình hiển thị số bài, tiến độ, XP, thời lượng và trạng thái khóa/mở/hoàn tất.",
            "Từ vựng được chia nhóm 50 từ mỗi bài cho HSK 1–6, 100 từ cho HSK 7–9; một đơn vị nhóm tối đa năm bài từ vựng.",
            "Các bài nền tảng mở từ, đọc/tra và ngữ pháp; các bài kỹ năng có luyện nghe, nói theo câu mẫu, đọc, viết Hán tự và tổng ôn.",
            "Tiến độ hoạt động được ghi theo bằng chứng cụ thể (xem chi tiết từ, phân tích bài đọc, trả lời ngữ pháp, viết nét hoặc làm bài ôn), rồi mới cho đánh dấu hoàn thành/mở bài tiếp.",
        ]),
        ("2.8 Ngữ pháp", [
            "Seed hiện tại có 28 cấu trúc: 7 cấu trúc nền và 21 cấu trúc bổ sung; trải từ HSK 1 đến HSK 6.",
            "Chi tiết gồm tên cấu trúc, mẫu câu, giải thích tiếng Việt, ví dụ Hán tự, pinyin có dấu, bản dịch Việt/Anh và nút nghe.",
            "Có năm dạng luyện: trắc nghiệm, điền chỗ trống, sắp xếp, chọn câu dịch phù hợp, sửa câu; tiến độ/độ đúng được lưu và lỗi có thể đưa vào sổ lỗi.",
            "Bài ngữ pháp không thay lịch SRS từ vựng. Kho hiện tại là nội dung hữu hạn, chưa đủ cơ sở gọi là giáo trình ngữ pháp đầy đủ để thi toàn bộ HSK.",
        ]),
        ("2.9 Luyện viết và dữ liệu nét", [
            "Danh sách 50 bộ thủ thông dụng có tìm kiếm, ý nghĩa, cách dùng và từ liên quan.",
            "Chi tiết bộ thủ có hoạt ảnh thứ tự nét, phát lại nét, ô luyện viết, bật/tắt gợi ý mờ, tẩy nét cuối và xóa trang.",
            "Bảng viết Hán tự hỗ trợ nhiều trang/ký tự, chọn ứng viên nhận dạng, nhận diện cả từ, nhập thủ công dự phòng và điều hướng trang.",
            "Dữ liệu stroke được kiểm kê 4.196/4.202 ký tự; còn thiếu 搾, 獃, 秊, 薙, 颿, \u9abd. Với ký tự thiếu, gợi ý nét offline có thể không xuất hiện.",
            "Nhận dạng nét ML Kit phụ thuộc native Android build; Expo Go không có đầy đủ module nhận dạng. Kết quả còn tùy mô hình và quyền/môi trường thiết bị.",
        ]),
        ("2.10 Nghe, nói và AI", [
            "Màn Nghe & nói dẫn đến hội thoại AI, shadowing (nghe câu mẫu–ghi âm–nghe lại) và luyện thanh điệu/cặp thanh.",
            "Luyện thanh có một thanh hoặc cặp thanh; chọn kiểu đọc pinyin/nghe rồi chọn, phát mẫu TTS, chọn đáp án và nghe/ghi âm để tự đối chiếu. Ghi chú trong UI nêu đây không phải chấm điểm giọng.",
            "Hội thoại Gemini có HSK 1–6, ba tình huống: đời thường, nhà hàng và hỏi đường; nhập câu hoặc nói, nhận câu tiếng Trung, pinyin, bản dịch, góp ý và câu gợi ý đáp lại; có đọc câu trả lời, nghe lại, xóa hội thoại và trạng thái lỗi/đăng nhập.",
            "Gemini chỉ nhận transcript và tối đa 12 lượt lịch sử, không gửi tệp ghi âm. Cần cấu hình Supabase và đăng nhập Cloud; khóa Gemini được đọc từ secret phía Edge Function.",
            "AI chấm phát âm từ bộ từ là chức năng riêng: gửi âm thanh tới Edge Function dùng OpenAI transcription; cấu hình API/Edge Function riêng, không dùng cùng Gemini.",
        ]),
        ("2.11 Đọc, truyện và từ trong ngữ cảnh", [
            "18 truyện ngắn offline: 6 truyện HSK 1, 6 HSK 2, 6 HSK 3; mỗi truyện hiện có câu hỏi đọc hiểu trắc nghiệm và ghi nhận kết quả/điểm tốt nhất.",
            "Trình đọc hỗ trợ dán/nhập văn bản, nhập TXT, OCR ảnh khi nền tảng hỗ trợ, giới hạn văn bản 2.000 ký tự, tách văn bản thành token theo kho từ offline.",
            "Có thống kê độ phủ vốn từ, độ khó/HSK ước tính, bật/tắt pinyin và nghĩa Việt, chạm từ để xem nghĩa, mở chi tiết từ, thêm vào bộ riêng và lưu/tiếp tục bài đọc.",
            "OCR không được bảo đảm trên mọi loại build; UI có phương án dán chữ khi OCR native không sẵn sàng.",
        ]),
        ("2.12 Thống kê, mục tiêu và thành tích", [
            "Theo dõi thời gian học, từ mới, lượt ôn, cấp nhớ, tiến độ từng HSK, kỹ năng gần đây, bản đồ kỹ năng và lịch hoạt động 7/14/28 ngày.",
            "Thời lượng được tính khi đang ở màn học/ôn, lưu bằng giây rồi hiển thị theo phút; mục tiêu ngày chọn 15/30/45/60 phút.",
            "Mục tiêu từ mới chọn 5/10/15/20/30 từ mỗi ngày; cài đặt học được lưu cục bộ.",
            "Màn Thành tích & mục tiêu có XP, XP hôm nay, chuỗi ngày hiện tại/tốt nhất, mục tiêu tuần theo phút, tiến độ và bộ sưu tập thành tích.",
            "Có nhắc học cục bộ theo giờ 18/19/20/21; cần quyền thông báo, Android có thể trễ khi bật tiết kiệm pin.",
        ]),
        ("2.13 Cài đặt, sao lưu và cloud", [
            "Cài đặt pinyin, màu thanh điệu, âm thanh, tự phát âm, tốc độ nói 0.6×/0.8×/1.0×/1.2×, rung, giao diện hệ thống/sáng/tối và hiệu ứng đầy đủ/giảm/tắt.",
            "Sao lưu thiết bị xuất ZIP, nhập/khôi phục, tạo điểm khôi phục trước khi thay dữ liệu và cho phép hoàn tác lần khôi phục gần nhất.",
            "Cloud hỗ trợ đăng nhập/tạo tài khoản, tải ZIP lên chủ động, liệt kê/làm mới, khôi phục, xóa và đăng xuất.",
            "Đồng bộ thiết bị hiện chỉ queue/apply cài đặt và metadata bộ từ. Dù registry có adapter cho vocabulary/progress/reading, luồng manual sync đang dùng chưa gửi/áp dụng các entity đó; SRS vẫn cục bộ.",
        ]),
    ]
    for title, bullets in feature_sections:
        add_heading(document, title, 2)
        for item in bullets:
            add_bullet(document, item)

    add_heading(document, "3. Bản đồ giao diện và điều hướng", 1)
    add_table(
        document,
        ["Khu vực", "Route / màn hình", "Nội dung và thao tác chính"],
        [
            ["Tab chính", "/(tabs)/index · /hsk · /vocabulary · /stats · /profile", "Trang chủ; tiến độ HSK; tìm/lọc từ; thống kê; cài đặt và sao lưu."],
            ["Khởi tạo", "/ · /onboarding", "Kiểm tra cài đặt lần đầu; chọn trình độ HSK và mục tiêu từ mới; lưu lựa chọn."],
            ["Kế hoạch", "/daily", "Phiên hôm nay/phiên nhanh; xem ôn, từ mới, củng cố và mở hoạt động gợi ý."],
            ["Học từ mới", "/learn/setup · /learn/session", "Chọn chủ đề hoặc bộ từ; chọn từ; ba lượt học; viết/pinyin/nói; đã biết/bỏ qua."],
            ["Ôn tập", "/review · /review/session · /review/result · /review/upcoming · /review/weak", "Chọn phiên; trả lời bài SRS; xem kết quả; theo dõi đếm ngược và từ yếu."],
            ["Kho từ", "/(tabs)/vocabulary · /word/[id]", "Tìm, lọc, mở chi tiết; tab tổng quan/viết/ví dụ/ghi chú; nghe, lưu, sửa, thêm vào bộ."],
            ["Bộ từ", "/decks · /decks/[id] · /decks/word · /decks/bulk-add · /decks/trash", "Tạo/quản lý bộ; thêm/sửa từng từ; nhập hàng loạt; chia sẻ; khôi phục bộ."],
            ["Bài tập trong bộ", "/decks/listening · /decks/quiz · /decks/pronunciation", "Ghép âm-thông nghĩa; quiz điền từ; AI chấm phát âm."],
            ["HSK & lộ trình", "/(tabs)/hsk · /path · /path/[courseId] · /path/lesson/[lessonId]", "Chọn cấp; xem bài; hoạt động có tiến độ; ghi nhận bằng chứng; mở bài tiếp theo."],
            ["Ngữ pháp", "/grammar · /grammar/[id]", "Lọc điểm ngữ pháp; nghe ví dụ; đổi dạng bài; làm lại; xem trạng thái nắm."],
            ["Viết", "/writing · /writing/[character]", "Tìm bộ thủ; xem nghĩa/thứ tự nét; phát lại; viết thử và sử dụng gợi ý."],
            ["Nói", "/speaking · /speaking/ai · /speaking/shadowing · /speaking/tones", "Chọn bài nói; chat Gemini; ghi âm shadowing; luyện thanh."],
            ["Đọc", "/reader · /stories", "Nhập hoặc OCR văn bản; tách từ; tra/nghe/lưu; đọc truyện và trả lời câu hỏi."],
            ["Củng cố", "/mistakes · /mistakes/practice", "Xem lỗi chưa khắc phục; luyện lại cho đến khi đạt điều kiện."],
            ["Cá nhân", "/achievements · /cloud", "Thành tích/mục tiêu tuần; đăng nhập, đồng bộ giới hạn, backup/restore cloud."],
        ],
        widths=[1.05, 2.35, 3.55],
        size=7.8,
    )

    add_heading(document, "4. Luồng tương tác mẫu", 1)
    flows = [
        ("Học từ HSK", "Trang chủ hoặc Học từ mới → chọn 1/9 chủ đề → chọn các từ muốn học → nghe/viết/nhập pinyin/nói → hoàn tất ba lượt → kết quả phiên và lịch SRS."),
        ("Ôn từ", "Ôn tập → app lấy từ đến hạn → bài theo cấp nhớ → trả lời hoặc dùng gợi ý → đánh giá/đáp án → cập nhật cấp và hạn kế tiếp → màn kết quả."),
        ("Thêm một từ HSK vào bộ", "Mở Kho từ → mở Chi tiết từ → nút + → chọn bất kỳ bộ từ riêng → xác nhận sao chép."),
        ("Nhập nhiều từ", "Mở bộ từ → Thêm từ hàng loạt → dán tối đa 100 mục → Nhận diện → kiểm tra ứng viên/đổi nghĩa/bỏ mục × → Thêm các dòng phù hợp."),
        ("Hoàn thành bài lộ trình", "Mở khóa → bài → mở từng hoạt động → hệ thống ghi bằng chứng → quay lại bài → đủ hoạt động thì Hoàn thành bài học."),
        ("Chat Gemini", "Nghe & nói → Luyện nói với AI → chọn HSK/tình huống → đăng nhập Cloud nếu cần → nhập hoặc đọc câu → xem phản hồi/pinyin/dịch/góp ý → nghe lại/đáp tiếp."),
        ("Khôi phục backup", "Cài đặt → Khôi phục → chọn ZIP → xem xác nhận thay dữ liệu → tạo restore point → nhập → có thể hoàn tác lần khôi phục."),
    ]
    add_table(document, ["Luồng", "Các bước mà người dùng thực hiện"], flows, widths=[1.5, 5.45], size=8.2)

    add_heading(document, "5. Hệ thống giao diện và tương tác dùng chung", 1)
    add_bullet(document, "Theme sáng/tối/theo hệ thống; màu chính xanh #2457D6, nền xám nhạt, thẻ trắng, màu trạng thái thành công/cảnh báo/lỗi; token spacing, radius, typography dùng chung.")
    add_bullet(document, "Tab bar cố định 5 mục, có safe-area inset và ẩn khi bàn phím mở; màn nội dung dùng component Screen, nút, thanh tìm, thẻ từ, vòng/thanh tiến độ.")
    add_bullet(document, "MotionPressable, AnimatedProgressBar, PulseRing, mascot/learning guide, âm thanh và haptic phản hồi; tùy chọn hiệu ứng đầy đủ/giảm/tắt. UI sounds mặc định tắt trong feature flags.")
    add_bullet(document, "Các trạng thái tải, rỗng, lỗi, thử lại, lưu bận, quyền hệ thống, mất cấu hình dịch vụ xuất hiện theo từng luồng; một số màn có thông báo live region/accessibility label.")
    add_bullet(document, "Có nhãn accessibility cho điều khiển quan trọng và trạng thái radio/selected; báo cáo này không thay thế một đợt audit WCAG/VoiceOver/TalkBack trên thiết bị.")

    add_heading(document, "6. Kiến trúc dữ liệu và dịch vụ", 1)
    add_table(
        document,
        ["Lớp", "Thành phần và trách nhiệm"],
        [
            ["Điều hướng/UI", "Expo Router; 43 route files gồm tab, học/ôn, từ, bộ từ, khóa học, đọc, viết, nói, tài khoản."],
            ["Component", "Screen, SearchBar, VocabularyCard, HanziHandwritingPad, PinyinHanziComposer, AudioButton, ShadowingPlayer, progress, empty/error state và component tương tác."],
            ["Dữ liệu cục bộ", "Expo SQLite, schema/migrations, repository; FTS5 cho tìm từ; bảng cho SRS, lịch sử, bộ từ, bài đọc, ngữ pháp, truyện, lộ trình, thành tích và outbox."],
            ["State phiên", "Zustand giữ queue/thiết lập tạm đang dùng; dữ liệu bền được đọc/ghi trong SQLite."],
            ["Nội dung", "JSON HSK 1–9; nghĩa Việt/Anh; pinyin; ví dụ; stroke data; 50 bộ thủ; seed ngữ pháp/truyện."],
            ["Âm thanh/nhận dạng", "expo-speech/TTS, expo-audio, expo-speech-recognition, pinyin IME và native ML Kit Digital Ink."],
            ["Cloud", "Supabase Auth/PostgREST/RPC, backup ZIP, chia sẻ bộ từ, sync outbox và Edge Functions."],
            ["AI", "Gemini hội thoại qua Edge Function; OpenAI transcription cho chấm phát âm là Edge Function riêng."],
            ["Kiểm thử", "Vitest, unit/integration tests, Expo lint, TypeScript và Android export trong npm run check."],
        ],
        widths=[1.45, 5.5],
        size=8.2,
    )

    add_heading(document, "7. Kiểm chứng hiện tại và giới hạn", 1)
    add_table(
        document,
        ["Hạng mục", "Trạng thái / mức bằng chứng"],
        [
            ["Kiểm định từ vựng", "Báo cáo data-validation-report.json: 11.330 bản ghi, valid=true, 0 issues; file báo cáo tạo 29/09/2026."],
            ["Vitest trong lượt kiểm kê", "ĐÃ CHẠY: 92/92 test files và 324/324 tests passed (01/10/2026)."],
            ["Full quality pipeline gần nhất", "Lần cập nhật trước đã báo npm run check pass (lint, typecheck, test và Expo Android export); lượt kiểm kê này chạy lại Vitest riêng."],
            ["Android", "Theo trạng thái cập nhật gần nhất: APK 0.1.25 / versionCode 27 đã cài và mở được trên điện thoại Android. Đây không phải walkthrough mọi màn hình."],
            ["Gemini", "Code client/Edge Function có auth, giới hạn input/timeout/rate; deployment active v2 và secret-name đã được kiểm tra ở lượt setup trước. Chưa xác thực một lượt chat model end-to-end trong báo cáo này."],
            ["Web", "Có cấu hình Expo web, lệnh export và local static server; người dùng từng báo màn localhost trắng. Báo cáo này không mở trình duyệt để xác nhận lỗi đó đã hết, nên web runtime được đánh dấu CHƯA KIỂM CHỨNG."],
            ["Đồng bộ cloud", "ĐÃ ĐỐI CHIẾU CODE: manual sync hiện chỉ đọc/ghi SETTINGS và metadata DECK; từ tự tạo, nội dung từ, reading và SRS chưa được áp dụng trong luồng sync này."],
            ["Stroke data", "4.196/4.202 ký tự; còn 6 ký tự thiếu dữ liệu nét như liệt kê ở mục 2.9."],
            ["Nội dung ngữ pháp/truyện", "28 cấu trúc và 18 truyện là dữ liệu seed hiện có; không đủ căn cứ quảng bá như bao phủ toàn bộ kiến thức thi HSK."],
        ],
        widths=[1.6, 5.35],
        size=8.0,
    )

    add_heading(document, "8. Các điểm cần lưu ý / ưu tiên tiếp theo", 1)
    add_table(
        document,
        ["Ưu tiên", "Điểm cần làm rõ hoặc bổ sung", "Vì sao"],
        [
            ["P1", "Hoàn thiện sync dữ liệu nhiều thiết bị hoặc đổi nội dung/nhãn UI cho đúng phạm vi sync hiện tại.", "Nếu người dùng hiểu “đồng bộ bộ từ” là có cả các từ trong bộ và tiến độ, họ có thể tưởng dữ liệu đã lên cloud trong khi chỉ metadata bộ được gửi."],
            ["P1", "Kiểm thử thực tế Gemini sau đăng nhập: cấu hình URL/key công khai, secret server, quota, model, timeout và lỗi mạng.", "Có route/function chưa chứng minh API provider trả lời thành công trên tài khoản/thiết bị cụ thể."],
            ["P1", "Mở lại web build trên trình duyệt và sửa/đánh dấu trạng thái blank screen bằng smoke test.", "Có công cụ serve và báo cáo lỗi trắng trước đó; Android export không kiểm chứng giao diện web."],
            ["P2", "Mở rộng ngữ pháp HSK 1–6 và đánh giá nội dung bằng đề cương/đề thi; tiếp tục tăng số truyện theo cấp.", "28 cấu trúc và 18 truyện hiện chỉ là nội dung khởi đầu, không đại diện toàn bộ syllabus."],
            ["P2", "Bổ sung stroke data cho 6 ký tự còn thiếu và chạy regression test nhận gợi ý offline.", "Đây là nguyên nhân một số chữ không thể hiện hướng dẫn nét offline."],
            ["P2", "Cập nhật README và các tài liệu phát hành.", "README hiện ghi version 0.1.17 trong khi package/app là 0.1.25; phần mô tả Supabase/dataset không bao quát đầy đủ các chức năng hiện hành."],
            ["P3", "Chạy kiểm thử UI end-to-end có thiết bị cho quyền mic, bàn phím, safe area, VoiceOver/TalkBack, dark mode và reduced motion.", "Unit test không thể xác nhận mọi tương tác native và bố cục trên kích thước máy thực."],
        ],
        widths=[0.7, 2.7, 3.55],
        size=7.9,
    )

    add_heading(document, "9. Phụ lục: toàn bộ route màn hình", 1)
    route_rows = [
        ["Khởi tạo", "/", "Bootstrap/điều hướng theo trạng thái onboarding."],
        ["Onboarding", "/onboarding", "Chọn trình độ và mục tiêu từ mới."],
        ["Tab", "/(tabs)/index", "Trang chủ và hành động ưu tiên."],
        ["Tab", "/(tabs)/hsk", "Tổng quan cấp HSK."],
        ["Tab", "/(tabs)/vocabulary", "Kho từ và bộ lọc."],
        ["Tab", "/(tabs)/stats", "Tiến độ học tập."],
        ["Tab", "/(tabs)/profile", "Tài khoản/cài đặt."],
        ["Thành tích", "/achievements", "XP, streak, mục tiêu tuần, huy hiệu."],
        ["Cloud", "/cloud", "Đăng nhập, đồng bộ, sao lưu/khôi phục."],
        ["Kế hoạch", "/daily", "Phiên hôm nay/phiên nhanh."],
        ["Bộ từ", "/decks", "Danh sách, tạo/nhập bộ."],
        ["Bộ từ", "/decks/[id]", "Chi tiết, ôn, học, chia sẻ, tìm từ."],
        ["Bộ từ", "/decks/word", "Tạo/chỉnh sửa mục từ."],
        ["Bộ từ", "/decks/bulk-add", "Nhập hàng loạt và xác nhận từng kết quả."],
        ["Bộ từ", "/decks/trash", "Khôi phục bộ đã xóa mềm."],
        ["Bài tập bộ từ", "/decks/listening", "Luyện nghe ghép âm-thông nghĩa."],
        ["Bài tập bộ từ", "/decks/quiz", "Quiz điền từ vào ví dụ."],
        ["Bài tập bộ từ", "/decks/pronunciation", "AI chấm phát âm."],
        ["Ngữ pháp", "/grammar", "Danh sách/lọc cấu trúc."],
        ["Ngữ pháp", "/grammar/[id]", "Ví dụ, nghe, năm dạng bài."],
        ["Học từ", "/learn/setup", "Chọn chủ đề/từ hoặc bộ từ."],
        ["Học từ", "/learn/session", "Buổi học ba lượt."],
        ["Sổ lỗi", "/mistakes", "Danh sách lỗi chưa khắc phục."],
        ["Sổ lỗi", "/mistakes/practice", "Bài luyện khắc phục lỗi."],
        ["Lộ trình", "/path", "Danh sách khóa/chặng."],
        ["Lộ trình", "/path/[courseId]", "Bài học và trạng thái mở khóa."],
        ["Lộ trình", "/path/lesson/[lessonId]", "Hoạt động, tiến độ và hoàn thành bài."],
        ["Đọc", "/reader", "Văn bản/tệp/ảnh, tách và tra từ."],
        ["Ôn tập", "/review", "Tổng quan/điểm bắt đầu phiên."],
        ["Ôn tập", "/review/session", "Bài SRS."],
        ["Ôn tập", "/review/result", "Kết quả học/ôn."],
        ["Ôn tập", "/review/upcoming", "Lịch ôn sắp tới."],
        ["Ôn tập", "/review/weak", "Từ cần củng cố."],
        ["Nghe-nói", "/speaking", "Chọn bài nói."],
        ["Nghe-nói", "/speaking/ai", "Hội thoại Gemini."],
        ["Nghe-nói", "/speaking/shadowing", "Nghe và nhại câu."],
        ["Nghe-nói", "/speaking/tones", "Luyện thanh/cặp thanh."],
        ["Truyện", "/stories", "Danh sách truyện theo cấp."],
        ["Chi tiết từ", "/word/[id]", "Thông tin, viết, ví dụ, ghi chú."],
        ["Luyện viết", "/writing", "Danh sách 50 bộ thủ."],
        ["Luyện viết", "/writing/[character]", "Chi tiết bộ thủ và canvas viết."],
        ["Layout", "/(tabs)/_layout", "Thanh điều hướng 5 tab."],
        ["Layout", "/_layout", "Khởi tạo app, SQLite và shell điều hướng."],
    ]
    add_table(document, ["Nhóm", "Đường dẫn", "Vai trò/tương tác"], route_rows, widths=[1.1, 2.15, 3.7], size=7.5)

    add_heading(document, "10. Tệp nguồn đã đối chiếu", 1)
    for source in [
        "package.json, app.json, README.md, data-validation-report.json",
        "src/app/** — route màn hình và điều hướng Expo Router",
        "src/components/**, src/constants/design.ts, src/theme/** — giao diện, token và theme",
        "src/db/** — schema, migrations, seed và repositories SQLite",
        "src/data/hsk-vocabulary.json, src/data/grammar-hsk-advanced.ts, src/data/common-radicals.ts",
        "src/db/stories.ts, src/db/learning-path.ts, src/db/grammar.ts",
        "src/services/** — SRS, nhận dạng, audio, analytics, backup, cloud, reader, speaking, content",
        "supabase/config.toml, supabase/functions/** và supabase/*.sql",
    ]:
        add_bullet(document, source)

    add_note(
        document,
        "Ghi chú bảo mật",
        "Báo cáo không chứa giá trị API key, password, access token hoặc nội dung riêng tư. Các key dịch vụ phải giữ trong Supabase secrets; app chỉ dùng URL/key công khai phù hợp.",
        fill=PALE_GREEN,
    )

    document.save(OUTPUT)
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    build_report()
