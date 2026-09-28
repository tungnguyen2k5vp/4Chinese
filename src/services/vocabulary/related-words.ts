import type { Vocabulary } from "@/types/models";

function hskDistance(left: Vocabulary["hskBand"], right: Vocabulary["hskBand"]): number {
  const asNumber = (value: Vocabulary["hskBand"]) => value === "7-9" ? 8 : value;
  return Math.abs(asNumber(left) - asNumber(right));
}
function statusPriority(word: Vocabulary): number {
  if (word.status === "LEARNING") return 0;
  if (word.status === "NEW" || !word.status) return 1;
  if (word.status === "KNOWN") return 2;
  return 3;
}

/** Ranks already-matched vocabulary only; matching itself stays inside SQLite. */
export function rankRelatedWords(source: Vocabulary, candidates: Vocabulary[], limit = 8): Vocabulary[] {
  const sourceCharacters = new Set(Array.from(source.simplified));
  return candidates
    .filter((candidate) => candidate.id !== source.id)
    .map((candidate) => ({
      candidate,
      overlap: Array.from(candidate.simplified).filter((character) => sourceCharacters.has(character)).length,
    }))
    .filter((item) => item.overlap > 0)
    .sort((left, right) =>
      right.overlap - left.overlap
      || hskDistance(left.candidate.hskBand, source.hskBand) - hskDistance(right.candidate.hskBand, source.hskBand)
      || statusPriority(left.candidate) - statusPriority(right.candidate)
      || (left.candidate.frequencyRank ?? Number.MAX_SAFE_INTEGER) - (right.candidate.frequencyRank ?? Number.MAX_SAFE_INTEGER)
      || left.candidate.simplified.length - right.candidate.simplified.length,
    )
    .slice(0, Math.max(1, Math.min(16, Math.trunc(limit))))
    .map((item) => item.candidate);
}
