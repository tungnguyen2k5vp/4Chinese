import type { SQLiteDatabase } from 'expo-sqlite';

import { awardActivityXp } from './gamification';
import { recordPracticeResult } from './mistakes';

import type { Vocabulary } from '@/types/models';

type ExampleSeed = { hanzi: string; pinyin: string; vi: string; en: string; words: string[] };
export type GrammarSeed = { id: string; title: string; pattern: string; explanation: string; hsk: string;
  quiz: string; answer: string; options: string[]; examples: ExampleSeed[] };

export const grammarSeed: GrammarSeed[] = [
  { id: 'gram-shi', title: 'Câu với 是', pattern: 'A + 是 + B', explanation: 'Dùng 是 để nói A là B (danh từ).', hsk: '1',
    quiz: '我___学生。', answer: '是', options: ['在', '是', '有', '不'], examples: [
      { hanzi: '我是学生。', pinyin: 'Wǒ shì xuésheng.', vi: 'Tôi là học sinh.', en: 'I am a student.', words: ['我', '是', '学生'] },
      { hanzi: '他是老师。', pinyin: 'Tā shì lǎoshī.', vi: 'Anh ấy là giáo viên.', en: 'He is a teacher.', words: ['他', '是', '老师'] },
    ] },
  { id: 'gram-bu', title: 'Phủ định với 不', pattern: 'Chủ ngữ + 不 + động từ/tính từ',
    explanation: 'Đặt 不 trước động từ hoặc tính từ để phủ định (một số trường hợp như 有 dùng 没).', hsk: '1',
    quiz: '我___是老师。', answer: '不', options: ['有', '没', '不', '在'], examples: [
      { hanzi: '我不是老师。', pinyin: 'Wǒ bú shì lǎoshī.', vi: 'Tôi không phải là giáo viên.', en: 'I am not a teacher.', words: ['我', '不', '是', '老师'] },
      { hanzi: '他不喝茶。', pinyin: 'Tā bù hē chá.', vi: 'Anh ấy không uống trà.', en: 'He does not drink tea.', words: ['他', '不', '喝', '茶'] },
    ] },
  { id: 'gram-ma', title: 'Câu hỏi với 吗', pattern: 'Câu trần thuật + 吗？',
    explanation: 'Thêm 吗 cuối câu trần thuật để hỏi có/không.', hsk: '1',
    quiz: '你是学生___？', answer: '吗', options: ['的', '吗', '了', '在'], examples: [
      { hanzi: '你是学生吗？', pinyin: 'Nǐ shì xuésheng ma?', vi: 'Bạn là học sinh phải không?', en: 'Are you a student?', words: ['你', '是', '学生', '吗'] },
      { hanzi: '你喝茶吗？', pinyin: 'Nǐ hē chá ma?', vi: 'Bạn uống trà không?', en: 'Do you drink tea?', words: ['你', '喝', '茶', '吗'] },
    ] },
  { id: 'gram-you', title: 'Có với 有', pattern: 'Chủ ngữ + 有 + tân ngữ',
    explanation: '有 diễn tả sự sở hữu; phủ định là 没有.', hsk: '1',
    quiz: '我___一本书。', answer: '有', options: ['是', '在', '有', '的'], examples: [
      { hanzi: '我有一本书。', pinyin: 'Wǒ yǒu yì běn shū.', vi: 'Tôi có một quyển sách.', en: 'I have a book.', words: ['我', '有', '一', '本', '书'] },
      { hanzi: '她没有猫。', pinyin: 'Tā méiyǒu māo.', vi: 'Cô ấy không có mèo.', en: 'She does not have a cat.', words: ['她', '没有', '猫'] },
    ] },
  { id: 'gram-zai', title: 'Địa điểm với 在', pattern: 'Chủ ngữ + 在 + địa điểm',
    explanation: '在 đứng trước địa điểm để chỉ nơi đang ở.', hsk: '1',
    quiz: '我___学校。', answer: '在', options: ['有', '是', '在', '吗'], examples: [
      { hanzi: '我在学校。', pinyin: 'Wǒ zài xuéxiào.', vi: 'Tôi ở trường học.', en: 'I am at school.', words: ['我', '在', '学校'] },
      { hanzi: '他在家。', pinyin: 'Tā zài jiā.', vi: 'Anh ấy ở nhà.', en: 'He is at home.', words: ['他', '在', '家'] },
    ] },
  { id: 'gram-de', title: 'Sở hữu với 的', pattern: 'Người/vật sở hữu + 的 + danh từ',
    explanation: '的 nối người/vật sở hữu với danh từ phía sau.', hsk: '1',
    quiz: '这是我___书。', answer: '的', options: ['本', '的', '是', '在'], examples: [
      { hanzi: '这是我的书。', pinyin: 'Zhè shì wǒ de shū.', vi: 'Đây là sách của tôi.', en: 'This is my book.', words: ['这', '是', '我', '的', '书'] },
      { hanzi: '那是他的朋友。', pinyin: 'Nà shì tā de péngyou.', vi: 'Đó là bạn của anh ấy.', en: 'That is his friend.', words: ['那', '是', '他', '的', '朋友'] },
    ] },
  { id: 'gram-bi', title: 'So sánh với 比', pattern: 'A + 比 + B + tính từ',
    explanation: '比 đặt giữa hai đối tượng để so sánh đặc điểm.', hsk: '2',
    quiz: '他___我高。', answer: '比', options: ['在', '是', '比', '的'], examples: [
      { hanzi: '他比我高。', pinyin: 'Tā bǐ wǒ gāo.', vi: 'Anh ấy cao hơn tôi.', en: 'He is taller than me.', words: ['他', '比', '我', '高'] },
      { hanzi: '今天比昨天冷。', pinyin: 'Jīntiān bǐ zuótiān lěng.', vi: 'Hôm nay lạnh hơn hôm qua.', en: 'Today is colder than yesterday.', words: ['今天', '比', '昨天', '冷'] },
    ] },
];

export type GrammarPoint = { id: string; title: string; pattern: string; explanation_vi: string;
  hsk_level: string; attempts: number; correct: number };
export type GrammarExample = { id: string; hanzi: string; pinyin: string; translation_vi: string;
  translation_en: string | null };

export async function seedGrammarContent(db: SQLiteDatabase, vocabulary: Vocabulary[]): Promise<void> {
  const wordIds = new Map<string, string>();
  for (const word of vocabulary) if (!wordIds.has(word.simplified)) wordIds.set(word.simplified, word.id);
  const existingIds = new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM vocabulary')).map((row) => row.id));
  await db.withTransactionAsync(async () => {
    for (const grammar of grammarSeed) {
      await db.runAsync(`INSERT OR IGNORE INTO grammar_points
        (id,title,pattern,explanation_vi,hsk_level,difficulty,created_at) VALUES(?,?,?,?,?,?,?)`,
      grammar.id, grammar.title, grammar.pattern, grammar.explanation, grammar.hsk, 1, '2026-09-27T00:00:00.000Z');
      const grammarWord = wordIds.get(grammar.answer);
      if (grammarWord && existingIds.has(grammarWord)) await db.runAsync(`INSERT OR IGNORE INTO grammar_vocabulary_links(grammar_id,vocabulary_id) VALUES(?,?)`,
        grammar.id, grammarWord);
      for (const [index, example] of grammar.examples.entries()) {
        const id = `sentence-${grammar.id}-${index + 1}`;
        await db.runAsync(`INSERT OR IGNORE INTO sentences
          (id,hanzi,pinyin,translation_vi,translation_en,hsk_level,difficulty,topic,source,created_at)
          VALUES(?,?,?,?,?,?,?,?,?,?)`, id, example.hanzi, example.pinyin, example.vi, example.en,
        grammar.hsk, 1, 'grammar', '4Chinese curriculum v1', '2026-09-27T00:00:00.000Z');
        await db.runAsync(`INSERT OR IGNORE INTO grammar_examples(grammar_id,sentence_id,sort_order) VALUES(?,?,?)`,
          grammar.id, id, index);
        await db.runAsync(`INSERT OR IGNORE INTO sentence_grammar(sentence_id,grammar_id) VALUES(?,?)`, id, grammar.id);
        for (const [position, token] of example.words.entries()) {
          const wordId = wordIds.get(token);
          if (wordId && existingIds.has(wordId)) await db.runAsync(`INSERT OR IGNORE INTO sentence_vocabulary(sentence_id,vocabulary_id,position)
            VALUES(?,?,?)`, id, wordId, position);
        }
      }
    }
  });
}

export async function listGrammarPoints(db: SQLiteDatabase): Promise<GrammarPoint[]> {
  return db.getAllAsync<GrammarPoint>(`SELECT g.id,g.title,g.pattern,g.explanation_vi,g.hsk_level,
    COALESCE(p.attempts,0) AS attempts,COALESCE(p.correct,0) AS correct
    FROM grammar_points g LEFT JOIN grammar_progress p ON p.grammar_id=g.id
    ORDER BY CAST(g.hsk_level AS INTEGER),g.difficulty,g.id`);
}

export async function listGrammarExamples(db: SQLiteDatabase, grammarId: string): Promise<GrammarExample[]> {
  return db.getAllAsync<GrammarExample>(`SELECT s.id,s.hanzi,s.pinyin,s.translation_vi,s.translation_en
    FROM grammar_examples e JOIN sentences s ON s.id=e.sentence_id
    WHERE e.grammar_id=? ORDER BY e.sort_order,s.id`, grammarId);
}

export async function recordGrammarAnswer(db: SQLiteDatabase, grammarId: string, correct: boolean,
  attempt?: { id: string; exerciseType: string }): Promise<void> {
  const now = new Date().toISOString();
  const attemptId = attempt?.id ?? `${now}-${Math.random().toString(36).slice(2)}`;
  const exerciseType = attempt?.exerciseType ?? 'grammar_fill_blank';
  if (!attemptId || !/^grammar_(choice|fill_blank|reorder|translation|correction)$/.test(exerciseType)) throw new Error('INVALID_GRAMMAR_ATTEMPT');
  await db.withTransactionAsync(async () => {
    const inserted = await db.runAsync('INSERT OR IGNORE INTO grammar_attempts(id,grammar_id,exercise_type,correct,created_at) VALUES(?,?,?,?,?)',
      attemptId, grammarId, exerciseType, correct ? 1 : 0, now);
    if (!inserted.changes) return;
    await db.runAsync(`INSERT INTO grammar_progress(grammar_id,attempts,correct,last_practiced_at,updated_at)
    VALUES(?,1,?,?,?) ON CONFLICT(grammar_id) DO UPDATE SET
    attempts=grammar_progress.attempts+1,correct=grammar_progress.correct+excluded.correct,
    last_practiced_at=excluded.last_practiced_at,updated_at=excluded.updated_at`, grammarId, correct ? 1 : 0, now, now);
    await recordPracticeResult(db, { grammarId, skill: 'GRAMMAR', exerciseType, correct });
    if (correct) await awardActivityXp(db, 'grammar', `${grammarId}:${exerciseType}`);
  });
}
