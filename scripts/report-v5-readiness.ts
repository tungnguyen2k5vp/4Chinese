/** Source inventory only: no device DB, migration, staging, provider call or promotion. */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  grammarV5Expansion,
  validateGrammarV5DraftPack,
} from "../src/data/grammar-v5-expansion";
import {
  advancedGrammarV5Drafts,
  validateAdvancedGrammarV5Pack,
} from "../src/data/grammar-v5-advanced-drafts";
import { lexicalV5Drafts } from "../src/data/lexical-v5-drafts";
import { pronunciationPairs } from "../src/data/pronunciation-pairs";
import { timedSpeakingPrompts } from "../src/data/speaking-practice";
import { starterVocabulary } from "../src/data/starter-vocabulary";
import { storiesV5Drafts, validateStoryPreview } from "../src/data/stories-v5";
import { writtenExercises } from "../src/data/written-practice";
import { getOfflineVocabulary } from "../src/db/database";
import { grammarSeed } from "../src/db/grammar";
import { validateLexicalDraft } from "../src/db/lexical-knowledge";
import {
  getListeningComprehension,
  type ListeningItem,
} from "../src/db/listening-library";
import { storySeed } from "../src/db/stories";
import { systemTtsSource } from "../src/services/audio/source";
import {
  draftPracticeBank,
  validateDraftBank,
} from "../src/services/exam/draft-bank";
import { assertQuestionBankReferencesValid } from "../src/services/exam/engine";
import { originalPracticeBank } from "../src/services/exam/practice-bank";
import { v5ContextualLessons } from "../src/services/learning/v5-contextual-lessons";
import { ROLEPLAY_SCENES } from "../src/services/speaking/roleplay-v5";
import { lexicalReadingMatches } from "../src/services/vocabulary/lexical-reading";

export const V5_INVENTORY_SOURCE_FILES = [
  "scripts/report-v5-readiness.ts",
  "src/data/grammar-v5-expansion.ts",
  "src/data/grammar-v5-advanced-drafts.ts",
  "src/data/lexical-v5-drafts.ts",
  "src/db/lexical-knowledge.ts",
  "src/services/vocabulary/lexical-reading.ts",
  "src/data/pronunciation-pairs.ts",
  "src/db/unified-search.ts",
  "src/services/search/normalize.ts",
  "src/data/confusable-words.ts",
  "src/data/stories-v5.ts",
  "src/db/stories.ts",
  "src/services/content/review-workflow.ts",
  "src/services/speaking/roleplay-v5.ts",
  "src/services/speaking/gemini-conversation-contract.ts",
  "src/services/exam/draft-bank.ts",
  "src/services/exam/original-questions-v5.ts",
  "src/services/exam/practice-bank.ts",
  "src/services/exam/engine.ts",
  "src/db/listening-library.ts",
  "src/services/audio/source.ts",
  "src/services/learning/v5-contextual-lessons.ts",
  "src/data/written-practice.ts",
  "src/data/speaking-practice.ts",
] as const;
const levels = ["1", "2", "3", "4", "5", "6", "7-9"];
function unique(ids: readonly string[], scope: string) {
  if (ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length)
    throw new Error(`DUPLICATE_OR_BLANK_INVENTORY_ID:${scope}`);
}

/** Shared by both scripts so Markdown/JSON/CLI counts cannot silently diverge. */
export function buildV5ReadinessReport(words = getOfflineVocabulary()) {
  validateGrammarV5DraftPack(grammarV5Expansion);
  validateAdvancedGrammarV5Pack(advancedGrammarV5Drafts);
  lexicalV5Drafts.forEach(validateLexicalDraft);
  storiesV5Drafts.forEach(validateStoryPreview);
  validateDraftBank(draftPracticeBank);
  originalPracticeBank.forEach(({ profile, questions }) =>
    assertQuestionBankReferencesValid(profile, questions),
  );
  for (const [scope, ids] of [
    ["grammar drafts", grammarV5Expansion.map((item) => item.id)],
    ["advanced grammar drafts", advancedGrammarV5Drafts.map((item) => item.id)],
    ["lexical drafts", lexicalV5Drafts.map((item) => item.id)],
    ["story drafts", storiesV5Drafts.map((item) => item.id)],
    ["roleplay scenes", ROLEPLAY_SCENES.map((item) => item.id)],
    [
      "roleplay goals",
      ROLEPLAY_SCENES.flatMap((scene) =>
        scene.goals.map((goal) => `${scene.id}:${goal.id}`),
      ),
    ],
    ["pronunciation pairs", pronunciationPairs.map((item) => item.id)],
  ] as const)
    unique(ids, scope);

  // Reproduce the runtime candidate lookup against bundled non-custom words, not installed rows.
  const lexicalBindings = lexicalV5Drafts.map((draft) => {
    const candidates = words
      .filter((word) => word.simplified === draft.hanzi)
      // SQLite ORDER BY frequency_rank ASC puts null first; known ranks are nonnegative.
      .sort(
        (a, b) =>
          (a.frequencyRank ?? -1) - (b.frequencyRank ?? -1) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )
      .slice(0, 12);
    const word = candidates.find(
      (word) => lexicalReadingMatches(word.pinyinNumeric, draft.numeric),
    );
    return {
      senseId: draft.id,
      vocabularyId: word?.id ?? null,
      level: word ? String(word.hskBand) : null,
      collocations: draft.collocations.length,
      sentenceId: `sentence-${draft.id}`,
      reviewStatus: draft.reviewStatus,
    };
  });
  // Enumerate exact-source companion definitions. REVIEWED here is an explicit lookup assumption,
  // not an assertion about the starter example or a device sentence's lifecycle/activation.
  const companions = starterVocabulary.flatMap((word) =>
    word.examples.flatMap((example) => {
      const sourceMatch: ListeningItem = {
        id: example.id,
        level: String(word.hskBand),
        type: "SENTENCE",
        audioSource: systemTtsSource(example.chinese),
        transcript: example.chinese,
        pinyin: example.pinyin,
        translation: example.vietnamese,
        targetVocabulary: [],
        targetGrammar: [],
        reviewStatus: "REVIEWED",
        source: word.source,
      };
      const companion = getListeningComprehension(sourceMatch);
      return companion
        ? [
            {
              definitionId: companion.id,
              starterExampleId: example.id,
              level: String(word.hskBand),
              provenance: companion.provenance,
              reviewStatus: companion.reviewStatus,
              transcript: example.chinese,
            },
          ]
        : [];
    }),
  );
  unique(
    companions.map((item) => item.transcript),
    "listening companion source transcripts",
  );
  for (const pair of pronunciationPairs) {
    if (
      [pair.a, pair.b, pair.pa, pair.pb, pair.va, pair.vb, pair.tip].some(
        (value) => !value.trim(),
      ) ||
      pair.a === (pair.b as string)
    )
      throw new Error(`INVALID_PRONUNCIATION_PAIR:${pair.id}`);
  }
  const examQuestions = draftPracticeBank.flatMap((bank) => bank.questions);
  const allGrammarDrafts = [...grammarV5Expansion, ...advancedGrammarV5Drafts];
  const sourceRows = [
    {
      name: "grammarPendingPoints",
      count: grammarV5Expansion.length,
      source: "src/data/grammar-v5-expansion.ts::grammarV5Expansion",
      status: "AI_ASSISTED / PENDING; inactive editorial preview only",
    },
    {
      name: "grammarPendingExampleSentences",
      count: grammarV5Expansion.reduce(
        (n, item) => n + item.examples.length,
        0,
      ),
      source: "grammarV5Expansion[].examples",
      status: "PENDING, excluded from legacy reviewed coverage",
    },
    {
      name: "advancedGrammarDraftPoints",
      count: advancedGrammarV5Drafts.length,
      source: "src/data/grammar-v5-advanced-drafts.ts::advancedGrammarV5Drafts",
      status: "AI_ASSISTED / DRAFT / UNVERIFIED; source-only review queue, not seeded or learner-visible",
    },
    {
      name: "advancedGrammarDraftExamples",
      count: advancedGrammarV5Drafts.reduce((n, item) => n + item.examples.length, 0),
      source: "advancedGrammarV5Drafts[].examples",
      status: "UNVERIFIED source-only examples, excluded from legacy reviewed coverage",
    },
    {
      name: "lexicalDraftSenses",
      count: lexicalV5Drafts.length,
      source: "src/data/lexical-v5-drafts.ts::lexicalV5Drafts",
      status: "AI_ASSISTED / DRAFT, not new vocabulary headwords",
    },
    {
      name: "lexicalDraftCollocations",
      count: lexicalV5Drafts.reduce(
        (n, item) => n + item.collocations.length,
        0,
      ),
      source: "lexicalV5Drafts[].collocations",
      status: "DRAFT definition placements, not published DB rows",
    },
    {
      name: "lexicalPendingExampleSentences",
      count: lexicalV5Drafts.length,
      source: "lexicalV5Drafts[].example",
      status: "One per sense; PENDING when staged, not reviewed",
    },
    {
      name: "storyDrafts",
      count: storiesV5Drafts.length,
      source: "src/data/stories-v5.ts::storiesV5Drafts",
      status: "AI_ASSISTED / DRAFT; not seeded/published",
    },
    {
      name: "storyDraftSentences",
      count: storiesV5Drafts.reduce((n, item) => n + item.sentences.length, 0),
      source: "storiesV5Drafts[].sentences",
      status: "DRAFT story lines, not shared sentence rows",
    },
    {
      name: "storyDraftQuestions",
      count: storiesV5Drafts.reduce((n, item) => n + item.questions.length, 0),
      source: "storiesV5Drafts[].questions",
      status: "DRAFT comprehension questions, not exam questions",
    },
    {
      name: "roleplayScenes",
      count: ROLEPLAY_SCENES.length,
      source: "src/services/speaking/roleplay-v5.ts::ROLEPLAY_SCENES",
      status: "Original self-practice scripts; no independent review evidence",
    },
    {
      name: "roleplayGoalExchanges",
      count: ROLEPLAY_SCENES.reduce((n, item) => n + item.goals.length, 0),
      source: "ROLEPLAY_SCENES[].goals",
      status:
        "Each goal has learner + partner text; not user turns or exam items",
    },
    {
      name: "originalPronunciationSelfPracticePairs",
      count: pronunciationPairs.length,
      source: "src/data/pronunciation-pairs.ts::pronunciationPairs",
      status:
        "Original self-practice; no independent review or acoustic scoring; no official level mapping",
    },
    {
      name: "existingPlayableReadingQuestions",
      count: originalPracticeBank.reduce(
        (n, item) => n + item.questions.length,
        0,
      ),
      source: "src/services/exam/practice-bank.ts::originalPracticeBank",
      status: "Legacy original practice, UNVERIFIED",
    },
    {
      name: "examDraftCandidates",
      count: examQuestions.length,
      source: "src/services/exam/draft-bank.ts::draftPracticeBank",
      status: "ORIGINAL / AI_DRAFT / DRAFT; rejected from attempts",
    },
    {
      name: "examDraftListeningTtsTranscripts",
      count: examQuestions.filter(
        (item) => item.metadata?.audio?.source === "SYSTEM_TTS",
      ).length,
      source: "draftPracticeBank[].questions[].metadata.audio",
      status: "Subset of exam candidates; SYSTEM_TTS, not recordings",
    },
    {
      name: "listeningSelfPracticeCompanionDefinitions",
      count: companions.length,
      source:
        "src/db/listening-library.ts::getListeningComprehension (exact starter source matches)",
      status:
        "AI_AUTHORED_SELF_PRACTICE / DRAFT; runtime matching sentence required",
    },
    {
      name: "contextualDraftLessons",
      count: v5ContextualLessons.length,
      source:
        "src/services/learning/v5-contextual-lessons.ts::v5ContextualLessons",
      status: "AI_GENERATED / DRAFT / UNVERIFIED, not published",
    },
    {
      name: "contextualDraftDialogueLines",
      count: v5ContextualLessons.reduce(
        (n, item) => n + item.dialogue.lines.length,
        0,
      ),
      source: "v5ContextualLessons[].dialogue.lines",
      status: "DRAFT SYSTEM_TTS text; not recorded audio",
    },
    {
      name: "contextualDraftPracticeQuestions",
      count: v5ContextualLessons.reduce(
        (n, item) => n + item.practice.length,
        0,
      ),
      source: "v5ContextualLessons[].practice",
      status: "DRAFT lesson questions, not exam-bank questions",
    },
  ];
  const rows = levels.map((level) => {
    const grammarDrafts = allGrammarDrafts.filter(
      (item) => item.hsk === level,
    );
    const lexical = lexicalBindings.filter((item) => item.level === level);
    const stories = storiesV5Drafts.filter((item) => item.level === level);
    const scenes = ROLEPLAY_SCENES.filter(
      (item) => String(item.recommendedLevel) === level,
    );
    return {
      level,
      internalVocabulary: words.filter((word) => String(word.hskBand) === level)
        .length,
      independentlyVerifiedVocabulary: null,
      grammarPoints: grammarSeed.filter((point) => point.hsk === level).length,
      independentlyReviewedGrammar: 0,
      grammarPendingDraftPoints: grammarDrafts.length,
      grammarPendingDraftSentences: grammarDrafts.reduce(
        (n, item) => n + item.examples.length,
        0,
      ),
      lexicalDraftSensesWithBundledBinding: lexical.length,
      lexicalDraftCollocationsWithBundledBinding: lexical.reduce(
        (n, item) => n + item.collocations,
        0,
      ),
      lexicalPendingSentencesWithBundledBinding: lexical.length,
      listeningReuseLegacyReviewedSentences: grammarSeed
        .filter((point) => point.hsk === level && !point.id.startsWith("vn-"))
        .reduce((n, point) => n + point.examples.length, 0),
      nativeOrLicensedListeningAudio: 0,
      listeningSelfPracticeCompanionDefinitions: companions.filter(
        (item) => item.level === level,
      ).length,
      stories: storySeed.filter((story) => story.level === level).length,
      independentlyReviewedStories: null,
      storyDrafts: stories.length,
      storyDraftSentences: stories.reduce(
        (n, item) => n + item.sentences.length,
        0,
      ),
      storyDraftQuestions: stories.reduce(
        (n, item) => n + item.questions.length,
        0,
      ),
      roleplayScenes: scenes.length,
      roleplayGoalExchanges: scenes.reduce(
        (n, item) => n + item.goals.length,
        0,
      ),
      existingPlayableReadingQuestions: originalPracticeBank
        .filter((bank) => bank.profile.level === level)
        .reduce((n, bank) => n + bank.questions.length, 0),
      draftBankQuestions: draftPracticeBank
        .filter((bank) => bank.profile.level === level)
        .reduce((n, bank) => n + bank.questions.length, 0),
      draftListeningQuestions: examQuestions.filter(
        (item) => item.metadata?.level === level && item.skill === "LISTENING",
      ).length,
      writingPrompts: writtenExercises.filter(
        (item) => item.level === level && item.kind === "WRITING",
      ).length,
      translationPrompts: writtenExercises.filter(
        (item) => item.level === level && item.kind === "TRANSLATION",
      ).length,
      speakingPrompts: timedSpeakingPrompts.filter(
        (item) => item.level === level,
      ).length,
      contextualDraftLessons: v5ContextualLessons.filter(
        (item) => item.internalHskBand === level,
      ).length,
      publishedContextualLessons: 0,
      officialCoverage: null,
      missingOfficialVocabulary: null,
      extraOfficialVocabulary: null,
      contentComplete: false,
      examReady: false,
    };
  });
  const totals = Object.fromEntries(
    sourceRows.map((row) => [row.name, row.count]),
  );
  return {
    scope: "BUNDLED_SOURCE_NOT_DEVICE_DATABASE",
    referenceStatus: "UNVERIFIED_LICENSE_AND_VERSION",
    confidence: {
      sourceInventory: "DETERMINISTIC_ENUMERATION_WITH_STRUCTURAL_VALIDATORS",
      academicQuality: "UNVERIFIED",
      statisticalInference: "NOT_APPLICABLE_TO_SOURCE_COUNTS",
    },
    implementationBoundaries: {
      unifiedSearch: {
        source: "src/db/unified-search.ts::searchAllContent",
        domains: ["VOCABULARY", "GRAMMAR", "STORY", "LESSON", "CONFUSABLE"],
        note: "Local FTS/LIKE queries reuse existing content; search is not new data, a publication path or completeness evidence. Pending v5-* grammar is excluded.",
      },
      lexicalPublication: {
        source: "src/db/lexical-knowledge.ts::listPublishedLexicalKnowledge",
        note: "Published-only senses/collocations require recorded reviewer/time metadata; draft counts do not imply publication or actual DB staging.",
      },
    },
    notes: [
      "Legacy REVIEWED/CURATED is not independent academic review.",
      "Draft grammar, lexical, story, exam, companion and contextual counts are not published/verified content.",
      "Null means unavailable evidence, not zero. Counts of nested definitions are not runtime database rows.",
      "Level labels are internal estimates; lexical levels come from bundled candidate bindings, not draft declarations.",
      "Roleplay goal exchanges contain two scripted utterances each, not recorded conversations.",
      "Draft exam TTS transcripts are included in candidate totals; do not add them again.",
      "Pronunciation pairs have no level metadata; report them globally, not in fabricated level buckets.",
      "Companion definitions are counted by exact starter source matches, assuming a reviewed runtime sentence only for lookup.",
      "No official completeness, exam readiness, independent review or activation follows from these counts.",
    ],
    inventory: {
      totals,
      sourceRows,
      independentlyReviewedNewDraftContent: 0,
      publishedNewDraftContent: 0,
      verifiedFullMocks: originalPracticeBank.filter(
        (bank) => bank.profile.verified,
      ).length,
      nativeOrLicensedAudioAssets: 0,
      runtimeDatabaseRows: null,
      details: {
        grammarDraftIds: grammarV5Expansion.map((item) => item.id),
        advancedGrammarDraftIds: advancedGrammarV5Drafts.map((item) => item.id),
        lexicalBindings,
        unresolvedLexicalDraftIds: lexicalBindings
          .filter((item) => item.vocabularyId === null)
          .map((item) => item.senseId),
        lexicalBindingScope:
          "BUNDLED_CANDIDATE_MATCH_NOT_STAGING_OR_DEVICE_ROWS",
        stories: storiesV5Drafts.map((item) => ({
          id: item.id,
          level: item.level,
          sentences: item.sentences.length,
          questions: item.questions.length,
          reviewStatus: item.review.state,
        })),
        roleplay: ROLEPLAY_SCENES.map((scene) => ({
          id: scene.id,
          level: scene.recommendedLevel ?? null,
          goals: scene.goals.length,
          scriptedUtterances: scene.goals.length * 2,
          reviewStatus: "UNVERIFIED_SELF_PRACTICE",
        })),
        pronunciationPairs: pronunciationPairs.map((item) => ({
          id: item.id,
          title: item.title,
          reviewStatus: "UNVERIFIED_SELF_PRACTICE",
          level: null,
        })),
        exam: draftPracticeBank.map((bank) => ({
          id: bank.profile.id,
          level: bank.profile.level,
          questions: bank.questions.length,
          questionIds: bank.questions.map((item) => item.id),
          reviewStatus: "DRAFT",
        })),
        listeningCompanions: companions,
      },
    },
    levels: rows,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(JSON.stringify(buildV5ReadinessReport(), null, 2));
}
