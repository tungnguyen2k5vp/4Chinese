import type { SQLiteDatabase } from 'expo-sqlite';

export type SentenceCoverageBand = {
  hskBand: string;
  words: number;
  zeroSentences: number;
  oneSentence: number;
  twoSentences: number;
  threeOrMoreSentences: number;
};

/**
 * Counts only reviewed shared sentences. Drafts/rejected content must never
 * inflate learner-facing coverage numbers.
 */
export async function sentenceCoverageReport(db: SQLiteDatabase): Promise<SentenceCoverageBand[]> {
  const rows = await db.getAllAsync<{
    hsk_band: string;
    sentence_count: number;
  }>(`SELECT v.hsk_band,COUNT(s.id) AS sentence_count
    FROM vocabulary v
    LEFT JOIN sentence_vocabulary sv ON sv.vocabulary_id=v.id
    LEFT JOIN sentences s ON s.id=sv.sentence_id AND s.review_status='REVIEWED'
    WHERE v.is_custom=0
    GROUP BY v.id,v.hsk_band`);
  const byBand = new Map<string, SentenceCoverageBand>();
  for (const row of rows) {
    const band = byBand.get(row.hsk_band) ?? {
      hskBand: row.hsk_band, words: 0, zeroSentences: 0, oneSentence: 0, twoSentences: 0, threeOrMoreSentences: 0,
    };
    band.words += 1;
    if (row.sentence_count === 0) band.zeroSentences += 1;
    else if (row.sentence_count === 1) band.oneSentence += 1;
    else if (row.sentence_count === 2) band.twoSentences += 1;
    else band.threeOrMoreSentences += 1;
    byBand.set(row.hsk_band, band);
  }
  return [...byBand.values()].sort((left, right) => left.hskBand.localeCompare(right.hskBand, undefined, { numeric: true }));
}
