import type { HskBand } from "@/types/models";

/** A stable unsigned hash so one local date always selects the same candidate. */
function hash(value: string): number {
  let result = 2_166_136_261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16_777_619);
  }
  return result >>> 0;
}

export function dailyWordOffset(
  localDate: string,
  bands: HskBand[],
  candidateCount: number,
): number {
  const count = Math.max(0, Math.trunc(candidateCount));
  if (!count) return 0;
  return hash(`${localDate}|${bands.map(String).sort().join(",")}`) % count;
}
