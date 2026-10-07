import type { GrammarSeed } from "@/db/grammar";

export type VietnameseContrast = {
  seed: GrammarSeed;
  vietnameseTrap: string;
  incorrect: string;
  corrected: string;
  why: string;
  sourceType: "CURATED";
  reviewStatus: "UNREVIEWED";
};
type ContrastSeed = Omit<VietnameseContrast, "sourceType" | "reviewStatus">;
const entries: ContrastSeed[] = [
  {
    seed: {
      id: "vn-de-di-de",
      title: "Người Việt hay nhầm: 的 / 地 / 得",
      hsk: "3",
      pattern:
        "Định ngữ + 的 + danh từ; trạng ngữ + 地 + động từ; động từ + 得 + bổ ngữ",
      explanation:
        "的 nối phần mô tả/sở hữu với danh từ (我的书); 地 nối cách thức với hành động (认真地学习); 得 nối hành động với mức độ/kết quả đánh giá (说得很好). Cùng đọc de nhưng không dùng thay nhau.",
      quiz: "这是我___书。",
      answer: "的",
      options: ["的", "地", "得"],
      examples: [
        {
          hanzi: "这是我的书。",
          pinyin: "Zhè shì wǒ de shū.",
          vi: "Đây là sách của tôi.",
          en: "This is my book.",
          words: ["这", "是", "我", "的", "书"],
        },
      ],
    },
    vietnameseTrap:
      "Tiếng Việt dùng “của”, “một cách”, “rất” ở các vị trí khác; không chọn trợ từ chỉ vì đều đọc de.",
    incorrect: "这是我地书。",
    corrected: "这是我的书。",
    why: "书 là danh từ được 我 bổ nghĩa sở hữu, nên dùng 的.",
  },
  {
    seed: {
      id: "vn-zai-you",
      title: "Người Việt hay nhầm: 再 / 又",
      hsk: "2",
      pattern: "再 + hành động dự định; 又 + việc lặp lại đã xảy ra",
      explanation:
        "再 thường dùng cho lần sau/chưa xảy ra: 明天再来. 又 thường kể việc đã lặp lại: 他又迟到了. Đây là cách dùng cốt lõi; các cấu trúc 又…又… có chức năng khác.",
      quiz: "我明天___来。",
      answer: "再",
      options: ["再", "又", "已"],
      examples: [
        {
          hanzi: "我明天再来。",
          pinyin: "Wǒ míngtiān zài lái.",
          vi: "Ngày mai tôi lại đến.",
          en: "I will come again tomorrow.",
          words: ["我", "明天", "再", "来"],
        },
      ],
    },
    vietnameseTrap:
      "Cả hai có thể dịch là “lại”. Phải xem lần lặp lại đã xảy ra hay còn dự định.",
    incorrect: "请你又说一遍。",
    corrected: "请你再说一遍。",
    why: "Đây là lời đề nghị cho một lần nói tiếp theo, dùng 再.",
  },
  {
    seed: {
      id: "vn-le-guo",
      title: "Người Việt hay nhầm: 了 / 过",
      hsk: "3",
      pattern: "Động từ + 了: hành động hoàn thành; động từ + 过: trải nghiệm",
      explanation:
        "我买了书 nói việc mua đã hoàn thành trong ngữ cảnh. 我去过北京 nói từng có trải nghiệm đến Bắc Kinh. 了 cuối câu còn báo thay đổi trạng thái; không phải mọi chữ “đã” đều dịch thành 了.",
      quiz: "我曾经去___北京。",
      answer: "过",
      options: ["过", "着", "的"],
      examples: [
        {
          hanzi: "我去过北京。",
          pinyin: "Wǒ qù guo Běijīng.",
          vi: "Tôi từng đến Bắc Kinh.",
          en: "I have been to Beijing.",
          words: ["我", "去", "过", "北京"],
        },
      ],
    },
    vietnameseTrap:
      "“Đã” và “từng” không phải cùng một ý. Chọn theo điều người nói muốn nhấn mạnh.",
    incorrect: "我过北京。",
    corrected: "我去过北京。",
    why: "过 chỉ trải nghiệm phải theo sau động từ 去, không thay cho động từ.",
  },
  {
    seed: {
      id: "vn-hui-neng-keyi",
      title: "Người Việt hay nhầm: 会 / 能 / 可以",
      hsk: "2",
      pattern: "会: kỹ năng học được; 能: điều kiện/năng lực; 可以: được phép",
      explanation:
        "我会游泳: biết bơi. 我今天不能游泳: hôm nay không thể bơi vì điều kiện nào đó. 这里可以游泳吗: ở đây có được phép bơi không. 会 còn có nghĩa dự đoán; cần xét ngữ cảnh.",
      quiz: "我学了很久，现在___游泳了。",
      answer: "会",
      options: ["会", "是", "有"],
      examples: [
        {
          hanzi: "我会游泳。",
          pinyin: "Wǒ huì yóuyǒng.",
          vi: "Tôi biết bơi.",
          en: "I can swim.",
          words: ["我", "会", "游泳"],
        },
      ],
    },
    vietnameseTrap:
      "Tiếng Việt thường gom ba ý vào “có thể”. Trước khi dịch hãy xác định kỹ năng, điều kiện hay sự cho phép.",
    incorrect: "我会游泳吗这里？",
    corrected: "这里可以游泳吗？",
    why: "Hỏi quy định ở một nơi: đặt 这里 đầu câu và dùng 可以 để hỏi sự cho phép.",
  },
  {
    seed: {
      id: "vn-shi-de",
      title: "Người Việt hay nhầm: 是…的",
      hsk: "3",
      pattern: "Chủ ngữ + 是 + chi tiết cần nhấn mạnh + động từ + 的",
      explanation:
        "Dùng để nhấn mạnh thời gian, nơi, cách thức hoặc người thực hiện của một việc đã biết là xảy ra: 我是昨天来的. Không dùng chỉ để đánh dấu quá khứ của mọi câu.",
      quiz: "我是昨天来___。",
      answer: "的",
      options: ["的", "地", "得"],
      examples: [
        {
          hanzi: "我是昨天来的。",
          pinyin: "Wǒ shì zuótiān lái de.",
          vi: "Tôi đến vào hôm qua (nhấn mạnh thời điểm).",
          en: "It was yesterday that I came.",
          words: ["我", "是", "昨天", "来", "的"],
        },
      ],
    },
    vietnameseTrap:
      "Không dịch từng chữ 是 là “là” và 的 là “của”; cả khung câu làm nổi bật một chi tiết.",
    incorrect: "我是昨天来地。",
    corrected: "我是昨天来的。",
    why: "Trợ từ đóng khung 是…的 là 的, không phải 地.",
  },
  {
    seed: {
      id: "vn-ba",
      title: "Người Việt hay nhầm: câu 把",
      hsk: "4",
      pattern: "Chủ ngữ + 把 + tân ngữ xác định + động từ + kết quả/vị trí",
      explanation:
        "把 đưa đối tượng đã biết lên trước hành động và nhấn mạnh cách xử lý nó: 我把书放在桌子上了. Động từ thường có thành phần chỉ kết quả/vị trí, không chỉ đứng trơ một mình.",
      quiz: "我___书放在桌子上了。",
      answer: "把",
      options: ["把", "被", "比"],
      examples: [
        {
          hanzi: "我把书放在桌子上了。",
          pinyin: "Wǒ bǎ shū fàng zài zhuōzi shàng le.",
          vi: "Tôi đã đặt quyển sách lên bàn.",
          en: "I put the book on the table.",
          words: ["我", "把", "书", "放", "在", "桌子", "上", "了"],
        },
      ],
    },
    vietnameseTrap:
      "把 không phải một từ có thể dịch độc lập thành “cầm”. Hãy nhìn đối tượng, hành động và kết quả.",
    incorrect: "我把书放。",
    corrected: "我把书放在桌子上了。",
    why: "放 cần chỉ nơi đặt trong ngữ cảnh này; bổ sung 在桌子上 làm rõ cách xử lý sách.",
  },
  {
    seed: {
      id: "vn-bei",
      title: "Người Việt hay nhầm: câu 被",
      hsk: "4",
      pattern: "Đối tượng chịu tác động + 被 + tác nhân + hành động/kết quả",
      explanation:
        "我的自行车被别人骑走了: xe đạp của tôi bị người khác đi mất. 被 không phải lúc nào cũng mang nghĩa xấu; câu bị động cần ngữ cảnh và hành động rõ ràng.",
      quiz: "我的自行车___别人骑走了。",
      answer: "被",
      options: ["被", "把", "比"],
      examples: [
        {
          hanzi: "我的自行车被别人骑走了。",
          pinyin: "Wǒ de zìxíngchē bèi biérén qí zǒu le.",
          vi: "Xe đạp của tôi bị người khác đi mất.",
          en: "Someone rode my bicycle away.",
          words: ["我", "的", "自行车", "被", "别人", "骑走", "了"],
        },
      ],
    },
    vietnameseTrap:
      "“Bị” và “được” trong tiếng Việt không tự quyết định cấu trúc Trung. Đối tượng chịu tác động đứng đầu câu.",
    incorrect: "别人被我的自行车骑走了。",
    corrected: "我的自行车被别人骑走了。",
    why: "Xe đạp chịu tác động, người khác là tác nhân. Đảo hai vị trí làm sai ý.",
  },
  {
    seed: {
      id: "vn-direction",
      title: "Người Việt hay nhầm: bổ ngữ 来 / 去",
      hsk: "3",
      pattern: "Động từ + hướng + 来/去",
      explanation:
        "来 thường hướng về điểm nhìn/người nói; 去 thường rời xa điểm nhìn. 走进来 là đi vào về phía người đang ở trong; 走进去 là đi vào chỗ ở xa người nói.",
      quiz: "我在房间里，对门外的朋友说：“请进___。”",
      answer: "来",
      options: ["来", "了", "的"],
      examples: [
        {
          hanzi: "请进来。",
          pinyin: "Qǐng jìn lái.",
          vi: "Mời vào (về phía người nói).",
          en: "Please come in.",
          words: ["请", "进", "来"],
        },
      ],
    },
    vietnameseTrap:
      "“Vào/ra/lên/xuống” chưa đủ; phải xác định điểm nhìn để chọn 来 hay 去.",
    incorrect: "请来进。",
    corrected: "请进来。",
    why: "进 chỉ hướng vào đứng trước 来 chỉ hướng về phía người nói.",
  },
  {
    seed: {
      id: "vn-result",
      title: "Người Việt hay nhầm: bổ ngữ kết quả",
      hsk: "3",
      pattern: "Động từ + 完/好/懂/到…",
      explanation:
        "看 nói hành động xem/đọc; 看懂 nói hiểu được; 看完 nói đọc/xem xong. Kết quả không tự suy ra chỉ vì hành động đã bắt đầu.",
      quiz: "这本书我已经看___了，不用再看。",
      answer: "完",
      options: ["完", "得", "地"],
      examples: [
        {
          hanzi: "我看完这本书了。",
          pinyin: "Wǒ kàn wán zhè běn shū le.",
          vi: "Tôi đã đọc xong quyển sách này.",
          en: "I finished reading this book.",
          words: ["我", "看", "完", "这", "本", "书", "了"],
        },
      ],
    },
    vietnameseTrap:
      "Phân biệt “đọc rồi” với “đọc xong” và “đọc hiểu”. Kết quả phải có từ thể hiện tương ứng.",
    incorrect: "我完看这本书了。",
    corrected: "我看完这本书了。",
    why: "完 bổ sung kết quả cho 看 nên đứng sau động từ.",
  },
  {
    seed: {
      id: "vn-er-liang",
      title: "Người Việt hay nhầm: 二 / 两 và lượng từ",
      hsk: "1",
      pattern: "两 + lượng từ + danh từ; 二 trong đếm/số thứ tự",
      explanation:
        "Hai quyển sách là 两本书; hai người là 两个人. Đếm “một, hai, ba” dùng 一、二、三. “Thứ hai” là 第二. Lượng từ phụ thuộc danh từ: 本 cho sách, 杯 cho cốc đồ uống.",
      quiz: "我买了___本书。",
      answer: "两",
      options: ["两", "第二", "二十"],
      examples: [
        {
          hanzi: "我买了两本书。",
          pinyin: "Wǒ mǎi le liǎng běn shū.",
          vi: "Tôi đã mua hai quyển sách.",
          en: "I bought two books.",
          words: ["我", "买", "了", "两", "本", "书"],
        },
      ],
    },
    vietnameseTrap:
      "Tiếng Việt dùng “hai” ở nhiều vị trí; tiếng Trung cần xét số đếm, số thứ tự và lượng từ.",
    incorrect: "我买了两书。",
    corrected: "我买了两本书。",
    why: "Trong cụm đếm sách này cần lượng từ 本 giữa 两 và 书.",
  },
  {
    seed: {
      id: "vn-word-order",
      title: "Người Việt hay nhầm: vị trí nơi chốn",
      hsk: "1",
      pattern: "Chủ ngữ + 在 + nơi chốn + động từ + tân ngữ",
      explanation:
        "我在家学习: tôi học ở nhà. Với trạng ngữ nơi hành động diễn ra, 在家 đứng trước 学习. Với động từ chỉ đặt/di chuyển đến, địa điểm có thể đứng sau: 放在桌子上.",
      quiz: "我___家学习。",
      answer: "在",
      options: ["在", "是", "有"],
      examples: [
        {
          hanzi: "我在家学习。",
          pinyin: "Wǒ zài jiā xuéxí.",
          vi: "Tôi học ở nhà.",
          en: "I study at home.",
          words: ["我", "在", "家", "学习"],
        },
      ],
    },
    vietnameseTrap:
      "Không bê nguyên trật tự “học ở nhà” sang tiếng Trung. Phân biệt nơi diễn ra với nơi đến/kết quả.",
    incorrect: "我学习在家。",
    corrected: "我在家学习。",
    why: "在家 là nơi hành động 学习 diễn ra, đặt trước động từ trong câu trung tính này.",
  },
  {
    seed: {
      id: "vn-time-position",
      title: "Người Việt hay nhầm: thời gian và thời lượng",
      hsk: "2",
      pattern: "Thời điểm trước động từ; thời lượng thường sau động từ",
      explanation:
        "我昨天学习了两个小时: 昨天 là thời điểm, 两个小时 là thời lượng. Thời điểm có thể ở đầu câu hoặc sau chủ ngữ, thường không đặt sau tân ngữ như dịch từng chữ tiếng Việt.",
      quiz: "我___去学校。",
      answer: "明天",
      options: ["明天", "两天了", "的"],
      examples: [
        {
          hanzi: "我明天去学校。",
          pinyin: "Wǒ míngtiān qù xuéxiào.",
          vi: "Ngày mai tôi đến trường.",
          en: "I will go to school tomorrow.",
          words: ["我", "明天", "去", "学校"],
        },
      ],
    },
    vietnameseTrap:
      "“Ngày mai” chỉ thời điểm; “hai tiếng” chỉ độ dài. Hai loại không dùng cùng vị trí máy móc.",
    incorrect: "我去学校明天。",
    corrected: "我明天去学校。",
    why: "明天 chỉ lúc hành động xảy ra, đặt trước 去 trong câu này.",
  },
];
export const vietnameseContrasts: VietnameseContrast[] = entries.map(
  (entry) => ({ ...entry, sourceType: "CURATED", reviewStatus: "UNREVIEWED" }),
);
