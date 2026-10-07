# Ngân hàng câu hỏi V4

## Nội dung đang phát hành trong source

src/services/exam/practice-bank.ts: 7 ORIGINAL_PRACTICE profiles, tổng 28 câu trắc nghiệm.
Các nhãn 1–6 và 7–9 là ước lượng giảng dạy. Mỗi bài 4 câu đọc/ngữ pháp trong ngữ cảnh, đáp án rõ và giải thích Việt.
Profile verified=false, standardVersionId/sourceRef=null; câu provenance=CURATED.
Không có câu chính thức, licensed exam hoặc Full Mock.

Các ví dụ trong unit test chỉ là fixture và không tính vào số nội dung learner-facing.
Bốn câu/band không đủ ngân hàng ôn thi hoàn chỉnh hoặc suy luận năng lực từng kỹ năng.

## Hợp đồng/validation

ExamProfile + ExamQuestion: ID ổn định, profileId, skill, prompt, choices, correctIndex, explanationVi, provenance.
Validator kiểm tra source, reference, section/count/order, duplicate, choices và đáp án.
OFFICIAL_STRUCTURE phải có version và nguồn đã xác minh. AI_DRAFT không đi qua gate xuất bản.
Các profile gốc có ID version-v1; attempt lưu toàn snapshot để việc sửa bank sau này không đổi bài cũ.

## Nội dung tự luận riêng

7 bài viết + 7 bài dịch ở written-practice.ts; 7 đề nói ở speaking-practice.ts.
Nguồn CURATED, reviewStatus UNREVIEWED. Có checklist/mẫu nhưng không chấm ngữ nghĩa hay quy đổi điểm thi.

## Còn phải làm

Mapping syllabus thật; independent content review; question-item content version/difficulty/review riêng;
ngân hàng nghe với nguồn hợp lệ; multi-answer/constructed response; rubric được kiểm chứng;
dạng bài và cấu trúc chính thức từng version; license trước khi bundle nguồn bên ngoài.
