export type ToneWord = { id: string; hanzi: string; pinyin: string; numeric: string; meaning: string };
export type ToneSample = ToneWord & { tones: number[]; answer: string; listeningSafe: boolean };

/** Numeric pinyin is authoritative. Reject punctuation/polyphonic alternatives, never guess a tone. */
export function parseTones(numeric: string): number[] {
  const compact = numeric.toLowerCase().replace(/\s+/g, '').replace(/u:/g, 'v');
  if (!/^(?:[a-züv]+[1-5])+$/.test(compact)) return [];
  return [...compact.matchAll(/[1-5]/g)].map((match) => Number(match[0]));
}

const toneMarkBase: Record<string, string> = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a', Ā: 'A', Á: 'A', Ǎ: 'A', À: 'A',
  ē: 'e', é: 'e', ě: 'e', è: 'e', Ē: 'E', É: 'E', Ě: 'E', È: 'E',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i', Ī: 'I', Í: 'I', Ǐ: 'I', Ì: 'I',
  ō: 'o', ó: 'o', ǒ: 'o', ò: 'o', Ō: 'O', Ó: 'O', Ǒ: 'O', Ò: 'O',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u', Ū: 'U', Ú: 'U', Ǔ: 'U', Ù: 'U',
  ǖ: 'ü', ǘ: 'ü', ǚ: 'ü', ǜ: 'ü', Ǖ: 'Ü', Ǘ: 'Ü', Ǚ: 'Ü', Ǜ: 'Ü',
};

/** Keep syllable spelling visible while withholding tone marks until the learner answers. */
export function withoutPinyinToneMarks(pinyin: string): string {
  return [...pinyin].map((character) => toneMarkBase[character] ?? character).join('').replace(/[1-5]/g, '');
}

export function buildToneSamples(words: ToneWord[], pair: boolean): ToneSample[] {
  const buckets = new Map<string, ToneSample[]>();
  for (const word of words) {
    const tones = parseTones(word.numeric);
    if (tones.length !== (pair ? 2 : 1) || [...word.hanzi].length !== tones.length) continue;
    if (pair && tones.some((tone) => tone === 5)) continue;
    const answer = tones.join('-');
    const sample = { ...word, tones, answer,
      // Dictionary-tone drills remain available. Do not score sandhi as the dictionary tone heard.
      listeningSafe: !word.hanzi.includes('一') && !word.hanzi.includes('不') &&
        !/[行长重乐得地还便着差藏朝调数省只为曾教觉都]/u.test(word.hanzi) &&
        !tones.some((tone, index) => tone === 3 && tones[index + 1] === 3) };
    const bucket = buckets.get(answer) ?? [];
    if (bucket.length < 12 && !bucket.some((item) => item.hanzi === word.hanzi)) bucket.push(sample);
    buckets.set(answer, bucket);
  }
  // Interleave tone classes so a session does not spend all its time on one class.
  const result: ToneSample[] = [];
  for (let i = 0; i < 12; i++) for (const key of [...buckets.keys()].sort()) {
    const sample = buckets.get(key)?.[i];
    if (sample) result.push(sample);
  }
  return result;
}

export function toneChoices(pair: boolean): string[] {
  return pair ? [1, 2, 3, 4].flatMap((a) => [1, 2, 3, 4].map((b) => `${a}-${b}`)) : ['1', '2', '3', '4', '5'];
}

export function toneLabel(value: string): string {
  return value === '5' ? 'Thanh nhẹ' : value.includes('-') ? value : `Thanh ${value}`;
}

export function nextShadowingIndex(index: number, count: number, loop: boolean, autoNext: boolean): number | null {
  if (count < 1 || index < 0 || index >= count) return null;
  if (loop) return index;
  return autoNext && index + 1 < count ? index + 1 : null;
}
