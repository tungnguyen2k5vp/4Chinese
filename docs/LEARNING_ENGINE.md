# Learning engine

SRS/memory level hiện có giữ nguyên. Skill scores/sổ lỗi/daily recommendations là lớp bổ sung, không ép lịch ôn mới lên dữ liệu cũ.

Daily planner deterministic: phần thời gian mục tiêu còn lại, ưu tiên từ đến hạn trước từ mới; từ yếu chưa đến hạn chỉ gợi ý. Grammar và mistake practice ghi lịch sử kỹ năng trong transaction; ba lần đúng không gợi ý liên tiếp có thể giải quyết một lỗi.

Learning Path: Course → Unit → Lesson → Activity, seed ID ổn định. Chỉ cho mở bài sau khi bài trước được đánh dấu hoàn thành. Hiện việc hoàn thành còn do người dùng xác nhận sau khi mở hoạt động, chưa phải chứng nhận đã vượt bài kiểm tra.

Tone Trainer đọc numeric pinyin thật, chặn mục không có tone/đa biến thể, giới hạn 12 ví dụ mỗi loại, đủ 5 thanh và 16 cặp trong kho hiện có. Bài từ điển vẫn có 3–3/一/不; bài nghe tránh các mục có biến điệu/đa âm thường gặp. TTS của thiết bị không phải bộ audio chứng nhận thanh điệu.

Shadowing dùng câu DB hiện có: nghe mẫu, loop, tốc độ, auto next, khoảng nghỉ, ẩn/hiện Hanzi/pinyin/nghĩa. Loop bị giới hạn 30 lượt, tự dừng cuối danh sách. Chỉ lưu lượt khi đã nghe mẫu xong và phát bản ghi cá nhân; không tăng speaking_score bằng việc tự đánh dấu đã luyện.

Còn thiếu: adaptive theo toàn bộ hoạt động, placement test, curriculum sâu, liên kết completion có bằng chứng, achievements/weekly goals, AI Tutor sau khi core ổn định.
