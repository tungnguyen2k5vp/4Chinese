export interface BilingualMeaningPair {
  vi: string;
  en: string;
}

function clean(items: string[]): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter((item) => item && !/^LT:/i.test(item)),
    ),
  );
}

/**
 * Keeps Vietnamese on the left and the matching English sense on the right.
 * Source dictionaries occasionally express one sense using several synonyms;
 * in that case those synonyms stay grouped in the same visual row instead of
 * being paired with an unrelated sense.
 */
export function pairBilingualMeanings(
  meaningsVi: string[],
  meaningsEn: string[],
  primaryMeaningVi = "",
): BilingualMeaningPair[] {
  const vi = clean(meaningsVi.length ? meaningsVi : [primaryMeaningVi]);
  const en = clean(meaningsEn);
  if (!vi.length && !en.length) return [];
  if (!vi.length || !en.length) {
    return [{ vi: vi.join("; ") || "—", en: en.join("; ") || "—" }];
  }
  if (vi.length === 1 || en.length === 1) {
    return [{ vi: vi.join("; ") || "—", en: en.join("; ") || "—" }];
  }

  const count = Math.min(vi.length, en.length);
  const pairs = Array.from({ length: count }, (_, index) => ({
    vi: vi[index] ?? "—",
    en: en[index] ?? "—",
  }));
  const last = pairs[count - 1];
  if (!last) return [];
  if (vi.length > count) {
    last.vi = [...vi.slice(count - 1)].join("; ");
  }
  if (en.length > count) {
    last.en = [...en.slice(count - 1)].join("; ");
  }
  return pairs;
}

export function primaryEnglishMeaning(meaningsEn: string[]): string {
  return clean(meaningsEn)[0] ?? "Chưa có bản dịch tiếng Anh";
}
