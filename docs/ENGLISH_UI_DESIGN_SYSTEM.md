# 4CHINESE V7.1 — ENGLISH UI DESIGN SYSTEM SPECIFICATION

## 1. Triết lý thiết kế (Design Philosophy)

Giao diện học tiếng Anh trong 4Chinese V7.1 được thiết kế lại hoàn toàn nhằm mang lại trải nghiệm:
- **Hiện đại (Modern):** Các góc bo cong mượt mà (radius 16–22px), đổ bóng đa tầng (subtle layered elevation), viền bán trong suốt.
- **Sinh động & Năng động (Energetic & Friendly):** Hệ màu Royal Blue kết hợp Violet và các màu nhấn kỹ năng (Teal cho Reading, Amber cho Review, Coral cho Spelling, Indigo cho CEFR).
- **Phân cấp thông tin rõ rệt (Strong Visual Hierarchy):** Chấm dứt tình trạng các nút bấm dài xếp chồng hàng loạt; chuyển sang bố cục Hero Banner, Metric Tiles, Skill Navigation, và Task Cards.
- **Minh họa nguyên bản (Original SVG Vector System):** 100% hình minh họa được vẽ bằng vector SVG độc quyền, không dùng asset vi phạm bản quyền hay mascot sao chép.
- **Tôn trọng tính toàn vẹn:** Hệ thống Design System này hoàn toàn độc lập với Chinese Mode và không can thiệp vào CSDL.

---

## 2. Hệ màu Semantic Tokens (Palette)

| Token Name | Light Mode | Dark Mode | Ứng dụng |
|---|---|---|---|
| `palette.primary` | `#2563EB` (Royal Blue) | `#3B82F6` (Electric Blue) | Màu chủ đạo, nút bấm chính, link hoạt động |
| `palette.secondary` | `#7C3AED` (Violet) | `#8B5CF6` (Bright Violet) | Huy hiệu, điểm nhấn phụ |
| `palette.vocabulary` | `#2563EB` | `#60A5FA` | Kho từ vựng, bộ thẻ |
| `palette.review` | `#D97706` (Amber) | `#FBBF24` (Gold) | Ôn tập Flashcard, thẻ đến hạn |
| `palette.reading` | `#0D9488` (Teal) | `#2DD4BF` (Bright Teal) | Trình đọc văn bản tiếng Anh |
| `palette.spelling` | `#EA580C` (Coral) | `#FB923C` (Orange) | Luyện viết chính tả |
| `palette.cefr` | `#4338CA` (Indigo) | `#818CF8` (Soft Indigo) | Khung cấp độ CEFR A1–C2 |
| `palette.success` | `#16A34A` (Green) | `#22C55E` (Emerald) | Trả lời đúng, hoàn thành mục tiêu |
| `palette.error` | `#E11D48` (Rose) | `#F43F5E` (Light Rose) | Trả lời sai, lỗi cú pháp |
| `palette.background` | `#F8FAFC` (Off-white) | `#0B0F19` (Deep Navy) | Nền màn hình chính |
| `palette.surface` | `#FFFFFF` (White) | `#161F30` (Navy Card) | Nền thẻ bài, modal |
| `palette.border` | `#E2E8F0` | `#25334D` | Đường viền ngăn cách |

---

## 3. Thang Typography

- **Hero Title:** `26px`, font-weight `800`, line-height `32px`
- **Section Title:** `20px`, font-weight `700`, line-height `26px`
- **Card Title:** `16–17px`, font-weight `700`, line-height `22px`
- **Body Text:** `14–15px`, font-weight `400`, line-height `21px`
- **Caption / Helper:** `12–13px`, font-weight `500`, line-height `18px`
- **English Headword:** `28–32px`, font-weight `800`, line-height `36px`
- **IPA Phonetics:** `16px`, font-weight `500`, font-style `italic`
- **Vietnamese Meaning:** `18px`, font-weight `600`, line-height `24px`

---

## 4. Hệ thống minh họa Vector SVG (`EnglishIllustrations.tsx`)

1. **`EnglishHeroIllustration`:** Tên lửa hành trình tri thức bay vào không gian các vì sao và quỹ đạo ngôn ngữ.
2. **`EmptyDecksIllustration`:** Bộ thẻ 3D xếp lớp rực rỡ với huy hiệu thêm thẻ mới và ánh sao lấp lánh.
3. **`EmptyReviewIllustration`:** Chiếc cúp vàng với tia hào quang mặt trời mừng ngày ôn bài hoàn tất.
4. **`EmptyReaderIllustration`:** Cuốn sách mở với dải ruy-băng đỏ và kính đọc sách thư thái.
5. **`EmptyStatsIllustration`:** Mầm cây xanh đâm chồi vươn lên cùng biểu đồ cột mốc tiến bộ.
6. **`CefrJourneyIllustration`:** Dãy núi 6 bậc thang vươn tới đỉnh cờ A1 -> C2.
7. **`BulkAddIllustration`:** Tài liệu văn bản chuyển đổi nhanh chóng thành các thẻ từ vựng với tốc độ cao.
8. **`EnglishBadge`:** Huy hiệu khiên "EN" màu Royal Blue.

---

## 5. Thư viện linh kiện tái sử dụng (`src/components/english/`)

- `EnglishHeroCard`: Khung chào đón người học với badge, title, subtitle, illustration và nút CTA.
- `EnglishMetricTile`: Thẻ đo lường chỉ số học tập (từ đến hạn, từ đã học, thời gian, tỷ lệ nhớ).
- `EnglishSkillTile`: Thẻ điều hướng kỹ năng với icon màu, tiêu đề, mô tả và mũi tên điều hướng.
- `EnglishDeckCard`: Thẻ hiển thị bộ từ cá nhân với trạng thái chọn, số thẻ, số thẻ đến hạn và thao tác.
- `EnglishEmptyState`: Trạng thái trống được thiết kế chuyên nghiệp với illustration, tiêu đề, mô tả và CTA.
- `EnglishStepIndicator`: Bộ chỉ báo các bước (1 -> 2 -> 3 -> 4) cho luồng nhập liệu phức tạp.
