export type CommonRadical = {
  character: string;
  name: string;
  meaningVi: string;
  usage: string;
  examples: string[];
};

/**
 * A compact, offline-first curriculum of high-frequency components.  The
 * examples are deliberately familiar HSK words, so a learner can connect the
 * shape with meaning instead of memorising a disconnected list of radicals.
 */
export const commonRadicals: CommonRadical[] = [
  { character: "亻", name: "Nhân đứng", meaningVi: "người", usage: "Thường đứng bên trái, liên quan con người hoặc hành động của người.", examples: ["你", "他", "住"] },
  { character: "人", name: "Nhân", meaningVi: "người", usage: "Dạng đầy đủ của bộ người; đôi khi nằm trên hoặc trong chữ.", examples: ["人", "从", "众"] },
  { character: "口", name: "Khẩu", meaningVi: "miệng, lời nói", usage: "Gợi nghĩa nói, ăn uống, âm thanh hoặc đồ vật có miệng.", examples: ["吃", "喝", "吗"] },
  { character: "女", name: "Nữ", meaningVi: "phụ nữ", usage: "Liên quan nữ giới, gia đình hoặc nét nghĩa mềm mại.", examples: ["妈", "姐", "好"] },
  { character: "子", name: "Tử", meaningVi: "con, trẻ nhỏ", usage: "Chỉ con cái, trẻ em hoặc sự học tập, sinh trưởng.", examples: ["儿子", "孩子", "字"] },
  { character: "宀", name: "Miên", meaningVi: "mái nhà", usage: "Nằm trên đầu chữ, gợi nhà cửa, không gian trong nhà hoặc sự che chở.", examples: ["家", "安", "室"] },
  { character: "心", name: "Tâm", meaningVi: "tim, tâm trí", usage: "Liên quan cảm xúc, suy nghĩ và trạng thái tinh thần.", examples: ["想", "爱", "心"] },
  { character: "忄", name: "Tâm đứng", meaningVi: "cảm xúc", usage: "Dạng đứng của 心, thường ở bên trái chữ.", examples: ["快", "情", "怕"] },
  { character: "手", name: "Thủ", meaningVi: "tay", usage: "Gợi các động tác thực hiện bằng tay.", examples: ["手", "拿", "找"] },
  { character: "扌", name: "Thủ đứng", meaningVi: "tay, thao tác", usage: "Dạng bên trái của 手, thường chỉ hành động.", examples: ["打", "推", "接"] },
  { character: "木", name: "Mộc", meaningVi: "cây, gỗ", usage: "Liên quan cây cối, đồ gỗ hoặc vật liệu từ cây.", examples: ["林", "杯", "校"] },
  { character: "氵", name: "Tam điểm thủy", meaningVi: "nước, chất lỏng", usage: "Dạng bên trái của 水; thường chỉ nước, sông biển hoặc chất lỏng.", examples: ["河", "海", "洗"] },
  { character: "火", name: "Hỏa", meaningVi: "lửa", usage: "Gợi lửa, nhiệt, ánh sáng hoặc quá trình nấu nướng.", examples: ["火", "灯", "炒"] },
  { character: "灬", name: "Hỏa đáy", meaningVi: "lửa", usage: "Dạng bốn chấm của 火, thường nằm ở đáy chữ.", examples: ["热", "点", "然"] },
  { character: "土", name: "Thổ", meaningVi: "đất", usage: "Liên quan đất đai, địa điểm, xây dựng hoặc vật làm từ đất.", examples: ["地", "坐", "城"] },
  { character: "金", name: "Kim", meaningVi: "kim loại, tiền", usage: "Liên quan kim loại, tiền bạc hoặc vật cứng sáng.", examples: ["金", "钱", "银"] },
  { character: "钅", name: "Kim đứng", meaningVi: "kim loại", usage: "Dạng bên trái của 金, thường gặp trong chữ giản thể.", examples: ["钱", "钟", "铁"] },
  { character: "日", name: "Nhật", meaningVi: "mặt trời, ngày", usage: "Gợi thời gian, ánh sáng, ngày tháng hoặc nhiệt độ.", examples: ["明", "早", "昨"] },
  { character: "月", name: "Nguyệt", meaningVi: "mặt trăng, tháng", usage: "Gợi tháng; trong nhiều chữ còn là dạng của bộ thịt/cơ thể.", examples: ["月", "明", "朋友"] },
  { character: "言", name: "Ngôn", meaningVi: "lời nói, ngôn ngữ", usage: "Liên quan nói năng, ngôn ngữ, thông tin hoặc lời hứa.", examples: ["语言", "请", "说"] },
  { character: "讠", name: "Ngôn đứng", meaningVi: "lời nói", usage: "Dạng giản thể bên trái của 言.", examples: ["语", "请", "谁"] },
  { character: "贝", name: "Bối", meaningVi: "vỏ sò, tiền", usage: "Xưa vỏ sò dùng làm tiền; nay thường gợi tiền bạc hoặc tài sản.", examples: ["贵", "买", "费"] },
  { character: "车", name: "Xa", meaningVi: "xe cộ", usage: "Liên quan phương tiện, chuyển động và giao thông.", examples: ["车", "轻", "轮"] },
  { character: "马", name: "Mã", meaningVi: "ngựa", usage: "Liên quan ngựa, động vật hoặc hành động cưỡi/chạy.", examples: ["马", "吗", "骑"] },
  { character: "虫", name: "Trùng", meaningVi: "côn trùng", usage: "Liên quan sâu bọ, côn trùng hoặc sinh vật bò sát.", examples: ["虫", "蚂", "蛇"] },
  { character: "艹", name: "Thảo đầu", meaningVi: "cỏ, thực vật", usage: "Nằm trên đầu chữ, gợi cây cỏ, hoa lá hoặc dược liệu.", examples: ["花", "茶", "菜"] },
  { character: "竹", name: "Trúc", meaningVi: "tre", usage: "Liên quan đồ làm từ tre hoặc vật có dạng thanh nhỏ.", examples: ["笑", "笔", "第"] },
  { character: "米", name: "Mễ", meaningVi: "gạo", usage: "Liên quan hạt, gạo, thức ăn dạng hạt hoặc bột.", examples: ["米", "糖", "料"] },
  { character: "衣", name: "Y", meaningVi: "quần áo", usage: "Liên quan trang phục, vải vóc hoặc việc mặc.", examples: ["衣", "表", "装"] },
  { character: "衤", name: "Y đứng", meaningVi: "quần áo", usage: "Dạng bên trái của 衣.", examples: ["裤", "裙", "被"] },
  { character: "食", name: "Thực", meaningVi: "ăn uống", usage: "Liên quan thức ăn, bữa ăn và hành động ăn.", examples: ["食", "饭", "餐"] },
  { character: "饣", name: "Thực đứng", meaningVi: "thức ăn", usage: "Dạng giản thể bên trái của 食.", examples: ["饭", "饱", "饿"] },
  { character: "足", name: "Túc", meaningVi: "chân, đủ", usage: "Liên quan chân, bước đi hoặc sự đầy đủ.", examples: ["路", "跑", "足"] },
  { character: "走", name: "Tẩu", meaningVi: "đi, chạy", usage: "Liên quan di chuyển, đi lại hoặc quá trình tiến tới.", examples: ["走", "起", "赶"] },
  { character: "门", name: "Môn", meaningVi: "cửa", usage: "Gợi cửa, không gian vào ra hoặc hoạt động trong nhà.", examples: ["门", "问", "间"] },
  { character: "雨", name: "Vũ", meaningVi: "mưa", usage: "Liên quan thời tiết và hiện tượng khí tượng.", examples: ["雨", "雪", "雷"] },
  { character: "石", name: "Thạch", meaningVi: "đá", usage: "Liên quan đá, khoáng chất hoặc vật cứng.", examples: ["石", "码", "矿"] },
  { character: "田", name: "Điền", meaningVi: "ruộng", usage: "Liên quan đồng ruộng, khu vực chia ô hoặc một số sự vật có ô.", examples: ["田", "男", "电"] },
  { character: "目", name: "Mục", meaningVi: "mắt", usage: "Liên quan nhìn, mắt, quan sát và mục tiêu.", examples: ["看", "眼", "睛"] },
  { character: "耳", name: "Nhĩ", meaningVi: "tai", usage: "Liên quan tai, nghe hoặc bộ phận cơ thể.", examples: ["耳", "听", "聪"] },
  { character: "力", name: "Lực", meaningVi: "sức mạnh", usage: "Gợi sức lực, khả năng hoặc hoạt động cần lực.", examples: ["力", "动", "办"] },
  { character: "刀", name: "Đao", meaningVi: "dao", usage: "Liên quan cắt, chia hoặc công cụ sắc bén.", examples: ["刀", "分", "别"] },
  { character: "刂", name: "Đao đứng", meaningVi: "dao, cắt", usage: "Dạng bên phải của 刀, thường trong chữ giản thể.", examples: ["到", "别", "刚"] },
  { character: "弓", name: "Cung", meaningVi: "cái cung", usage: "Liên quan cung tên, kéo cong hoặc phát âm có thanh điệu.", examples: ["张", "弟", "引"] },
  { character: "广", name: "Nghiễm", meaningVi: "mái nhà, vách", usage: "Dạng mái dốc, thường gợi nhà, nơi chốn hoặc công trình.", examples: ["店", "床", "度"] },
  { character: "山", name: "Sơn", meaningVi: "núi", usage: "Liên quan núi non, địa hình hoặc hình dạng nhô lên.", examples: ["山", "岁", "岛"] },
  { character: "川", name: "Xuyên", meaningVi: "sông", usage: "Gợi sông ngòi hoặc dòng chảy.", examples: ["川", "州", "顺"] },
  { character: "纟", name: "Mịch đứng", meaningVi: "sợi tơ", usage: "Dạng giản thể của 糸, gợi chỉ, sợi, buộc hoặc quan hệ.", examples: ["红", "给", "级"] },
  { character: "礻", name: "Thị đứng", meaningVi: "thần linh, nghi lễ", usage: "Dạng bên trái của 示, thường có trong từ về phúc lành, nghi lễ.", examples: ["礼", "祝", "神"] },
  { character: "王", name: "Ngọc / Vương", meaningVi: "ngọc, vua", usage: "Khi đứng bên trái thường là bộ ngọc, gợi đá quý và đồ quý.", examples: ["王", "现", "球"] },
];

export function findCommonRadical(character: string): CommonRadical | undefined {
  return commonRadicals.find((radical) => radical.character === character);
}
