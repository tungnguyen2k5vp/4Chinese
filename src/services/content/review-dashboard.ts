import type { SQLiteDatabase } from 'expo-sqlite';

export type ReviewDashboardState = string;

export type ReviewDashboardRow = {
  key: string;
  label: string;
  table: string;
  statusColumn: string;
  available: boolean;
  statusTracked: boolean;
  total: number;
  counts: Readonly<Record<ReviewDashboardState, number>>;
};

type DashboardDefinition = Pick<ReviewDashboardRow, 'key' | 'label' | 'table' | 'statusColumn'> & { where?: string };

/** Fixed identifiers only: these definitions are not derived from user input. */
export const REVIEW_DASHBOARD_DEFINITIONS: readonly DashboardDefinition[] = [
  { key: 'hsk-mappings', label: 'Mapping từ vựng HSK', table: 'hsk_vocabulary_alignment', statusColumn: 'review_status' },
  { key: 'word-senses', label: 'Nghĩa của từ', table: 'word_senses', statusColumn: 'review_status' },
  { key: 'examples', label: 'Ví dụ câu', table: 'sentences', statusColumn: 'review_status' },
  { key: 'collocations', label: 'Cụm từ đi kèm', table: 'word_collocations', statusColumn: 'review_status' },
  { key: 'grammar', label: 'Ngữ pháp', table: 'grammar_points', statusColumn: 'review_status' },
  { key: 'stories', label: 'Truyện', table: 'stories', statusColumn: 'review_status' },
  { key: 'dialogues', label: 'Hội thoại', table: 'learning_dialogues', statusColumn: 'review_status' },
  { key: 'listening', label: 'Bài nghe', table: 'sentences', statusColumn: 'review_status', where: 'audio_uri IS NOT NULL AND length(trim(audio_uri)) > 0' },
  { key: 'exam-questions', label: 'Câu hỏi luyện thi', table: 'exam_questions', statusColumn: 'review_status' },
  { key: 'writing-prompts', label: 'Đề viết', table: 'written_practice', statusColumn: 'review_status' },
  { key: 'speaking-prompts', label: 'Đề nói', table: 'speaking_prompts', statusColumn: 'review_status' },
  { key: 'translation-prompts', label: 'Đề dịch', table: 'translation_prompts', statusColumn: 'review_status' },
];

type TableInfo = { name: string };
type CountRow = { state: string | null; count: number };

async function tableInfo(db: SQLiteDatabase, table: string): Promise<readonly TableInfo[]> {
  return db.getAllAsync<TableInfo>(`PRAGMA table_info(${table})`);
}

/**
 * Read-only developer report. Missing status tables are reported explicitly as
 * unavailable/untracked; the dashboard never turns missing data into zeros or
 * changes learner-owned records.
 */
export async function readReviewDashboard(db: SQLiteDatabase): Promise<ReviewDashboardRow[]> {
  const rows: ReviewDashboardRow[] = [];
  for (const definition of REVIEW_DASHBOARD_DEFINITIONS) {
    const columns = await tableInfo(db, definition.table);
    if (!columns.length) {
      rows.push({ ...definition, available: false, statusTracked: false, total: 0, counts: {} });
      continue;
    }
    const hasStatus = columns.some((column) => column.name === definition.statusColumn);
    const where = definition.where ? ` WHERE ${definition.where}` : '';
    if (!hasStatus) {
      const totalRow = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${definition.table}${where}`);
      const total = totalRow?.count ?? 0;
      rows.push({ ...definition, available: true, statusTracked: false, total, counts: { UNTRACKED: total } });
      continue;
    }
    const grouped = await db.getAllAsync<CountRow>(`SELECT ${definition.statusColumn} AS state, COUNT(*) AS count
      FROM ${definition.table}${where} GROUP BY ${definition.statusColumn}`);
    const counts: Record<string, number> = {};
    for (const group of grouped) counts[group.state?.trim() || 'UNSET'] = group.count;
    rows.push({ ...definition, available: true, statusTracked: true, total: Object.values(counts).reduce((sum, count) => sum + count, 0), counts });
  }
  return rows;
}

