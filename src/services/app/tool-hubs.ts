export type HubTool = {
  id: string;
  title: string;
  description: string;
  href: string;
};
export type ToolGroup = { title: string; tools: readonly HubTool[] };

/** Navigation only: grouping does not replace existing flows or progress. */
export const practiceGroups: readonly ToolGroup[] = [
  {
    title: "Ôn và củng cố",
    tools: [
      {
        id: "review",
        title: "Ôn theo lịch SRS",
        description: "Ôn từ đến hạn, giữ nguyên các cấp nhớ.",
        href: "/review",
      },
      {
        id: "weak",
        title: "Từ cần củng cố",
        description: "Luyện lại các từ cần chú ý.",
        href: "/review/weak",
      },
      {
        id: "mistakes",
        title: "Sổ lỗi",
        description: "Xem và luyện lại lỗi đã ghi nhận.",
        href: "/mistakes",
      },
      {
        id: "upcoming",
        title: "Lịch ôn sắp tới",
        description: "Xem thời gian ôn tiếp theo của từng từ.",
        href: "/review/upcoming",
      },
    ],
  },
  {
    title: "Nghe và nói",
    tools: [
      { id: 'recording-library', title: 'Bản ghi tại máy', description: 'Nghe/xóa bản sao đã lưu 7 ngày, 30 ngày hoặc tự xóa; không vào sao lưu JSON của app.', href: '/speaking/recordings' },
      { id: 'pronunciation-pairs', title: 'Phân biệt âm dễ nhầm', description: '10 bài nghe và tự đối chiếu âm đầu, vần và thanh.', href: '/speaking/pairs' },
      {id:'listening-library',title:'Thư viện nghe',description:'Nghe câu đã review, điều chỉnh tốc độ và mở bản chép lời TTS.',href:'/listening'},
      {
        id: "listening",
        title: "Nghe và ghép nghĩa",
        description: "Kiểm tra nghe với từ trong bộ từ riêng.",
        href: "/decks/listening",
      },
      {
        id: "tones",
        title: "Thanh điệu",
        description: "Nghe mẫu TTS và phân biệt thanh điệu.",
        href: "/speaking/tones",
      },
      {
        id: "shadowing",
        title: "Nói theo mẫu",
        description: "Nghe TTS, ghi âm và tự nghe lại trên điện thoại.",
        href: "/speaking/shadowing",
      },
      {
        id: "speaking",
        title: "Nghe & nói",
        description: "Chọn công cụ luyện phát âm đang có.",
        href: "/speaking",
      },
      {
        id: "conversation",
        title: "Hội thoại với AI",
        description: "Cần mạng và đăng nhập; không phải điểm thi.",
        href: "/speaking/ai",
      },
    ],
  },
  {
    title: "Viết, ngữ pháp và luyện thi",
    tools: [
      {
        id: "hanzi",
        title: "Luyện viết Hán tự",
        description: "Tập nét và nhận diện chữ; không thay bài viết đoạn.",
        href: "/writing",
      },
      {
        id: "grammar",
        title: "Ngữ pháp",
        description: "Cấu trúc, ví dụ và bài luyện trong ngữ cảnh.",
        href: "/grammar",
      },
      {
        id: "grammar-focus",
        title: "Ôn lỗi ngữ pháp lặp lại",
        description:
          "Bài ôn ngắn dựa trên nhiều lượt luyện, không chỉ một lần sai.",
        href: "/grammar/focus",
      },
      {
        id: "confusables", title: "Từ dễ nhầm",
        description: "So sánh cách dùng và chọn từ trong tình huống cụ thể.",
        href: "/confusables",
      },
      {
        id: "exam",
        title: "Trung tâm luyện thi",
        description: "Mini test gốc có đồng hồ, lưu đáp án và giải thích.",
        href: "/exam",
      },
      {
        id: "written",
        title: "Viết và dịch",
        description: "Lưu bản nháp và tự đối chiếu với mẫu offline.",
        href: "/exam/skills",
      },
      {
        id: "timed-speaking",
        title: "Luyện nói có thời gian",
        description: "Chuẩn bị, ghi âm và tự đối chiếu; không chấm tự động.",
        href: "/exam/speaking",
      },
    ],
  },
];

export const libraryGroups: readonly ToolGroup[] = [
  {
    title: "Đọc theo ngữ cảnh",
    tools: [
      {id:'listening-library',title:'Thư viện nghe',description:'Câu theo cấp HSK, nghe lại và tự đối chiếu bản chép lời.',href:'/listening'},
      {
        id: "stories",
        title: "Truyện ngắn",
        description: "Truyện phân cấp, tra từ và kiểm tra đọc hiểu.",
        href: "/stories",
      },
      {
        id: "reader",
        title: "Đọc & tra từ",
        description: "Văn bản của bạn, TXT và công cụ OCR hiện có.",
        href: "/reader",
      },
    ],
  },
  {
    title: "Kho cá nhân và tra cứu",
    tools: [
      { id: 'global-search', title: 'Tìm trong ứng dụng', description: 'Tìm từ vựng, ngữ pháp, truyện, bài học và nhóm từ dễ nhầm.', href: '/search' },
      {
        id: "decks",
        title: "Bộ từ riêng",
        description: "Quản lý và học các bộ từ bạn tự tạo.",
        href: "/decks",
      },
      {
        id: "dictionary",
        title: "Kho từ vựng",
        description: "Tìm Hán tự, pinyin và nghĩa Việt trong kho offline.",
        href: "/(tabs)/vocabulary",
      },
      {
        id: "grammar-reference",
        title: "Tra cấu trúc ngữ pháp",
        description: "Đọc giải thích và ví dụ; có thể luyện ngay.",
        href: "/grammar",
      },
      {
        id: "hsk",
        title: "HSK và syllabus",
        description: "Phân biệt dữ liệu nội bộ với chuẩn chưa xác minh.",
        href: "/(tabs)/hsk",
      },
    ],
  },
];
