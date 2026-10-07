import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { timedSpeakingPrompts } from "../src/data/speaking-practice";
import { vietnameseContrasts } from "../src/data/vietnamese-contrasts";
import { writtenExercises } from "../src/data/written-practice";
import { confusablePairs } from "../src/data/confusable-words";
import { grammarSeed } from "../src/db/grammar";
import { originalPracticeBank } from "../src/services/exam/practice-bank";

const vocabulary = JSON.parse(
  readFileSync(resolve("src/data/hsk-vocabulary.json"), "utf8"),
) as { hskBand: string | number }[];
const bands = ["1", "2", "3", "4", "5", "6", "7-9"];
const report = {
  generatedAt: new Date().toISOString(),
  vocabularyRows: vocabulary.length,
  officialReferenceVerified: false,
  officialCoveragePercent: null,
  grammarPoints: grammarSeed.length,
  vietnameseContrasts: vietnameseContrasts.length,
  confusablePairs: confusablePairs.length,
  confusableQuestions: confusablePairs.reduce((count, pair) => count + pair.questions.length, 0),
  miniTestProfiles: originalPracticeBank.length,
  miniTestQuestions: originalPracticeBank.reduce(
    (count, bank) => count + bank.questions.length,
    0,
  ),
  writingTasks: writtenExercises.filter((task) => task.kind === "WRITING")
    .length,
  translationTasks: writtenExercises.filter(
    (task) => task.kind === "TRANSLATION",
  ).length,
  speakingPrompts: timedSpeakingPrompts.length,
  bands: bands.map((band) => ({
    band,
    vocabularyRows: vocabulary.filter((word) => String(word.hskBand) === band)
      .length,
    grammarPoints: grammarSeed.filter((point) => point.hsk === band).length,
    miniTestQuestions:
      originalPracticeBank.find((bank) => bank.profile.level === band)
        ?.questions.length ?? 0,
    writingTasks: writtenExercises.filter(
      (task) => task.level === band && task.kind === "WRITING",
    ).length,
    translationTasks: writtenExercises.filter(
      (task) => task.level === band && task.kind === "TRANSLATION",
    ).length,
    speakingPrompts: timedSpeakingPrompts.filter(
      (prompt) => prompt.level === band,
    ).length,
  })),
};
assert.equal(
  report.bands.reduce((total, band) => total + band.vocabularyRows, 0),
  report.vocabularyRows,
  "Unaccounted vocabulary band",
);
assert.equal(
  report.bands.reduce((total, band) => total + band.grammarPoints, 0),
  report.grammarPoints,
  "Unaccounted grammar band",
);
writeFileSync(
  resolve("docs/V4_CONTENT_COUNTS.json"),
  JSON.stringify(report, null, 2) + "\n",
  "utf8",
);
console.log(JSON.stringify(report, null, 2));
