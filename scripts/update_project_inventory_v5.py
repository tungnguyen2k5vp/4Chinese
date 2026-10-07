"""Preserve the previous inventory and append the latest V5 evidence as a new DOCX."""
from pathlib import Path
from zipfile import ZipFile
from docx import Document
from docx.enum.text import WD_BREAK
from generate_project_inventory_report import OUTPUT, ROOT, set_repeat_table_header, prevent_row_split

target = OUTPUT.with_name('TONG_QUAN_TINH_NANG_GIAO_DIEN_TUONG_TAC_4CHINESE_2026-10-02_V5.docx')
baseline = OUTPUT.with_name(OUTPUT.stem + '_V5.docx')
document = Document(baseline)
document.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
document.add_heading('Cập nhật mới nhất — V5 / 0.1.30 / ngày 02-10-2026', 1)
document.add_paragraph('0.1.30/code32/schema39: build SUCCESS, xác minh chữ ký PASS và cài đặt adb install -r SUCCESS theo main. APK đã ký 215357568 byte; SHA256 80BDE32EF15A8A8CB2170776894ACF4EDFE77A3C400881BF16B1DCB473050D1B. Xác minh chữ ký không có nghĩa ký production cho store. Kiểm tra cuối: typecheck/lint PASS; 146 tệp / 819 tests PASS theo handoff cuối của main.')
document.add_paragraph('Android IME thật: PASS có giới hạn cho khả năng nhìn thấy con trỏ sau chuỗi xuống dòng kết thúc ở dòng 10. Main đã xem và xác minh docs/device-keyboard-v5-fixed.png và docs/device-keyboard-v5-ten-lines.png. Native QA PARTIAL, giới hạn font scale 1.0 trên Realme RMX3085/Android 13; không suy ra mọi IME, chữ lớn, accessibility, audio hoặc lifecycle đều PASS. UID 10414/dataDir không đổi và Buổi 15 hiển thị là quan sát có giới hạn, không chứng minh giữ nguyên mọi bản ghi. V5 chưa hoàn chỉnh về học thuật/nguồn/licence.')
document.add_heading('Chứng cứ lịch sử — 0.1.29/code31, bàn phím FAILED', 2)
document.add_paragraph('Giữ nguyên báo cáo V4 và V5/0.1.27 phía trước như lịch sử. Phần sau là trạng thái mới nhất, được ưu tiên khi số liệu khác nhau. Main báo cài đặt 0.1.29/code31 SUCCESS bằng adb install -r trên Realme RMX3085 (FAJFPNTCPFGEKZB6), Android 13, font scale 1.0; nâng từ 0.1.26/code28. Main xác minh version/code đã cài, UID 10414 và dataDir không đổi, PID 16068 đang chạy; log lỗi đã kiểm tra trống. Điện thoại hiện đã mở khóa; main quan sát màn hình từ vựng với các số đếm 179 / 37 và Unicode tiếng Việt đúng, gồm placeholder/dấu chấm giữa. Kiểm tra bàn phím native sau đó FAILED: dòng 5 bị che. Giữ nguyên chứng cứ này; retest 0.1.30 PENDING.')
document.add_paragraph('Ranh giới chứng cứ: 20 ca QA trình duyệt PASS thuộc checkpoint lịch sử 0.1.28, không phải lượt chạy lại trên 0.1.29. Cài đặt SUCCESS là handoff riêng của main, không tự xác nhận giữ nguyên dữ liệu học, mic/TTS/TalkBack hay bàn phím native. Quan sát màn hình từ vựng sau khi mở khóa là chứng cứ một phần riêng, không phải native QA PASS; kết quả bàn phím 0.1.29 FAILED (dòng 5 bị che). Chi tiết QA thiết bị do main quản lý trong V5_DEVICE_QA.md.')
lines = (ROOT / 'docs' / 'V5_UPDATE_SUMMARY.md').read_text(encoding='utf-8').splitlines()
index = 0
while index < len(lines):
    line = lines[index].strip()
    if not line:
        index += 1
        continue
    if line.startswith('|'):
        group = []
        while index < len(lines) and lines[index].strip().startswith('|'):
            group.append([cell.strip() for cell in lines[index].strip().strip('|').split('|')])
            index += 1
        rows = [group[0]] + group[2:]
        table = document.add_table(rows=1, cols=len(rows[0]))
        table.style = 'Table Grid'
        for col, text in enumerate(rows[0]):
            table.rows[0].cells[col].text = text
        set_repeat_table_header(table.rows[0])
        for row in rows[1:]:
            cells = table.add_row().cells
            for col, text in enumerate(row):
                cells[col].text = text
            prevent_row_split(table.rows[-1])
        continue
    if line.startswith('#'):
        level = min(3, len(line) - len(line.lstrip('#')))
        document.add_heading(line.lstrip('#').strip(), level)
    elif line.startswith('- '):
        document.add_paragraph(line[2:].replace('**', '').replace('`', ''), style='List Bullet')
    else:
        document.add_paragraph(line.replace('**', '').replace('`', ''))
    index += 1
document.core_properties.title = '4Chinese — thống kê tính năng và cập nhật V5'
document.core_properties.subject = '0.1.30/code32/schema39; build/signature/install SUCCESS; bounded caret PASS; native QA PARTIAL; historic 0.1.29 keyboard FAILED'
document.save(target)
with ZipFile(target) as package:
    if package.testzip() is not None:
        raise RuntimeError('INVALID_DOCX_ZIP')
check = Document(target)
assert any('Cập nhật mới nhất — V5 / 0.1.30 / ngày 02-10-2026' == paragraph.text for paragraph in check.paragraphs)
assert check.core_properties.subject.startswith('0.1.30/code32/schema39;')
latest_index = next(index for index, paragraph in enumerate(check.paragraphs) if paragraph.text == 'Cập nhật mới nhất — V5 / 0.1.30 / ngày 02-10-2026')
latest_text = '\n'.join(paragraph.text for paragraph in check.paragraphs[latest_index:])
assert 'SUCCESS' in latest_text and 'FAJFPNTCPFGEKZB6' in latest_text
assert '10414' in latest_text and '16068' in latest_text and 'dataDir không đổi' in latest_text
current_end = next(index for index, paragraph in enumerate(check.paragraphs) if paragraph.text == 'Chứng cứ lịch sử — 0.1.29/code31, bàn phím FAILED')
current_text = '\\n'.join(paragraph.text for paragraph in check.paragraphs[latest_index:current_end])
assert 'SUCCESS' in current_text and 'PARTIAL' in current_text and 'dòng 10' in current_text
assert '80BDE32EF15A8A8CB2170776894ACF4EDFE77A3C400881BF16B1DCB473050D1B' in current_text and '215357568' in current_text
assert '819 tests PASS' in current_text and '146 tệp' in current_text
assert 'PENDING' not in current_text and 'IN PROGRESS' not in current_text
assert 'FAILED' in latest_text and 'dòng 5 bị che' in latest_text
assert '179 / 37' in latest_text and 'đã mở khóa' in latest_text
assert 'đang khóa' not in latest_text
assert 'font scale 1.0' in current_text
assert '\ufffd' not in latest_text
assert len(check.tables) >= len(Document(baseline).tables) + 2
print(f'DOCX validated: {target} ({target.stat().st_size} bytes)')
