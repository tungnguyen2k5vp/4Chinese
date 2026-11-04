/** Original practice material written for 4Chinese V8.1. Not copied from 4English.
 * Human curriculum/linguistic review is still required; never certified CEFR. */
export interface ContentMetadata {
  source: '4Chinese original'; version: 'V8.1'; rights: 'ORIGINAL_NO_THIRD_PARTY';
  attribution: string; review: 'REVIEW_REQUIRED'; publication: 'DRAFT'; created: string;
}
export const originalContentMetadata: ContentMetadata = { source: '4Chinese original', version: 'V8.1', rights: 'ORIGINAL_NO_THIRD_PARTY', attribution: 'Original practice text created for the 4Chinese project, 2026', review: 'REVIEW_REQUIRED', publication: 'DRAFT', created: '2026-10-13' };
export interface DialogueTurn { speaker: 'A' | 'B'; en: string; vi: string }
export interface EnglishDialogue {
  id: string; topic: 'Everyday' | 'Travel' | 'Work & study' | 'Discussion'; title: string;
  level: 'Short sentences' | 'Longer sentences'; scenario: string; participants: [string, string];
  goals: string[]; vocabulary: string[]; grammar: string[]; turns: DialogueTurn[];
  audio: 'DEVICE_TTS'; minutes: number; metadata: ContentMetadata;
}
function dialogue(id: string, topic: EnglishDialogue['topic'], title: string, scenario: string, participants: [string, string], vocabulary: string[], pairs: [string, string][], level: EnglishDialogue['level'] = 'Short sentences'): EnglishDialogue {
  return { id, topic, title, scenario, participants, goals: ['Nghe và hiểu các lượt trao đổi', 'Tự luyện đáp lời trong tình huống'], vocabulary, grammar: ['Requests and responses in context'], turns: pairs.map(([en, vi], index) => ({ speaker: index % 2 ? 'B' : 'A', en, vi })), level, audio: 'DEVICE_TTS', minutes: 5, metadata: originalContentMetadata };
}
export const englishDialogues: EnglishDialogue[] = [
  dialogue('meet-someone', 'Everyday', 'Meeting a new neighbour', 'Hai người gặp nhau lần đầu tại khu nhà.', ['Alex', 'Sam'], ['neighbour', 'work', 'weekend'], [
    ['Hello. I am Alex. I moved here last week.', 'Xin chào. Tôi là Alex. Tôi chuyển đến đây tuần trước.'],
    ['Nice to meet you, Alex. I am Sam.', 'Rất vui được gặp bạn, Alex. Tôi là Sam.'],
    ['Nice to meet you too. Do you work nearby?', 'Tôi cũng rất vui được gặp bạn. Bạn làm việc gần đây à?'],
    ['Yes, I work at a school across the street.', 'Vâng, tôi làm ở một trường học bên kia đường.'],
    ['That is convenient. What do you do at the weekend?', 'Thật tiện. Bạn làm gì vào cuối tuần?'],
    ['I usually go for a walk. Would you like to join me?', 'Tôi thường đi dạo. Bạn có muốn đi cùng không?'],
    ['Yes, thank you. Saturday morning would be great.', 'Có, cảm ơn bạn. Sáng thứ Bảy thì rất tốt.'],
    ['Great. Let us meet by the front door at nine.', 'Tuyệt. Chúng ta gặp ở cửa chính lúc chín giờ nhé.'],
  ]),
  dialogue('order-food', 'Everyday', 'Ordering lunch', 'Gọi món và hỏi về thành phần tại quán.', ['Customer', 'Server'], ['menu', 'soup', 'vegetables'], [
    ['Could I see the menu, please?', 'Cho tôi xem thực đơn được không?'],
    ['Of course. Today we also have vegetable soup.', 'Được chứ. Hôm nay chúng tôi còn có súp rau.'],
    ['Does the soup contain milk?', 'Súp có chứa sữa không?'],
    ['No, it does not. It contains vegetables and water.', 'Không. Súp có rau và nước.'],
    ['I would like the soup and some bread, please.', 'Tôi muốn gọi súp và ít bánh mì.'],
    ['Certainly. Would you like a drink?', 'Vâng. Bạn muốn đồ uống không?'],
    ['Just a glass of water, thank you.', 'Chỉ một cốc nước thôi, cảm ơn.'],
    ['Your order will be ready in ten minutes.', 'Món của bạn sẽ sẵn sàng trong mười phút.'],
  ]),
  dialogue('directions', 'Everyday', 'Finding the station', 'Hỏi đường và xác nhận vị trí.', ['Visitor', 'Local'], ['station', 'turn', 'bridge'], [
    ['Excuse me. How do I get to the station?', 'Xin lỗi. Tôi đến nhà ga bằng cách nào?'],
    ['Walk straight ahead, then turn left at the bridge.', 'Đi thẳng, rồi rẽ trái ở cây cầu.'],
    ['Is the station far from the bridge?', 'Nhà ga có xa cây cầu không?'],
    ['No. It is about five minutes away on foot.', 'Không. Đi bộ mất khoảng năm phút.'],
    ['So I turn left, not right?', 'Vậy tôi rẽ trái, không phải rẽ phải, đúng không?'],
    ['That is right. You will see the entrance beside a cafe.', 'Đúng rồi. Bạn sẽ thấy lối vào bên cạnh một quán cà phê.'],
  ]),
  dialogue('hotel', 'Travel', 'Checking in at a hotel', 'Xác nhận đặt phòng và hỏi giờ ăn sáng.', ['Guest', 'Receptionist'], ['reservation', 'breakfast', 'key'], [
    ['Hello. I have a reservation under the name Lee.', 'Xin chào. Tôi đã đặt phòng với tên Lee.'],
    ['Welcome. May I see your identification, please?', 'Chào mừng. Tôi có thể xem giấy tờ tùy thân của bạn không?'],
    ['Here it is. Is breakfast included?', 'Đây. Bữa sáng có được bao gồm không?'],
    ['Yes. Breakfast is served from seven until ten.', 'Có. Bữa sáng được phục vụ từ bảy đến mười giờ.'],
    ['Thank you. Could I have a room away from the lift?', 'Cảm ơn. Tôi có thể nhận phòng xa thang máy không?'],
    ['Certainly. Here is your key. Your room is on the second floor.', 'Được chứ. Đây là chìa khóa của bạn. Phòng ở tầng hai.'],
  ]),
  dialogue('meeting', 'Work & study', 'Planning a team task', 'Thống nhất công việc và hạn hoàn thành.', ['Mina', 'Jordan'], ['draft', 'review', 'deadline'], [
    ['Could we review the plan before we begin?', 'Chúng ta xem lại kế hoạch trước khi bắt đầu được không?'],
    ['Yes. We need a short draft by Thursday.', 'Được. Chúng ta cần một bản nháp ngắn trước thứ Năm.'],
    ['I can write the introduction. Who will check the figures?', 'Tôi có thể viết phần giới thiệu. Ai sẽ kiểm tra số liệu?'],
    ['I will check them and send you my notes tomorrow.', 'Tôi sẽ kiểm tra và gửi ghi chú cho bạn ngày mai.'],
    ['That works. Shall we meet again on Wednesday?', 'Như vậy ổn. Chúng ta gặp lại vào thứ Tư nhé?'],
    ['Agreed. Let us check our progress then.', 'Đồng ý. Khi đó chúng ta kiểm tra tiến độ nhé.'],
  ], 'Longer sentences'),
  dialogue('opinions', 'Discussion', 'Choosing a quieter workspace', 'Nêu ý kiến, cân nhắc lợi ích và đề xuất thử nghiệm.', ['Taylor', 'Robin'], ['focus', 'shared', 'trial'], [
    ['I find it difficult to focus in the shared room. What do you think?', 'Tôi thấy khó tập trung trong phòng chung. Bạn nghĩ sao?'],
    ['I understand, but the shared room makes quick discussions easier.', 'Tôi hiểu, nhưng phòng chung giúp trao đổi nhanh dễ hơn.'],
    ['Could we reserve one quiet room for tasks that need concentration?', 'Chúng ta dành một phòng yên tĩnh cho việc cần tập trung được không?'],
    ['That might help. We should make sure everyone can use it fairly.', 'Có thể hữu ích. Chúng ta nên đảm bảo ai cũng có thể dùng công bằng.'],
    ['Perhaps we could try a booking system for two weeks.', 'Có lẽ chúng ta thử hệ thống đặt phòng trong hai tuần.'],
    ['Good idea. After the trial, we can ask the team for feedback.', 'Ý hay. Sau khi thử, chúng ta có thể hỏi ý kiến nhóm.'],
  ], 'Longer sentences'),
];

export interface EnglishReadingLesson {
  id: string; title: string; type: 'Article' | 'Story'; topic: string; text: string; explanation: string;
  vocabulary: string[]; questions: { prompt: string; options: string[]; answer: number; explanation: string }[]; metadata: ContentMetadata;
}
export const englishReadingLessons: EnglishReadingLesson[] = [
  { id: 'everyday-learning', title: 'Learning a little every day', type: 'Article', topic: 'Đời sống', text: 'I am learning English every day. I do not try to remember a hundred new words at once. Instead, I read a short text and choose two words that I want to use.\n\nYesterday, I went to the library. Some children were reading a story together. Their teacher asked them to look up an unfamiliar word. They discussed its meaning before they continued reading.\n\nA better study routine is not always a longer one. A small task that fits into your day can be easier to repeat. After reading, I write one sentence using a new word. Later, I return to my saved words and review them.', explanation: 'Bài thử nói về thói quen học ít nhưng đều. Chạm learning, went, children, better hoặc look up để tra các dạng từ.', vocabulary: ['learn', 'library', 'child', 'routine', 'look up'], questions: [{ prompt: 'How many words does the writer choose?', options: ['Two words', 'A hundred words', 'No words'], answer: 0, explanation: 'Đoạn đầu nói người viết chọn hai từ muốn sử dụng.' }], metadata: originalContentMetadata },
  { id: 'weekend-story', title: 'The missing notebook', type: 'Story', topic: 'Cuối tuần', text: 'On Saturday morning, Nina was ready to visit her friend. She put her keys in her bag, but her small notebook was missing. She used it to write down ideas for stories.\n\nNina looked under the table and behind the sofa. Then she remembered her walk to the park the day before. She had stopped beside a tree to draw a bird. Perhaps the notebook was still there.\n\nAt the park, a gardener was holding a blue notebook. He had found it on a bench, not beside the tree. Nina thanked him and opened it. On the last page, she wrote a new idea: a story about a person who helped a stranger.', explanation: 'Truyện gốc thử nghiệm. Nina tìm sổ và nhớ lại việc đã làm; chưa được duyệt như graded reader theo CEFR.', vocabulary: ['notebook', 'missing', 'bench', 'stranger'], questions: [{ prompt: 'Where did the gardener find the notebook?', options: ['On a bench', 'Behind a sofa', 'Under a table'], answer: 0, explanation: 'Người làm vườn tìm được sổ trên ghế dài.' }], metadata: originalContentMetadata },
  { id: 'healthy-habits', title: 'A short walk after work', type: 'Article', topic: 'Thói quen', text: 'After a busy day at work, Ben usually sits on the sofa and looks at his phone. One evening, he decides to leave his phone at home and take a short walk.\n\nOutside, he notices the colours of the sky and hears people talking near a small shop. He does not walk quickly. He simply follows a quiet street and returns after fifteen minutes.\n\nThe next evening, his sister joins him. They talk about their day without looking at a screen. Ben does not expect one walk to change his life. He just wants to make a little room for a different habit. When it rains, they choose another simple activity at home.', explanation: 'Bài luyện đọc về một thói quen đời thường, không phải hướng dẫn y tế.', vocabulary: ['notice', 'quiet', 'habit', 'activity'], questions: [{ prompt: 'What does Ben leave at home?', options: ['His phone', 'His sister', 'His shoes'], answer: 0, explanation: 'Ben để điện thoại ở nhà trước khi đi dạo.' }], metadata: originalContentMetadata },
  { id: 'technology-help', title: 'A useful tool, not every answer', type: 'Article', topic: 'Công nghệ', text: 'A translation tool can help us understand a message in another language. However, a single word may have several meanings. The right meaning often depends on the sentence around it.\n\nImagine that a friend writes about a bank beside a river. A tool might suggest a place where people keep money. Before accepting that suggestion, we should read the whole sentence. In this case, the friend is describing the edge of the river.\n\nGood tools show their limits and let people make choices. When we save a new word, we can choose the meaning that matches our text. Keeping a short example can help us remember why we chose that meaning. A tool supports learning; it does not replace careful reading.', explanation: 'Bài thử về ngữ cảnh và từ đa nghĩa; không dùng câu river bank để chấm nghĩa ngân hàng.', vocabulary: ['translation', 'message', 'bank', 'choice'], questions: [{ prompt: 'What should we read before accepting a meaning?', options: ['The whole sentence', 'Only the first letter', 'Nothing else'], answer: 0, explanation: 'Cần đọc cả câu để hiểu ngữ cảnh.' }], metadata: originalContentMetadata },
];
export function publishedEnglishContent<T extends { metadata: ContentMetadata }>(content: T[]): T[] {
  // Deliberately empty until a separately approved human-reviewed publishing decision.
  return content.filter(row => (row.metadata.publication as string) === 'PUBLISHED' && (row.metadata.review as string) === 'HUMAN_REVIEWED');
}
