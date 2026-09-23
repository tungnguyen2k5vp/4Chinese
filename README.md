# 4Chinese

Ứng dụng học từ vựng tiếng Trung cho người Việt, xây dựng bằng Expo/React Native. 4Chinese ưu tiên học chủ động: viết hoặc chọn Hán tự, tự nhớ pinyin, chọn nghĩa, luyện nghe/nói và ôn lặp ngắt quãng theo cấp độ.

> Dự án chạy offline-first: từ vựng, tiến độ học và lịch ôn được lưu trên thiết bị bằng SQLite. Supabase chỉ cần thiết khi dùng tính năng chia sẻ/nhận bộ từ bằng mã ngắn.

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
- Quiz điền chỗ trống/chọn Hán tự với ví dụ của chính bộ từ riêng, và luyện phát âm AI chấm điểm 0–100.

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

## Chấm phát âm AI

Từ chi tiết một bộ từ, chọn **Luyện phát âm AI**. App ghi một đoạn ngắn, gửi thẳng đến Supabase Edge Function để AI phiên âm tiếng Trung và trả về điểm 0–100. Khóa OpenAI chỉ nằm trên Supabase; Edge Function không lưu file ghi âm.

Thiết lập một lần bằng Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase secrets set OPENAI_API_KEY=your_openai_api_key
supabase functions deploy pronunciation-score --no-verify-jwt
```

`--no-verify-jwt` chỉ phù hợp khi kiểm tra development chưa có tài khoản. Trước khi phát hành công khai, hãy thêm Supabase Auth và rate limit để bảo vệ chi phí API. Sau khi thêm `expo-audio`, cài lại development build một lần để Android có quyền ghi âm:

```bash
npx expo run:android --device
```

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
- Version hiện tại: `0.1.0`

## License

Xem [LICENSE](./LICENSE).
