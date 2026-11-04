# 4Chinese — P3: triển khai và kiểm chứng

Ngày: **24/10/2026**. Đã triển khai **6 cải tiến** trong source. **Chưa build/cài APK P3 và chưa kiểm chứng P3 trên điện thoại thật.** Chỉ xuất bundle Android; không chạy ADB, không dùng Expo Go và không thao tác dữ liệu trên điện thoại.

Nền tảng thực tế: Expo ~57.0.27, React Native 0.86.3, React 19.2.3, Expo Router ~57.0.25, Reanimated 4.5.1. Không thay dependency hoặc cấu hình build.

## 1. Cải tiến đã triển khai

| Hạng mục / màn hình | Trước P3 | Sau P3, kích hoạt và trạng thái cuối | Timing Full |
| --- | --- | --- | --- |
| **1. Warmup và ôn tiếng Anh** | Câu hỏi/phản hồi thay trực tiếp; tiến trình là width tĩnh; lựa chọn dùng Pressable thường | Chuyển vùng câu hỏi khi đổi lượt; gợi ý reveal khi mở; lựa chọn có pressed scale và radio checked/selected; phản hồi đúng có icon/nhãn/pop, sai có icon/nhãn “Cùng xem lại nhé” và câu trả lời đã nhập để đối chiếu. Đáp án chỉ hiện sau khi handler hiện tại xác nhận/lưu thành công. | Câu hỏi 280 ms, x: 12 → 0; warmup/gợi ý y: 10 → 0 và opacity: 0 → 1. Đúng 280 ms, scale 0,94 → 1,035 → 1. Sai 240 ms, translateX tối đa ±5 px rồi về 0. Press/release 100 ms, scale 0,98. Tiến trình 360 ms. |
| **2. Flashcard tiếng Anh** | Chỉ reveal nghĩa một chiều; nhánh flashcard cũ tồn tại nhưng khó tìm từ flow ôn mặc định | Thêm nút phụ **“Ôn bằng flashcard · tự đánh giá”** ở màn chuẩn bị ôn, mở nhánh `/english/review?legacy=true&mode=MEANING` đang có. Trong nhánh đó dùng nút **Hiện nghĩa đã lưu / Xem mặt trước** để lật hai chiều; đổi mặt tại 50%, chỉ một mặt được mount. Các nút Chưa nhớ/Đã nhớ giữ nguyên handler. Default Choice/Cloze vẫn là nút chính. Giữ deckId, quick và chế độ preview khi đi theo lối vào mới. | RotateY 0 ↔ 180°, perspective 900, 320 ms ease-in-out cubic; inner face xoay bù 180° để chữ đúng chiều. |
| **3. XP thật** | Tổng XP đổi số tức thì | XpJourneyCard nội suy số **khi prop tổng XP thực sự đổi**. Mount lại hiển thị ngay số hiện có; không đếm từ 0, không phát thưởng. Accessibility đọc số đích, không đọc mỗi frame. | 360 ms ease-out cubic, làm tròn hiển thị vi-VN. |
| **4. Cấu tạo chữ** | Danh sách thành phần chỉ là chữ tĩnh; bảng nét chỉ xem toàn chữ | Nút Toàn chữ và từng thành phần lấy từ `characterStructure`/`buildStructureTree` hiện có. Chọn phần để xem bảng nét tương ứng và chú thích; luôn giữ chữ đầy đủ, cách đọc/nghĩa nếu dữ liệu đã có. Có trạng thái radio và vùng chạm tối thiểu 48 px. Chữ chưa có cấu tạo vẫn dùng fallback cũ. | Reveal vùng bảng nét 280 ms; không tự chạy nét chỉ vì render lại. Replay dùng StrokeWriter hiện tại, 420 ms/nét. |
| **5. Word Chain** | Từ, điểm và lịch sử đổi trực tiếp; khóa hàng lịch sử có index nên thay đổi khi thêm từ | Reveal từ mới khi logic đã trả kết quả, thông báo và tối đa hai hàng vừa thêm; dùng key từ ổn định để các hàng cũ không chạy lại. Từ hiện tại/lịch sử có pressed feedback khi tra. Điểm nội suy từ score thật, giữ nguyên luật. | Reveal 280 ms; điểm 360 ms; press/release 100 ms. |
| **6. Modal tiếng Anh** | Một số modal slide/fade cố định hoặc chỉ đọc reduced motion từ Reanimated | Dùng `useModalAnimationType` sẵn có tại ReviewFlow, legacy review, Reader, từ điển nhanh, chọn nghĩa, menu bộ từ, chia sẻ bộ từ. Full slide ở sheet; Giảm/OS Reduce Motion fade; Tắt none. Modal chia sẻ vốn fade giữ fade ở Full/Giảm, none ở Tắt. | Timing đóng/mở do native Modal/nền tảng quyết định; không khẳng định số ms. |

Các số ms trên là cấu hình mã, không phải phép đo thời gian dựng frame trên Android. Không thêm thời gian chờ trước nút Tiếp tục, không submit/đổi câu từ callback animation. Thông tin đúng/sai vẫn có icon, chữ và màu khi không có chuyển động.

## 2. Dữ liệu, thao tác liên tục và lifecycle

- `FlashcardFlip`: một mặt duy nhất trong cây; mặt ẩn không giữ nút/focus. Nút lật ngoài thẻ luôn khả dụng nếu nghiệp vụ không busy. Đổi hướng giữa chừng dừng animation cũ và chạy về đích mới. Đổi `turnKey` (card/mode/chiều hỏi) đặt ngay mặt hợp lệ; render lại không tự reveal. Lật không gọi chấm hoặc lưu.
- `AnimatedNumber`: dừng đích cũ trước khi đổi đích; finite/nonnegative target, accessibilityLabel luôn là số cuối. Listener chỉ cập nhật state hiển thị. Không nhận callback cập nhật XP.
- Hai primitive mới dùng hook reduced-motion hiện có: Giảm/Tắt/OS Reduce Motion bỏ flip/count và hiển thị đích ngay. Background đặt trạng thái cuối; unmount bỏ listener và dừng animation. Không có vòng lặp trang trí mới.
- Câu hỏi dùng `turnKey` cho animation nhưng **không dùng React key để remount vùng nhập**. Giữ nguyên key input warmup vốn có khi thật sự đổi từ/pass. Đổi theme/rerender trong cùng lượt giữ nội dung/focus trong fixture.
- Handler chấm/lưu, khóa submit, pending answer, retry, queue, công thức tiến trình và lịch SRS đều được giữ nguyên. Hiệu ứng sai không chạy lại khi bấm kiểm tra cùng trạng thái. Khi lưu lỗi, chưa hiển thị phản hồi thành công; người học thử lại bằng luồng cũ.
- Word Chain không reveal kết quả trước promise từ điển. Không thêm giả lập “AI đang nghĩ”, điểm âm học hoặc phần thưởng.
- Chọn thành phần chữ chỉ lưu state cục bộ `{character,index}`; không sửa mnemonic, stroke data hoặc ghi nhớ lựa chọn vào DB. StrokeWriter vẫn có thông báo khi thiếu dữ liệu; mẫu bộ thủ dạng gốc, nếu có, tiếp tục được ghi rõ bởi component cũ.

Đối chiếu snapshot **980 file** trước P3: **965 file giữ nguyên hash, 15 file được sửa, không xóa file**. Toàn bộ file trong `src/db`, `src/services`, `src/stores`, `src/hooks`, dữ liệu/content, package/lockfile và các cấu hình/native có trong manifest giữ nguyên. Kiểm tra AST đối chiếu **37 handler có tên** trong các màn/component liên quan: thân hàm giữ nguyên, gồm `recordAnswer`, `continueAfterFeedback`, `answer`, `check`, `next`, `startGame`, `submit` và các hàm tải/lưu hiện có. Diff riêng của P3 được lưu ngoài dự án để tách khỏi thay đổi chưa commit có sẵn.

“Không ảnh hưởng tiến độ” ở đây nghĩa là không sửa thuật toán/lịch/dữ liệu hoặc thêm thao tác ghi từ animation. Khi người dùng chủ động làm bài/đánh giá thẻ, app vẫn lưu theo nghiệp vụ đang có. Chưa có phép so sánh DB điện thoại trước/sau vì không truy cập thiết bị trong P3.

## 3. Ý tưởng đã khảo sát và hoãn

- **Mascot/pháo hoa mới:** đã có LearningGuide và celebrate trong kết quả ôn, hoàn thành học/bài. Không tạo bản thứ hai hoặc gắn pháo hoa với mỗi đáp án. Achievements chỉ cung cấp trạng thái unlockedAt; không có tín hiệu mới mở khóa đủ rõ để phát thưởng khi mount/history. Màn kết quả thi cũng không được suy thành sự kiện mới chỉ vì mở màn.
- **Vẽ dọc đường nét:** dữ liệu hiện tại là outline tô kín, chưa có median/hướng bút đáng tin cậy. Giữ replay lần lượt từng nét, không dựng đường vẽ sai.
- **Waveform/điểm phát âm:** LocalVoiceRecorder đang dùng trạng thái/thời lượng, chưa bật/cấp meter cho UI; SpeechPinyinButton nhận transcript và trạng thái, ShadowingPlayer đối chiếu nghe mẫu/bản ghi, không trả điểm âm học. Không thêm waveform giả, không đổi quyền micro hoặc pipeline âm thanh. Không tuyên bố đã kiểm thử ghi âm native trong P3.
- **Âm thanh UI:** manifest sự kiện còn trống; không thêm âm thanh chưa có nguồn/giấy phép phù hợp.
- Không thêm bảng xếp hạng, streak, notification, analytics, backend hay nội dung/video mới. Các giới hạn là căn cứ chọn phạm vi 6 mục, không phải tính năng đã triển khai.

Nguồn, bằng chứng và bảng chấm ứng viên: [MOTION_ENGAGEMENT_RESEARCH.md](MOTION_ENGAGEMENT_RESEARCH.md). Website sản phẩm là tham khảo cơ chế; nghiên cứu gamification không chứng minh một hiệu ứng riêng làm tăng retention.

## 4. File thuộc thay đổi P3

| File | Phạm vi |
| --- | --- |
| `src/components/ui/AnimatedNumber.tsx` **mới** | Nội suy số thực đã tính; lifecycle và accessibility |
| `src/components/ui/FlashcardFlip.tsx` **mới** | Lật một mặt, đảo chiều/reset, lifecycle |
| `src/components/ui/StudyTransition.tsx` | Thêm durationMs tùy chọn; mặc định P1/P2 giữ nguyên |
| `src/components/ui/MotionPressable.tsx` | Cho truyền accessibilityRole, checked/selected semantic cả web/native |
| `src/components/ui/AnimatedProgressBar.tsx` | testID và accessibilityValue theo đơn vị đếm; giữ mặc định phần trăm |
| `src/components/english/EnglishLearningProgress.tsx` | Dùng progress primitive thay width tĩnh |
| `src/components/english/EnglishNewWordWarmup.tsx` | Chuyển nội dung và phản hồi; giữ handler |
| `src/components/english/EnglishReviewFlow.tsx` | Phản hồi, lựa chọn, chuyển câu/gợi ý/tiến trình, modal và lối vào flashcard |
| `src/app/english/review.tsx` | Lật flashcard, nút hai chiều, feedback/modal; bỏ styles nút reveal cũ |
| `src/components/XpJourneyCard.tsx` | Tổng XP chuyển số khi dữ liệu đổi |
| `src/app/memory/structure.tsx` | Chọn thành phần đã có dữ liệu, reveal bảng nét |
| `src/app/(tabs)/entertainment.tsx` | Word Chain: số/reveal/pressed và key lịch sử ổn định |
| `src/components/english/EnglishQuickDictionary.tsx` | Chỉ đồng bộ policy modal |
| `src/components/english/EnglishSensePickerModal.tsx` | Chỉ đồng bộ policy modal |
| `src/app/english/index.tsx` | Chỉ đồng bộ policy modal menu bộ từ |
| `src/app/english/decks.tsx` | Chỉ đồng bộ policy modal chia sẻ |
| `src/app/english/reader.tsx` | Chỉ đồng bộ policy hai modal |
| `scripts/qa-motion-p3.cjs` **mới** | Kiểm thử RN-web có fixture ở ranh giới DB/audio/network |
| `docs/MOTION_ENGAGEMENT_RESEARCH.md` **mới** | Nguồn và lựa chọn phạm vi |
| `docs/MOTION_P3_ENGAGEMENT_REPORT.md` **mới** | Bàn giao và bằng chứng |

## 5. Kết quả kiểm thử

Artifacts nằm ngoài source tại **`D:/ReactJS/4Chinese-P3-2026-10-24/`**; gồm snapshot/originals, log, ảnh fixture `web/`, `web-p2/`, `preservation.json`, `p3-source.diff` và `export-android/`.

| Kiểm tra thực chạy | Kết quả / giới hạn |
| --- | --- |
| `npm run typecheck` | Exit 0 |
| `npm run lint -- --no-cache` | Exit 0; **0 lỗi, 9 cảnh báo** trên các file không sửa trong P3. Không dùng cache cảnh báo cũ. |
| `npm test` trước/sau | Cùng **1160 đạt / 1165**, 5 lỗi tồn tại trước P3, 207/212 file test đạt. Không sửa test hoặc DB ngoài phạm vi để làm sạch báo cáo. |
| `node scripts/qa-motion-p1.cjs` | PASS: press/release, tap nhanh, disabled/loading, retarget, progress bounds, Full/Giảm/Tắt/OS, visibility/unmount mô phỏng. RN-web. |
| `node scripts/qa-playful-ui.cjs` | PASS: mascot/vẫy tay/pháo hoa và tương tác P2, phản hồi, playback giả lập, hub/path/word tabs, UI memory/sổ lỗi, scope đọc/điều hướng, unsaved notes, 320/390/430 px, theme và CSS text 150%. Fixture, không phải native. |
| `node scripts/qa-motion-p3.cjs` | PASS: một mặt thẻ, đảo chiều trước/sau giữa chuyển động, reset lượt; số đích/retarget/remount; Full/Giảm/Tắt/OS; visibility/unmount mô phỏng; warmup đúng/sai/giữ focus; nhấn submit/retry hai lần với fixture lưu lỗi; không lưu trùng card; hoàn thành/remount không lưu thêm; modal mở/đóng; chọn thành phần; replay/fallback không nét; Word Chain chờ promise thật của fixture; 320/390/430 sáng/tối; CSS text 150%; không pageerror hoặc ghi ngoài ranh giới fixture. |
| `npx expo export --platform android --output-dir D:/ReactJS/4Chinese-P3-2026-10-24/export-android` | Exit 0, Hermes Android bundle được xuất. **Không phải APK, không chứng minh runtime native.** |
| Hash/AST đối chiếu snapshot, `git diff --check` | PASS; không xóa hoặc sửa file ngoài danh sách cho phép. Git có cảnh báo chuẩn hóa LF/CRLF, không có lỗi whitespace. |

5 lỗi baseline vẫn giữ nguyên:

1. `src/db/home-review-scope.test.ts`
2. `src/db/review-pagination-and-size.test.ts`
3. `src/db/unified-search.test.ts`
4. `src/services/learning/session-pinyin-ui.test.ts`
5. `src/services/reader/word-context.test.ts`

**Phân loại bằng chứng:** cấu hình/hàm được xác minh từ source và diff; hành vi tương tác nêu PASS được chạy bằng RN-web với fixture. Audio/network/DB đều được thay ranh giới, icon/font/nét mẫu có stub; ảnh cấu tạo chỉ minh họa bố cục, không xác minh nét thật. Media query Reduced Motion và document visibility là mô phỏng trình duyệt. Không có video/native benchmark P3. CSS 150% không tương đương fontScale Android. TalkBack, bàn phím Android, modal native, GPU flip 3D, tốc độ frame trên máy yếu và audio permission/lifecycle thật **chưa xác minh**.

## 6. Kế hoạch kiểm tra trên thiết bị khi được yêu cầu

Chỉ bắt đầu build/cài thử APK sau yêu cầu tương ứng của người dùng. Ưu tiên bản thử/dữ liệu kiểm thử tách khỏi tiến độ thật.

1. Ôn tiếng Anh: đúng/sai/trống, gợi ý, nhập nhanh có bàn phím, đổi câu/pass; tiếp tục khi hiệu ứng còn chạy. Đối chiếu mỗi thao tác học chỉ tạo bản ghi theo logic hiện tại.
2. Lật thẻ 10 lần liên tục, đảo chiều trước/sau 50%, đổi chế độ/chiều hỏi, Back trong khi lật; TalkBack chỉ gặp mặt đang hiện. Nếu máy yếu bị giật 3D, đánh giá fallback reveal có sẵn trong chế độ Giảm trước khi mở rộng.
3. Full/Giảm/Tắt, OS Reduce Motion bằng thao tác được người dùng cho phép; đổi setting giữa hiệu ứng. Background/foreground/unmount phải về trạng thái cuối, không tự lưu hay phát thưởng.
4. Hán tự có/không có cấu tạo, thành phần có/thiếu dữ liệu nét, mẫu bộ thủ dạng gốc; đọc nguyên chữ và cách đọc không bị che. Replay, đổi phần khi đang phát, chuyển Giảm/Tắt; kiểm tra hành vi StrokeWriter cũ riêng, không gắn nhãn đã cải thiện vẽ nét trong P3.
5. Word Chain: từ sai, trùng, đúng, từ điển lỗi/chậm, dừng/chơi lại; không hiện từ trả lời trước kết quả và không tự lưu từ gặp.
6. Màn nhỏ/fontScale ≥1,3/1,5, sáng/tối; chạm mục đầu/cuối, cuộn thẻ dài và modal với bàn phím. Đo frame pacing release trên máy yếu và kiểm tra TalkBack, không suy từ web.
7. Luồng kết quả đã lưu/lưu lỗi/history mở lại: so sánh hành vi trước/sau; không thêm XP hay chạy animation mới giả hoàn thành. Recorder bắt đầu/dừng/hủy/lỗi và background chỉ là smoke test hồi quy phần cũ, không phải feature P3 mới.

## 7. Đánh giá trải nghiệm và retention

Chưa có dữ liệu theo thời gian để tuyên bố cải thiện retention. Không thêm event/SDK trong đợt này.

- Trước tiên dùng phiên kiểm thử có nhiệm vụ tương đương trên dữ liệu giả: thời gian tìm nút xem nghĩa, số chạm bị mất, khả năng giải thích lỗi sau feedback, hoàn thành lượt và chuyển sang câu kế. Ghi riêng chi phí chờ animation và lựa chọn Giảm/Tắt; không coi thời gian trong app dài hơn là tốt hơn.
- Nếu dữ liệu lịch sử hiện hữu đủ so sánh, đánh giá tỷ lệ hoàn thành phiên/bài, thời gian một hành động và mức bỏ dở; kiểm soát độ khó, số từ, thiết bị và kinh nghiệm người học. Chỉ dùng dữ liệu sẵn có và được phép, không suy phiên thoát từ dữ liệu thiếu sự kiện.
- D1/D7 chỉ đánh giá khi có dữ liệu quay lại đủ tin cậy; nếu chưa có, để là kế hoạch. Muốn kết luận nhân quả cần thử nghiệm có nhóm so sánh, thời gian và cỡ mẫu phù hợp, cùng kiểm tra kết quả nhớ từ sau đó. Thử nghiệm UI thành công không chứng minh hiệu quả học tập.
