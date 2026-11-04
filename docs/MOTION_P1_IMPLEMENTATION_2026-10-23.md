# 4Chinese — triển khai motion P1 (23/10/2026)

Workspace đã xác minh: `D:\ReactJS\HocTiengTrungApp`, package `4chinese` 0.1.51, Expo 57. Đã đọc AGENTS.md, tài liệu Expo đúng phiên bản, MOTION_SYSTEM.md và luồng học/ôn hiện tại trước khi sửa.

## Thay đổi

| File | Nội dung |
| --- | --- |
| `src/components/ui/MotionPressable.tsx` | Timing nhấn/nhả 100 ms, dừng trước khi đổi đích; bù hitSlop theo kích thước để giữ vùng chạm; reset khi disabled, giảm chuyển động hoặc background; cleanup khi unmount. Haptic vẫn opt-in. |
| `src/components/PrimaryButton.tsx` | Dùng lại MotionPressable; primary/danger scale 0.97, secondary/ghost 0.98; giữ nhãn, minHeight 48, loading, disabled và trạng thái busy. |
| `src/components/ui/StudyTransition.tsx` | Component chỉ trình bày: opacity 0.7 → 1, translateX 12 → 0, 280 ms ease-out cubic. Câu đầu bỏ qua; thay lượt sẽ hủy hiệu ứng trước. Không có callback nghiệp vụ. |
| `src/app/learn/session.tsx` | Animate thẻ câu hỏi và phản hồi sau xác nhận. Khóa đồng bộ trước await, chặn lượt đã xác nhận và bỏ cập nhật/điều hướng muộn sau unmount. Cờ kết thúc ngăn redirect queue rỗng ghi đè đích hoàn thành phiên. Lỗi lưu giữ câu trả lời để thử lại. Màu/icon phản hồi đúng giữ nguyên ý nghĩa sau khi ô nhập được xóa cho lượt tiếp theo. |
| `src/app/review/session.tsx` | Animate vùng câu hỏi và bảng phản hồi; bổ sung live region. Chặn xác nhận lặp cùng index, kể cả hai pass đầu hoàn tất đồng bộ trước render. Giữ khóa lưu hiện có; không cập nhật UI/điều hướng sau unmount. |
| `src/components/ui/AnimatedProgressBar.tsx` | Giữ 360 ms, dừng/đổi đích như trước. Chặn NaN/Infinity về 0; số hữu hạn clamp [0,1]. Thêm ARIA cho web; background chốt ngay giá trị đích. |
| `scripts/qa-motion-p1.cjs` | Kiểm tra component thật bằng RN-web/React và trình duyệt riêng; dùng esbuild đã có, stub duy nhất haptic tùy chọn. |
| `docs/MOTION_SYSTEM.md` | Cập nhật thông số, quy tắc và lệnh kiểm tra. |
| Báo cáo này | Phạm vi, bằng chứng và giới hạn kiểm thử. |

Trước P1, MotionPressable dùng spring; PrimaryButton đổi scale/opacity tức thời khi pressed. Sau P1, hai component dùng chung timing ngắn, có nhiều mức scale. Không thêm animation vào header/progress khi đổi câu; hiệu ứng vào Screen có sẵn vẫn giữ nguyên. Identity câu học gồm index/pass/wordId; câu ôn gồm index/pass/wordId, nên cùng một từ ở lượt sau vẫn có chuyển động.

Đã cân nhắc progress 220–280 ms: thanh sẽ tới đích sớm hơn 80–140 ms, nhưng luồng học vốn không chờ progress. Chưa có đo lường native chứng minh lợi ích, nên giữ 360 ms và chỉ cải thiện tính hợp lệ/lifecycle. Giá trị accessibility luôn là tiến trình thực, không phải giá trị nội suy.

Full dùng hiệu ứng trên; reduced/off và OS Reduce Motion đưa thẳng về trạng thái cuối. Đúng/sai vẫn thể hiện bằng chữ và icon có sẵn. Animation không remount ô trả lời, không khóa nút chờ hoàn tất và không ghi SQLite.

## Kiểm thử đã chạy

- `npm run typecheck`: đạt.
- `npm run lint`: 0 lỗi, 9 cảnh báo ở các file ngoài phần sửa P1; không tự sửa chúng.
- ESLint trực tiếp toàn bộ file mã P1 và script kiểm tra: 0 lỗi, 0 cảnh báo.
- `npm test`: trước và sau đều **1.160 đạt / 5 lỗi / 1.165 tổng**; cùng đúng 5 test lỗi, không có lỗi mới.
- `node scripts/qa-motion-p1.cjs`: đạt. Kiểm tra scale primary/secondary, giữ/nhả, kéo ra ngoài rồi nhả, 10 click, disabled/loading trong lúc nhấn, busy, câu đầu, đổi đích câu giữa chừng, header không thêm transform, progress 0/1%/100%/ngoài khoảng/NaN/Infinity/đổi đích, reduced/off/OS, tắt motion khi đang chạy, visibility mô phỏng và unmount. Đây là kiểm tra web, không đo FPS native.
- `npx expo export --platform web --output-dir <thư-mục-bằng-chứng>/web`: đạt.
- `npx expo export --platform android --output-dir <thư-mục-bằng-chứng>/android`: đạt, xuất Hermes bundle; không tương đương build/cài APK hay kiểm thử máy thật.
- Luồng UI + SQLite: **đạt**, không có pageerror. Dùng browser context tạm, tạo bộ từ riêng và từ 用 qua giao diện. Kịch bản được lưu cùng bằng chứng ở `qa-session.cjs`; kết quả cuối ở `ui-final/result.json`. Đã nhấn dồn 10 lần mỗi nút xác nhận học/ôn, đi đủ ba pass cùng từ, tăng cấp qua hai phiên, gợi ý giữ cấp, compose/xóa chữ, phản hồi sai và reveal. Observer Worker chỉ đọc thông điệp, xác minh **đúng 3 lần INSERT review_log thành công cho 3 phiên ôn hoàn tất**, không thay đổi truy vấn. Bài test chờ UI hoàn tất lưu trước khi hard reload.

Năm lỗi baseline còn lại nằm trong `home-review-scope.test.ts`, `review-pagination-and-size.test.ts`, `unified-search.test.ts`, `session-pinyin-ui.test.ts`, `word-context.test.ts`. Chi tiết đối chiếu: `test-comparison.json` trong thư mục bằng chứng.

## Bằng chứng và giới hạn

Thư mục bằng chứng ngoài project: `D:\ReactJS\4Chinese-Motion-P1-2026-10-23`.

- `originals/`, `files-before.json`, `git-status-before.txt`: bản đối chiếu trước P1, bao gồm công việc chưa commit của người dùng.
- `diffs/`, `file-audit.json`: thay đổi so với thời điểm bắt đầu P1, tách khỏi các diff đã có sẵn so với HEAD.
- `typecheck.log`, `lint.log`, `tests-before.json`, `tests-after.json`, `test-comparison.json`, `qa-primitives.log`, `qa-session.log`, `ui-final/`: kết quả chạy và ảnh chụp.

Đã xem ảnh web của màn học và phản hồi ôn tập. Phát hiện điện thoại Realme qua ADB, nhưng chưa cài bản native P1, chưa kiểm thử animation/gesture/TalkBack/haptic trên bản đó và chưa đo FPS. Không thay thế ứng dụng hoặc dữ liệu học trên điện thoại. Visibility trong bài test component là sự kiện mô phỏng, không phải lifecycle Android thật.

Trước phát hành cần kiểm tra trên bản native P1: giữ/kéo ra ngoài/cancel bằng ngón tay, vùng chạm ở mép và cạnh nút khác, Back trong lúc lưu, background/foreground thật, TalkBack, hệ thống Reduce Motion, thiết bị yếu và các dạng viết tay/cloze/mixed queue chưa được đi hết qua UI web. Kịch bản hiện tại chưa mô phỏng lỗi ghi SQLite hoặc đo tốc độ khung hình.

## Bảo toàn phạm vi

Đối chiếu hash trước/sau: chỉ sửa/thêm các file P1 liệt kê ở trên. Không chủ động thay schema, migration, SRS, queue service, HSK, auth, cấu hình build, package/package-lock hoặc màn hình khác. Những thay đổi có sẵn của người dùng được giữ lại. Không dùng asset, âm thanh, mã decompile, Lottie hay Rive từ HelloChinese; không thêm dependency, commit hoặc deploy.
