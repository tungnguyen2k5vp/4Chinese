export type GrammarEvidence = {
  id: string;
  grammarId: string;
  exerciseType: string;
  correct: boolean;
  createdAt: string;
};
export type GrammarMicroLesson = {
  grammarId: string;
  samples: number;
  wrong: number;
  exerciseTypes: number;
  latestAt: string;
};
/** Recommendations, not diagnoses: minimum five distinct events, three errors, two formats. */
export function recommendGrammarMicroLessons(
  events: readonly GrammarEvidence[],
  nowMs: number,
): GrammarMicroLesson[] {
  if (!Number.isFinite(nowMs)) throw new Error("INVALID_EVIDENCE_CLOCK");
  const unique = new Map<string, GrammarEvidence>();
  for (const event of events) {
    const at = Date.parse(event.createdAt);
    if (
      !event.id ||
      !event.grammarId ||
      !event.exerciseType ||
      !Number.isFinite(at) ||
      at > nowMs ||
      nowMs - at > 30 * 86400000
    )
      continue;
    if (!unique.has(event.id)) unique.set(event.id, event);
  }
  const grouped = new Map<string, GrammarEvidence[]>();
  for (const event of unique.values())
    grouped.set(event.grammarId, [
      ...(grouped.get(event.grammarId) ?? []),
      event,
    ]);
  const recommendations: GrammarMicroLesson[] = [];
  for (const [grammarId, history] of grouped) {
    history.sort(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        b.id.localeCompare(a.id),
    );
    const wrong = history.filter((event) => !event.correct).length;
    const exerciseTypes = new Set(history.map((event) => event.exerciseType))
      .size;
    if (
      history.length < 5 ||
      wrong < 3 ||
      exerciseTypes < 2 ||
      (history.length - wrong) / history.length >= 0.7 ||
      history.slice(0, 3).every((event) => event.correct)
    )
      continue;
    recommendations.push({
      grammarId,
      samples: history.length,
      wrong,
      exerciseTypes,
      latestAt: history[0]!.createdAt,
    });
  }
  return recommendations
    .sort(
      (a, b) =>
        b.wrong / b.samples - a.wrong / a.samples ||
        b.wrong - a.wrong ||
        a.grammarId.localeCompare(b.grammarId),
    )
    .slice(0, 3);
}
