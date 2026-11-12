/** Original, beginner-friendly practice content. These activities never write SRS progress. */
export type SceneId = 'cafe' | 'station' | 'market' | 'classroom';
export type SceneWord = {
  id: string; hanzi: string; pinyin: string; meaning: string; icon: string;
  x: number; y: number; sentence: string; sentencePinyin: string; translation: string; tokens: string[];
};
export type DialogueTurn = { prompt: string; pinyin: string; meaning: string; choices: string[]; answer: number; explanation: string };
export type PracticeScene = { id: SceneId; title: string; subtitle: string; mission: string; words: SceneWord[]; dialogue: DialogueTurn[] };

export const practiceScenes: PracticeScene[] = [
  {
    id: 'cafe', title: 'Quán cà phê', subtitle: 'Gọi món & trò chuyện', mission: 'Gọi đồ uống và thanh toán',
    words: [
      { id: 'coffee', hanzi: '咖啡', pinyin: 'kāfēi', meaning: 'cà phê', icon: 'cafe-outline', x: 17, y: 60, sentence: '我想喝一杯咖啡。', sentencePinyin: 'Wǒ xiǎng hē yì bēi kāfēi.', translation: 'Tôi muốn uống một cốc cà phê.', tokens: ['我', '想', '喝', '一杯', '咖啡'] },
      { id: 'tea', hanzi: '茶', pinyin: 'chá', meaning: 'trà', icon: 'leaf-outline', x: 41, y: 58, sentence: '请给我一杯茶。', sentencePinyin: 'Qǐng gěi wǒ yì bēi chá.', translation: 'Xin cho tôi một cốc trà.', tokens: ['请', '给', '我', '一杯', '茶'] },
      { id: 'menu', hanzi: '菜单', pinyin: 'càidān', meaning: 'thực đơn', icon: 'list-outline', x: 15, y: 23, sentence: '我可以看一下菜单吗？', sentencePinyin: 'Wǒ kěyǐ kàn yíxià càidān ma?', translation: 'Tôi có thể xem thực đơn một chút không?', tokens: ['我', '可以', '看一下', '菜单', '吗'] },
      { id: 'bread', hanzi: '面包', pinyin: 'miànbāo', meaning: 'bánh mì', icon: 'nutrition-outline', x: 65, y: 70, sentence: '这个面包很好吃。', sentencePinyin: 'Zhège miànbāo hěn hǎochī.', translation: 'Chiếc bánh mì này rất ngon.', tokens: ['这个', '面包', '很', '好吃'] },
      { id: 'money', hanzi: '钱', pinyin: 'qián', meaning: 'tiền', icon: 'cash-outline', x: 83, y: 43, sentence: '一共多少钱？', sentencePinyin: 'Yígòng duōshao qián?', translation: 'Tổng cộng bao nhiêu tiền?', tokens: ['一共', '多少', '钱'] },
    ],
    dialogue: [
      { prompt: '您好，您想喝点儿什么？', pinyin: 'Nín hǎo, nín xiǎng hē diǎnr shénme?', meaning: 'Xin chào, bạn muốn uống gì?', choices: ['我要一杯咖啡。', '我坐火车。', '这是我的书。'], answer: 0, explanation: '我要一杯咖啡：Tôi muốn một cốc cà phê. 一杯 là một cốc.' },
      { prompt: '您还要别的吗？', pinyin: 'Nín hái yào bié de ma?', meaning: 'Bạn có muốn thêm gì khác không?', choices: ['我去学校。', '再来一个面包。', '现在三点。'], answer: 1, explanation: '再来一个面包：Cho thêm một chiếc bánh mì. 再来 dùng khi gọi thêm món.' },
      { prompt: '一共二十五块钱。', pinyin: 'Yígòng èrshíwǔ kuài qián.', meaning: 'Tổng cộng 25 tệ.', choices: ['书在桌子上。', '天气很好。', '好的，谢谢。'], answer: 2, explanation: '好的，谢谢：Vâng, cảm ơn. 块 là cách nói thông dụng của đơn vị tiền 元.' },
    ],
  },
  {
    id: 'station', title: 'Nhà ga', subtitle: 'Mua vé & hỏi đường', mission: 'Mua vé tàu đi Bắc Kinh',
    words: [
      { id: 'train', hanzi: '火车', pinyin: 'huǒchē', meaning: 'tàu hỏa', icon: 'train-outline', x: 17, y: 56, sentence: '我们坐火车去北京。', sentencePinyin: 'Wǒmen zuò huǒchē qù Běijīng.', translation: 'Chúng tôi đi Bắc Kinh bằng tàu hỏa.', tokens: ['我们', '坐', '火车', '去', '北京'] },
      { id: 'ticket', hanzi: '车票', pinyin: 'chēpiào', meaning: 'vé xe, vé tàu', icon: 'ticket-outline', x: 47, y: 56, sentence: '我想买一张车票。', sentencePinyin: 'Wǒ xiǎng mǎi yì zhāng chēpiào.', translation: 'Tôi muốn mua một vé tàu.', tokens: ['我', '想', '买', '一张', '车票'] },
      { id: 'clock', hanzi: '时间', pinyin: 'shíjiān', meaning: 'thời gian', icon: 'time-outline', x: 19, y: 20, sentence: '我们还有时间。', sentencePinyin: 'Wǒmen hái yǒu shíjiān.', translation: 'Chúng ta vẫn còn thời gian.', tokens: ['我们', '还', '有', '时间'] },
      { id: 'luggage', hanzi: '行李', pinyin: 'xíngli', meaning: 'hành lý', icon: 'bag-handle-outline', x: 78, y: 72, sentence: '这是我的行李。', sentencePinyin: 'Zhè shì wǒ de xíngli.', translation: 'Đây là hành lý của tôi.', tokens: ['这', '是', '我的', '行李'] },
      { id: 'exit', hanzi: '出口', pinyin: 'chūkǒu', meaning: 'lối ra', icon: 'exit-outline', x: 79, y: 22, sentence: '出口在那边。', sentencePinyin: 'Chūkǒu zài nàbiān.', translation: 'Lối ra ở phía kia.', tokens: ['出口', '在', '那边'] },
    ],
    dialogue: [
      { prompt: '您要去哪里？', pinyin: 'Nín yào qù nǎlǐ?', meaning: 'Bạn muốn đi đâu?', choices: ['我喜欢喝茶。', '我要去北京。', '我有一本书。'], answer: 1, explanation: '我要去北京：Tôi muốn đi Bắc Kinh. 去 + địa điểm diễn tả đi đến đâu.' },
      { prompt: '您要买几张票？', pinyin: 'Nín yào mǎi jǐ zhāng piào?', meaning: 'Bạn muốn mua mấy vé?', choices: ['一张，谢谢。', '今天很热。', '我喝咖啡。'], answer: 0, explanation: '一张，谢谢：Một vé, cảm ơn. 张 là lượng từ cho vé và các vật dạng tờ.' },
      { prompt: '火车十点出发。', pinyin: 'Huǒchē shí diǎn chūfā.', meaning: 'Tàu khởi hành lúc 10 giờ.', choices: ['这个苹果很甜。', '她是老师。', '好的，我知道了。'], answer: 2, explanation: '好的，我知道了：Vâng, tôi biết rồi. 出发 có nghĩa là khởi hành.' },
    ],
  },
  {
    id: 'market', title: 'Chợ trái cây', subtitle: 'Chọn mua & hỏi giá', mission: 'Mua trái cây cho một ngày mới',
    words: [
      { id: 'apple', hanzi: '苹果', pinyin: 'píngguǒ', meaning: 'táo', icon: 'nutrition-outline', x: 17, y: 54, sentence: '我想买两个苹果。', sentencePinyin: 'Wǒ xiǎng mǎi liǎng ge píngguǒ.', translation: 'Tôi muốn mua hai quả táo.', tokens: ['我', '想', '买', '两个', '苹果'] },
      { id: 'banana', hanzi: '香蕉', pinyin: 'xiāngjiāo', meaning: 'chuối', icon: 'moon-outline', x: 43, y: 56, sentence: '这些香蕉很新鲜。', sentencePinyin: 'Zhèxiē xiāngjiāo hěn xīnxiān.', translation: 'Những quả chuối này rất tươi.', tokens: ['这些', '香蕉', '很', '新鲜'] },
      { id: 'watermelon', hanzi: '西瓜', pinyin: 'xīguā', meaning: 'dưa hấu', icon: 'ellipse-outline', x: 68, y: 57, sentence: '这个西瓜很甜。', sentencePinyin: 'Zhège xīguā hěn tián.', translation: 'Quả dưa hấu này rất ngọt.', tokens: ['这个', '西瓜', '很', '甜'] },
      { id: 'bag', hanzi: '袋子', pinyin: 'dàizi', meaning: 'túi', icon: 'bag-outline', x: 84, y: 28, sentence: '请给我一个袋子。', sentencePinyin: 'Qǐng gěi wǒ yí ge dàizi.', translation: 'Xin cho tôi một chiếc túi.', tokens: ['请', '给', '我', '一个', '袋子'] },
      { id: 'price', hanzi: '价格', pinyin: 'jiàgé', meaning: 'giá cả', icon: 'pricetag-outline', x: 21, y: 21, sentence: '这个价格很合适。', sentencePinyin: 'Zhège jiàgé hěn héshì.', translation: 'Mức giá này rất phù hợp.', tokens: ['这个', '价格', '很', '合适'] },
    ],
    dialogue: [
      { prompt: '您想买什么水果？', pinyin: 'Nín xiǎng mǎi shénme shuǐguǒ?', meaning: 'Bạn muốn mua trái cây gì?', choices: ['我想买苹果。', '这是火车站。', '我在看书。'], answer: 0, explanation: '我想买苹果：Tôi muốn mua táo. 想买 + món hàng diễn tả ý muốn mua.' },
      { prompt: '这些苹果很甜。您要几个？', pinyin: 'Zhèxiē píngguǒ hěn tián. Nín yào jǐ ge?', meaning: 'Táo này rất ngọt. Bạn muốn mấy quả?', choices: ['下午三点。', '我要两个。', '他是老师。'], answer: 1, explanation: '我要两个：Tôi muốn hai quả. Dùng 两 trước lượng từ 个.' },
      { prompt: '需要袋子吗？', pinyin: 'Xūyào dàizi ma?', meaning: 'Bạn có cần túi không?', choices: ['我坐火车。', '这是我的手机。', '需要，谢谢。'], answer: 2, explanation: '需要，谢谢：Có cần, cảm ơn. 需要 có nghĩa là cần.' },
    ],
  },
  {
    id: 'classroom', title: 'Lớp học', subtitle: 'Đồ dùng & giao tiếp', mission: 'Làm quen với một người bạn mới',
    words: [
      { id: 'book', hanzi: '书', pinyin: 'shū', meaning: 'sách', icon: 'book-outline', x: 17, y: 62, sentence: '我在看书。', sentencePinyin: 'Wǒ zài kàn shū.', translation: 'Tôi đang đọc sách.', tokens: ['我', '在', '看', '书'] },
      { id: 'pen', hanzi: '笔', pinyin: 'bǐ', meaning: 'bút', icon: 'pencil-outline', x: 43, y: 68, sentence: '我有一支笔。', sentencePinyin: 'Wǒ yǒu yì zhī bǐ.', translation: 'Tôi có một cây bút.', tokens: ['我', '有', '一支', '笔'] },
      { id: 'desk', hanzi: '桌子', pinyin: 'zhuōzi', meaning: 'bàn', icon: 'file-tray-outline', x: 69, y: 64, sentence: '书在桌子上。', sentencePinyin: 'Shū zài zhuōzi shàng.', translation: 'Sách ở trên bàn.', tokens: ['书', '在', '桌子', '上'] },
      { id: 'teacher', hanzi: '老师', pinyin: 'lǎoshī', meaning: 'giáo viên', icon: 'person-outline', x: 82, y: 25, sentence: '她是我们的老师。', sentencePinyin: 'Tā shì wǒmen de lǎoshī.', translation: 'Cô ấy là giáo viên của chúng tôi.', tokens: ['她', '是', '我们的', '老师'] },
      { id: 'chinese', hanzi: '中文', pinyin: 'Zhōngwén', meaning: 'tiếng Trung', icon: 'language-outline', x: 24, y: 23, sentence: '我们一起学中文。', sentencePinyin: 'Wǒmen yìqǐ xué Zhōngwén.', translation: 'Chúng ta cùng học tiếng Trung.', tokens: ['我们', '一起', '学', '中文'] },
    ],
    dialogue: [
      { prompt: '你好，你叫什么名字？', pinyin: 'Nǐ hǎo, nǐ jiào shénme míngzi?', meaning: 'Chào bạn, bạn tên là gì?', choices: ['我喝一杯茶。', '我叫小明。', '现在十点。'], answer: 1, explanation: '我叫小明：Tôi tên là Tiểu Minh. 叫 + tên là cách giới thiệu tên.' },
      { prompt: '你也学中文吗？', pinyin: 'Nǐ yě xué Zhōngwén ma?', meaning: 'Bạn cũng học tiếng Trung à?', choices: ['对，我也学中文。', '苹果很甜。', '出口在那边。'], answer: 0, explanation: '对，我也学中文：Đúng, tôi cũng học tiếng Trung. 也 đứng trước động từ.' },
      { prompt: '我们一起练习吧！', pinyin: 'Wǒmen yìqǐ liànxí ba!', meaning: 'Chúng ta cùng luyện tập nhé!', choices: ['这张票很贵。', '我不喝咖啡。', '好啊！'], answer: 2, explanation: '好啊：Được chứ! 吧 ở cuối câu gợi ý cùng làm một việc.' },
    ],
  },
];

export const sentenceRepairs = [
  { wrong: '我很喜欢喝书。', correct: '我很喜欢看书。', choices: ['喝 → 看', '我 → 你', '很 → 也'], answer: 0, explanation: '看书 là đọc sách. 喝 dùng cho đồ uống, như 喝茶 hoặc 喝咖啡.' },
  { wrong: '我有二个苹果。', correct: '我有两个苹果。', choices: ['有 → 是', '二 → 两', '苹果 → 茶'], answer: 1, explanation: 'Trước lượng từ 个, dùng 两 để nói hai đơn vị: 两个苹果.' },
  { wrong: '我想买一杯车票。', correct: '我想买一张车票。', choices: ['我 → 他', '买 → 看', '杯 → 张'], answer: 2, explanation: 'Vé dùng lượng từ 张. 杯 dùng cho đồ uống đựng trong cốc.' },
  { wrong: '我是看书。', correct: '我在看书。', choices: ['是 → 在', '我 → 我们', '书 → 笔'], answer: 0, explanation: '在 + động từ diễn tả hành động đang diễn ra: 我在看书.' },
  { wrong: '这我的书是。', correct: '这是我的书。', choices: ['Bỏ 我的', 'Đưa 是 ra sau 这', 'Thêm 很 trước 书'], answer: 1, explanation: 'Câu phán đoán có trật tự A + 是 + B: 这 + 是 + 我的书.' },
  { wrong: '我想喝一张茶。', correct: '我想喝一杯茶。', choices: ['想 → 在', '喝 → 买', '张 → 杯'], answer: 2, explanation: 'Một cốc trà là 一杯茶; 张 dùng cho vật dạng tờ như vé, giấy.' },
  { wrong: '我中文也学。', correct: '我也学中文。', choices: ['Đưa 中文 ra sau 学', 'Đổi 学 thành 喝', 'Bỏ 也 và 学'], answer: 0, explanation: '也 đứng trước động từ; tân ngữ 中文 đứng sau 学: 我 + 也 + 学 + 中文.' },
  { wrong: '书在桌子是。', correct: '书在桌子上。', choices: ['书 → 笔', '是 → 上', '在 → 有'], answer: 1, explanation: '在 + địa điểm + từ chỉ phương vị: 在桌子上 là ở trên bàn.' },
];

export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function sentenceMatches(tokens: readonly string[], word: SceneWord): boolean {
  return tokens.join('') === word.tokens.join('');
}
