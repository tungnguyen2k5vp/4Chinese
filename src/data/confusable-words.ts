export type ConfusableQuestion = {
  id: string;
  sentence: string;
  translation: string;
  answer: string;
  explanation: string;
};
export type ConfusablePair = {
  id: string;
  title: string;
  sourceType: "CURATED" | "AI_ASSISTED";
  reviewStatus: "UNREVIEWED";
  contentVersion: 1;
  provenance?: string;
  reviewLabel?: "PENDING";
  examples?: readonly { hanzi: string; vi: string }[];
  words: readonly {
    hanzi: string;
    pinyin: string;
    meaning: string;
    usage: string;
  }[];
  questions: readonly ConfusableQuestion[];
  writingPrompt: string;
};

function originalV5Pair(id: string, words: ConfusablePair['words'], questions: ConfusablePair['questions'],
  writingPrompt: string): ConfusablePair {
  return { id, title: words.map((word) => word.hanzi).join(' / '), words, questions,
    sourceType: 'AI_ASSISTED', reviewStatus: 'UNREVIEWED', reviewLabel: 'PENDING', contentVersion: 1,
    provenance: '4Chinese original V5 contrast practice · AI-assisted · pending independent review',
    examples: questions.map((question) => ({ hanzi: question.sentence.replace('___', question.answer), vi: question.translation })),
    writingPrompt: `${writingPrompt} Tự luyện bản gốc có AI hỗ trợ · PENDING, chưa kiểm duyệt độc lập; không phải ngân hàng thi chính thức.` };
}

/** Original practice, not an official level mapping or independently verified bank. */
export const confusablePairs: readonly ConfusablePair[] = [
  {
    id: "know",
    title: "知道 / 认识",
    sourceType: "CURATED",
    reviewStatus: "UNREVIEWED",
    contentVersion: 1,
    words: [
      {
        hanzi: "知道",
        pinyin: "zhīdao",
        meaning: "biết một thông tin",
        usage:
          "Biết đáp án, địa chỉ hoặc chuyện gì đã xảy ra; thường theo sau bởi một mệnh đề.",
      },
      {
        hanzi: "认识",
        pinyin: "rènshi",
        meaning: "quen biết; nhận ra",
        usage:
          "Quen một người hoặc nhận ra chữ/vật; không dùng để nói biết một thông tin như địa chỉ.",
      },
    ],
    questions: [
      {
        id: "address",
        sentence: "你___他的地址吗？",
        translation: "Bạn có biết địa chỉ của anh ấy không?",
        answer: "知道",
        explanation:
          "Địa chỉ là thông tin cần biết, nên dùng 知道. 认识 thường chỉ sự quen biết hoặc nhận ra.",
      },
      {
        id: "friend",
        sentence: "我___小李，我们是同学。",
        translation: "Tôi quen Tiểu Lý, chúng tôi là bạn học.",
        answer: "认识",
        explanation:
          "Hai người là bạn học, tức có quan hệ quen biết: 认识小李. 知道小李 có thể chỉ biết đến người đó, không diễn đạt sự quen biết ở đây.",
      },
    ],
    writingPrompt:
      "Viết một câu về thông tin bạn biết và một câu giới thiệu người bạn quen.",
  },
  {
    id: "opinion",
    title: "觉得 / 认为",
    sourceType: "CURATED",
    reviewStatus: "UNREVIEWED",
    contentVersion: 1,
    words: [
      {
        hanzi: "觉得",
        pinyin: "juéde",
        meaning: "cảm thấy; thấy rằng",
        usage:
          "Dùng cho cảm giác cơ thể, cảm nhận cá nhân và ý kiến. Với ý kiến, đôi khi có thể thay bằng 认为.",
      },
      {
        hanzi: "认为",
        pinyin: "rènwéi",
        meaning: "cho rằng; nhận định",
        usage:
          "Nêu nhận định sau suy xét. Không thay 觉得 trong câu diễn tả cảm giác cơ thể trực tiếp.",
      },
    ],
    questions: [
      {
        id: "cold",
        sentence: "风很大，我___有点儿冷。",
        translation: "Gió rất mạnh, tôi cảm thấy hơi lạnh.",
        answer: "觉得",
        explanation:
          "Có cảm giác lạnh trực tiếp, nên dùng 觉得冷. 认为 không diễn tả cảm giác cơ thể theo cách này.",
      },
      {
        id: "tired",
        sentence: "走了很久以后，我___很累。",
        translation: "Sau khi đi rất lâu, tôi cảm thấy rất mệt.",
        answer: "觉得",
        explanation:
          "Mệt là cảm giác cơ thể. Không đặt câu hỏi “ý kiến” mơ hồ vì 觉得 và 认为 đều có thể đúng trong nhiều nhận định.",
      },
    ],
    writingPrompt:
      "Viết một câu cảm nhận với 觉得 và một nhận định có lý do với 认为. Hai từ có thể cùng đúng trong một số câu nêu ý kiến.",
  },
  {
    id: "again",
    title: "再 / 又",
    sourceType: "CURATED",
    reviewStatus: "UNREVIEWED",
    contentVersion: 1,
    words: [
      {
        hanzi: "再",
        pinyin: "zài",
        meaning: "lại; thêm một lần (chưa diễn ra)",
        usage: "Nói lần lặp lại sẽ diễn ra hoặc yêu cầu làm thêm lần nữa.",
      },
      {
        hanzi: "又",
        pinyin: "yòu",
        meaning: "lại (đã xảy ra)",
        usage:
          "Trong cách dùng lặp lại ở đây, nói sự việc đã xảy ra thêm một lần. Không phải mọi cách dùng 又 đều chỉ quá khứ.",
      },
    ],
    questions: [
      {
        id: "repeat",
        sentence: "我没听清楚，请___说一遍。",
        translation: "Tôi chưa nghe rõ, hãy nói lại một lần nữa.",
        answer: "再",
        explanation:
          "Đang yêu cầu một lần nói tiếp theo, chưa xảy ra, nên dùng 再.",
      },
      {
        id: "late",
        sentence: "他昨天迟到了，今天___迟到了。",
        translation: "Hôm qua anh ấy đến muộn, hôm nay lại đến muộn.",
        answer: "又",
        explanation:
          "Cả lần đến muộn hôm nay đã xảy ra (迟到了), nên dùng 又 để nói lặp lại.",
      },
    ],
    writingPrompt:
      "Kể một việc đã lặp lại bằng 又 và dự định làm lại một việc bằng 再.",
  },
  {
    id: "just",
    title: "刚 / 刚才",
    sourceType: "CURATED",
    reviewStatus: "UNREVIEWED",
    contentVersion: 1,
    words: [
      {
        hanzi: "刚",
        pinyin: "gāng",
        meaning: "vừa mới",
        usage:
          "Phó từ đứng trước động từ: 我刚回来. Không dùng riêng làm thời điểm trước 的.",
      },
      {
        hanzi: "刚才",
        pinyin: "gāngcái",
        meaning: "lúc nãy",
        usage:
          "Danh từ thời gian; có thể ở đầu câu, sau chủ ngữ hoặc trong 刚才的….",
      },
    ],
    questions: [
      {
        id: "moment",
        sentence: "___的电话是小王打来的。",
        translation: "Cuộc điện thoại lúc nãy là do Tiểu Vương gọi.",
        answer: "刚才",
        explanation:
          "Cần một thời điểm để bổ nghĩa 电话 qua 的: 刚才的电话. Không nói 刚的电话.",
      },
      {
        id: "position",
        sentence: "___，他还在这里，现在已经走了。",
        translation: "Lúc nãy anh ấy còn ở đây, giờ đã đi rồi.",
        answer: "刚才",
        explanation:
          "Vị trí đầu câu trước dấu phẩy là danh từ thời gian 刚才. 刚 phải gắn với động từ phía sau, không đứng riêng như vậy.",
      },
    ],
    writingPrompt:
      "Viết một câu có 我刚… và một câu bắt đầu bằng 刚才. Trong 我…回来, cả hai từ đôi khi đều dùng được.",
  },
  {
    id: "two",
    title: "二 / 两",
    sourceType: "CURATED",
    reviewStatus: "UNREVIEWED",
    contentVersion: 1,
    words: [
      {
        hanzi: "二",
        pinyin: "èr",
        meaning: "hai (đếm, số thứ tự)",
        usage:
          "Dùng khi đọc số, số điện thoại và số thứ tự 第二. Một số tổ hợp số có quy tắc riêng.",
      },
      {
        hanzi: "两",
        pinyin: "liǎng",
        meaning: "hai (số lượng)",
        usage:
          "Thường dùng trước lượng từ để đếm hai người/vật: 两个人、两本书.",
      },
    ],
    questions: [
      {
        id: "books",
        sentence: "我买了___本书。",
        translation: "Tôi mua hai quyển sách.",
        answer: "两",
        explanation:
          "Đếm số lượng trước lượng từ 本, cách nói thông dụng là 两本书.",
      },
      {
        id: "ordinal",
        sentence: "这是我第___次来北京。",
        translation: "Đây là lần thứ hai tôi đến Bắc Kinh.",
        answer: "二",
        explanation: "第 tạo số thứ tự, nên dùng 第二次, không dùng 第两次.",
      },
    ],
    writingPrompt: "Viết một câu đếm hai đồ vật và một câu nói “lần thứ hai”.",
  },
  {
    id: "or",
    title: "还是 / 或者",
    sourceType: "CURATED",
    reviewStatus: "UNREVIEWED",
    contentVersion: 1,
    words: [
      {
        hanzi: "还是",
        pinyin: "háishi",
        meaning: "hay (câu hỏi lựa chọn)",
        usage:
          "Hỏi người nghe chọn giữa A và B. 还是 còn có nghĩa khác như “vẫn” hoặc “nên… hơn”.",
      },
      {
        hanzi: "或者",
        pinyin: "huòzhě",
        meaning: "hoặc (nêu các khả năng)",
        usage:
          "Nêu khả năng/thay thế trong câu trần thuật. Trong một số cấu trúc câu hỏi phức tạp, 或者 vẫn có thể xuất hiện.",
      },
    ],
    questions: [
      {
        id: "drink",
        sentence: "你想喝茶___咖啡？",
        translation: "Bạn muốn uống trà hay cà phê?",
        answer: "还是",
        explanation: "Câu hỏi yêu cầu chọn giữa hai đồ uống nên dùng 还是.",
      },
      {
        id: "transport",
        sentence: "去学校可以坐公交车___骑自行车。",
        translation: "Đi học có thể đi xe buýt hoặc đi xe đạp.",
        answer: "或者",
        explanation:
          "Đây là câu trần thuật liệt kê hai cách đi học, không yêu cầu người nghe trả lời lựa chọn.",
      },
    ],
    writingPrompt:
      "Đặt một câu hỏi chọn A/B với 还是 và một câu nêu hai khả năng với 或者.",
  },
  originalV5Pair('v5-bu-mei', [
    { hanzi: '不', pinyin: 'bù', meaning: 'không (ý định/thói quen/đặc điểm)', usage: '我不想去。Tôi không muốn đi. 不 phủ định ý muốn; 不 còn có các cách dùng khác theo ngữ cảnh.' },
    { hanzi: '没', pinyin: 'méi', meaning: 'chưa/không xảy ra; không có', usage: '我昨天没去。Hôm qua tôi không đi. Phủ định 有 dùng 没有, không dùng 不有.' },
  ], [
    { id: 'possession', sentence: '我___有自行车。', translation: 'Tôi không có xe đạp.', answer: '没', explanation: '有 chỉ sở hữu được phủ định bằng 没有; 不有 không phải cách dùng chuẩn ở đây.' },
    { id: 'intention', sentence: '明天学校放假，我___去上课。', translation: 'Ngày mai trường nghỉ, tôi sẽ không đi học.', answer: '不', explanation: '明天 đặt hành động trong kế hoạch ngày mai nên dùng 不去. 没去 kể việc chưa/không xảy ra, không dùng để phủ định kế hoạch tương lai này.' },
  ], 'Viết một câu 不想 và một câu 没有; giải thích vì sao không đổi cho nhau.'),
  originalV5Pair('v5-zuo-gan', [
    { hanzi: '做', pinyin: 'zuò', meaning: 'làm/chế tạo; kết hợp cố định', usage: '她在做饭。Cô ấy đang nấu cơm. 做饭、做作业 là các kết hợp thông dụng.' },
    { hanzi: '干', pinyin: 'gàn', meaning: 'làm công việc (khẩu ngữ)', usage: '他很能干。Anh ấy rất giỏi làm việc. 干 và 做 có vùng nghĩa giao nhau nhưng không thay trong mọi kết hợp.' },
  ], [
    { id: 'homework', sentence: '孩子正在___作业。', translation: 'Đứa trẻ đang làm bài tập.', answer: '做', explanation: 'Kết hợp chuẩn trong ngữ cảnh học tập là 做作业; không chọn 干 chỉ vì cùng dịch “làm”.' },
    { id: 'capable', sentence: '大家都说她精明能___，办事又快又好。', translation: 'Mọi người đều nói cô ấy lanh lợi tháo vát, làm việc vừa nhanh vừa tốt.', answer: '干', explanation: '精明能干 là kết hợp chỉ người lanh lợi, giỏi việc. Không thay bằng 精明能做; 能做 có thể dùng ở ngữ cảnh khác để nói có thể làm một việc.' },
  ], 'Viết câu với 做作业 và 很能干; không suy ra mọi tân ngữ đều chọn duy nhất một từ.'),
  originalV5Pair('v5-kan-jian', [
    { hanzi: '看', pinyin: 'kàn', meaning: 'xem/đọc; nhìn có chủ ý', usage: '我在看书。Tôi đang đọc sách. 看 phim/sách nhấn hành động xem hoặc đọc.' },
    { hanzi: '见', pinyin: 'jiàn', meaning: 'gặp; thấy (trong kết hợp)', usage: '明天见！Hẹn gặp ngày mai! 看见 là kết quả nhìn thấy; không đổi thành 见书 để nói đọc sách.' },
  ], [
    { id: 'reading', sentence: '我正在___这本小说。', translation: 'Tôi đang đọc cuốn tiểu thuyết này.', answer: '看', explanation: 'Đang thực hiện hành động đọc tiểu thuyết: 看小说; 见小说 không diễn đạt ý này.' },
    { id: 'farewell', sentence: '再___！', translation: 'Tạm biệt!', answer: '见', explanation: '再见 là lời chào tạm biệt cố định. 再看 nghĩa xem tiếp/xem lại, không phải lời chào này.' },
  ], 'Đặt câu 看书, 再见 và 看见; phân biệt hành động nhìn với đạt kết quả nhìn thấy.'),
  originalV5Pair('v5-ting-tingjian', [
    { hanzi: '听', pinyin: 'tīng', meaning: 'nghe (hành động)', usage: '我喜欢听音乐。Tôi thích nghe nhạc. Có nghe chăm chú chưa chắc đã nghe thấy rõ.' },
    { hanzi: '听见', pinyin: 'tīngjiàn', meaning: 'nghe thấy (kết quả)', usage: '我听见有人敲门。Tôi nghe thấy có người gõ cửa. 见 bổ sung kết quả tri giác.' },
  ], [
    { id: 'imperative', sentence: '请仔细___，然后回答问题。', translation: 'Hãy nghe kỹ rồi trả lời câu hỏi.', answer: '听', explanation: 'Yêu cầu thực hiện hành động nghe kỹ, dùng 仔细听; không ra lệnh đạt kết quả bằng 仔细听见.' },
    { id: 'failed-result', sentence: '我认真听了，但声音太小，还是没___你说什么。', translation: 'Tôi đã nghe chăm chú, nhưng âm thanh nhỏ quá nên vẫn không nghe thấy bạn nói gì.', answer: '听见', explanation: '认真听了 xác nhận hành động nghe đã diễn ra; vấn đề là chưa đạt kết quả nghe thấy: 没听见. Chọn 没听 sẽ phủ định hành động vừa được xác nhận.' },
  ], 'Viết câu có 听了 nhưng 没听见 để tách hành động và kết quả.'),
  originalV5Pair('v5-xiang-yao', [
    { hanzi: '想', pinyin: 'xiǎng', meaning: 'nghĩ/nhớ; muốn', usage: '我想家了。Tôi nhớ nhà rồi. 想 + động từ còn có thể diễn đạt mong muốn.' },
    { hanzi: '要', pinyin: 'yào', meaning: 'muốn/lấy; sắp/phải theo ngữ cảnh', usage: '我要一杯茶。Tôi muốn một cốc trà. 要 và 想 trước động từ đôi khi đều dùng được với sắc thái khác nhau.' },
  ], [
    { id: 'miss', sentence: '离开家很久了，我很___家。', translation: 'Xa nhà lâu rồi, tôi rất nhớ nhà.', answer: '想', explanation: '想家 là nhớ nhà; 要家 không diễn đạt nỗi nhớ.' },
    { id: 'order', sentence: '服务员，我___一杯热茶。', translation: 'Phục vụ ơi, cho tôi một cốc trà nóng.', answer: '要', explanation: 'Gọi món với 要 + danh từ trực tiếp. Với 想, cần nói 想喝一杯热茶 để diễn đạt muốn uống.' },
  ], 'Đặt câu 想家 và 要一杯茶; đừng tạo câu hỏi chỉ có 想/要 + 去 vì cả hai có thể phù hợp.'),
  originalV5Pair('v5-bixu', [
    { hanzi: '必须', pinyin: 'bìxū', meaning: 'nhất thiết phải (phó từ)', usage: '进入实验室必须戴护目镜。Vào phòng thí nghiệm bắt buộc đeo kính bảo hộ. 必须 đứng trước hành động.' },
    { hanzi: '必需', pinyin: 'bìxū', meaning: 'thiết yếu/cần có', usage: '水是生命所必需的。Nước là thứ thiết yếu cho sự sống. 必需 có thể xuất hiện trong 所必需的 hoặc 必需品.' },
  ], [
    { id: 'obligation', sentence: '进入实验室___戴护目镜。', translation: 'Vào phòng thí nghiệm nhất thiết phải đeo kính bảo hộ.', answer: '必须', explanation: 'Đứng trước động từ 戴 để đặt yêu cầu bắt buộc: 必须. 必需 không phải phó từ này.' },
    { id: 'essential', sentence: '水是生命所___的。', translation: 'Nước là thứ thiết yếu cho sự sống.', answer: '必需', explanation: 'Khung 所必需的 nói thứ cần có cho sự sống; không dùng 所必须的 không có động từ theo sau.' },
  ], 'Viết 必须戴护目镜 và 生活必需品; chú ý cùng âm bìxū nhưng khác chữ và chức năng.'),
  originalV5Pair('v5-yihou-houlai', [
    { hanzi: '以后', pinyin: 'yǐhòu', meaning: 'sau một mốc; về sau/tương lai', usage: '下课以后我回家。Sau giờ học tôi về nhà. 以后 có thể nối trực tiếp sau mốc thời gian/sự việc.' },
    { hanzi: '后来', pinyin: 'hòulái', meaning: 'sau đó (trong chuyện đã xảy ra)', usage: '后来他搬家了。Sau đó anh ấy chuyển nhà. Không nối trực tiếp thành 毕业后来.' },
  ], [
    { id: 'anchor', sentence: '毕业___，她去了上海工作。', translation: 'Sau khi tốt nghiệp, cô ấy đến Thượng Hải làm việc.', answer: '以后', explanation: '毕业 là mốc trực tiếp trước 以后; 后来 không gắn vào sau mốc theo cách này.' },
    { id: 'narrative', sentence: '“___居上”这个成语说的是后起的人超过了先前的人。', translation: 'Thành ngữ “người đến sau vượt lên trước” nói về người xuất hiện sau vượt người đi trước.', answer: '后来', explanation: 'Thành ngữ cố định là 后来居上, không phải 以后居上. Trong nhiều câu kể chuyện sau một mốc, 以后 và 后来 đều có thể phù hợp, nên không chấm một câu “sau đó” thiếu ràng buộc.' },
  ], 'Kể một sự kiện với 起初…后来…, rồi đặt câu 毕业以后….'),
  originalV5Pair('v5-yidian-youidian', [
    { hanzi: '一点儿', pinyin: 'yìdiǎnr', meaning: 'một chút (lượng; mức độ so sánh)', usage: '请说慢一点儿。Xin nói chậm hơn một chút. 一点儿 thường sau tính từ khi điều chỉnh mức độ.' },
    { hanzi: '有点儿', pinyin: 'yǒudiǎnr', meaning: 'hơi (thường không như ý)', usage: '今天有点儿冷。Hôm nay hơi lạnh. 有点儿 đứng trước tính từ.' },
  ], [
    { id: 'adjust', sentence: '请说慢___。', translation: 'Xin nói chậm hơn một chút.', answer: '一点儿', explanation: 'Điều chỉnh mức độ sau 慢 bằng 一点儿; không nói 慢有点儿.' },
    { id: 'complaint', sentence: '这双鞋___小，穿着不舒服。', translation: 'Đôi giày này hơi nhỏ, mang không thoải mái.', answer: '有点儿', explanation: 'Nhận xét hơi nhỏ và bất tiện: 有点儿小. 一点儿小 không phải trật tự của ý này.' },
  ], 'Đặt câu 有点儿贵 và 便宜一点儿; một câu nhận xét, một câu xin điều chỉnh.'),
  originalV5Pair('v5-shihe-heshi', [
    { hanzi: '适合', pinyin: 'shìhé', meaning: 'phù hợp với (động từ)', usage: '这本书适合初学者。Sách này phù hợp với người mới học. 适合 nhận tân ngữ chỉ người/đối tượng phù hợp.' },
    { hanzi: '合适', pinyin: 'héshì', meaning: 'thích hợp (tính từ)', usage: '这个时间很合适。Thời gian này rất thích hợp. Có thể làm định ngữ trong 合适的时间.' },
  ], [
    { id: 'object', sentence: '这本书很___初学者。', translation: 'Sách này rất phù hợp với người mới học.', answer: '适合', explanation: 'Có tân ngữ 初学者 phía sau nên dùng động từ 适合, không dùng 很合适初学者.' },
    { id: 'attributive', sentence: '请用形容词修饰“时间”：我们需要找一个___的时间。', translation: 'Hãy dùng tính từ bổ nghĩa cho “thời gian”: Chúng ta cần tìm một thời gian thích hợp.', answer: '合适', explanation: 'Đề yêu cầu tính từ làm định ngữ: 合适的时间. 适合 là động từ, như 适合大家的时间; không khẳng định mọi câu dùng 适合的时间 đều sai khi ngữ cảnh cho phép lược đối tượng.' },
  ], 'Đặt câu 适合初学者 và 合适的时间; cùng dịch “phù hợp” nhưng khác loại từ.'),
];

export function findConfusablePair(id: string) {
  return confusablePairs.find((pair) => pair.id === id);
}

export function validateConfusableAttempt(row: Record<string, unknown>): void {
  const pair = findConfusablePair(String(row.pair_id));
  const question = pair?.questions.find((item) => item.id === row.question_id);
  if (
    typeof row.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,160}$/.test(row.id) ||
    !pair ||
    !question ||
    row.content_version !== pair.contentVersion ||
    !pair.words.some((word) => word.hanzi === row.selected_word) ||
    row.correct !== (row.selected_word === question.answer ? 1 : 0) ||
    ![0, 1].includes(Number(row.assisted)) ||
    typeof row.assisted !== "number" ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at))
  ) {
    throw new Error("INVALID_CONFUSABLE_ATTEMPT");
  }
}
