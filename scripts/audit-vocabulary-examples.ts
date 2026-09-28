import { getOfflineVocabulary } from "../src/db/database";
import { withContextualExamples } from "../src/services/vocabulary/contextual-example";

const summary: Record<string, { total: number; contextual: number; missing: number }> = {};
for (const word of getOfflineVocabulary()) {
  const band = String(word.hskBand);
  const counts = (summary[band] ??= { total: 0, contextual: 0, missing: 0 });
  counts.total++;
  const examples = withContextualExamples(word).examples;
  if (examples.some((example) => example.chinese.includes("我正在学习“"))) {
    throw new Error(`Generic metalinguistic example remains in ${word.id}`);
  }
  if (examples.length) counts.contextual++;
  else counts.missing++;
}
console.log(JSON.stringify(summary, null, 2));
