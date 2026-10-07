import type { SQLiteDatabase } from 'expo-sqlite';

import { validatePublishedStoryPack } from '../data/stories-v5';
import type { ContentPackApplier } from '../services/content/content-delivery';

import { awardActivityXp } from './gamification';

export const storySeed = [
  { id: 'story-school-1', title: 'Một ngày ở trường', description: 'Tiểu Minh giới thiệu lớp học của mình.',
    level: '1', minutes: 3, content: '我叫小明。我是学生。我每天去学校。我的老师很好。我喜欢学中文。',
    prompt: 'Tiểu Minh làm gì mỗi ngày?', choices: ['Đi học', 'Đi bơi', 'Đi chợ'], answer: 0 },
  { id: 'story-new-friend-hsk1', title: 'Bạn cùng bàn mới', description: 'Tiểu Minh làm quen với một bạn mới trong lớp.',
    level: '1', minutes: 3, content: '今天班里来了一个新同学，叫小雨。老师让她坐在我旁边。下课以后，我问她喜欢什么。她说喜欢看书和听音乐。中午，我请她和我们一起吃饭。',
    prompt: 'Tiểu Vũ ăn trưa cùng ai?', choices: ['Cô giáo', 'Tiểu Minh và các bạn', 'Mẹ của bạn ấy'], answer: 1 },
  { id: 'story-rainy-day-hsk1', title: 'Cơn mưa sau giờ học', description: 'Quên mang ô, Tiểu Minh được chị đón ở cổng trường.',
    level: '1', minutes: 3, content: '今天早上天气很好，我没带雨伞。下午放学的时候，下雨了。我在学校门口等了一会儿，姐姐拿着一把伞来接我。我们一起回家，衣服没有湿。',
    prompt: 'Ai đến đón Tiểu Minh?', choices: ['Anh trai', 'Mẹ', 'Chị gái'], answer: 2 },
  { id: 'story-fruit-shop-hsk1', title: 'Ở cửa hàng trái cây', description: 'Hai chị em mua trái cây rồi mang về chia cho bố mẹ.',
    level: '1', minutes: 3, content: '星期天，我和姐姐去水果店。姐姐买了三个苹果，我买了两根香蕉。回家以后，我们把水果洗干净，分给爸爸和妈妈吃。',
    prompt: 'Người kể chuyện mua gì?', choices: ['Hai quả chuối', 'Hai quả táo', 'Hai quả lê'], answer: 0 },
  { id: 'story-family-dinner-hsk1', title: 'Bữa tối cả nhà', description: 'Một buổi tối mẹ nấu cơm, mọi người cùng chuẩn bị bàn ăn.',
    level: '1', minutes: 3, content: '今天爸爸不在家，妈妈做晚饭。我帮她洗菜，也把碗和筷子放在桌上。弟弟倒了水。饭做好以后，我们三个人一起吃饭。',
    prompt: 'Người kể giúp mẹ việc gì?', choices: ['Rửa rau và bày bát đũa', 'Đi mua quần áo', 'Dọn phòng ngủ'], answer: 0 },
  { id: 'story-lost-pencil-hsk1', title: 'Chiếc bút chì đâu rồi?', description: 'Trong giờ học, Tiểu Minh nhờ bạn tìm chiếc bút chì bị rơi.',
    level: '1', minutes: 3, content: '上课的时候，我找不到铅笔。我问小丽：“你看见我的铅笔了吗？”她指了指椅子旁边。我一看，铅笔掉在那里了。找到以后，我谢谢她。',
    prompt: 'Chiếc bút chì ở đâu?', choices: ['Trên bàn', 'Cạnh chiếc ghế', 'Trong cặp sách'], answer: 1 },
  { id: 'story-weekend-2', title: 'Cuối tuần', description: 'Một buổi đi chơi cùng bạn bè.',
    level: '2', minutes: 4, content: '星期六，我和朋友去公园。天气很好。我们一起喝茶，也拍了照片。晚上我回家吃饭。',
    prompt: 'Họ đã đến đâu?', choices: ['Trường học', 'Công viên', 'Nhà hàng'], answer: 1 },
  { id: 'story-birthday-hsk2', title: 'Chiếc bánh sinh nhật', description: 'Tiểu Vũ bất ngờ khi cả nhà nhớ ngày sinh nhật của mình.',
    level: '2', minutes: 4, content: '今天是小雨的生日。她下课以后回家，看见桌上有一个大蛋糕。妈妈和弟弟都在家等她。吃完晚饭，他们一起唱生日歌。小雨很高兴，因为家人都记得这一天。',
    prompt: 'Tiểu Vũ nhìn thấy gì trên bàn khi về nhà?', choices: ['Một chiếc bánh sinh nhật', 'Một quyển sách mới', 'Một bó hoa'], answer: 0 },
  { id: 'story-wrong-bus-hsk2', title: 'Chuyến xe đi nhầm đường', description: 'Trên đường đến thăm bà, người kể phát hiện mình lên nhầm xe buýt.',
    level: '2', minutes: 4, content: '今天我要去外婆家。上了公共汽车以后，我发现车走的路和以前不一样。我问司机，才知道自己坐错了车。下一站我下车，再坐另一辆车。虽然晚了一点儿，外婆还是在门口等我。',
    prompt: 'Vì sao người kể xuống xe ở trạm tiếp theo?', choices: ['Xe đã đến nhà bà', 'Người kể lên nhầm xe', 'Người kể muốn mua đồ'], answer: 1 },
  { id: 'story-library-book-hsk2', title: 'Quyển sách ở thư viện', description: 'Một bạn quay lại thư viện sớm để mượn cuốn sách mình muốn đọc.',
    level: '2', minutes: 4, content: '周三下午，我去图书馆还书。我还想借一本关于动物的书，可是书架上没有了。图书馆阿姨说，第二天会有新书。我第二天早一点儿去，果然借到了。',
    prompt: 'Người kể muốn mượn sách về chủ đề gì?', choices: ['Âm nhạc', 'Du lịch', 'Động vật'], answer: 2 },
  { id: 'story-learn-swimming-hsk2', title: 'Học bơi', description: 'Từ sợ nước, người kể dần tự bơi được sang bên kia hồ.',
    level: '2', minutes: 4, content: '暑假里，我开始学游泳。刚下水时，我有点儿害怕，不敢把头放进水里。老师让我先在水里走，再慢慢练习呼吸。一个星期后，我已经可以游到池子的另一边了。',
    prompt: 'Sau một tuần, người kể đã làm được điều gì?', choices: ['Tự bơi sang phía bên kia hồ', 'Dạy bơi cho thầy giáo', 'Bơi ra biển một mình'], answer: 0 },
  { id: 'story-supermarket-list-hsk2', title: 'Danh sách đi siêu thị', description: 'Người kể ghi lại món cần mua và kiểm tra tiền trước khi tính tiền.',
    level: '2', minutes: 4, content: '爸爸请我去超市买牛奶和面包。我把要买的东西写在纸上，找到一样就划掉一样。结账时，我发现钱不够，就没有买饮料。回家后，爸爸说我做得很仔细。',
    prompt: 'Vì sao người kể không mua nước uống?', choices: ['Trong siêu thị không có', 'Mang không đủ tiền', 'Bố không thích uống'], answer: 1 },
  { id: 'story-letter-3', title: 'Lá thư cho bạn', description: 'Một người bạn kể về cuộc sống ở thành phố.',
    level: '3', minutes: 5, content: '亲爱的朋友，我现在住在一个新的城市。这里的人很友好。虽然工作很忙，但是我每天都学习中文。我希望下个月能见到你。',
    prompt: 'Người viết hy vọng điều gì?', choices: ['Đổi việc', 'Đi học xa', 'Gặp bạn vào tháng sau'], answer: 2 },
  { id: 'story-train-visit-hsk3', title: 'Chuyến tàu thăm bà', description: 'Một chuyến đi một mình có chút bối rối nhưng kết thúc bằng cuộc đoàn tụ vui vẻ.',
    level: '3', minutes: 5, content: '上个月，我第一次一个人坐火车去看外婆。出发前，我把车票和地址放进一个小袋子里。到了车站，我一时找不到检票口，幸好工作人员耐心地告诉我怎么走。外婆在出口等我，看见我就笑了。',
    prompt: 'Ở nhà ga, người kể gặp khó khăn gì?', choices: ['Không tìm thấy cổng soát vé', 'Làm mất túi hành lý', 'Không nhớ số điện thoại của bà'], answer: 0 },
  { id: 'story-old-photo-hsk3', title: 'Tấm ảnh cũ', description: 'Một tấm ảnh cũ gợi cho bố nhớ lại chuyến đi với ông nội.',
    level: '3', minutes: 5, content: '搬家的时候，我在柜子里找到一张旧照片。照片上，爸爸还是个孩子，正坐在河边钓鱼。我把照片拿给他看，他想了好一会儿，才想起那是小时候和爷爷去旅行时拍的。那天晚上，我们听他讲了很久。',
    prompt: 'Bức ảnh chụp bố đang làm gì?', choices: ['Đọc sách bên cửa sổ', 'Câu cá bên bờ sông', 'Đạp xe trong công viên'], answer: 1 },
  { id: 'story-lost-dog-hsk3', title: 'Chú chó ở cổng công viên', description: 'Người kể tìm cách liên lạc với chủ của chú chó đi lạc.',
    level: '3', minutes: 5, content: '回家路上，我在公园门口看见一只小狗，脖子上挂着写有电话号码的牌子。我先打电话联系主人，再陪小狗在门口等。十分钟后，一个着急的女孩跑来。她认出小狗后，连声向我道谢。',
    prompt: 'Trên cổ chú chó có vật gì?', choices: ['Một chiếc khăn màu đỏ', 'Một chiếc vòng không có tên', 'Một chiếc thẻ ghi số điện thoại'], answer: 2 },
  { id: 'story-message-mixup-hsk3', title: 'Tin nhắn bị hiểu nhầm', description: 'Chỉ một chữ trong tin nhắn khiến hai người hẹn lệch giờ.',
    level: '3', minutes: 5, content: '小林发消息说：“三点后在咖啡店见。”我把“后”看成“前”，两点半就到了。等到三点还没见到他，我便打电话确认。小林说他刚出门，我这才发现自己看错了。最后我们还是一起喝了咖啡。',
    prompt: 'Vì sao người kể đến quán cà phê sớm?', choices: ['Đọc nhầm chữ “后” thành “前”', 'Nhớ nhầm địa chỉ quán', 'Muốn mua cà phê trước'], answer: 0 },
  { id: 'story-neighborhood-trees-hsk3', title: 'Cây xanh trước khu nhà', description: 'Hàng xóm cùng trồng cây để con đường bớt nắng và dễ chịu hơn.',
    level: '3', minutes: 5, content: '小区门口的路边以前很晒，大家经过时总想找个阴凉的地方。上个月，邻居们一起种了几棵树。我们轮流浇水，孩子们还给树挂上名字牌。现在路上有了树荫，大家散步时常停下来聊几句。',
    prompt: 'Con đường thay đổi thế nào sau khi mọi người trồng cây?', choices: ['Trở nên mát hơn khi đi bộ', 'Xe cộ chạy nhanh hơn', 'Cửa hàng mở cửa muộn hơn'], answer: 0 },
] as const;

export type Story = { id: string; title: string; description: string; hsk_level: string; difficulty: number;
  content: string; estimated_minutes: number; best_score: number; attempts: number };
export type StoryQuestion = { id: string; story_id: string; prompt_vi: string; choices_json: string; correct_index: number };

export async function seedStories(db: SQLiteDatabase): Promise<void> {
  const storyIds = storySeed.map((story) => story.id);
  const questionIds = storySeed.map((story) => `${story.id}-q1`);
  const storyPlaceholders = storyIds.map(() => '?').join(',');
  const questionPlaceholders = questionIds.map(() => '?').join(',');
  const existing = await db.getFirstAsync<{ story_count: number; question_count: number }>(`SELECT
    (SELECT COUNT(*) FROM stories WHERE id IN (${storyPlaceholders})) AS story_count,
    (SELECT COUNT(*) FROM story_questions WHERE id IN (${questionPlaceholders})) AS question_count`,
  ...storyIds, ...questionIds);
  if (existing?.story_count === storySeed.length && existing.question_count === storySeed.length) return;

  await db.withTransactionAsync(async () => {
    for (const story of storySeed) {
      await db.runAsync(`INSERT OR IGNORE INTO stories(id,title,description,hsk_level,difficulty,content,estimated_minutes,created_at)
        VALUES(?,?,?,?,?,?,?,?)`, story.id, story.title, story.description, story.level, 1, story.content,
      story.minutes, '2026-09-27T00:00:00.000Z');
      await db.runAsync(`INSERT OR IGNORE INTO story_questions(id,story_id,prompt_vi,choices_json,correct_index)
        VALUES(?,?,?,?,?)`, `${story.id}-q1`, story.id, story.prompt, JSON.stringify(story.choices), story.answer);
    }
  });
}

export async function listStories(db: SQLiteDatabase): Promise<Story[]> {
  return db.getAllAsync<Story>(`SELECT s.id,s.title,s.description,s.hsk_level,s.difficulty,s.content,s.estimated_minutes,
    COALESCE(p.best_score,0) AS best_score,COALESCE(p.attempts,0) AS attempts
    FROM stories s LEFT JOIN story_progress p ON p.story_id=s.id WHERE s.is_active=1
    ORDER BY CAST(s.hsk_level AS INTEGER),s.difficulty,s.id`);
}

export async function getStory(db: SQLiteDatabase, storyId: string): Promise<Story | null> {
  return db.getFirstAsync<Story>(`SELECT s.id,s.title,s.description,s.hsk_level,s.difficulty,s.content,s.estimated_minutes,
    COALESCE(p.best_score,0) AS best_score,COALESCE(p.attempts,0) AS attempts
    FROM stories s LEFT JOIN story_progress p ON p.story_id=s.id WHERE s.id=? AND s.is_active=1`, storyId);
}

export async function getStoryQuestions(db: SQLiteDatabase, storyId: string): Promise<StoryQuestion[]> {
  return db.getAllAsync<StoryQuestion>(`SELECT id,story_id,prompt_vi,choices_json,correct_index
    FROM story_questions WHERE story_id=? ORDER BY sort_order,id`, storyId);
}

export async function recordStoryAnswer(db: SQLiteDatabase, storyId: string, correct: boolean): Promise<void> {
  // Legacy reader sends only q1. It must not mark a multi-question story complete or award XP.
  const questions = await getStoryQuestions(db, storyId);
  if (questions.length !== 1) throw new Error('STORY_FULL_QUIZ_REQUIRED');
  await saveStoryAttempt(db, storyId, correct);
}

async function saveStoryAttempt(db: SQLiteDatabase, storyId: string, correct: boolean): Promise<void> {
  const now = new Date().toISOString();
  const score = correct ? 1 : 0;
  await db.withTransactionAsync(async () => {
    await db.runAsync(`INSERT INTO story_progress(story_id,completed_at,best_score,attempts,updated_at)
    VALUES(?,?,?,1,?) ON CONFLICT(story_id) DO UPDATE SET
    completed_at=CASE WHEN excluded.best_score=1 THEN excluded.completed_at ELSE story_progress.completed_at END,
    best_score=MAX(story_progress.best_score,excluded.best_score),
    attempts=story_progress.attempts+1,updated_at=excluded.updated_at`, storyId, correct ? now : null, score, now);
    if (correct) await awardActivityXp(db, 'story', storyId);
  });
}

/** Validate the entire pack before writing; collision means skip, never replace saved content/questions.
 * Caller must retain the validated review manifest: current SQLite schema has no metadata columns.
 * Publication evidence is required, but this code cannot authenticate a human reviewer's identity.
 */
async function insertPublishedStories(db: SQLiteDatabase, payload: unknown): Promise<{ inserted: number; skipped: number }> {
  const stories = validatePublishedStoryPack(payload);
  let inserted = 0;
  let skipped = 0;
  for (const story of stories) {
    const result = await db.runAsync(`INSERT OR IGNORE INTO stories
      (id,title,description,hsk_level,difficulty,content,estimated_minutes,created_at)
      VALUES(?,?,?,?,?,?,?,?)`, story.id, story.title, story.description, story.level,
    story.level === '7-9' ? 7 : Number(story.level), story.sentences.map((s) => s.hanzi).join('\n'),
    story.minutes, story.review.evidence!.reviewedAt);
    if (!result.changes) { skipped++; continue; }
    inserted++;
    for (const [order, question] of story.questions.entries()) {
      await db.runAsync(`INSERT INTO story_questions(id,story_id,prompt_vi,choices_json,correct_index,sort_order)
        VALUES(?,?,?,?,?,?)`, `${story.id}-q${order + 1}`, story.id, question.promptVi,
      JSON.stringify(question.choices), question.answer, order);
    }
  }
  return { inserted, skipped };
}

export async function importPublishedStoryPack(db: SQLiteDatabase, payload: unknown): Promise<{ inserted: number; skipped: number }> {
  // Fail before opening a transaction for malformed, unpublished, or duplicate records.
  validatePublishedStoryPack(payload);
  let result = { inserted: 0, skipped: 0 };
  await db.withTransactionAsync(async () => { result = await insertPublishedStories(db, payload); });
  return result;
}

/** Opt-in adapter for the existing checksum/size/version delivery boundary, which owns its transaction.
 * No registration, download, sync, or publication is performed automatically.
 */
export const storyPackApplier: ContentPackApplier = {
  type: 'STORIES',
  validate(payload) { validatePublishedStoryPack(payload); },
  async apply(db, payload) { await insertPublishedStories(db, payload); },
};

export function splitStorySentences(content: string): string[] {
  return (content.match(/[^。！？\n]+[。！？]?/gu) ?? []).map((line) => line.trim()).filter(Boolean);
}

/** One attempt means the complete questionnaire; best_score remains the legacy 0/1 all-correct flag. */
export async function recordStoryQuiz(db: SQLiteDatabase, storyId: string, answers: readonly number[]): Promise<void> {
  const story = await getStory(db, storyId);
  const questions = await getStoryQuestions(db, storyId);
  if (!story || !questions.length || answers.length !== questions.length || answers.some((answer, index) => {
    const choices: unknown = JSON.parse(questions[index]!.choices_json);
    return !Array.isArray(choices) || !Number.isInteger(answer) || answer < 0 || answer >= choices.length;
  })) throw new Error('STORY_QUIZ_INCOMPLETE');
  await saveStoryAttempt(db, storyId, answers.every((answer, index) => answer === questions[index]!.correct_index));
}
