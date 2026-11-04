/** Original Vietnamese teaching notes. Presentation only; never seeds or records learner data. */
export type GrammarForm = { label: string; pattern: string; hanzi: string; pinyin: string; vi: string };
export type GrammarGuide = { use: string; tip: string; forms?: GrammarForm[] };
export const grammarGuides: Record<string, GrammarGuide> = {
  "gram-shi": { use: "Giới thiệu danh tính, nghề nghiệp hoặc phân loại.", tip: "是 nối với danh từ. Miêu tả tính chất thường dùng 很 + tính từ: 他很高, không dùng 他是高.", forms: [
    { label: "Khẳng định", pattern: "A + 是 + B", hanzi: "我是学生。", pinyin: "Wǒ shì xuésheng.", vi: "Tôi là học sinh." },
    { label: "Phủ định", pattern: "A + 不 + 是 + B", hanzi: "我不是老师。", pinyin: "Wǒ bú shì lǎoshī.", vi: "Tôi không phải giáo viên." },
    { label: "Câu hỏi", pattern: "A + 是 + B + 吗？", hanzi: "你是学生吗？", pinyin: "Nǐ shì xuésheng ma?", vi: "Bạn là học sinh phải không?" },
  ] },
  "gram-bu": { use: "Nói một việc không làm, một thói quen hoặc ý định phủ định.", tip: "不 không phải dấu hiệu thời gian quá khứ. Việc chưa xảy ra hoặc không xảy ra thường dùng 没(有); phủ định 有 luôn là 没有.", forms: [
    { label: "Không làm", pattern: "Chủ ngữ + 不 + động từ", hanzi: "我不喝茶。", pinyin: "Wǒ bù hē chá.", vi: "Tôi không uống trà." },
    { label: "Không có", pattern: "Chủ ngữ + 没有 + tân ngữ", hanzi: "我没有车。", pinyin: "Wǒ méiyǒu chē.", vi: "Tôi không có xe." },
  ] },
  "gram-ma": { use: "Biến một câu kể thành câu hỏi có/không.", tip: "Đã có từ hỏi 谁, 什么, 哪儿 thì thường không thêm 吗. Câu hỏi 你是谁？ hỏi danh tính, khác 你是老师吗？", forms: [
    { label: "Câu kể", pattern: "Chủ ngữ + vị ngữ", hanzi: "他喝茶。", pinyin: "Tā hē chá.", vi: "Anh ấy uống trà." },
    { label: "Hỏi có/không", pattern: "Câu kể + 吗？", hanzi: "他喝茶吗？", pinyin: "Tā hē chá ma?", vi: "Anh ấy uống trà không?" },
  ] },
  "gram-you": { use: "Nói ai sở hữu gì hoặc ở đâu có sự vật nào.", tip: "Phủ định 有 bằng 没有. 在 xác định vị trí của một sự vật; 有 giới thiệu sự vật hiện diện.", forms: [
    { label: "Sở hữu", pattern: "Người + 有 + vật", hanzi: "我有一本书。", pinyin: "Wǒ yǒu yì běn shū.", vi: "Tôi có một quyển sách." },
    { label: "Không có", pattern: "Người + 没有 + vật", hanzi: "我没有书。", pinyin: "Wǒ méiyǒu shū.", vi: "Tôi không có sách." },
    { label: "Tồn tại", pattern: "Địa điểm + 有 + sự vật", hanzi: "桌子上有一本书。", pinyin: "Zhuōzi shàng yǒu yì běn shū.", vi: "Trên bàn có một quyển sách." },
  ] },
  "gram-zai": { use: "Cho biết người hoặc vật đang ở đâu.", tip: "Khi thêm hành động, cụm địa điểm thường đứng trước động từ: 我在家学习. Phân biệt với 在 + động từ diễn tả việc đang diễn ra.", forms: [
    { label: "Vị trí", pattern: "Người/vật + 在 + địa điểm", hanzi: "我在家。", pinyin: "Wǒ zài jiā.", vi: "Tôi ở nhà." },
    { label: "Hành động ở đâu", pattern: "Chủ ngữ + 在 + nơi chốn + động từ", hanzi: "我在家学习。", pinyin: "Wǒ zài jiā xuéxí.", vi: "Tôi học ở nhà." },
  ] },
  "gram-de": { use: "Nối người sở hữu hoặc phần miêu tả với danh từ.", tip: "Danh từ chính nằm sau 的. 我的书 là “sách của tôi”; không đảo thành 书的我.", forms: [
    { label: "Sở hữu", pattern: "Người sở hữu + 的 + danh từ", hanzi: "这是我的书。", pinyin: "Zhè shì wǒ de shū.", vi: "Đây là sách của tôi." },
    { label: "Miêu tả", pattern: "Phần miêu tả + 的 + danh từ", hanzi: "我喜欢红色的衣服。", pinyin: "Wǒ xǐhuān hóngsè de yīfu.", vi: "Tôi thích quần áo màu đỏ." },
  ] },
  "gram-bi": { use: "So sánh hai đối tượng theo cùng một đặc điểm.", tip: "Không cao bằng: A 没有 B 高. 不比 chỉ phủ nhận “cao hơn”, có thể bằng hoặc thấp hơn. Với mẫu cơ bản, không thêm 很 trước tính từ sau 比.", forms: [
    { label: "Hơn", pattern: "A + 比 + B + tính từ", hanzi: "他比我高。", pinyin: "Tā bǐ wǒ gāo.", vi: "Anh ấy cao hơn tôi." },
    { label: "Không bằng", pattern: "A + 没有 + B + tính từ", hanzi: "我没有他高。", pinyin: "Wǒ méiyǒu tā gāo.", vi: "Tôi không cao bằng anh ấy." },
    { label: "Không hơn", pattern: "A + 不比 + B + tính từ", hanzi: "他不比我高。", pinyin: "Tā bù bǐ wǒ gāo.", vi: "Anh ấy không cao hơn tôi." },
  ] },
  "gram-guo": { use: "Kể trải nghiệm từng có trước thời điểm nói.", tip: "过 nhấn trải nghiệm, không chỉ một sự kiện đã hoàn tất. Phủ định thường là 没(有) + động từ + 过.", forms: [
    { label: "Từng", pattern: "Chủ ngữ + động từ + 过 + tân ngữ", hanzi: "我去过北京。", pinyin: "Wǒ qùguo Běijīng.", vi: "Tôi từng đến Bắc Kinh." },
    { label: "Chưa từng", pattern: "Chủ ngữ + 没 + động từ + 过 + tân ngữ", hanzi: "我没去过北京。", pinyin: "Wǒ méi qùguo Běijīng.", vi: "Tôi chưa từng đến Bắc Kinh." },
  ] },
  "gram-le-change": { use: "Báo một trạng thái mới hoặc tình hình đã thay đổi.", tip: "了 cuối câu không mặc định là quá khứ. 天快黑了 nói trời sắp tối; 不…了 có thể diễn tả không còn làm nữa." },
  "gram-ba": { use: "Đưa một đối tượng đã xác định lên trước để nói nó được xử lý ra sao.", tip: "Sau động từ thường cần kết quả, hướng, nơi chốn hoặc thành phần khác. Phủ định/động từ năng nguyện thường đứng trước 把." },
  "gram-bei": { use: "Nhấn đối tượng chịu tác động của một hành động.", tip: "Người gây ra hành động có thể không nêu. Bị động không nhất thiết luôn mang nghĩa xấu; đừng thêm 被 chỉ vì câu Việt có chữ “bị”." },
  "gram-suiran-danshi": { use: "Nêu một điều được thừa nhận rồi đưa ra ý trái dự đoán.", tip: "虽然 mở vế nhượng bộ; 但是/可是 mở vế tương phản. Giữ quan hệ ý nghĩa giữa hai vế, không ghép chỉ vì thấy hai từ nối." },
  "gram-shi-de": { use: "Nhấn thời gian, nơi chốn hoặc cách thức của một việc đã biết là xảy ra.", tip: "Trọng tâm nằm sau 是. Phân biệt với câu phân loại 是 + danh từ và với 的 chỉ sở hữu." },
  "gram-budan-erqie": { use: "Bổ sung ý thứ hai, thường tăng mức độ so với ý thứ nhất.", tip: "Cùng chủ ngữ thường đặt chủ ngữ trước 不但. Khác chủ ngữ thường đặt 不但 trước chủ ngữ thứ nhất." },
  "gram-yuqi-buru": { use: "So sánh hai lựa chọn và nghiêng về lựa chọn thứ hai.", tip: "与其 nêu phương án kém ưu tiên; 不如 nêu phương án nên chọn. Không dùng như một câu so sánh chiều cao hay số lượng." },
  "gram-jishi-ye": { use: "Giả định một điều kiện cực đoan mà kết luận vẫn không đổi.", tip: "即使 là “cho dù”, không khẳng định điều kiện đã xảy ra. 也 gắn với kết quả vẫn giữ nguyên." },
  "gram-yin-er": { use: "Nối nguyên nhân với hệ quả, thường trong văn viết.", tip: "因而 gần với “do đó”. Hệ quả phải được suy ra từ vế trước; đây không phải từ nối hai ý ngẫu nhiên." },
  "gram-yu": { use: "Dùng 于 để biểu thị quan hệ như nơi chốn, thời điểm hoặc đối tượng trong các mẫu văn viết.", tip: "Chức năng của 于 phụ thuộc động từ/cụm từ đi kèm. Không thay mọi 在, 对 hoặc 从 bằng 于." },
  "gram-ne-continuation": { use: "Nhấn một trạng thái/hành động còn tiếp diễn hoặc hỏi tiếp một đối tượng khác.", tip: "呢 không thay 吗 trong mọi câu hỏi. 我呢？ hỏi “còn tôi?”, còn 他在学习呢 nhấn việc đang học." },
  "gram-zai-progressive": { use: "Diễn tả hành động đang diễn ra tại thời điểm được nói đến.", tip: "在 + động từ khác 在 + địa điểm. Không ghép máy móc với mọi động từ trạng thái như 是 hoặc 有.", forms: [
    { label: "Đang làm", pattern: "Chủ ngữ + 在 + động từ", hanzi: "我在看书。", pinyin: "Wǒ zài kàn shū.", vi: "Tôi đang đọc sách." },
    { label: "Không đang làm", pattern: "Chủ ngữ + 没在 + động từ", hanzi: "我没在看书。", pinyin: "Wǒ méi zài kàn shū.", vi: "Tôi không đang đọc sách." },
  ] },
  "gram-yinwei-suoyi": { use: "Giải thích vì sao một sự việc dẫn đến kết quả khác.", tip: "因为 dẫn nguyên nhân, 所以 dẫn kết quả. Trong nhiều ngữ cảnh có thể dùng một trong hai, không bắt buộc câu nào cũng đủ cặp." },
  "gram-cong-dao": { use: "Nêu điểm đầu và điểm cuối của thời gian, không gian hoặc phạm vi.", tip: "Giữ cùng loại mốc trong một cặp: 从学校到家; 从八点到九点. Vị trí cả cụm tùy cấu trúc câu." },
  "gram-yue-lai-yue": { use: "Miêu tả mức độ thay đổi dần theo thời gian.", tip: "越来越 đứng trước tính từ hoặc động từ tâm lý phù hợp. Phân biệt với 越…越… mô tả hai mức độ biến đổi cùng nhau." },
  "gram-yibian-yibian": { use: "Nói hai hành động diễn ra đồng thời.", tip: "Hai vế 一边…一边… thường cùng chủ thể và cần là các hành động có thể diễn ra cùng lúc." },
  "gram-ruguo-jiu": { use: "Đặt một điều kiện giả định rồi nêu kết quả khi điều kiện thỏa mãn.", tip: "如果 mở điều kiện; 就 thường nằm ở vế kết quả sau chủ ngữ. Phân biệt giả định với 因为 nêu nguyên nhân." },
  "gram-wulun-dou": { use: "Nói kết quả không thay đổi bất kể điều kiện nào.", tip: "无论 thường đi với từ nghi vấn hoặc các lựa chọn, chẳng hạn 无论谁…都…. Không dùng như 即使 với một điều kiện đơn lẻ." },
  "gram-jinguan-haishi": { use: "Thừa nhận khó khăn hay điều kiện trái dự đoán nhưng kết quả vẫn xảy ra.", tip: "尽管 thường thừa nhận một thực tế, còn 即使 thường đặt giả định. 还是 ở đây mang nghĩa “vẫn”, khác 还是 trong câu hỏi lựa chọn." },
  "gram-zhisuoyi": { use: "Nêu kết quả trước rồi giải thích nguyên nhân, thường với 是因为.", tip: "之所以 mở điều cần giải thích; 是因为 đưa ra nguyên nhân. Tránh dùng 之所以 mà bỏ phần giải thích cần thiết trong ngữ cảnh." },
};

/** Accent-insensitive Vietnamese lookup, while preserving Chinese characters. */
export const normalizeGrammarSearch = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "d").toLocaleLowerCase();
