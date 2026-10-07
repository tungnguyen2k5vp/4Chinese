/** Original self-practice material, not acoustic scoring or an official HSK list. */
export const pronunciationPairs = [
  { id: 'z-zh', title: 'z / zh', a: '早', pa: 'zǎo', va: 'sớm', b: '找', pb: 'zhǎo', vb: 'tìm', tip: 'z: đầu lưỡi gần răng trên; zh: đầu lưỡi lùi hơn. Không đổi thanh 3 khi đối chiếu hai âm.' },
  { id: 'c-ch', title: 'c / ch', a: '擦', pa: 'cā', va: 'lau', b: '插', pb: 'chā', vb: 'cắm', tip: 'Cả hai đều bật hơi; ch đặt đầu lưỡi lùi hơn c. Dùng một mẩu giấy trước miệng để quan sát hơi.' },
  { id: 's-sh', title: 's / sh', a: '四', pa: 'sì', va: 'bốn', b: '是', pb: 'shì', vb: 'là', tip: 's có đầu lưỡi gần răng; sh đầu lưỡi lùi. Nghe âm đầu, không chỉ nhìn chữ.' },
  { id: 'j-q', title: 'j / q', a: '鸡', pa: 'jī', va: 'gà', b: '七', pb: 'qī', vb: 'bảy', tip: 'q bật hơi rõ hơn j. Hai âm dùng mặt lưỡi phía trước; tránh đọc q như “qu” tiếng Việt.' },
  { id: 'q-x', title: 'q / x', a: '七', pa: 'qī', va: 'bảy', b: '西', pb: 'xī', vb: 'tây', tip: 'q có lúc chặn rồi bật hơi; x là luồng hơi xát liên tục. Đây là bài đối chiếu mẫu, không tự chấm phát âm.' },
  { id: 'an-ang', title: 'an / ang', a: '三', pa: 'sān', va: 'ba', b: '桑', pb: 'sāng', vb: 'dâu tằm', tip: 'an kết thúc bằng đầu lưỡi; ang kết thúc ở phần sau lưỡi. Không thêm âm “g” bật ra.' },
  { id: 'en-eng', title: 'en / eng', a: '真', pa: 'zhēn', va: 'thật', b: '争', pb: 'zhēng', vb: 'tranh giành', tip: 'Chú ý vị trí kết thúc n/ng và cả nguyên âm. Hai vần không chỉ khác một chữ viết.' },
  { id: 'in-ing', title: 'in / ing', a: '金', pa: 'jīn', va: 'vàng', b: '京', pb: 'jīng', vb: 'kinh đô', tip: 'in kết thúc ở đầu lưỡi; ing ở phần sau lưỡi. Giữ cùng thanh 1 để tập trung nghe vần.' },
  { id: 'tone-2-3', title: 'Thanh 2 / thanh 3', a: '麻', pa: 'má', va: 'cây gai', b: '马', pb: 'mǎ', vb: 'ngựa', tip: 'Thanh 2 đi lên. Thanh 3 khi đọc riêng thấp rồi lên; trong câu thường chỉ thấp, không cần cố uốn đầy đủ.' },
  { id: 'tone-1-4', title: 'Thanh 1 / thanh 4', a: '妈', pa: 'mā', va: 'mẹ', b: '骂', pb: 'mà', vb: 'mắng', tip: 'Thanh 1 cao và ngang; thanh 4 bắt đầu cao rồi xuống nhanh. Giữ nguyên âm a trong cả hai.' },
] as const;
