# Animation and illustration credits

Phạm vi: các minh họa và hiệu ứng được khảo sát/thay đổi ngày 26/10/2026. Các thông báo giấy phép của dependency hiện có vẫn giữ nguyên.

## Tài nguyên đang sử dụng

| Thành phần | Nguồn / tác giả | Cách sử dụng |
| --- | --- | --- |
| Nhân vật đồng hành nhiều lớp, sách, tay, mắt và pháo giấy | Vector được dựng riêng trong `src/components/visual/LearningGuide.tsx` cho 4Chinese trong task này | Không dùng hình, nhân vật, code hoặc file animation tải từ bên ngoài. Không có asset `.riv`, `.lottie` hay Lottie JSON mới. |
| Dấu đúng/sai | SVG được dựng riêng trong `src/components/ui/AnswerFeedbackIcon.tsx` | Hình học cơ bản; animation dùng `StudyTransition` của dự án. |
| Thẻ ghi nhớ, chuyển cảnh, hiệu ứng nhấn, progress và vòng audio | Primitives hiện có của dự án, React Native `Animated`, `react-native-svg` đã cài | Không thêm dependency. Không chuyển code DOM/canvas của các nguồn web vào app. |

## Bộ hình cũ còn trong repository

`src/components/visual/guide-artwork.json` giữ ba hình **unDraw**, tác giả **Katerina Limpitsouni**:

- Learning: https://cdn.undraw.co/illustration/learning_qt7d.svg
- Reading: https://cdn.undraw.co/illustration/reading_6jjr.svg
- Celebration: https://cdn.undraw.co/illustrations/celebration_wtm8.svg

Nguồn: https://undraw.co/illustrations. Giấy phép: https://undraw.co/license, đã đối chiếu trong đợt 25/10/2026. Giấy phép tùy chỉnh cho phép sử dụng cá nhân/thương mại và sửa hình; không bắt buộc ghi công, có giới hạn về phân phối bộ hình/dịch vụ tương tự và sử dụng AI/ML. Đây không phải CC0 hay MIT. Ba hình không phải tác phẩm tự vẽ. Bản lưu điều khoản/nguồn nằm trong thư mục lưu trữ đợt minh họa trước.

Sau đợt này `LearningGuide` không còn import JSON trên; các hình cũ được giữ để đối chiếu, không làm nguồn cho nhân vật mới.

## Nguồn tham khảo, không đưa tài nguyên/code vào bundle

| Nguồn | License đã xác minh / giới hạn | Nội dung tham khảo |
| --- | --- | --- |
| [React Bits repository](https://github.com/DavidHDev/react-bits), [catalog](https://reactbits.dev/) | `LICENSE.md` hiện có MIT **kèm Commons Clause**; không được coi là MIT thuần | `AnimatedContent`, `ClickSpark`, `TiltedCard`; tham khảo phản hồi ngắn và burst. Không copy. |
| [sanidhyy/duolingo-clone](https://github.com/sanidhyy/duolingo-clone) | MIT | Source thẻ đáp án, quiz, trạng thái selected/correct. Không dùng mascot, thương hiệu, âm thanh hay scoring. |
| [rapmons/flashcard-learning](https://github.com/rapmons/flashcard-learning) | Không tìm thấy license trong cây repo đã đọc; API license trả 404 | Xem source `FlashcardCard.tsx`; không sao chép. |
| [ibelick/motion-primitives](https://github.com/ibelick/motion-primitives) | MIT, file `LICENCE.md` | `animated-group`, `animated-number`, `morphing-dialog`; tham khảo reveal và dữ liệu thật. |
| [magicuidesign/magicui](https://github.com/magicuidesign/magicui) | MIT | Source confetti, number ticker và progress; không nhập dependency canvas. |
| [motiondivision/motion](https://github.com/motiondivision/motion) | MIT | Ví dụ spring/sequence/scroll; không cài Motion. |
| [Rive community](https://rive.app/community/), [My Avatar](https://rive.app/marketplace/554-1038-my-avatar/) | Trang asset ghi **CC BY**, tác giả **JcToon**; không tải/nhúng asset | Mô tả rig, state machine và blink; chỉ tham khảo cách tách lớp. Không tuyên bố đã kiểm tra runtime file Rive. |
| [LottieFiles: language learning](https://lottiefiles.com/search?q=language%20learning), [education](https://lottiefiles.com/search?q=education) | Hai trang search không truy cập được; đã tìm và đọc được các trang asset riêng cùng [Lottie Simple License](https://lottiefiles.com/page/license) | [Waving Character](https://lottiefiles.com/free-animation/waving-character-TjnPV99UqN) của LottieFiles và [Joy in Education](https://lottiefiles.com/free-animation/joy-in-education-ghi6jhsszZ) của Christian Abiel ghi Lottie Simple License. Không tải/nhúng; giữ rig native có nhiều phản ứng, không thêm runtime chỉ cho hình trang trí. |
| [Chadi11/animatekit-ui](https://github.com/Chadi11/animatekit-ui) | Không tìm thấy LICENSE trong cây repo đã đọc; API license trả 404 | Source progress, Aurora, `BouncePopButton`; không sao chép. |
| [sshnox/Flashcard-Quiz-App](https://github.com/sshnox/Flashcard-Quiz-App) | MIT | Source `Flashcard.jsx`; tham khảo hai mặt thẻ và callback. |

Đã đọc thêm trang [Loading to success and failure states](https://rive.app/marketplace/14742-27809-loading-to-success-and-failure-states/) của **khadsemayur** và [Notification Animation](https://rive.app/marketplace/22354-41872-notification-animation/) của **VianMeno**: cả hai trang ghi CC BY. Chỉ khảo sát metadata/mô tả, không tải hoặc phát file Rive. Không thay spinner và trạng thái trống/lỗi có lời giải thích đang có trong app bằng asset ngoài.

Lottie Simple License (FL 9.13.21) cho phép dùng/sửa/phân phối cả thương mại, yêu cầu giữ cùng điều khoản cho file và bản sửa, không cho gom file thành dịch vụ cạnh tranh; attribution không bắt buộc nhưng được khuyến khích. Không có file chịu giấy phép này được thêm vào dự án trong task này.

Bằng chứng source/package/license đã tải của tám repository: `../4Chinese-Archive/rich-motion-2026-10-26/research/`. Không suy ra chuyển động của sản phẩm từ README hoặc ảnh tĩnh. Chi tiết áp dụng và giới hạn kiểm tra: [báo cáo](docs/RICH_MOTION_2026-10-26.md).

## Motion UX V2 — 26/10/2026

[yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos): repository LICENSE là MIT, copyright 2026 yihui-dev. Đã đọc README/LICENSE, prompt UI Motion Loop Design (@flxrnc), Animated Story (@N01ennn) và Interactive Zen Garden (@arixxbt). Chỉ tham khảo continuity, phản ứng theo state và kiểm tra điểm chuyển; không nhập code, prompt code, video, artwork hoặc nhân vật. Không suy diễn giấy phép repository thành giấy phép cho mọi video/tác phẩm liên kết. Không thêm tài nguyên ngoài hoặc dependency. Bản đọc: `../4Chinese-Archive/motion-ux-v2-2026-10-26/research/`; [đối chiếu áp dụng](docs/MOTION_UX_V2_RESEARCH.md). Chưa chạy/xem demo video của nguồn này.
