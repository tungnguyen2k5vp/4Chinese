import type { HskLevel } from "@/services/hsk/alignment";
export type TimedSpeakingPrompt = {
  id: string;
  level: HskLevel;
  title: string;
  prompt: string;
  preparationSeconds: number;
  recordingSeconds: number;
  checklist: string[];
  sourceType: "CURATED";
  reviewStatus: "UNREVIEWED";
};
const prompts: Omit<TimedSpeakingPrompt, "sourceType" | "reviewStatus">[] = [
  {
    id: "speak-1-read",
    level: "1",
    title: "Đọc câu ngắn",
    prompt: "朗读：你好！我叫小明。我是学生。我喜欢学习中文。",
    preparationSeconds: 10,
    recordingSeconds: 30,
    checklist: [
      "Đọc rõ từng từ, không thêm câu ngoài đề.",
      "Để ý thanh điệu 你好 và 学习.",
      "Ngắt câu theo dấu câu.",
    ],
  },
  {
    id: "speak-2-introduce",
    level: "2",
    title: "Giới thiệu sinh hoạt",
    prompt: "请介绍你的一天。你几点起床？你什么时候学习中文？",
    preparationSeconds: 15,
    recordingSeconds: 30,
    checklist: [
      "Có ít nhất hai hoạt động.",
      "Dùng giờ/thời điểm rõ.",
      "Câu nghe được và không chỉ đọc câu hỏi.",
    ],
  },
  {
    id: "speak-3-directions",
    level: "3",
    title: "Chỉ đường cho bạn",
    prompt:
      "朋友想去图书馆。请告诉他怎么去，并提醒他图书馆几点关门。你可以自己设定地点和时间。",
    preparationSeconds: 20,
    recordingSeconds: 60,
    checklist: [
      "Nêu điểm xuất phát và hướng đi.",
      "Nêu giờ đóng cửa.",
      "Diễn đạt liên tục, không cần nói thật nhanh.",
    ],
  },
  {
    id: "speak-4-experience",
    level: "4",
    title: "Kể một chuyến đi",
    prompt: "介绍一次让你印象深刻的旅行。你去了哪里？发生了什么？为什么难忘？",
    preparationSeconds: 20,
    recordingSeconds: 60,
    checklist: [
      "Nêu nơi đến.",
      "Kể một sự việc cụ thể.",
      "Giải thích vì sao khó quên.",
    ],
  },
  {
    id: "speak-5-opinion",
    level: "5",
    title: "Nêu ý kiến có lý do",
    prompt: "你认为学生应该参加志愿活动吗？请说明你的观点，并举一个例子。",
    preparationSeconds: 30,
    recordingSeconds: 90,
    checklist: [
      "Quan điểm rõ.",
      "Lý do liên quan trực tiếp.",
      "Có ví dụ thay vì chỉ lặp quan điểm.",
    ],
  },
  {
    id: "speak-6-retell",
    level: "6",
    title: "Kể lại và nhận xét",
    prompt:
      "阅读后用自己的话复述并评论：一家社区书店原来顾客很少。店主开始举办免费读书会，让居民分享喜欢的书。几个月后，书店成为大家交流的地方。但活动增加了成本，店主仍在寻找可持续的经营方式。",
    preparationSeconds: 30,
    recordingSeconds: 90,
    checklist: [
      "Kể được vấn đề, hành động và kết quả.",
      "Không bỏ khó khăn về chi phí.",
      "Phân biệt thông tin trong đoạn và nhận xét của mình.",
    ],
  },
  {
    id: "speak-79-policy",
    level: "7-9",
    title: "Thảo luận lựa chọn chính sách",
    prompt:
      "如果城市中心限制私家车进入，会带来哪些好处和困难？请提出一种配套措施，并说明它如何帮助居民。",
    preparationSeconds: 30,
    recordingSeconds: 120,
    checklist: [
      "Nêu lợi ích và khó khăn.",
      "Đề xuất giải pháp cụ thể.",
      "Lập luận có điều kiện, không tuyệt đối hóa.",
      "Kết thúc bằng kết luận ngắn.",
    ],
  },
  {
    id: "speak-1-buy-water",
    level: "1",
    title: "Mua nước ở cửa hàng nhỏ",
    prompt: "你在小店买水。请说你要什么、要几瓶，最后说谢谢。",
    preparationSeconds: 10,
    recordingSeconds: 30,
    checklist: [
      "Nói rõ muốn mua nước.",
      "Nêu số chai muốn mua.",
      "Kết thúc bằng lời cảm ơn.",
    ],
  },
  {
    id: "speak-1-meeting-message",
    level: "1",
    title: "Đọc tin nhắn hẹn bạn",
    prompt: "朗读给朋友的短消息：我在学校门口。你在哪儿？今天很冷。我们先去喝茶，好吗？",
    preparationSeconds: 10,
    recordingSeconds: 30,
    checklist: [
      "Đọc đủ tin nhắn, không thêm lời ngoài đề.",
      "Giữ rõ câu hỏi 你在哪儿？ và 好吗？",
      "Ngắt câu ở dấu câu, không đọc thành một chuỗi liền.",
    ],
  },
  {
    id: "speak-2-lost-umbrella",
    level: "2",
    title: "Gọi hỏi chiếc ô bỏ quên",
    prompt:
      "请打电话给饭店，说你今天中午在那儿吃饭，忘了一把黑色的伞。问服务员有没有看到，明天上午能不能去拿。",
    preparationSeconds: 15,
    recordingSeconds: 30,
    checklist: [
      "Nêu đã ăn ở quán vào trưa nay.",
      "Mô tả chiếc ô màu đen bị bỏ quên.",
      "Hỏi có tìm thấy ô không và có thể lấy vào sáng mai không.",
    ],
  },
  {
    id: "speak-2-zoo-message",
    level: "2",
    title: "Nhắn lại lịch đi sở thú",
    prompt:
      "读完后用自己的话告诉朋友：星期六上午九点在动物园门口见。门票每人二十元。请带水。说清见面的时间、地点、票价和要带的东西。",
    preparationSeconds: 15,
    recordingSeconds: 30,
    checklist: [
      "Nêu thứ Bảy lúc 9 giờ sáng và cổng sở thú.",
      "Nêu giá vé 20 tệ mỗi người.",
      "Nhắc mang nước; dùng lời của mình thay vì chỉ đọc yêu cầu.",
    ],
  },
  {
    id: "speak-3-dinner-plan",
    level: "3",
    title: "Chia việc chuẩn bị bữa tối",
    prompt:
      "你和朋友准备给四个人做晚饭。家里有米饭和鸡蛋，但没有蔬菜。请说明还要买什么、谁去买，以及几点开始做饭。细节可以自己设定。",
    preparationSeconds: 20,
    recordingSeconds: 60,
    checklist: [
      "Nêu cần mua thêm rau cho bữa tối bốn người.",
      "Chia rõ người đi mua và việc còn lại.",
      "Nêu giờ bắt đầu nấu, sắp xếp các việc theo thứ tự dễ hiểu.",
    ],
  },
  {
    id: "speak-3-running-notice",
    level: "3",
    title: "Nhắn lại thông báo chạy bộ",
    prompt:
      "读完通知后，用自己的话告诉邻居：周日下午三点，公园有免费的跑步活动。请在周五前报名。下雨就改到体育馆。说清活动时间、报名要求和下雨时的安排。",
    preparationSeconds: 20,
    recordingSeconds: 60,
    checklist: [
      "Nêu Chủ nhật lúc 3 giờ chiều tại công viên và hoạt động miễn phí.",
      "Nhắc phải đăng ký trước thứ Sáu.",
      "Nêu phương án chuyển sang nhà thi đấu nếu trời mưa.",
    ],
  },
  {
    id: "speak-4-lamp-exchange",
    level: "4",
    title: "Giải thích yêu cầu đổi đèn",
    prompt:
      "你买的台灯用了两天就不亮了，但收据还在。请向店员说明问题，提出换货的请求。如果同款已经卖完，你愿意接受什么其他办法？不要替店员作出保证。",
    preparationSeconds: 20,
    recordingSeconds: 60,
    checklist: [
      "Nêu đèn không sáng sau hai ngày sử dụng và còn hóa đơn.",
      "Đề nghị đổi hàng với cách nói lịch sự.",
      "Nêu một phương án nếu hết mẫu cũ, không tự khẳng định cửa hàng đã đồng ý.",
    ],
  },
  {
    id: "speak-4-neighbor-repairs",
    level: "4",
    title: "Thương lượng giờ sửa nhà",
    prompt:
      "邻居想周日早上七点开始装修，你担心影响大家休息。请礼貌地说明你的顾虑，建议另一个时间，并解释这个安排对双方有什么好处。",
    preparationSeconds: 20,
    recordingSeconds: 60,
    checklist: [
      "Nêu lo ngại về việc nghỉ ngơi lúc 7 giờ sáng Chủ nhật.",
      "Đề xuất một giờ khác cụ thể bằng lời lịch sự.",
      "Giải thích lợi ích cho cả hàng xóm và người nghỉ ngơi.",
    ],
  },
  {
    id: "speak-5-vegetable-summary",
    level: "5",
    title: "Tóm tắt cách đặt giỏ rau",
    prompt:
      "阅读后概括给同事听：一家菜店试行预订菜篮。顾客前一天选菜，第二天下班后到店领取。这样减少了剩菜，但一些老人不会用手机。店主于是保留电话预订，并每天留出少量现货。请概括做法、好处和需要照顾的人群，不要添加原文没有的数据。",
    preparationSeconds: 30,
    recordingSeconds: 90,
    checklist: [
      "Tóm tắt việc chọn rau hôm trước và nhận sau giờ làm hôm sau.",
      "Nêu giảm rau thừa cùng khó khăn của người không dùng điện thoại thông minh.",
      "Nêu đặt qua điện thoại và giữ ít hàng bán ngay, không bịa số liệu.",
    ],
  },
  {
    id: "speak-5-office-space",
    level: "5",
    title: "Nêu ý kiến về phòng nghỉ trưa",
    prompt:
      "公司准备把闲置会议室改成午休室，但有人希望保留开会空间。你支持哪种安排？请从使用人数和管理成本两方面说明理由，并提出一个兼顾另一方的办法。",
    preparationSeconds: 30,
    recordingSeconds: 90,
    checklist: [
      "Nêu rõ lựa chọn giữ phòng họp hoặc chuyển thành phòng nghỉ.",
      "Giải thích theo số người sử dụng và chi phí quản lý; đánh dấu giả định nếu tự đặt số liệu.",
      "Đề xuất cách đáp ứng một phần nhu cầu của bên còn lại.",
    ],
  },
  {
    id: "speak-6-museum-summary",
    level: "6",
    title: "Tóm tắt kế hoạch mở bảo tàng buổi tối",
    prompt:
      "阅读后向志愿者复述并说明尚未解决的问题：一家社区博物馆试行周五夜间开放，方便白天上班的居民参观。志愿者负责讲解，附近商店提供小额赞助。参观人数增加了，但值班人员疲劳，赞助也只够支持三个月。馆方正在讨论减少开放次数或招募更多志愿者。不要把讨论中的方案说成已经决定的安排。",
    preparationSeconds: 30,
    recordingSeconds: 90,
    checklist: [
      "Nêu mục đích mở tối thứ Sáu và vai trò của tình nguyện viên, cửa hàng tài trợ.",
      "Nêu tăng lượt tham quan nhưng nhân sự mệt và tài trợ chỉ đủ ba tháng.",
      "Phân biệt hai phương án đang bàn với quyết định đã có.",
    ],
  },
  {
    id: "speak-6-bus-detour",
    level: "6",
    title: "Giải thích xe nối tuyến khi sửa đường",
    prompt:
      "小区原来的一条公交线路因修路临时绕行，居民要多走十五分钟才能到车站。社区计划开通早晚两班接驳车，但部分居民希望增加中午班次。请向居民解释现有安排的作用和限制，并提出收集需求、再决定班次的办法。不要把尚未决定的事项说成承诺。",
    preparationSeconds: 30,
    recordingSeconds: 90,
    checklist: [
      "Nêu lý do đổi tuyến và phải đi bộ thêm 15 phút.",
      "Giải thích kế hoạch hai chuyến sáng/tối chưa đáp ứng nhu cầu giữa trưa.",
      "Đề xuất cách thu thập nhu cầu trước khi quyết định, không hứa thêm chuyến chắc chắn.",
    ],
  },
  {
    id: "speak-79-logistics-summary",
    level: "7-9",
    title: "Tóm tắt thử nghiệm giao hàng",
    prompt:
      "阅读后向评审小组作口头摘要：一座城市在两条商业街试行集中配送。商家把货物先送到共同仓库，再由小型车辆分时送货，目的是减少白天占道。一个月后，参加试点的商家反映门前更整洁，但部分小店认为仓储费用偏高，也有人担心晚上收货增加员工负担。试点尚未比较冬季情况，也没有统计未参加商家的意见。请概括目标、做法和不同反馈，说明现有信息为何不足以支持全市推广，并提出下一步需要补充的证据。",
    preparationSeconds: 30,
    recordingSeconds: 120,
    checklist: [
      "Tóm tắt mục tiêu, kho chung và cách chia giờ giao hàng.",
      "Nêu cả phản hồi về mặt tiền gọn hơn, phí kho và gánh nặng nhận hàng buổi tối.",
      "Chỉ ra giới hạn hai phố, một tháng, thiếu mùa đông và ý kiến của bên không tham gia.",
      "Đề xuất bằng chứng bổ sung trước khi mở rộng, không coi phản hồi là kết luận toàn thành phố.",
    ],
  },
  {
    id: "speak-79-night-exhibition",
    level: "7-9",
    title: "So sánh phương án triển lãm ánh sáng",
    prompt:
      "一座古镇计划在河岸举办夜间灯光展，希望增加游客停留时间。居民担心噪声，小商户关心收益是否公平，管理方担心维护费用。请比较每晚固定开放与仅周末预约开放两种方案，从居民生活、收益分配和维护成本三个角度提出建议。说明需要收集什么信息，并提出调整或暂停项目的条件。尚未有实际调查数据，不要把推测说成事实。",
    preparationSeconds: 30,
    recordingSeconds: 120,
    checklist: [
      "So sánh mở mỗi tối với đặt chỗ vào cuối tuần, không chỉ mô tả một phương án.",
      "Xét đời sống cư dân, phân chia lợi ích và chi phí bảo trì.",
      "Nêu thông tin cần khảo sát, phân biệt giả định với dữ liệu đã có.",
      "Đề xuất điều kiện điều chỉnh hoặc tạm dừng dự án với lập luận có điều kiện.",
    ],
  },
];
export const timedSpeakingPrompts: TimedSpeakingPrompt[] = prompts.map(
  (prompt) => ({
    ...prompt,
    sourceType: "CURATED",
    reviewStatus: "UNREVIEWED",
  }),
);
