# 4CHINESE V7.1 — PHẠM VI BẢO VỆ VÀ NGUYÊN TẮC CÔ LẬP

## 1. Nguyên tắc cốt lõi (Core Invariants)

1. **CHỈ cải thiện giao diện và tương tác thuộc chế độ tiếng Anh (`learningLanguage === 'en'`).**
2. **KHÔNG sửa thiết kế, nội dung hoặc logic của chế độ tiếng Trung (CHINESE UI BASELINE FROZEN).**
3. **KHÔNG sửa, reset, migrate, drop, truncate hoặc ghi đè database SQLite.**
4. **KHÔNG thay đổi dữ liệu học, lịch SRS, tiến độ học tập của người dùng.**
5. **KHÔNG triển khai Cloud Sync hay thay đổi cơ chế sao lưu local.**
6. **TUYỆT ĐỐI KHÔNG cài, nâng cấp hoặc ghi đè APK trên điện thoại vật lý.**

---

## 2. Phân loại mã nguồn và ranh giới chỉnh sửa

### Nhóm 1: English-Only Presentation (Được phép cải tiến toàn diện)
- `src/app/english/activity.tsx` — English Home & Mistake Book
- `src/app/english/index.tsx` — English Vocabulary Hub & Decks
- `src/app/english/review.tsx` — English Review (Meaning, Spelling, Quick)
- `src/app/english/reader.tsx` — English Reader Workspace
- `src/app/english/bulk.tsx` — English Bulk Entry Flow
- `src/app/english/decks.tsx` — English Deck Management & Trash
- `src/app/english/card-edit.tsx` — English Card Editor
- `src/components/EnglishOverview.tsx` — English Levels (CEFR) & English Statistics
- `src/components/EnglishAudioButton.tsx` — English Audio Pronunciation Button
- Các components mới thuộc `src/components/english/*` (Design tokens, illustrations, cards, heroes)
- Fixture preview cô lập trong `src/data/english-preview-fixtures.ts` (chỉ dùng cho Visual QA)

### Nhóm 2: Shared Routes & Components (Chỉ chỉnh sửa nhánh `en`, bảo vệ nhánh `zh`)
- `src/app/(tabs)/index.tsx`: Đã cô lập bằng `<EnglishAvailability><EnglishActivity /></EnglishAvailability>` vs `<ChineseHome />`. Giữ nguyên 100% `ChineseHome`.
- `src/app/(tabs)/hsk.tsx`: Đã cô lập bằng `<EnglishLevels />` vs `<ChineseHskScreen />`. Giữ nguyên 100% `ChineseHskScreen`.
- `src/app/(tabs)/vocabulary.tsx`: Đã cô lập bằng `<EnglishWorkspace />` vs `<ChineseVocabularyScreen />`. Giữ nguyên 100% `ChineseVocabularyScreen`.
- `src/app/(tabs)/stats.tsx`: Đã cô lập bằng `<EnglishStatistics />` vs `<ChineseStatsScreen />`. Giữ nguyên 100% `ChineseStatsScreen`.
- `src/app/(tabs)/profile.tsx`: Tách biệt phần cài đặt chuyên biệt cho tiếng Trung ("Hiện Pinyin", "Màu thanh điệu") thành nhóm riêng hoặc ẩn khi đang ở English mode, bảo lưu 100% giá trị đã lưu trong CSDL.
- `src/components/LanguageSettings.tsx`: Nâng cấp giao diện chọn ngôn ngữ trực quan hơn mà không làm thay đổi logic `useLearningLanguage`.

### Nhóm 3: Chinese-Only (HOÀN TOÀN BỊ KHÓA - KHÔNG CHẠM VÀO)
- Toàn bộ các màn hình HSK 1-6, HSK 7-9.
- Chinese Word Detail, Chinese Reader, Chinese Grammar, Chinese Writing, Chinese Listening, Chinese Speaking.
- Chinese Learning Path, Chinese Syllabus, Chinese Mistakes.
- Chinese theme tokens, Chinese illustrations, HSK catalogs.

### Nhóm 4: Database & Engine (HOÀN TOÀN BỊ KHÓA)
- `src/db/schema.ts` — Không sửa schema version.
- `src/db/migrations.ts` — Không thêm file migration.
- `src/db/repository.ts` — Không sửa query CSDL.
- `src/db/hsk30.ts` — Không đụng chạm CSDL HSK 3.0.
- `src/db/english/*` — Không thay đổi cấu trúc bảng hoặc logic lưu trữ của English learner.
