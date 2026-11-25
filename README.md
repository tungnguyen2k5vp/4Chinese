# 4Chinese

Ứng dụng học từ vựng tiếng Trung cho người Việt, xây dựng bằng Expo/React Native. 4Chinese ưu tiên học chủ động: viết hoặc chọn Hán tự, tự nhớ pinyin, chọn nghĩa, luyện nghe/nói và ôn lặp ngắt quãng theo cấp độ.

Xem phiên bản và mã bản dựng trong [app.json](app.json). Các tính năng gồm lộ trình và ngữ pháp HSK, luyện viết và cấu tạo Hán tự, chia sẻ tiến độ bộ từ bằng mã 8 ký tự, cùng AI Tutor dùng phiên khách tự động. Xem [trạng thái backend và kiểm thử AI Tutor](docs/AI_BACKEND_2026-11-04.md).

> Dự án chạy offline-first: từ vựng, tiến độ học và lịch ôn được lưu trên thiết bị bằng SQLite. Supabase phục vụ chia sẻ bộ từ, sao lưu/đồng bộ tùy chọn và các tính năng AI khi được bật. Khóa AI chỉ lưu ở server.

## Tính năng chính

- Kho từ vựng HSK 1–2 mở rộng, hỗ trợ Hán tự giản/phồn thể, pinyin có dấu hoặc dạng số, nghĩa Việt/Anh, từ loại, HSK, ví dụ và ảnh minh họa.
- Tạo bộ từ riêng; thêm một từ hoặc nhập hàng loạt, xem trước kết quả nhận diện rồi chọn nghĩa phù hợp.
- Nhận diện nét viết Hán tự trên Android development build; hỗ trợ nhiều ký tự, gợi ý ứng viên và chọn pinyin.
- Học ngay trong từng bộ từ: lần đầu hiển thị đáp án để ghi nhớ, các lượt sau tự nhớ và kiểm tra.
- Ôn tập SRS theo 6 cấp độ: Cấp 1, 2, 3, 4, 5, Nhớ sâu; có hẹn giờ chính xác theo phút và hạ cấp khi trả lời sai.
- Học/ôn bằng viết Hán tự, nhập pinyin rồi chọn chữ, chọn nghĩa, nghe phát âm, và nhận giọng nói tiếng Trung.
- Gợi ý nét mờ trong vùng viết khi quên chữ; có tẩy nét cuối, xóa toàn bộ và trang luyện viết.
- Luyện 50 bộ thủ thông dụng: ý nghĩa, cách dùng, từ liên quan và animation thứ tự nét.
- Chia sẻ bộ từ bằng mã 8 ký tự; nhập mã để thêm bộ từ của bạn bè.
- Đổi tên, tìm trong bộ từ bằng pinyin/Hán tự, xóa mềm/khôi phục bộ từ; giữ lâu một từ để xác nhận xóa.
- Quiz điền chỗ trống/chọn Hán tự với ví dụ của bộ từ riêng và đối chiếu từ được nhận diện trong bản ghi âm.

## Công nghệ

- Expo SDK 57, React Native 0.86, Expo Router
- TypeScript strict, Zustand, Expo SQLite
- ML Kit Digital Ink thông qua native Expo module cho nhận diện nét Android
- `expo-speech`, `expo-speech-recognition` và `expo-audio` cho phát âm, nhận giọng nói, ghi âm và chấm AI
- Supabase PostgREST RPC cho chia sẻ bộ từ
- Vitest và ESLint

## Yêu cầu

- Node.js 22.13 hoặc mới hơn
- npm 10+
- Android Studio + Android SDK nếu chạy development build Android
- Điện thoại Android (khuyến nghị) hoặc iOS simulator/macOS

## Cài đặt nhanh

```bash
git clone https://github.com/tungnguyen2k5vp/4Chinese.git
cd 4Chinese
npm install
Copy-Item .env.example .env
```

Mở `.env` và điền cấu hình Supabase của bạn:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Chỉ dùng **Publishable key** (hoặc legacy `anon` key) của Supabase. Không đưa `secret` hay `service_role` key vào app, GitHub hoặc file `.env.example`.

## Cấu hình Supabase cho mã chia sẻ bộ từ

1. Tạo một project tại [Supabase](https://supabase.com/).
2. Vào **Settings → API Keys**, lấy **Project URL** và **Publishable key**.
3. Điền chúng vào `.env` theo mẫu phía trên.
4. Trong Supabase, vào **SQL Editor → New query**.
5. Mở file [`supabase/shared-decks.sql`](./supabase/shared-decks.sql), copy toàn bộ nội dung, dán vào SQL Editor và chọn **Run**.
6. Khởi động lại Metro với cache sạch.

Schema này tạo các RPC an toàn để xuất bản và tải bộ từ qua mã gồm 8 ký tự. Dữ liệu học cá nhân vẫn nằm cục bộ trên thiết bị.

## Đối chiếu từ nhận diện từ bản ghi âm

Trong chi tiết bộ từ, **Luyện phát âm AI** gửi bản ghi ngắn qua Edge Function để phiên âm và so khớp chữ Hán với từ mục tiêu. Điểm thể hiện mức khớp của văn bản nhận diện. Khóa OpenAI được cấu hình ở server.

Giữ chức năng này trong môi trường kiểm thử riêng. Trước khi bật công khai, cần xác thực phiên người dùng, hạn mức bền vững theo tài khoản và giới hạn chi phí toàn dịch vụ. Có thể kiểm tra hợp đồng phản hồi, giới hạn tải lên và xử lý lỗi bằng `node --test supabase/functions/pronunciation-score/index.test.cjs`.

## Chạy ứng dụng

### Expo Go

Phù hợp để xem giao diện và các tính năng không cần native module.

```bash
npx expo start --go
```

Quét QR bằng Expo Go trên điện thoại cùng mạng. Expo Go không hỗ trợ nhận diện nét ML Kit và nhận giọng nói native của dự án.

### Android development build (khuyến nghị)

Development build cần thiết cho viết Hán tự có nhận diện và nút nói tiếng Trung.

```bash
npx expo run:android --device
npx expo start --dev-client --clear
```

Sau lần cài đầu, chỉ cần chạy lệnh thứ hai để cập nhật JavaScript/TypeScript trong lúc phát triển. Lần đầu ML Kit có thể tải mô hình tiếng Trung, nên thiết bị cần Internet.

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm test
npm run data:validate
```

Hoặc chạy toàn bộ kiểm tra và export Android:

```bash
npm run check
```

## Cấu trúc dự án

```text
src/app/                 Màn hình Expo Router: tab, bộ từ, học, ôn, viết
src/components/          Component giao diện, canvas viết, âm thanh, biểu đồ
src/data/                Dữ liệu HSK, bộ thủ và dữ liệu bổ sung
src/db/                  Schema, migration, seed và repository SQLite
src/services/            SRS, handwriting, pinyin IME, speech, media, deck share
src/stores/              State tạm thời của phiên học
modules/                 Native Expo module ML Kit Digital Ink cho Android
supabase/                SQL schema/RPC cho chia sẻ bộ từ
scripts/                 Import, tạo stroke data và kiểm định dataset
```

## Dữ liệu và giấy phép

Nguồn HSK và nghĩa từ được mô tả tại [`DATA_LICENSES.md`](./DATA_LICENSES.md). Kiểm tra dữ liệu mới nhất nằm trong `data-validation-report.json`.

Ảnh minh họa được chọn theo nghĩa của từ hoặc do người dùng chọn từ thư viện ảnh. Khi bổ sung nguồn ảnh mới, cần giữ attribution và tuân thủ giấy phép của nguồn.

## Đóng góp

1. Tạo nhánh mới: `git checkout -b feat/ten-tinh-nang`.
2. Chạy lint, typecheck và test trước khi commit.
3. Dùng conventional commit, ví dụ: `feat: thêm bài luyện nghe`.
4. Không commit `.env`, APK/AAB, `node_modules`, thư mục build hay khóa bí mật.

## Ghi chú phát hành

- Tên hiển thị app: **4Chinese**
- Android package: `com.tungnguyen2k5vp.fourchinese`
- iOS bundle identifier: `com.tungnguyen2k5vp.fourchinese`
- Version cấu hình hiện tại: `0.1.25` (không đồng nghĩa đã cài bản V4 lên điện thoại).

## V4 — bản đang phát triển

Trạng thái chức năng, giới hạn dữ liệu HSK và các bước chưa hoàn tất: [V4_FINAL_REPORT.md](./docs/V4_FINAL_REPORT.md).
Chưa có cấp nào được xác minh “HSK Exam Ready”; mini test là bài luyện gốc, không phải đề chính thức.

Kiểm tra bản web riêng mà không ghi đè thư mục export Android:

```bash
npx expo export --platform web --output-dir dist-v4-web
node scripts/serve-web.cjs 8084 dist-v4-web
```

Mở http://localhost:8084. Luyện tập và Thư viện gom các công cụ đang có; HSK → Ôn thi mở mini test, viết/dịch/nói và mức độ chuẩn bị.
Thống kê nội dung từ source: `npx tsx scripts/audit-v4-content.ts`.
Kiểm tra browser tùy chọn (cần Playwright và Edge trên máy): `node scripts/smoke-v4-web.cjs <đường-dẫn-module-playwright>`.
Kết quả được ghi trong `docs/V4_WEB_SMOKE.json`, không dùng hồ sơ browser của người dùng hoặc gọi Gemini.

## License

Xem [LICENSE](./LICENSE).
