# 4Chinese — Implementation Report

Ngày thực hiện: 2026-09-21

## Đã thực hiện

### 1. Audit và roadmap

- Thêm `FEATURE_AUDIT.md`: inventory chức năng, kiến trúc hiện hữu, trạng thái đầy đủ/một phần/chưa có, rủi ro và tham khảo mã nguồn mở.
- Thêm `FEATURE_ROADMAP.md`: P0–P3 có giá trị, rủi ro và quyết định triển khai.
- Không có thay đổi source application trước khi audit/roadmap hoàn tất.

### 2. P0: “Từ cần củng cố” / sổ lỗi cá nhân

Các file mới/thay đổi:

| File | Thay đổi |
| --- | --- |
| `src/services/review/weak-words.ts` | Hàm thuần chấm điểm lý do cần củng cố từ số lần sai, lapse, sai liên tiếp, độ chính xác và hint. |
| `src/services/review/weak-words.test.ts` | Test cho từ ổn định, lỗi lặp lại và lý do hiện cho người học. |
| `src/db/repository.ts` | `getWeakVocabulary()` đọc đúng SQLite progress đang có; không thêm bảng/cột, không ghi trạng thái. |
| `src/app/review/weak.tsx` | Màn hình minh bạch danh sách/lý do; chỉ cho ôn các từ **yếu và đã đến hạn**. |
| `src/app/(tabs)/index.tsx` | Thêm shortcut “Từ cần củng cố” ở Home. |

Luồng an toàn:

1. Người học mở **Từ cần củng cố** từ Home.
2. App hiển thị từ đã học có tín hiệu cần chú ý, ví dụ “Sai liên tiếp 2 lần”, “Đã quên lại 1 lần” hoặc “Độ chính xác 50%”.
3. Nếu một từ chưa đến hạn, người học vẫn xem được nhưng không thể ghi một lượt ôn trái lịch.
4. Nút ôn chỉ lấy tập con vừa yếu vừa đến hạn rồi dùng lại `review/session` hiện có.
5. `reviewWord()` vẫn là nơi duy nhất cập nhật SRS, review log, daily stats và lịch tiếp theo.

## Những gì cố ý không thay đổi

- Không thay router, Expo/RN version, Zustand store hay dependency.
- Không đổi SQLite schema/migration, không động dữ liệu học đang có.
- Không đổi scheduler cấp nhớ sang FSRS.
- Không bật các `ReviewMode` chưa được UX test, dù hạ tầng đã tồn tại.
- Không thêm AI, account/cloud sync, reader hay dataset 100k+ vì các phần này cần thiết kế/giấy phép/chi phí riêng.
- Không sửa `.env`, Supabase RPC/RLS hoặc đưa bất kỳ key nào vào Git.

## Kiểm thử

Đã chạy thành công tại `D:\ReactJS\HocTiengTrungApp`:

```text
npm run typecheck  → passed
npm test           → 22 files, 90 tests passed
npm run lint       → passed
git diff --check   → no whitespace errors
```

## Cách kiểm tra thủ công trên development build

1. Mở tab **Trang chủ**.
2. Chạm **Từ cần củng cố** trong nhóm “Học nhanh”.
3. Dùng một từ đang ở `LEARNING`, trả lời sai/lộ gợi ý vài lần và hoàn tất các lượt ôn hợp lệ để tạo tín hiệu.
4. Quay lại màn hình này; thẻ từ sẽ có lý do cần củng cố.
5. Nếu thời điểm `next_review_at` đã đến, nút “Ôn … từ yếu đến hạn” sẽ vào đúng phiên ôn hiện có. Nếu chưa đến hạn, nút bị vô hiệu hóa — đây là chủ ý để không phá SRS.

## Bước tiếp theo đề xuất

P0 kế tiếp nên là thiết kế **per-skill error tracking** theo `ReviewMode` (nghe/viết/pinyin/nghĩa), sau đó mới tạo Smart Daily Review. Việc đó cần migration additive, truy vấn aggregate và test migration riêng; không nên gộp vào thay đổi an toàn hiện tại.
