import type { SceneId } from './interactive-content';

import { characterStructure } from '@/services/memory/character-content';

/** Original offline practice. No repository, progress, account or persistence dependency. */
export type StudyLine = { chinese: string; pinyin: string; meaning: string };
export type SceneMission = StudyLine & { item: string; place: 0 | 1; explanation: string };
export const sceneMissions: Record<SceneId, { places: [string, string]; tasks: SceneMission[] }> = {
  cafe: { places: ['Bàn khách · 客人的桌子', 'Quầy · 柜台'], tasks: [
    { chinese: '请把茶放在客人的桌子上。', pinyin: 'Qǐng bǎ chá fàng zài kèrén de zhuōzi shàng.', meaning: 'Hãy đặt trà lên bàn của khách.', item: 'tea', place: 0, explanation: '把茶放在……上: đặt trà lên… Chú ý cả đồ vật lẫn nơi nhận.' },
    { chinese: '请把菜单放在柜台上。', pinyin: 'Qǐng bǎ càidān fàng zài guìtái shàng.', meaning: 'Hãy đặt thực đơn lên quầy.', item: 'menu', place: 1, explanation: '菜单 là thực đơn; 柜台 là quầy.' },
    { chinese: '请把面包放在客人的桌子上。', pinyin: 'Qǐng bǎ miànbāo fàng zài kèrén de zhuōzi shàng.', meaning: 'Hãy đặt bánh mì lên bàn của khách.', item: 'bread', place: 0, explanation: '面包 là bánh mì. 放在……上 chỉ vị trí đặt đồ.' },
  ] },
  station: { places: ['Hành khách · 乘客', 'Bàn trợ giúp · 服务台'], tasks: [
    { chinese: '请把车票交给这位乘客。', pinyin: 'Qǐng bǎ chēpiào jiāo gěi zhè wèi chéngkè.', meaning: 'Hãy đưa vé tàu cho hành khách này.', item: 'ticket', place: 0, explanation: '车票 là vé tàu; 交给 là giao cho ai.' },
    { chinese: '请把行李送到服务台。', pinyin: 'Qǐng bǎ xíngli sòng dào fúwùtái.', meaning: 'Hãy mang hành lý đến bàn trợ giúp.', item: 'luggage', place: 1, explanation: '行李 là hành lý. 送到…… nghĩa là mang đến…' },
    { chinese: '请把车票放在服务台上。', pinyin: 'Qǐng bǎ chēpiào fàng zài fúwùtái shàng.', meaning: 'Hãy đặt vé tàu lên bàn trợ giúp.', item: 'ticket', place: 1, explanation: 'Vẫn là 车票, nhưng lần này nơi nhận là 服务台, không phải hành khách.' },
  ] },
  market: { places: ['Túi khách · 客人的袋子', 'Kệ hàng · 货架'], tasks: [
    { chinese: '请把苹果放进客人的袋子里。', pinyin: 'Qǐng bǎ píngguǒ fàng jìn kèrén de dàizi lǐ.', meaning: 'Hãy cho táo vào túi của khách.', item: 'apple', place: 0, explanation: '放进……里: cho vào bên trong. 苹果 là táo.' },
    { chinese: '请把香蕉放在货架上。', pinyin: 'Qǐng bǎ xiāngjiāo fàng zài huòjià shàng.', meaning: 'Hãy đặt chuối lên kệ hàng.', item: 'banana', place: 1, explanation: '香蕉 là chuối; 货架 là kệ hàng.' },
    { chinese: '请把西瓜放进客人的袋子里。', pinyin: 'Qǐng bǎ xīguā fàng jìn kèrén de dàizi lǐ.', meaning: 'Hãy cho dưa hấu vào túi của khách.', item: 'watermelon', place: 0, explanation: '西瓜 là dưa hấu. 客人的袋子 là túi của khách.' },
  ] },
  classroom: { places: ['Bàn giáo viên · 老师的桌子', 'Bàn của bạn · 你的桌子'], tasks: [
    { chinese: '请把书放在老师的桌子上。', pinyin: 'Qǐng bǎ shū fàng zài lǎoshī de zhuōzi shàng.', meaning: 'Hãy đặt sách lên bàn giáo viên.', item: 'book', place: 0, explanation: '老师的桌子 là bàn giáo viên. 的 biểu thị quan hệ sở hữu.' },
    { chinese: '请把笔放在你的桌子上。', pinyin: 'Qǐng bǎ bǐ fàng zài nǐ de zhuōzi shàng.', meaning: 'Hãy đặt bút lên bàn của bạn.', item: 'pen', place: 1, explanation: '笔 là bút. 你的桌子 là bàn của bạn.' },
    { chinese: '请把书放在你的桌子上。', pinyin: 'Qǐng bǎ shū fàng zài nǐ de zhuōzi shàng.', meaning: 'Hãy đặt sách lên bàn của bạn.', item: 'book', place: 1, explanation: 'Lần này sách cần được đặt trên bàn của bạn, không phải bàn giáo viên.' },
  ] },
};

export type StoryChoice = StudyLine & { next: string };
export type StoryNode = StudyLine & { choices?: StoryChoice[]; ending?: string; takeaway?: string };
export type ChoiceStory = { id: SceneId; title: string; subtitle: string; start: string; nodes: Record<string, StoryNode> };
export const choiceStories: ChoiceStory[] = [
  { id: 'cafe', title: 'Một buổi chiều ở quán', subtitle: 'Chọn đồ uống, chọn cách tận hưởng', start: 'start', nodes: {
    start: { chinese: '欢迎！您想喝什么？', pinyin: 'Huānyíng! Nín xiǎng hē shénme?', meaning: 'Chào mừng! Bạn muốn uống gì?', choices: [
      { chinese: '我想喝茶。', pinyin: 'Wǒ xiǎng hē chá.', meaning: 'Tôi muốn uống trà.', next: 'tea' },
      { chinese: '我要一杯咖啡。', pinyin: 'Wǒ yào yì bēi kāfēi.', meaning: 'Tôi muốn một cốc cà phê.', next: 'coffee' },
    ] },
    tea: { chinese: '好的。您在这里喝，还是带走？', pinyin: 'Hǎo de. Nín zài zhèlǐ hē, háishi dàizǒu?', meaning: 'Vâng. Bạn uống tại đây hay mang đi?', choices: [
      { chinese: '在这里喝。我想看书。', pinyin: 'Zài zhèlǐ hē. Wǒ xiǎng kàn shū.', meaning: 'Uống tại đây. Tôi muốn đọc sách.', next: 'tea-stay' },
      { chinese: '带走，谢谢。', pinyin: 'Dàizǒu, xièxie.', meaning: 'Mang đi, cảm ơn.', next: 'tea-go' },
    ] },
    coffee: { chinese: '咖啡好了。您还要什么？', pinyin: 'Kāfēi hǎo le. Nín hái yào shénme?', meaning: 'Cà phê xong rồi. Bạn muốn thêm gì?', choices: [
      { chinese: '再来一个面包。', pinyin: 'Zài lái yí ge miànbāo.', meaning: 'Cho thêm một chiếc bánh mì.', next: 'coffee-bread' },
      { chinese: '不用了，谢谢。', pinyin: 'Bú yòng le, xièxie.', meaning: 'Không cần nữa, cảm ơn.', next: 'coffee-only' },
    ] },
    'tea-stay': { chinese: '窗边很安静，您可以坐那里。', pinyin: 'Chuāngbiān hěn ānjìng, nín kěyǐ zuò nàlǐ.', meaning: 'Bên cửa sổ rất yên tĩnh, bạn có thể ngồi ở đó.', ending: 'Góc đọc sách bên cửa sổ', takeaway: '在这里喝: uống tại đây. 想 + động từ: muốn làm gì.' },
    'tea-go': { chinese: '这是您的茶，路上小心！', pinyin: 'Zhè shì nín de chá, lùshang xiǎoxīn!', meaning: 'Đây là trà của bạn, đi đường cẩn thận nhé!', ending: 'Một cốc trà mang theo', takeaway: '带走: mang đi. 谢谢 là cách cảm ơn ngắn gọn, tự nhiên.' },
    'coffee-bread': { chinese: '这是咖啡和面包，请慢用！', pinyin: 'Zhè shì kāfēi hé miànbāo, qǐng màn yòng!', meaning: 'Đây là cà phê và bánh mì, mời bạn dùng!', ending: 'Bữa xế vừa ý', takeaway: '再来 + số lượng + món: gọi thêm món. 请慢用 là lời mời dùng món lịch sự.' },
    'coffee-only': { chinese: '好的，祝您有愉快的一天！', pinyin: 'Hǎo de, zhù nín yǒu yúkuài de yì tiān!', meaning: 'Vâng, chúc bạn một ngày vui vẻ!', ending: 'Chỉ một cốc cà phê', takeaway: '不用了，谢谢: từ chối một lời mời một cách lịch sự.' },
  } },
  { id: 'station', title: 'Chuyến tàu của bạn', subtitle: 'Chọn điểm đến và kế hoạch hành trình', start: 'start', nodes: {
    start: { chinese: '您好，您要去哪里？', pinyin: 'Nín hǎo, nín yào qù nǎlǐ?', meaning: 'Xin chào, bạn muốn đi đâu?', choices: [
      { chinese: '我要去北京。', pinyin: 'Wǒ yào qù Běijīng.', meaning: 'Tôi muốn đi Bắc Kinh.', next: 'beijing' },
      { chinese: '我要去上海。', pinyin: 'Wǒ yào qù Shànghǎi.', meaning: 'Tôi muốn đi Thượng Hải.', next: 'shanghai' },
    ] },
    beijing: { chinese: '您想上午出发，还是下午出发？', pinyin: 'Nín xiǎng shàngwǔ chūfā, háishi xiàwǔ chūfā?', meaning: 'Bạn muốn khởi hành buổi sáng hay buổi chiều?', choices: [
      { chinese: '上午出发。', pinyin: 'Shàngwǔ chūfā.', meaning: 'Khởi hành buổi sáng.', next: 'beijing-am' },
      { chinese: '下午出发。', pinyin: 'Xiàwǔ chūfā.', meaning: 'Khởi hành buổi chiều.', next: 'beijing-pm' },
    ] },
    shanghai: { chinese: '您要买几张票？', pinyin: 'Nín yào mǎi jǐ zhāng piào?', meaning: 'Bạn muốn mua mấy vé?', choices: [
      { chinese: '一张，我一个人去。', pinyin: 'Yì zhāng, wǒ yí ge rén qù.', meaning: 'Một vé, tôi đi một mình.', next: 'shanghai-one' },
      { chinese: '两张，我和朋友一起去。', pinyin: 'Liǎng zhāng, wǒ hé péngyou yìqǐ qù.', meaning: 'Hai vé, tôi đi cùng bạn.', next: 'shanghai-two' },
    ] },
    'beijing-am': { chinese: '这是上午的车票。祝您旅途愉快！', pinyin: 'Zhè shì shàngwǔ de chēpiào. Zhù nín lǚtú yúkuài!', meaning: 'Đây là vé tàu buổi sáng. Chúc bạn đi đường vui vẻ!', ending: 'Buổi sáng hướng về Bắc Kinh', takeaway: '上午 / 下午: buổi sáng / buổi chiều. 出发: khởi hành.' },
    'beijing-pm': { chinese: '这是下午的车票。您还有时间吃午饭。', pinyin: 'Zhè shì xiàwǔ de chēpiào. Nín hái yǒu shíjiān chī wǔfàn.', meaning: 'Đây là vé tàu buổi chiều. Bạn vẫn còn thời gian ăn trưa.', ending: 'Ăn trưa rồi lên đường', takeaway: '还有时间 + động từ: vẫn còn thời gian làm gì.' },
    'shanghai-one': { chinese: '一张去上海的车票，请收好。', pinyin: 'Yì zhāng qù Shànghǎi de chēpiào, qǐng shōu hǎo.', meaning: 'Một vé đi Thượng Hải, bạn hãy giữ cẩn thận.', ending: 'Chuyến đi một mình', takeaway: '一张车票: một vé tàu. 一个人: một mình.' },
    'shanghai-two': { chinese: '这是两张车票，您和朋友可以坐在一起。', pinyin: 'Zhè shì liǎng zhāng chēpiào, nín hé péngyou kěyǐ zuò zài yìqǐ.', meaning: 'Đây là hai vé, bạn và người bạn có thể ngồi cùng nhau.', ending: 'Cùng bạn đến Thượng Hải', takeaway: '两张: hai tờ/vé. 和……一起: cùng với…' },
  } },
  { id: 'market', title: 'Giỏ trái cây cuối tuần', subtitle: 'Mua cho mình hoặc mang tặng', start: 'start', nodes: {
    start: { chinese: '今天的水果很新鲜，您想买什么？', pinyin: 'Jīntiān de shuǐguǒ hěn xīnxiān, nín xiǎng mǎi shénme?', meaning: 'Trái cây hôm nay rất tươi, bạn muốn mua gì?', choices: [
      { chinese: '我想买苹果。', pinyin: 'Wǒ xiǎng mǎi píngguǒ.', meaning: 'Tôi muốn mua táo.', next: 'apples' },
      { chinese: '我想买香蕉。', pinyin: 'Wǒ xiǎng mǎi xiāngjiāo.', meaning: 'Tôi muốn mua chuối.', next: 'bananas' },
    ] },
    apples: { chinese: '您自己吃，还是送给朋友？', pinyin: 'Nín zìjǐ chī, háishi sòng gěi péngyou?', meaning: 'Bạn tự ăn hay tặng bạn bè?', choices: [
      { chinese: '自己吃，要两个。', pinyin: 'Zìjǐ chī, yào liǎng ge.', meaning: 'Tự ăn, lấy hai quả.', next: 'apple-self' },
      { chinese: '送给朋友，要六个。', pinyin: 'Sòng gěi péngyou, yào liù ge.', meaning: 'Tặng bạn, lấy sáu quả.', next: 'apple-gift' },
    ] },
    bananas: { chinese: '需要袋子吗？', pinyin: 'Xūyào dàizi ma?', meaning: 'Bạn có cần túi không?', choices: [
      { chinese: '需要，谢谢。', pinyin: 'Xūyào, xièxie.', meaning: 'Có cần, cảm ơn.', next: 'banana-bag' },
      { chinese: '不用，我有袋子。', pinyin: 'Bú yòng, wǒ yǒu dàizi.', meaning: 'Không cần, tôi có túi.', next: 'banana-own' },
    ] },
    'apple-self': { chinese: '两个苹果，给您。祝您周末愉快！', pinyin: 'Liǎng ge píngguǒ, gěi nín. Zhù nín zhōumò yúkuài!', meaning: 'Hai quả táo của bạn đây. Chúc bạn cuối tuần vui vẻ!', ending: 'Vừa đủ cho hôm nay', takeaway: '两个苹果: hai quả táo. Trước lượng từ 个, dùng 两.' },
    'apple-gift': { chinese: '六个苹果装好了，希望您的朋友喜欢！', pinyin: 'Liù ge píngguǒ zhuāng hǎo le, xīwàng nín de péngyou xǐhuan!', meaning: 'Sáu quả táo đã gói xong, mong người bạn của bạn sẽ thích!', ending: 'Một món quà ngọt ngào', takeaway: '送给 + người nhận: tặng cho ai. 自己: bản thân, tự mình.' },
    'banana-bag': { chinese: '香蕉在袋子里，请拿好。', pinyin: 'Xiāngjiāo zài dàizi lǐ, qǐng ná hǎo.', meaning: 'Chuối ở trong túi, bạn cầm cẩn thận nhé.', ending: 'Một túi chuối mang về', takeaway: '在……里: ở trong… 需要: cần.' },
    'banana-own': { chinese: '好的，放进您的袋子里吧。', pinyin: 'Hǎo de, fàng jìn nín de dàizi lǐ ba.', meaning: 'Vâng, hãy cho vào túi của bạn nhé.', ending: 'Chiếc túi dùng lại', takeaway: '我有……: tôi có… 不用: không cần.' },
  } },
  { id: 'classroom', title: 'Người bạn cùng lớp', subtitle: 'Làm quen rồi chọn hoạt động chung', start: 'start', nodes: {
    start: { chinese: '你好！下课后你想做什么？', pinyin: 'Nǐ hǎo! Xiàkè hòu nǐ xiǎng zuò shénme?', meaning: 'Chào bạn! Sau giờ học bạn muốn làm gì?', choices: [
      { chinese: '我想练习中文。', pinyin: 'Wǒ xiǎng liànxí Zhōngwén.', meaning: 'Tôi muốn luyện tiếng Trung.', next: 'practice' },
      { chinese: '我想去图书馆。', pinyin: 'Wǒ xiǎng qù túshūguǎn.', meaning: 'Tôi muốn đến thư viện.', next: 'library' },
    ] },
    practice: { chinese: '好啊！我们练习什么？', pinyin: 'Hǎo a! Wǒmen liànxí shénme?', meaning: 'Được chứ! Chúng ta luyện gì?', choices: [
      { chinese: '练习点菜吧。', pinyin: 'Liànxí diǎn cài ba.', meaning: 'Luyện gọi món nhé.', next: 'order' },
      { chinese: '练习介绍自己吧。', pinyin: 'Liànxí jièshào zìjǐ ba.', meaning: 'Luyện giới thiệu bản thân nhé.', next: 'introduce' },
    ] },
    library: { chinese: '我也想去。我们现在去吗？', pinyin: 'Wǒ yě xiǎng qù. Wǒmen xiànzài qù ma?', meaning: 'Tôi cũng muốn đi. Chúng ta đi bây giờ chứ?', choices: [
      { chinese: '好，现在去。', pinyin: 'Hǎo, xiànzài qù.', meaning: 'Được, đi bây giờ.', next: 'now' },
      { chinese: '等十分钟，好吗？', pinyin: 'Děng shí fēnzhōng, hǎo ma?', meaning: 'Đợi mười phút, được không?', next: 'later' },
    ] },
    order: { chinese: '你当客人，我当服务员。开始吧！', pinyin: 'Nǐ dāng kèrén, wǒ dāng fúwùyuán. Kāishǐ ba!', meaning: 'Bạn làm khách, tôi làm phục vụ. Bắt đầu nhé!', ending: 'Quán ăn trong lớp học', takeaway: '……吧: gợi ý cùng làm gì. 当 + vai trò: đóng vai/làm…' },
    introduce: { chinese: '我先说：我叫小雨，很高兴认识你！', pinyin: 'Wǒ xiān shuō: wǒ jiào Xiǎoyǔ, hěn gāoxìng rènshi nǐ!', meaning: 'Tôi nói trước: Tôi tên Tiểu Vũ, rất vui được làm quen với bạn!', ending: 'Lời chào mở đầu tình bạn', takeaway: '我叫……: tôi tên là… 很高兴认识你: rất vui được làm quen.' },
    now: { chinese: '走吧！图书馆就在前面。', pinyin: 'Zǒu ba! Túshūguǎn jiù zài qiánmian.', meaning: 'Đi thôi! Thư viện ở ngay phía trước.', ending: 'Cùng nhau đến thư viện', takeaway: '也 đứng trước động từ. 就在前面: ở ngay phía trước.' },
    later: { chinese: '没问题，十分钟后见！', pinyin: 'Méi wèntí, shí fēnzhōng hòu jiàn!', meaning: 'Không vấn đề gì, mười phút nữa gặp nhé!', ending: 'Một cuộc hẹn sau giờ học', takeaway: 'Khoảng thời gian + 后: sau bao lâu. 十分钟后: sau mười phút.' },
  } },
];

/** Use only the curated decomposition inventory, never guessed split glyphs. */
export const assemblyCharacters = [
  ['休', 'nghỉ ngơi', 'Nhìn người 亻 bên cây 木 để tự nhắc mình nghỉ một chút.'],
  ['明', 'sáng; rõ', 'Tưởng tượng hai nguồn sáng 日 và 月 để gợi nhớ chữ 明.'],
  ['林', 'rừng, nhiều cây', 'Hai phần 木 giống nhau, mỗi phần chiếm một vị trí.'],
  ['妈', 'mẹ', '女 gợi nghĩa liên quan nữ giới; 马 gợi âm, không mang nghĩa “ngựa” trong từ này.'],
  ['河', 'sông', '氵 gợi nước; 可 gợi âm. Đừng ghép nghĩa từng phần thành một định nghĩa.'],
  ['晴', 'trời quang', '日 gợi trời nắng; 青 là phần gợi âm.'],
  ['请', 'mời; xin', '讠 gợi lời nói; 青 là phần gợi âm.'],
  ['字', 'chữ', 'Gắn hình ảnh mái 宀 ở trên và 子 ở dưới với một tấm thẻ chữ.'],
  ['安', 'yên; an toàn', 'Nhớ vị trí: 宀 bên trên, 女 bên dưới.'],
  ['男', 'nam', 'Nhớ vị trí 田 ở trên và 力 ở dưới.'],
  ['问', 'hỏi', 'Dùng hình ảnh 口 bên trong 门 làm móc nhớ.'],
  ['国', 'nước; quốc gia', 'Phân biệt khung 囗 bao ngoài và 玉 ở trong; 囗 không phải 口.'],
].map(([character, clue, note]) => ({ character: character!, clue: clue!, note: note!, structure: characterStructure(character!)! }));

export type ReadingRow = StudyLine & { id: string; label?: string };
export type ReadingQuestion = { prompt: string; choices: string[]; answer: number; evidence: string[]; explanation: string };
export type ReadingDocument = { id: string; scene: SceneId; title: string; chineseTitle: string; subtitle: string; rows: ReadingRow[]; questions: ReadingQuestion[] };
export const readingDocuments: ReadingDocument[] = [
  { id: 'menu', scene: 'cafe', title: 'Đọc thực đơn', chineseTitle: '小林咖啡馆', subtitle: 'Chọn món và tính tiền', rows: [
    { id: 'hours', chinese: '营业时间：08:00—20:00', pinyin: 'Yíngyè shíjiān', meaning: 'Giờ mở cửa: 08:00–20:00' },
    { id: 'coffee', label: '01', chinese: '咖啡　18元 / 杯', pinyin: 'Kāfēi · shíbā yuán / bēi', meaning: 'Cà phê: 18 tệ/cốc' },
    { id: 'tea', label: '02', chinese: '茶　12元 / 杯', pinyin: 'Chá · shí’èr yuán / bēi', meaning: 'Trà: 12 tệ/cốc' },
    { id: 'bread', label: '03', chinese: '面包　8元 / 个', pinyin: 'Miànbāo · bā yuán / ge', meaning: 'Bánh mì: 8 tệ/chiếc' },
    { id: 'offer', chinese: '热茶、热咖啡，店内享用或打包。', pinyin: 'Rè chá, rè kāfēi, diàn nèi xiǎngyòng huò dǎbāo.', meaning: 'Trà nóng, cà phê nóng; dùng tại quán hoặc mang đi.' },
  ], questions: [
    { prompt: 'Một cốc trà giá bao nhiêu?', choices: ['8 tệ', '12 tệ', '18 tệ'], answer: 1, evidence: ['tea'], explanation: '茶　12元 / 杯: trà 12 tệ mỗi cốc.' },
    { prompt: 'Quán đóng cửa lúc mấy giờ?', choices: ['08:00', '18:00', '20:00'], answer: 2, evidence: ['hours'], explanation: '营业时间 ghi 08:00—20:00, nên quán đóng lúc 20:00.' },
    { prompt: 'Một cốc cà phê và một chiếc bánh mì hết bao nhiêu?', choices: ['26 tệ', '20 tệ', '30 tệ'], answer: 0, evidence: ['coffee', 'bread'], explanation: 'Cà phê 18 tệ + bánh mì 8 tệ = 26 tệ.' },
    { prompt: 'Có thể mang đồ uống đi không?', choices: ['Chỉ được dùng tại quán', 'Chỉ mang đi sau 20:00', 'Có, có thể đóng gói mang đi'], answer: 2, evidence: ['offer'], explanation: '打包 là đóng gói mang đi; 或 là hoặc.' },
  ] },
  { id: 'ticket', scene: 'station', title: 'Đọc vé tàu', chineseTitle: '模拟车票 · G102', subtitle: 'Tìm đúng ga, giờ và chỗ ngồi', rows: [
    { id: 'route', chinese: '北京南 → 上海虹桥', pinyin: 'Běijīng Nán → Shànghǎi Hóngqiáo', meaning: 'Bắc Kinh Nam → Thượng Hải Hồng Kiều' },
    { id: 'date', chinese: '乘车日期：2026年11月8日', pinyin: 'Chéngchē rìqī', meaning: 'Ngày đi: 08/11/2026' },
    { id: 'time', chinese: '开车时间：09:20', pinyin: 'Kāichē shíjiān · jiǔ diǎn èrshí fēn', meaning: 'Giờ khởi hành: 09:20' },
    { id: 'seat', chinese: '座位：02车 08A号', pinyin: 'Zuòwèi · líng èr chē, líng bā A hào', meaning: 'Chỗ ngồi: toa 02, ghế 08A' },
    { id: 'gate', chinese: '检票口：05', pinyin: 'Jiǎnpiàokǒu · líng wǔ', meaning: 'Cửa kiểm vé: 05' },
  ], questions: [
    { prompt: 'Bạn lên tàu tại ga nào?', choices: ['Bắc Kinh Nam', 'Thượng Hải Hồng Kiều', 'Không ghi trên vé'], answer: 0, evidence: ['route'], explanation: 'Ga trước mũi tên là ga đi: 北京南. Đây là vé giả lập để luyện đọc.' },
    { prompt: 'Tàu khởi hành lúc mấy giờ?', choices: ['08:00', '09:20', '20:09'], answer: 1, evidence: ['time'], explanation: '开车时间：09:20 là giờ tàu khởi hành.' },
    { prompt: 'Cửa kiểm vé của bạn là số mấy?', choices: ['02', '08', '05'], answer: 2, evidence: ['gate'], explanation: '检票口：05. Đừng nhầm với số toa hoặc số ghế.' },
    { prompt: 'Ghế ngồi nào đúng với vé?', choices: ['Toa 08, ghế 02A', 'Toa 02, ghế 08A', 'Toa 05, ghế 08A'], answer: 1, evidence: ['seat'], explanation: '02车 là toa 02; 08A号 là ghế 08A.' },
  ] },
  { id: 'messages', scene: 'classroom', title: 'Đọc tin nhắn hẹn gặp', chineseTitle: '小雨 · 约好一起学习', subtitle: 'Thời gian, địa điểm và điều kiện thay đổi', rows: [
    { id: 'when', label: '小雨', chinese: '我们周六下午三点见吧！', pinyin: 'Wǒmen zhōuliù xiàwǔ sān diǎn jiàn ba!', meaning: 'Chúng ta gặp lúc ba giờ chiều thứ Bảy nhé!' },
    { id: 'where', label: '小雨', chinese: '在图书馆东门等我。', pinyin: 'Zài túshūguǎn dōngmén děng wǒ.', meaning: 'Đợi tôi ở cổng phía đông thư viện.' },
    { id: 'bring', label: '小雨', chinese: '记得带一本中文书。', pinyin: 'Jìde dài yì běn Zhōngwén shū.', meaning: 'Nhớ mang một cuốn sách tiếng Trung.' },
    { id: 'rain', label: '小雨', chinese: '如果下雨，我们就在旁边的咖啡馆见。', pinyin: 'Rúguǒ xià yǔ, wǒmen jiù zài pángbiān de kāfēiguǎn jiàn.', meaning: 'Nếu trời mưa, chúng ta sẽ gặp ở quán cà phê bên cạnh.' },
  ], questions: [
    { prompt: 'Cuộc hẹn diễn ra khi nào?', choices: ['15:00 thứ Bảy', '03:00 thứ Bảy', '15:00 Chủ nhật'], answer: 0, evidence: ['when'], explanation: '周六 là thứ Bảy; 下午三点 là 15:00.' },
    { prompt: 'Nếu trời không mưa, bạn chờ ở đâu?', choices: ['Cổng tây nhà ga', 'Cổng đông thư viện', 'Bên trong lớp học'], answer: 1, evidence: ['where', 'rain'], explanation: 'Địa điểm ban đầu là 图书馆东门: cổng phía đông thư viện. Chỉ đổi sang quán cà phê nếu mưa.' },
    { prompt: 'Bạn cần mang gì?', choices: ['Một chiếc vé tàu', 'Một cốc cà phê', 'Một cuốn sách tiếng Trung'], answer: 2, evidence: ['bring'], explanation: '带一本中文书: mang một cuốn sách tiếng Trung. 本 là lượng từ cho sách.' },
    { prompt: 'Nếu trời mưa, cuộc hẹn chuyển đến đâu?', choices: ['Quán cà phê bên cạnh', 'Một nhà ga khác', 'Cổng phía tây thư viện'], answer: 0, evidence: ['rain'], explanation: '如果下雨……就在旁边的咖啡馆见: nếu mưa thì gặp ở quán cà phê bên cạnh.' },
  ] },
];

/** Slot identities matter: 木 + 木 has two distinct draggable pieces. */
export function assemblyMatches(parts: readonly string[], character: string): boolean {
  const expected = characterStructure(character)?.parts;
  return !!expected && parts.length === expected.length && parts.every((part, index) => part === expected[index]);
}
