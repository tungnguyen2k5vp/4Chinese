import type { SQLiteDatabase } from 'expo-sqlite';

import { awardActivityXp } from './gamification';

const storySeed = [
  { id: 'story-school-1', title: 'Một ngày ở trường', description: 'Tiểu Minh giới thiệu lớp học của mình.',
    level: '1', minutes: 3, content: '我叫小明。我是学生。我每天去学校。我的老师很好。我喜欢学中文。',
    prompt: 'Tiểu Minh làm gì mỗi ngày?', choices: ['Đi học', 'Đi bơi', 'Đi chợ'], answer: 0 },
  { id: 'story-weekend-2', title: 'Cuối tuần', description: 'Một buổi đi chơi cùng bạn bè.',
    level: '2', minutes: 4, content: '星期六，我和朋友去公园。天气很好。我们一起喝茶，也拍了照片。晚上我回家吃饭。',
    prompt: 'Họ đã đến đâu?', choices: ['Trường học', 'Công viên', 'Nhà hàng'], answer: 1 },
  { id: 'story-letter-3', title: 'Lá thư cho bạn', description: 'Một người bạn kể về cuộc sống ở thành phố.',
    level: '3', minutes: 5, content: '亲爱的朋友，我现在住在一个新的城市。这里的人很友好。虽然工作很忙，但是我每天都学习中文。我希望下个月能见到你。',
    prompt: 'Người viết hy vọng điều gì?', choices: ['Đổi việc', 'Đi học xa', 'Gặp bạn vào tháng sau'], answer: 2 },
] as const;

export type Story = { id: string; title: string; description: string; hsk_level: string; difficulty: number;
  content: string; estimated_minutes: number; best_score: number; attempts: number };
export type StoryQuestion = { id: string; story_id: string; prompt_vi: string; choices_json: string; correct_index: number };

export async function seedStories(db: SQLiteDatabase): Promise<void> {
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
    FROM stories s LEFT JOIN story_progress p ON p.story_id=s.id
    ORDER BY CAST(s.hsk_level AS INTEGER),s.difficulty,s.id`);
}

export async function getStory(db: SQLiteDatabase, storyId: string): Promise<Story | null> {
  return db.getFirstAsync<Story>(`SELECT s.id,s.title,s.description,s.hsk_level,s.difficulty,s.content,s.estimated_minutes,
    COALESCE(p.best_score,0) AS best_score,COALESCE(p.attempts,0) AS attempts
    FROM stories s LEFT JOIN story_progress p ON p.story_id=s.id WHERE s.id=?`, storyId);
}

export async function getStoryQuestions(db: SQLiteDatabase, storyId: string): Promise<StoryQuestion[]> {
  return db.getAllAsync<StoryQuestion>(`SELECT id,story_id,prompt_vi,choices_json,correct_index
    FROM story_questions WHERE story_id=? ORDER BY sort_order,id`, storyId);
}

export async function recordStoryAnswer(db: SQLiteDatabase, storyId: string, correct: boolean): Promise<void> {
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
