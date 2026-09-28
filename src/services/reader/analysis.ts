import type { ReaderToken } from './segment';

export type ReaderAnalysis = { totalWords: number; knownWords: number; learningWords: number;
  unknownWords: number; coveragePercent: number; estimatedHsk: string; difficulty: 'Dễ' | 'Vừa' | 'Khó' };

/** Coverage counts all recognized, already-studied words; unknown includes unrecognized Hanzi. */
export function analyzeReaderTokens(tokens: ReaderToken[], sourceText: string): ReaderAnalysis {
  const totalWords = tokens.length;
  const knownWords = tokens.filter((token) => token.vocabulary?.status === 'KNOWN').length;
  const learningWords = tokens.filter((token) => token.vocabulary &&
    token.vocabulary.status !== 'KNOWN' && (token.vocabulary.status === 'LEARNING' || token.vocabulary.studied)).length;
  const unknownWords = totalWords - knownWords - learningWords;
  const coveragePercent = totalWords ? Math.round((knownWords + learningWords) / totalWords * 100) : 0;
  const bandWeight = (band: string): number => band === '7-9' ? 7 : Number(band) || 1;
  const bands = tokens.map((token) => token.vocabulary?.hskBand).filter((band): band is NonNullable<typeof band> => !!band);
  const maxBand = bands.length ? bands.reduce((max, band) => bandWeight(String(band)) > bandWeight(String(max)) ? band : max) : null;
  const sentenceCount = Math.max(1, sourceText.split(/[。！？!?]+/u).filter((item) => item.trim()).length);
  const averageSentenceLength = Array.from(sourceText).filter((character) => /[\u3400-\u9fff]/u.test(character)).length / sentenceCount;
  const difficulty = coveragePercent < 60 || averageSentenceLength > 35 || (maxBand && bandWeight(String(maxBand)) >= 5)
    ? 'Khó' : coveragePercent < 85 || averageSentenceLength > 20 ? 'Vừa' : 'Dễ';
  return { totalWords, knownWords, learningWords, unknownWords, coveragePercent,
    estimatedHsk: maxBand ? String(maxBand) : 'Chưa rõ', difficulty };
}
