import { describe, expect, it } from 'vitest';

import {
  DATABASE_VERSION,
  isValidMigrationVersion,
  latestIndexSql,
  migrationSql,
  migrationV2Sql,
  migrationV3Sql,
  migrationV4Sql,
  migrationV5Sql,
  migrationV10Sql,
  migrationV11Sql,
  migrationV12Sql,
} from './schema';

describe('database migration', () => {
  it('contains every persistence table and the v2 indexes', () => {
    for (const table of ['vocabulary','example_sentence','vocabulary_character_index','user_vocabulary_progress','review_log','daily_stats','user_settings','personal_deck','image_assets']) {
      expect(migrationSql).toContain(`TABLE IF NOT EXISTS ${table}`);
    }
    expect(latestIndexSql).toContain('idx_progress_next_review');
    expect(latestIndexSql).toContain('idx_vocabulary_deck');
    expect(latestIndexSql).toContain('idx_vocabulary_pinyin_compact');
    expect(latestIndexSql).toContain('idx_personal_deck_deleted');
    expect(latestIndexSql).toContain('idx_vocabulary_character_lookup');
  });

  it('adds recoverable soft-delete support for personal decks', () => {
    expect(migrationSql).toContain('deleted_at TEXT');
    expect(migrationV3Sql).toContain('ALTER TABLE personal_deck ADD COLUMN deleted_at TEXT');
    expect(migrationV3Sql).not.toContain('DROP TABLE');
  });

  it('migrates legacy FSRS data without deleting its columns', () => {
    expect(migrationV2Sql).toContain('memory_level');
    expect(migrationV2Sql).toContain('next_review_at');
    expect(migrationV2Sql).toContain('stability < 14');
    expect(migrationV2Sql).not.toContain('DROP TABLE');
  });

  it('validates migration versions', () => {
    expect(isValidMigrationVersion(DATABASE_VERSION)).toBe(true);
    expect(isValidMigrationVersion(DATABASE_VERSION + 1)).toBe(false);
    expect(isValidMigrationVersion(-1)).toBe(false);
  });

  it('adds explicit lifecycle state and studied flag without deleting progress', () => {
    expect(migrationV4Sql).toContain('ADD COLUMN status');
    expect(migrationV4Sql).toContain('ADD COLUMN studied');
    expect(migrationV4Sql).toContain("'LEARNING'");
    expect(migrationV4Sql).not.toContain('DROP TABLE');
  });

  it('adds pinyin compose telemetry without deleting review history', () => {
    expect(migrationSql).toContain('typed_pinyin TEXT');
    expect(migrationSql).toContain('selected_hanzi TEXT');
    expect(migrationSql).toContain('candidate_rank INTEGER');
    expect(migrationV5Sql).toContain('ALTER TABLE review_log ADD COLUMN typed_pinyin');
    expect(migrationV5Sql).not.toContain('DROP TABLE');
  });

  it('adds nullable exercise telemetry without deleting review history', () => {
    expect(migrationSql).toContain('exercise_type TEXT');
    expect(migrationV10Sql).toContain('ALTER TABLE review_log ADD COLUMN exercise_type TEXT');
    expect(migrationV10Sql).not.toContain('DROP TABLE');
  });

  it('adds a recoverable character index for related-word lookups', () => {
    expect(migrationV11Sql).toContain('vocabulary_character_index');
    expect(migrationV11Sql).not.toContain('DROP TABLE');
  });

  it('adds image metadata without replacing vocabulary', () => {
    expect(migrationV12Sql).toContain('CREATE TABLE IF NOT EXISTS image_assets');
    expect(migrationV12Sql).not.toContain('DROP TABLE');
    expect(migrationV12Sql).not.toContain('DELETE FROM vocabulary');
  });
});
