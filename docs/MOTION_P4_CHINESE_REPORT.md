# P4 — Trải nghiệm học tiếng Trung và thực hành tương tác

Ngày thực hiện: 24–25/10/2026. Workspace: `D:\ReactJS\HocTiengTrungApp`.

P4 đã triển khai phản hồi sửa lỗi, khám phá đường thanh, điều khiển thứ tự nét và một phần nhỏ shadowing. Thay đổi tập trung vào thông tin giúp học và tự đối chiếu. Chưa cài APK, chưa dùng ADB, chưa kiểm thử trên điện thoại hoặc dữ liệu học của người dùng.

## 1. Khảo sát và phạm vi

Đã đọc `AGENTS.md`, tài liệu Expo phiên bản 57, `MOTION_SYSTEM.md`, `MOTION_ENGAGEMENT_RESEARCH.md`, `MOTION_P3_ENGAGEMENT_REPORT.md` và các component/flow tiếng Trung được yêu cầu. Package thực tế: Expo `~57.0.27`, React Native `0.86.3`, React `19.2.3`, Expo Router `~57.0.25`, Reanimated `4.5.1`, react-native-svg `15.15.4`. Không thay package, dependency hoặc cấu hình build.

Các khoảng trống xác minh được từ source trước P4:

- **Learn:** đã có nghĩa, pinyin, phát âm, ví dụ và ba lượt học. Chỉ xác nhận được khi ghép/viết đúng; ghép sai bằng pinyin thiếu hướng dẫn sửa ngay tại vùng phản hồi. Không cần thêm một bảng đáp án đầy đủ nữa.
- **Review:** đã có phản hồi đúng/sai và nút đánh giá. Chế độ ghép pinyin có một bảng kết quả riêng trùng với vùng phản hồi chung; các chế độ chọn nghĩa/pinyin thiếu phần đối chiếu đầy đủ tại vùng phản hồi.
- **Thanh điệu:** đã có năm đường SVG tĩnh, bài chọn thanh/cặp thanh, TTS và quy tắc lọc mẫu nghe. Chưa có phần khám phá từng đường với replay độc lập.
- **Nét chữ:** đã có outline từng nét, nút trước/sau và phát lần lượt mỗi 420 ms; thiếu tạm dừng/tiếp tục và việc điều khiển tay chưa hủy chắc chắn lần phát cũ. Không có median/hướng bút đủ để dựng hiệu ứng vẽ nét chính xác.
- **Shadowing:** đã có TTS, dừng, lặp, chuyển câu, đếm câu, ghi âm native và tùy chọn hiển thị trong modal. Chỉ cần đưa thao tác ẩn/hiện pinyin, nghĩa ra gần câu đang học. Engine không cung cấp timestamp từng từ để làm karaoke.

Áp dụng nguyên tắc của các skill `agency-mobile-ui-ux-engineer` và `agency-expo-react-native-engineer`: nội dung rõ, thao tác chủ động, vùng bấm phù hợp, thích ứng dark mode và motion policy hiện có. Không dựng hệ thống animation mới.

## 2. Nguồn tham khảo và giới hạn bằng chứng

Đối chiếu nguồn công khai ngày 24/10/2026, trước khi triển khai A → B → C → D:

| Nguồn | Điều xác minh được | Cách áp dụng và giới hạn |
| --- | --- | --- |
| [HelloChinese](https://www.hellochinese.cc/vi) | Trang giới thiệu mô tả học qua trò chơi/bài nhỏ, tích hợp kỹ năng tiếng Trung, viết tay, phát âm và ôn tập. | Học theo phần nhỏ, cung cấp phát âm và cơ hội thử lại. Trang quảng bá không chứng minh timing hay hành vi animation cụ thể. |
| [SuperChinese](https://www.superchinese.com/vi/) và [FAQ](https://www.superchinese.com/faq.html) | Giới thiệu học theo ngữ cảnh, phản hồi phát âm và chấm ở mức ký tự. | Chỉ tham khảo cách đặt phản hồi gần nội dung. 4Chinese không có dữ liệu chấm âm học tương đương nên không thêm điểm phát âm giả. |
| [Zhou, 2024 — Gamifying language education](https://www.nature.com/articles/s41599-024-04073-3), [PDF chính thức](https://www.nature.com/articles/s41599-024-04073-3.pdf) | Nghiên cứu 70 người học EFL tại Trung Quốc, so sánh học qua Duolingo với nhóm truyền thống; dùng bảng hỏi, lấy mẫu trải nghiệm và phỏng vấn để khảo sát hứng thú/ideal L2 self. Đã đọc PDF vì trang HTML bị chuyển hướng xác thực cookie. | Đây là học **tiếng Anh**, không phải thử nghiệm học thanh/nét tiếng Trung; không tách riêng hiệu quả animation. Chỉ hỗ trợ giả thuyết thiết kế thực hành chủ động, không chứng minh P4 tăng retention. |
| [Nghiên cứu phản hồi tức thì và leaderboard, 2026](https://learning-gate.com/index.php/2576-8484/article/view/12079) | Abstract công bố 09/02/2026: 60 sinh viên, ba nhóm trong sáu tuần với Quizizz; NASA-TLX, bảng hỏi chiến lược học từ và SEM. Tác giả báo cáo liên hệ thuận lợi của phản hồi tức thì và bất lợi về tải nhận thức của leaderboard. | Bằng chứng ở mức abstract, mẫu nhỏ và không kiểm nghiệm P4. Ưu tiên giải thích lỗi gọn, không thêm leaderboard hoặc phần thưởng ngoài phạm vi. |

Không sao chép đồ họa, âm thanh, thương hiệu hoặc mã decompile của ứng dụng tham khảo. Không có quan sát video hay đo native HelloChinese trong P4. Timing dưới đây là lựa chọn triển khai của 4Chinese. Cần nghiên cứu với người học trước khi kết luận về khả năng ghi nhớ.

## 3. Các thay đổi đã triển khai

### P4-A — Phản hồi sửa lỗi

**`src/app/learn/session.tsx`**

- Giữ vùng phản hồi sẵn có, thêm hướng dẫn khi Hanzi đã ghép bằng pinyin không khớp mục tiêu; hiển thị phần người học đã ghép và nút nghe lại bằng `AudioButton` hiện hữu.
- Tiền tố đúng của từ nhiều chữ, ví dụ `好` khi đang ghép `好人`, không bị báo sai sớm. Đây chỉ là điều kiện hiển thị hướng dẫn; điều kiện xác nhận đáp án giữ nguyên.
- Đây là phản hồi hỗ trợ khi ghép, **không phải một lần submit/chấm sai mới**. Không tự tăng lỗi, lưu kết quả hay đổi lượt. Không mở thêm đáp án Hanzi ở hai lượt gợi nhớ vốn đang ẩn chữ.
- Nghĩa, pinyin và ví dụ vốn có tiếp tục dùng tại vị trí cũ. Hướng dẫn lỗi dùng reveal thay cho shake; lỗi lưu vẫn dùng vùng phản hồi sẵn có và cho thử lại với câu trả lời được giữ.

**`src/app/review/session.tsx`**

- Bổ sung ngay trong vùng phản hồi chung: câu đã chọn khi sai, Hanzi mục tiêu, pinyin/nghĩa khi không rỗng, và nghe lại bằng TTS hiện có.
- Nhãn đối chiếu thích ứng loại bài: “Nghĩa bạn chọn”, “Pinyin bạn chọn”, “Chữ bạn chọn”. Không hiện lựa chọn giả khi người học bấm xem đáp án.
- Bỏ bảng kết quả ghép pinyin riêng bị trùng. Chỉ còn một vùng phản hồi và các nút tiếp tục/đánh giá vốn có.
- Pinyin tại vùng đáp án có màu nền chữ theo theme, đọc được trong dark mode khi tắt tô màu thanh.
- Phản hồi xuất hiện theo `responseComplete` sau xác nhận đáp án/xem đáp án hiện hữu, **không có nghĩa kết quả đã được lưu**. Người học vẫn chủ động bấm tiếp tục/đánh giá; persistence và ba lượt ôn không đổi.

### P4-B — Khám phá đường thanh

**`src/app/speaking/tones.tsx`, `src/components/visual/ToneContour.tsx`**

- Thêm disclosure “Khám phá đường thanh”, đóng mặc định để bài luyện hiện tại vẫn gọn.
- Chọn thanh 1–4/thanh nhẹ bằng radio có trạng thái được chọn; chỉ đường đang chọn được minh họa. Có “Minh họa lại” và “Hiện toàn đường”.
- Giữ nguyên cả năm SVG path cũ. Clip reveal từ trái sang phải trong **320 ms, linear**, không phải đường cao độ được đo. Thanh 3 là dạng đầy đủ; thanh nhẹ là ký hiệu tham khảo. Nội dung màn hình ghi rõ minh họa độc lập với âm thanh.
- Ví dụ nghe lấy từ `buildToneSamples(words, false)`, khớp thanh và `listeningSafe`. Không tự tạo âm tiết, pinyin hay file audio. Thiếu mẫu phù hợp thì hiển thị trạng thái thiếu mẫu.
- Nghe/dừng mẫu dùng lại `play`/`stop` và engine TTS hiện hữu. Nghe ví dụ gọi `play(..., false)` nên không đánh dấu đã nghe câu quiz và không mở khóa bài nghe.
- Counter replay tăng riêng theo thao tác. Đổi theme/rerender không chạy lại; dừng rồi replay cùng thanh vẫn chạy được. Quay lại màn sau blur không tự phát lại reveal.
- Các `ToneContour` cũ không truyền `revealKey` vẫn hiển thị tĩnh. Không thêm đo microphone, waveform hoặc điểm phát âm.

### P4-C — Điều khiển thứ tự nét

**`src/components/StrokeWriter.tsx`**

- Giữ hình chữ đầy đủ ban đầu; có phát lại từ đầu, tạm dừng/tiếp tục, nét trước/nét sau và chỉ báo `Nét x/y`.
- Tự phát vẫn hiện từng **nét hoàn chỉnh mỗi 420 ms**. Không dựng đường chạy bút từ outline. Nét hiện tại dùng màu nhấn, nét trước giữ mực, nét chưa đến lượt có opacity `0.12`.
- Một state sequence dùng chung cho phát và bước tay; revision vô hiệu hóa lần phát cũ, bao gồm bấm replay liên tiếp ở cùng vị trí. Timer cũ được hủy khi đổi chữ, bước tay, dừng, blur, đổi motion hoặc unmount.
- Đổi chữ đặt về hình mới đầy đủ, không đem vị trí của chữ trước sang chữ mới. Background/blur dừng ở bước hợp lệ hiện tại; không tự tiếp tục khi quay lại.
- Reduced/off/OS Reduce Motion hiện đủ nét ngay khi chuyển policy hoặc bấm replay. Vẫn có thể chủ động xem trước/sau từng nét, nút tự phát bị vô hiệu hóa.
- Giữ `getStrokePaths`: tám shard hiện hữu và supplemental, ưu tiên nét đúng chữ rồi fallback bộ thủ đã có từ trước. Nếu thiếu dữ liệu, tiếp tục chỉ hiển thị chữ từ font với giải thích; không có nút replay giả.
- Component được dùng sẵn ở luyện viết `writing/[character]`, chi tiết từ `word/[id]`, ôn trí nhớ và cấu tạo chữ/thành phần. Các màn này nhận điều khiển mới mà không sửa nội dung hay thuật toán của màn.
- Không thay `WritingCanvas`, `HanziHandwritingPad`, nhận dạng, chấm nét hoặc draft viết. Xem mẫu xong chỉ là hoàn tất minh họa; không được tính là người học viết đúng.

### P4-D — Bổ sung nhỏ cho shadowing

**`src/components/ShadowingPlayer.tsx`**

- Đặt nút ẩn/hiện pinyin và nghĩa ngay dưới câu; dùng chính hai state đã có trong modal cài đặt, không tạo bản cài đặt song song.
- Câu hiện tại và nội dung được mở có reveal ngắn. Hanzi, pinyin, nghĩa lấy nguyên từ `ShadowingSentence`; bộ ghi âm không bị key/remount do các nút mới.
- Giữ trạng thái phát/dừng, lặp, chuyển câu, đếm câu và lưu lượt luyện hiện hữu. Không thêm karaoke theo âm tiết, waveform hoặc đồng bộ không có timestamp. Không thay engine ghi âm/TTS.

## 4. Timing, lifecycle và accessibility

| Vùng | Full | Reduced/off/OS | Hủy/retarget |
| --- | --- | --- | --- |
| Learn hướng dẫn, shadowing reveal | 280 ms, ease-out cubic; opacity 0 → 1, translateY 10 → 0 | Hiện trạng thái cuối ngay | Chuyển câu/nội dung, blur, background, unmount |
| Review phản hồi vốn có | Đúng: scale 0.94 → 1.035 → 1 trong 280 ms; sai: shake tối đa 5 px trong 320 ms | Nội dung và điều khiển giữ nguyên, không chuyển động | Chuyển lượt/đáp án, blur, background, unmount |
| Đường thanh đang chọn | 320 ms, linear, một lần | Toàn đường ngay | Chọn thanh/replay thay lần cũ; dừng/blur/background về toàn đường |
| Thứ tự nét | Bước nguyên nét mỗi 420 ms; không easing hình học | Không tự phát; vẫn bước tay được | Một sequence/revision, không timer chồng |
| Nút/disclosure tái sử dụng | Press 100 ms; mũi tên disclosure 180 ms, nội dung reveal 280 ms | Theo primitive hiện hữu | Theo cleanup hiện hữu |

`StudyTransition` chỉ thêm prop tùy chọn `active`, mặc định `true`. Learn/Review feedback và shadowing truyền focus màn hình để dừng/đưa về trạng thái cuối khi blur. Caller ngoài P4 không đổi mặc định. Không có callback hoàn thành animation nào chấm, lưu, đổi queue hoặc điều hướng.

Đúng/sai, thanh được chọn, số nét và trạng thái dừng có chữ/semantics riêng, không chỉ phân biệt bằng màu. Radio có `checked`, nút có nhãn/disabled; vùng bấm mới từ 44–50 px. Caption nét không phát live announcement mỗi 420 ms trong lúc tự chạy; khi dừng dùng thông báo polite. Pinyin/nghĩa bị ẩn được unmount nên không đồng thời lộ ra trong accessibility tree. TalkBack native chưa xác minh.

## 5. Nguồn dữ liệu và bảo vệ tiến độ

| Nội dung | Nguồn thực trong app | Điều không suy diễn |
| --- | --- | --- |
| Hanzi, pinyin, nghĩa, ví dụ học/ôn | `Vocabulary` của queue hiện tại, các context/ví dụ đã có | Không sinh đáp án/pinyin/ngữ cảnh mới; không thêm ví dụ lặp ở feedback |
| Thanh điệu của bài luyện | `ToneWord.numeric` qua `parseTones`/`buildToneSamples` hiện hữu | Không lấy đường SVG làm kết quả đo phát âm |
| Hình đường thanh | Năm path vốn có trong `ToneContour` | Chỉ mô hình minh họa, không số đo cao độ hoặc đồng bộ TTS |
| Nét chữ | `getStrokePaths`, `stroke-shard-0..7.json`, `supplemental-strokes.json` | Không tạo median, suy hướng bút hoặc chấm viết từ animation |
| Shadowing | `ShadowingSentence` hiện hữu, TTS/ghi âm hiện hữu | Không coi TTS là bản thu bản ngữ hoặc replay là điểm phát âm |

Trước P4 đã lưu hash/copy **985 file** và git status của worktree đang có nhiều thay đổi P1–P3. Đối chiếu sau P4: **977 file giữ nguyên, 8 file sửa, không file bị xóa**; thêm script fixture và báo cáo này. Kiểm tra AST xác nhận **30 named handler cũ** của Learn/Review/Tones/Shadowing giữ nguyên thân hàm; đã đọc thêm toàn bộ diff P4 để kiểm tra phần JSX và callback mới.

Các file DB/schema/migration, scheduler/SRS/queue, data HSK/nét, nhận dạng/audio service, auth/backend, store/hook nghiệp vụ, package/build config và source flow tiếng Anh đều giữ hash như snapshot đầu P4. Những thay đổi có sẵn ở các vùng này trong `git status` không phải thay đổi của P4. Không mở database trên điện thoại. Thao tác học/ôn chủ động khi dùng app vẫn lưu bình thường theo nghiệp vụ cũ.

## 6. Kiểm thử và bằng chứng

Thư mục bằng chứng ngoài repo: `D:\ReactJS\4Chinese-P4-2026-10-24`. Gồm `originals`, `files-before.json`, `git-status-before.txt`, `p4-only.diff`, `preservation.json`, log và ảnh trong `web`.

| Kiểm tra | Kết quả/giới hạn |
| --- | --- |
| `npm run typecheck` | Đạt. |
| `npm run lint -- --no-cache` | Đạt, 0 error; còn 9 warning ở các file ngoài thay đổi P4. |
| `npm test` | 1.160 đạt / 1.165; 207 file đạt / 212. Đúng 5 lỗi như baseline chạy trước P4; không sửa test ngoài phạm vi để che lỗi. |
| `node scripts/qa-motion-p4.cjs` | Đạt trên RN-web/Edge với source screen/component thật; DB, candidate nhận dạng và speech là fixture. Dùng corpus nét thật. |
| Fixture P1, playful UI, P3 | P1 và playful UI đạt. P3 nguyên bản có race ở bước kiểm tra fallback; bản chẩn đoán ngoài repo thêm chờ React commit đạt toàn bộ. Xem chi tiết bên dưới. |
| Expo export Android | Đã xuất bundle Hermes; đây không phải build/cài APK hay kiểm thử native. |
| Hash/AST và `git diff --check` | Đạt; so với snapshot worktree đầu P4 để giữ công việc có sẵn. |

Năm lỗi baseline giữ nguyên: `src/db/home-review-scope.test.ts`, `src/db/review-pagination-and-size.test.ts`, `src/db/unified-search.test.ts`, `src/services/learning/session-pinyin-ui.test.ts`, `src/services/reader/word-context.test.ts`. Chi tiết trong `test-baseline.log` và `test-final.log`. Các unit test nét chữ hiện hữu vẫn đạt.

Fixture P4 kiểm tra:

- Ghép sai, tiền tố đúng của từ nhiều chữ, sửa/ghép lại, không tự xác nhận; focus và chuỗi nhập không mất khi đổi theme. Nút nghe lại dùng nhãn nghe/dừng động của `AudioButton`, đã kiểm tra với callback TTS fixture.
- Đối chiếu sai ở chọn nghĩa, chọn pinyin, ghép Hanzi; trường pinyin/nghĩa/ví dụ rỗng không tạo dữ liệu giả.
- Ba lượt Learn/Review, bấm xác nhận liên tục, lưu lỗi rồi retry. Kiểm tra số lời gọi API fixture để phát hiện chấm/lưu lặp; không thay thế việc kiểm thử persistence native thực tế.
- Chọn/replay/dừng đường thanh, giá trị reveal trung gian/kết thúc, đổi theme không replay, reduced/off, focus/background và nghe ví dụ không mở khóa quiz.
- Nét có thật/thiếu dữ liệu, phát/dừng/tiếp tục/bước tay, replay liên tục, đổi chữ không remount, rerender, blur/background, OS Reduce Motion và unmount.
- Shadowing ẩn/hiện, chuyển câu, callback âm thanh cũ, lỗi giọng Mandarin và không tự lưu khi chưa đủ điều kiện. Ghi âm thật không chạy trong fixture.
- Không tràn ngang ở 320/390/430 px, light/dark; mô phỏng CSS chữ 150%. Kiểm tra thêm Learn/Review có nghĩa dài, StrokeWriter và shadowing ở 320 px/dark/chữ 150%. Đây không phải Android `fontScale`.

Ảnh tiêu biểu: `web/02-learn-correction.png`, `03-review-meaning-error.png`, `04-review-compose-error.png`, `05-tone-guide.png`, `06-shadowing.png`, `07-tones-320-dark.png`, `09-review-320-dark-text150.png`. Đã xem trực tiếp ảnh để kiểm tra bố cục và sửa màu pinyin dark mode.

Fixture P3 nguyên bản không ổn định tại dòng 123: `count()` kiểm tra nút replay trước khi React commit đổi sang chữ thiếu nét. Một lần chạy lại nguyên bản đạt, nhưng lượt hồi quy cuối tái hiện lỗi. Bản chẩn đoán `qa-motion-p3-await-commit.cjs` đặt ngoài repo chỉ thêm chờ thông báo fallback xuất hiện trước assertion đó, sau đó đạt toàn bộ các ca còn lại; log `qa-motion-p3-await-commit.log`. P1 và playful UI cuối cùng đạt, log `qa-motion-p1-final.log`, `qa-playful-ui-final.log`. Không sửa source flow tiếng Anh hoặc script P3, và không coi bản chẩn đoán là script nguyên bản đã sạch lỗi. Kết quả fixture web không được diễn giải thành xác minh Android.

## 7. File thay đổi

Tám file hiện hữu: `src/app/learn/session.tsx`, `src/app/review/session.tsx`, `src/app/speaking/tones.tsx`, `src/components/ShadowingPlayer.tsx`, `src/components/StrokeWriter.tsx`, `src/components/StrokeWriter.test.ts` (chỉ thêm mock focus), `src/components/visual/ToneContour.tsx`, `src/components/ui/StudyTransition.tsx` (prop `active` mặc định giữ nguyên).

Hai file mới: `scripts/qa-motion-p4.cjs`, `docs/MOTION_P4_CHINESE_REPORT.md`. Không commit, deploy, điều khiển điện thoại hay cài APK.

## 8. Phần chưa xác minh và kế hoạch kiểm thử native sau này

Chỉ thực hiện sau khi người dùng yêu cầu kiểm tra/cài APK ở giai đoạn tiếp theo, với dữ liệu fixture riêng:

1. Quay video trước/sau ở cùng màn và cấu hình: ghép sai → sửa; chọn thanh → replay/dừng; phát nét → dừng/bước tay; ẩn/hiện shadowing → chuyển câu. Không hoàn thành bài học trên tài khoản thật.
2. Kiểm tra TalkBack: thứ tự focus, cách đọc pinyin/Hanzi, radio selected, nút dừng, trạng thái thiếu dữ liệu; bảo đảm nội dung ẩn không được đọc.
3. Thử Android font scale lớn, màn nhỏ, light/dark, bàn phím mở; kiểm tra không che nút/nội dung và cuộn tới được toàn bộ giải thích.
4. Thử full/reduced/off và OS Reduce Motion; back/forward, background/foreground, bấm nhanh, đổi chữ/câu giữa chuyển động; không tự resume hoặc tự phát TTS.
5. Kiểm tra SVG clip/reveal và timer trên native, độ mượt/GPU, giọng Mandarin chậm/thiếu/lỗi, microphone/ghi âm thật. Bundle export và screenshot web chưa chứng minh các điểm này.

Karaoke theo timestamp, đường bút chạy theo median và chấm phát âm được để ngoài P4 do engine/dữ liệu hiện tại chưa đủ. Chỉ xem xét khi có dữ liệu đồng bộ hoặc kết quả đo đáng tin cậy; không thay bằng mô phỏng.
