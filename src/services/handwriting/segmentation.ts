import type { InkStroke } from "./recognizer";

/** Split a left-to-right word at the longest pauses between strokes. */
export function segmentStrokesByWritingOrder(
  strokes: InkStroke[],
  characterCount: number,
): InkStroke[][] {
  const count = Math.max(1, Math.min(Math.trunc(characterCount), strokes.length));
  if (count <= 1) return [strokes];
  const gaps = strokes.slice(0, -1).map((stroke, index) => {
    const end = stroke.points.at(-1)?.t ?? index;
    const start = strokes[index + 1]?.points[0]?.t ?? end;
    return { after: index, gap: Math.max(0, start - end) };
  });
  const cuts = new Set(
    gaps
      .sort((a, b) => b.gap - a.gap || a.after - b.after)
      .slice(0, count - 1)
      .map((item) => item.after),
  );
  const result: InkStroke[][] = [];
  let group: InkStroke[] = [];
  strokes.forEach((stroke, index) => {
    group.push(stroke);
    if (cuts.has(index)) {
      result.push(group);
      group = [];
    }
  });
  if (group.length) result.push(group);
  return result;
}

export function combineCharacterCandidates(groups: string[][], limit = 8): string[] {
  let combinations = [""];
  for (const group of groups) {
    const characters = Array.from(
      new Set(
        group
          .map((item) => Array.from(item.trim())[0] ?? "")
          .filter((item) => /[\u3400-\u9fff]/u.test(item)),
      ),
    ).slice(0, 4);
    if (!characters.length) return [];
    combinations = combinations
      .flatMap((prefix) => characters.map((character) => `${prefix}${character}`))
      .slice(0, limit);
  }
  return combinations;
}
