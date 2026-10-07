# V4 release gate — 2026-10-01

- [x] Lint sạch + TypeScript + 111 file / 377 tests.
- [x] Migration 32–35 additive; kiểm thử rollback/legacy SQLite, không reset/rekey dữ liệu học.
- [x] Import reference atomic, không tự chứng thực nguồn nhập.
- [x] Snapshot mini test bất biến; CAS, deadline, resume, flags, autosubmit, results.
- [x] 7 mini test gốc dùng được; UI nói rõ không phải đề chính thức.
- [x] Viết/dịch lưu nháp và tự đối chiếu; backup round-trip và backward compatibility.
- [x] Nói có chuẩn bị/giới hạn ghi âm và dọn bản ghi tạm (unit/lifecycle tests).
- [x] 12 đối chiếu Việt–Trung; micro lesson ngữ pháp dựa nhiều mẫu.
- [x] 6 cặp dễ nhầm / 12 câu; lưu offline, nối Sổ lỗi, hinted success không giải quyết lỗi và backup cũ giữ bảng mới.
- [x] Readiness nội bộ không fabricate official coverage/score.
- [x] Luyện tập/Thư viện gom công cụ, giữ năm tab và bộ từ riêng.
- [x] Android bundle export và web export.
- [x] Gradle assembleRelease build thử đạt; apksigner xác minh chữ ký debug. Chưa cài lên thiết bị.
- [x] 11 browser smoke scenarios: lưu/resume/nộp/viết/dịch/fallback nói/hub-back/từ dễ nhầm/compact-dark/offline navigation/hai tab.
- [x] Startup loading/recovery không xóa data; lease/preflight OPFS có unit và browser regression.
- [ ] Official reference/licensing + crosswalk bốn chiều được kiểm chứng.
- [ ] Grammar/sense/example/curriculum coverage đủ mục tiêu học/thi theo version.
- [ ] Full mock theo profile chính thức và ngân hàng câu hỏi đầy đủ.
- [ ] Writing/speaking/translation rubric/AI feedback đã đánh giá chất lượng.
- [ ] Sync custom words, membership, notes, SRS events, history, path và metadata; two-device tests.
- [ ] EPUB/PDF, context cards, native audio packs hợp lệ, advanced stories/reader/listening.
- [ ] AI roleplay mở rộng và Gemini E2E với auth thật.
- [ ] Native device mic permission, interruptions, TalkBack/VoiceOver, font-scale, dark/reduced-motion, offline/restart.
- [ ] Performance trên thiết bị, signed/release-like APK, version bump và xác nhận update không mất dữ liệu.

Android export không phải APK; Gradle tạo APK riêng, xem V4_ANDROID_BUILD.md. Build thử debug-signed cùng version không đủ gate phát hành/store. Browser smoke không chứng minh microphone/native hoặc toàn bộ web.
Không cài hoặc đẩy GitHub trong lượt này. Không cấp nhãn “Content Complete”/“HSK Exam Ready”.
