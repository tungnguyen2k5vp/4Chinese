import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { DATABASE_VERSION, migrationSql } from './schema';

const preservedTables = [
  'personal_deck', 'vocabulary', 'example_sentence', 'user_vocabulary_progress', 'review_log', 'daily_stats',
  'user_settings', 'lesson_progress', 'lesson_activity_progress', 'grammar_progress', 'story_progress',
  'mistake_records', 'vocabulary_skill_mastery', 'speaking_practice', 'xp_events', 'user_achievements',
  'learning_goals', 'reading_documents', 'reading_progress', 'reading_vocabulary',
] as const;

function snapshotUserData(sqlite: DatabaseSync): Record<string, unknown[]> {
  return Object.fromEntries(preservedTables.map((table) => [
    table,
    sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1`).all(),
  ]));
}

function createVersion20Snapshot(): DatabaseSync {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(migrationSql);
  sqlite.exec('PRAGMA user_version = 20;');
  sqlite.exec(`
    INSERT INTO personal_deck(id,name,color,created_at,updated_at) VALUES('deck-v20','Bộ từ lâu năm','#2457D6','2026-09-01','2026-09-02');
    INSERT INTO vocabulary(id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,pos,hsk_band,classifiers,visual_type,source,source_version,source_url,translation_status,search_text,is_custom,created_at,updated_at)
      VALUES('hsk-v20','学习','學習','xuéxí','xue2xi2','học tập','["học tập"]','["study"]','["động từ"]','1','[]','none','bundle','1','https://example.test','verified','学习 xuexi học tập',0,'2026-09-01','2026-09-01');
    INSERT INTO vocabulary(id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,pos,hsk_band,classifiers,visual_type,source,source_version,source_url,translation_status,search_text,is_custom,deck_id,created_at,updated_at)
      VALUES('custom-v20','复习','複習','fùxí','fu4xi2','ôn bài','["ôn bài"]','["review"]','["động từ"]','2','[]','none','user','1','local','verified','复习 fuxi ôn bài',1,'deck-v20','2026-09-01','2026-09-02');
    INSERT INTO example_sentence(id,vocabulary_id,chinese,pinyin,vietnamese,difficulty) VALUES('example-v20','custom-v20','我晚上复习。','Wǒ wǎnshang fùxí.','Tôi ôn bài buổi tối.',1);
    INSERT INTO user_vocabulary_progress(vocabulary_id,status,studied,due,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,state,mastery_level,is_known,is_favorite,is_suspended,notes,memory_level,deep_memory_stage,next_review_at,review_count,correct_count,wrong_count,lapse_count,consecutive_correct,consecutive_wrong,hint_used_count,average_response_time_ms,last_response_time_ms,created_at,updated_at)
      VALUES('hsk-v20','LEARNING',1,'2026-10-01',4,5,1,2,0,3,1,2,3,0,1,0,'Ghi chú cần giữ',3,0,'2026-10-01',3,2,1,1,2,0,0,1200,800,'2026-09-01','2026-09-02');
    INSERT INTO review_log(vocabulary_id,reviewed_at,rating,previous_state,new_state,response_time_ms,mode,exercise_type)
      VALUES('hsk-v20','2026-09-02',3,1,2,800,'hanzi-meaning','hanzi_to_meaning');
    INSERT INTO daily_stats(date,reviewed,correct,new_words,study_seconds) VALUES('2026-09-02',12,10,3,900);
    INSERT INTO user_settings(id,value,updated_at) VALUES(1,'{"dailyNewWordGoal":15}','2026-09-02');
    INSERT INTO courses(id,title,description,hsk_band,sort_order,created_at) VALUES('course-v20','HSK 1','Nền tảng','1',1,'2026-09-01');
    INSERT INTO units(id,course_id,title,sort_order) VALUES('unit-v20','course-v20','Bài 1',1);
    INSERT INTO lessons(id,unit_id,title,estimated_minutes,xp_reward,sort_order) VALUES('lesson-v20','unit-v20','Từ và ngữ cảnh',15,20,1);
    INSERT INTO lesson_activities(id,lesson_id,activity_type,title,target,sort_order) VALUES('activity-v20','lesson-v20','VOCABULARY','Xem từ HSK','1',1);
    INSERT INTO lesson_progress(lesson_id,status,started_at,completed_at,updated_at) VALUES('lesson-v20','COMPLETED','2026-09-01','2026-09-02','2026-09-02');
    INSERT INTO lesson_activity_progress(activity_id,completed_at) VALUES('activity-v20','2026-09-02');
    INSERT INTO grammar_points(id,title,pattern,explanation_vi,hsk_level,created_at) VALUES('grammar-v20','是','A 是 B','Mẫu câu cơ bản','1','2026-09-01');
    INSERT INTO grammar_progress(grammar_id,attempts,correct,last_practiced_at,updated_at) VALUES('grammar-v20',4,3,'2026-09-02','2026-09-02');
    INSERT INTO stories(id,title,description,hsk_level,content,created_at) VALUES('story-v20','Câu chuyện','Mô tả','1','我学习中文。','2026-09-01');
    INSERT INTO story_progress(story_id,completed_at,best_score,attempts,updated_at) VALUES('story-v20','2026-09-02',1,2,'2026-09-02');
    INSERT INTO mistake_records(id,vocabulary_id,skill_type,exercise_type,wrong_count,correct_streak,resolved,metadata,updated_at) VALUES('mistake-v20','hsk-v20','LISTENING','audio_to_meaning',2,0,0,'{}','2026-09-02');
    INSERT INTO vocabulary_skill_mastery(vocabulary_id,meaning_score,recognition_score,pinyin_score,listening_score,writing_score,speaking_score,updated_at) VALUES('hsk-v20',80,70,60,40,20,10,'2026-09-02');
    INSERT INTO speaking_practice(id,kind,vocabulary_id,correct,created_at) VALUES('tone-v20','tone','hsk-v20',1,'2026-09-02');
    INSERT INTO xp_events(id,activity,entity_id,points,local_date,created_at) VALUES('xp-v20','review','hsk-v20',5,'2026-09-02','2026-09-02');
    INSERT INTO achievements(id,title,metric,threshold) VALUES('achievement-v20','Khởi đầu','reviews',1);
    INSERT INTO user_achievements(achievement_id,unlocked_at) VALUES('achievement-v20','2026-09-02');
    INSERT INTO learning_goals(id,weekly_minutes,updated_at) VALUES(1,180,'2026-09-02');
    INSERT INTO reading_documents(id,title,content,created_at,updated_at) VALUES('reading-v20','Bài đọc','我学习中文。','2026-09-01','2026-09-02');
    INSERT INTO reading_progress(document_id,last_token_index,coverage_percent,last_read_at) VALUES('reading-v20',2,75,'2026-09-02');
    INSERT INTO reading_vocabulary(document_id,vocabulary_id,occurrences) VALUES('reading-v20','hsk-v20',1);
  `);
  return sqlite;
}

describe('version 20 production snapshot upgrade', () => {
  it('adds content metadata without losing a long-term learner profile', async () => {
    const sqlite = createVersion20Snapshot();
    try {
      const before = snapshotUserData(sqlite);
      const db = expoAdapter(sqlite);
      expect(await migrateDatabaseSchema(db)).toBe(20);
      expect(snapshotUserData(sqlite)).toEqual(before);
      expect(sqlite.prepare('SELECT name FROM sqlite_master WHERE type=? AND name=?').get('table', 'content_metadata'))
        .toEqual({ name: 'content_metadata' });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
      sqlite.exec(`PRAGMA user_version = ${DATABASE_VERSION};`);
      expect(await migrateDatabaseSchema(db)).toBe(DATABASE_VERSION);
      expect(snapshotUserData(sqlite)).toEqual(before);
    } finally {
      sqlite.close();
    }
  });
});
