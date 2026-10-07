import { performance } from 'node:perf_hooks';
import { DatabaseSync } from 'node:sqlite';

import { getOfflineVocabulary } from '../src/db/database';
import { expoAdapter } from '../src/db/fixtures/legacy_database';
import { migrateDatabaseSchema } from '../src/db/migrations';
import { normalizeSearch } from '../src/services/search/normalize';
import { resolveBulkVocabulary } from '../src/services/vocabulary/bulk-import';

const terms = [
  'hôm qua', 'hôm nay', 'ngôi sao', 'tuần', 'ngày mai', 'chủ nhật', 'kia', 'đây', 'nào', 'đâu',
  'làm', 'công', 'phòng', 'phòng làm việc', 'dạy', 'phòng học', 'chỉ', 'nhân viên', 'sống', 'ở',
  'tầng', 'phòng nhà', 'gian phòng', 'số', 'dãy số', 'điện thoại', 'có', 'và', 'có thể', 'đều',
  'cảm ơn', 'ăn', 'uống', 'đồ ăn', 'muốn', 'cái bát', 'nhà ăn', 'bánh bao', 'mỳ', 'trứng gà',
  'buổi tối', 'đói', 'chậm', 'cái khác', 'bọn họ', 'trung quốc', 'học sinh', 'bạn bè', 'tên', 'nước',
  'sách', 'trường học', 'đại học', 'trả lại', 'xin lỗi', 'tạm biệt', 'hẹn gặp lại', 'đúng', 'nhiều', 'quả dưa',
  'thư viện', 'máy bay', 'sân bay', 'bệnh viện', 'bác sĩ', 'y tá', 'ngân hàng', 'siêu thị', 'khách sạn', 'nhà hàng',
  'tàu hỏa', 'xe buýt', 'xe đạp', 'taxi', 'bản đồ', 'đường', 'gần', 'xa', 'bên trái', 'bên phải',
  'bắt đầu', 'kết thúc', 'giúp đỡ', 'hiểu', 'biết', 'nhớ', 'quên', 'thích', 'yêu', 'cần',
  '工作', '图书馆', 'xue2 sheng1', 'xuéshēng', '朋友', '谢谢', '再见', '学校', '老师', '名字',
];

function seedDictionary(sqlite: DatabaseSync): void {
  const statement = sqlite.prepare(`INSERT INTO vocabulary(
    id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,
    pos,hsk_band,source,source_version,source_url,translation_status,search_text,is_custom,deck_id
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  sqlite.exec('BEGIN TRANSACTION');
  try {
    for (const word of getOfflineVocabulary()) {
      statement.run(
        word.id, word.simplified, word.traditional, word.pinyin, word.pinyinNumeric,
        word.primaryMeaningVi, JSON.stringify(word.meaningsVi), JSON.stringify(word.meaningsEn),
        JSON.stringify(word.pos), String(word.hskBand), word.source, word.sourceVersion,
        word.sourceUrl, word.translationStatus,
        normalizeSearch([
          word.simplified, word.traditional, word.pinyin, word.pinyinNumeric,
          ...word.meaningsVi, ...word.meaningsEn,
        ].join(' ')),
        0, null,
      );
    }
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

function percentile(samples: number[], ratio: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

async function measure(db: ReturnType<typeof expoAdapter>, inputs: string[]) {
  const samples: number[] = [];
  let resolved = 0;
  const input = inputs.join('\n');
  await resolveBulkVocabulary(db, input);
  for (let run = 0; run < 3; run += 1) {
    const startedAt = performance.now();
    resolved = (await resolveBulkVocabulary(db, input)).filter((item) => item.word).length;
    samples.push(performance.now() - startedAt);
  }
  return {
    inputCount: inputs.length,
    resolved,
    medianMs: Math.round(percentile(samples, 0.5) * 100) / 100,
    p95Ms: Math.round(percentile(samples, 0.95) * 100) / 100,
  };
}

async function main(): Promise<void> {
  const sqlite = new DatabaseSync(':memory:');
  try {
    const db = expoAdapter(sqlite);
    await migrateDatabaseSchema(db);
    seedDictionary(sqlite);
    const results = [];
    for (const count of [1, 10, 50, 100]) results.push(await measure(db, terms.slice(0, count)));
    process.stdout.write(`${JSON.stringify({
      dictionarySize: sqlite.prepare('SELECT COUNT(*) AS count FROM vocabulary').get(),
      results,
    }, null, 2)}\n`);
  } finally {
    sqlite.close();
  }
}

void main();
