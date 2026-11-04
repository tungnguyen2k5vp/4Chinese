# P3 — Nghiên cứu tương tác hỗ trợ học tập

Ngày truy cập nguồn: **24/10/2026**. Phạm vi: giao diện 4Chinese hiện có; không sửa thuật toán học, dữ liệu, SDK hoặc backend. Đã đối chiếu bản kiểm kê `D:/ReactJS/4Chinese-Interactive-Motion-2026-10-23/ANIMATION_INTERACTION_INVENTORY_2026-10-24.md` với source hiện tại trước khi chọn việc.

## Nguồn và quyết định thiết kế

Các trang sản phẩm dưới đây xác minh được mô tả tính năng công khai. Không dùng chúng để khẳng định thời lượng animation, hiệu năng native hoặc hiệu quả ghi nhớ. Không phân tích video mới trong P3 và không sao chép mã, bố cục thương hiệu, nhân vật, âm thanh hay tài nguyên XAPK.

| Nguồn | Điều đọc được / giới hạn | Chuyển hóa thành thiết kế riêng, đối tượng và lợi ích dự kiến | Chi phí, rủi ro và quyết định |
| --- | --- | --- | --- |
| [Duolingo 101](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/) | Bài ngắn theo lộ trình, bài nhận biết và gõ nhớ lại; luyện lại lỗi. Đây là mô tả sản phẩm. | Warmup và ôn tiếng Anh: phản hồi ngay, giữ câu nhập sai để đối chiếu, chuyển câu nhẹ; giúp biết cần sửa gì. | Thấp–vừa; nguy cơ mất focus nếu remount. **Chọn**, dùng primitive sẵn có, không key lại input bằng animation. |
| [Duolingo: learning well](https://blog.duolingo.com/time-spent-learning-well/) | Thời gian/số phiên không tự phản ánh chất lượng; chỉ số có thể thiên về nội dung dễ hoặc nhóm dùng nhiều. | Thanh tiến trình phản ánh kết quả logic hiện tại; animation không bắt chờ. Hữu ích cho người có phiên học ngắn. | Thấp; không đổi công thức tiến trình. **Chọn nguyên tắc**, không tối ưu thời gian ở lại app. |
| [Duolingo streak help](https://www.duolingo.com/help/what-is-a-streak) | Công cụ chỉ đọc được khung iframe, thiếu nội dung để xác minh chi tiết. | Không suy diễn cơ chế streak hay thêm nhắc nhở. | Thiếu bằng chứng và ngoài phạm vi; **không triển khai**. |
| [HelloChinese](https://www.hellochinese.cc/) | Trang giới thiệu nêu bài học dạng trò chơi, nghe/nói/đọc/viết, nhận giọng nói, viết tay, ôn cách quãng và video người bản ngữ. Không có bằng chứng timing từng hiệu ứng. | Với người học Hán tự: chọn thành phần trong cấu tạo đã xác minh, vẫn giữ toàn chữ và cách đọc. Giúp khám phá quan hệ thành phần và xem nét tương ứng. | Vừa; dữ liệu cấu tạo chỉ có một tập nhỏ. **Chọn cấu tạo**, không suy đoán nét hoặc vai trò ngữ nghĩa/ngữ âm. |
| [SuperChinese](https://www.superchinese.com/) và [FAQ](https://www.superchinese.com/faq.html) | FAQ mô tả tình huống thực tế và phản hồi phát âm bằng điểm/màu từng ký tự. Không kiểm chứng engine qua website. | Chỉ hiển thị trạng thái/kết quả thật của bộ ghi/nhận giọng nói hiện tại. Phù hợp luyện phát âm. | Cao nếu thiếu meter/đánh giá âm học. **Hoãn waveform và điểm phát âm**: source không cung cấp các tín hiệu cần thiết cho thiết kế đó. |
| [Memrise](https://www.memrise.com/) | Trang sản phẩm mô tả video ngắn người bản ngữ và Hear → Learn → Copy theo ngữ cảnh. | Flashcard chủ động lật để xem nghĩa/ngữ cảnh đã lưu; hỗ trợ tự nhớ trước khi xem. | Vừa; phải giữ một mặt tương tác và không tự đánh giá. **Chọn lật thẻ**, không thêm/tải video hoặc nội dung mới. |
| [Busuu](https://www.busuu.com/en-US) và [Corrections](https://www.busuu.com/en/how-to/corrections) | Hướng dẫn sửa bài khuyến khích phản hồi ngắn, giải thích lỗi, có lời động viên. Cơ chế cộng đồng là tính năng sản phẩm riêng. | Phản hồi sai dùng “Cùng xem lại nhé”, hiển thị đáp án người học và đáp án hiện có. Dành cho người dễ nản khi sai. | Thấp; phải giữ nguyên chấm điểm. **Chọn ngôn ngữ hỗ trợ**, không xây feed/bạn bè. |
| [Gamification is not just fun…](https://link.springer.com/article/10.1186/s40359-026-05046-8) | Bài công bố 02/07/2026; 337 sinh viên, khóa blended 16 tuần; khảo sát tự báo cáo sau can thiệp và mô hình liên hệ. Không phải thử nghiệm ngẫu nhiên chứng minh nhân quả. | Dùng cảm nhận năng lực, quyền chủ động và hỗ trợ làm tiêu chí chọn phản hồi; kiểm tra tác động sau này. | Không thể suy ra một flip/pop làm tăng retention. **Chọn nguyên tắc**, không tuyên bố tăng kết quả học. |
| [Stanford: Contests, Gamification…](https://www.gsb.stanford.edu/faculty-research/publications/contests-gamification-persistent-engagement-educational-technology), [bản công bố](https://link.springer.com/article/10.1007/s11129-026-09311-3) | Trang Stanford trả 403 khi mở trực tiếp; đọc được abstract qua chỉ mục tìm kiếm và đối chiếu trang công bố. Nghiên cứu ngẫu nhiên khoảng 10.000 người dùng tại Ấn Độ, thi đọc/bảng xếp hạng/phần thưởng trong app tiếng Anh; ghi nhận tương tác kéo dài sau ưu đãi. | Nhắc rằng phần thưởng phải gắn hoạt động thật, cần đánh giá đúng bối cảnh. | Bằng chứng về cuộc thi, không về animation; engagement không đồng nhất với học tốt. **Không thêm leaderboard, quà hoặc thi đua**. |
| [Reanimated accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/) | Reduced motion cho phép trả trạng thái cuối, bỏ chuyển động không thiết yếu và điều chỉnh lặp. | Full/Giảm/Tắt và tùy chọn OS qua hook hiện có; số/flip về đích ngay khi giảm chuyển động. | Thấp; web không xác minh được Android TalkBack/frame pacing. **Chọn**, không tạo hook riêng hoặc buộc dùng Reanimated. |
| [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) | Đã đọc tài liệu đúng phiên bản theo AGENTS.md; workspace dùng Expo ~57.0.27, RN 0.86.3, React 19.2.3. | Tận dụng RN Animated và Expo Router hiện tại. | Không thêm dependency hoặc sửa cấu hình native. |

## Chấm ứng viên

Thang 1–5: học tập, UX, dữ liệu: cao hơn tốt hơn; chi phí, tải hiệu năng, hồi quy: cao hơn khó/rủi ro hơn. Đây là đánh giá kỹ thuật để chọn phạm vi, chưa phải số liệu người học.

| Ứng viên | Học tập | UX | Dữ liệu | Chi phí | Tải | Hồi quy | Kết luận |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Phản hồi/chuyển câu/tiến trình tiếng Anh | 5 | 5 | 5 | 2 | 2 | 2 | **Chọn 1**: thiếu nhất quán với tiếng Trung |
| Flashcard lật có nút hai chiều | 4 | 5 | 5 | 3 | 2 | 3 | **Chọn 2**: chủ động xem đáp án, giữ đánh giá rõ ràng |
| Chuyển số XP thật khi đổi giá trị | 2 | 4 | 5 | 2 | 2 | 1 | **Chọn 3**: chỉ một vị trí XP, không đếm lại từ 0 |
| Khám phá thành phần Hán tự | 5 | 4 | 4 | 2 | 2 | 2 | **Chọn 4**: chỉ cấu tạo đã xác minh |
| Word Chain: reveal kết quả và điểm thật | 4 | 4 | 5 | 2 | 2 | 2 | **Chọn 5**: có tương tác lặp thực tế |
| Đồng bộ motion policy modal tiếng Anh | 3 | 5 | 5 | 1 | 1 | 2 | **Chọn 6**: cải thiện khả năng tiếp cận |
| Vẽ liên tục dọc nét | 5 | 4 | 1 | 4 | 3 | 4 | Hoãn: path là viền nét tô kín, thiếu median/hướng tin cậy |
| Waveform microphone / điểm âm học | 4 | 4 | 1 | 4 | 3 | 4 | Hoãn: recorder chưa bật/cung cấp luồng meter cho UI; không giả dữ liệu |
| Pháo hoa/mở huy hiệu mới | 2 | 3 | 2 | 3 | 3 | 4 | Không thêm: đã có LearningGuide; nhiều màn chỉ có snapshot/history, không có tín hiệu sự kiện mới |
| Âm thanh UI | 2 | 3 | 1 | 3 | 2 | 2 | Hoãn: manifest sự kiện trống, chưa có bộ asset phù hợp giấy phép |

## Ranh giới dữ liệu và bản quyền

Các ý tưởng là cơ chế tương tác phổ biến, được viết bằng component/token của 4Chinese. Không tái sử dụng asset độc quyền từ app tham khảo. Không thêm asset bên ngoài nên không phát sinh yêu cầu phân phối giấy phép mới. Giữ nguyên attribution và dữ liệu nét/cấu tạo đang có; nghiên cứu website không xác lập quyền sao chép tài sản của họ.

Không sửa bảng, migration, SRS, queue, cách chấm hoặc phép cộng XP. Phản hồi chỉ theo kết quả hiện tại; các callback hoạt ảnh chỉ thay đổi hiển thị. Không thêm analytics SDK. Kế hoạch đánh giá và giới hạn kiểm thử nằm trong [báo cáo triển khai](MOTION_P3_ENGAGEMENT_REPORT.md).
