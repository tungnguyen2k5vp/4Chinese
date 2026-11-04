const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');
const qa = path.join(root, 'artifacts/v8-1-native-2026-10-13');
const out = path.join(root, 'artifacts/v8-1-english-2026-10-13');
const digest = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const baseline = JSON.parse(fs.readFileSync(path.join(out, 'baseline.json'), 'utf8'));
const allowed = new Set([
  'src/app/(tabs)/english-speaking.tsx', 'src/app/(tabs)/entertainment.tsx', 'src/app/(tabs)/explore.tsx',
  'src/app/english/card-edit.tsx', 'src/app/english/decks/[id].tsx', 'src/app/english/profile.tsx',
  'src/app/english/reader.tsx', 'src/app/english/review.tsx', 'src/app/english/word.tsx',
  'src/app/english/_layout.tsx', 'src/app/_layout.tsx',
  'src/components/english/EnglishQuickDictionary.tsx', 'src/components/english/EnglishSensePickerModal.tsx',
  'src/db/english/flashcard-settings.ts', 'src/db/english/skypedia.ts',
  'src/services/english/status-bar.test.ts', 'src/services/english/word-chain.test.ts', 'src/services/english/word-chain.ts',
  'android/app/src/debug/AndroidManifest.xml',
  'src/app/learn/session.tsx', // Explicit user addendum on 2026-10-13: pinyin below Chinese learning audio.
  // Explicit user addenda: Home all-due count and ten-word review batches; no scheduler/schema edits.
  'src/app/(tabs)/index.tsx', 'src/components/DueReviewCard.tsx', 'src/app/review/index.tsx',
  'src/stores/app-store.ts', 'src/app/decks/[id].tsx', 'src/app/review/weak.tsx',
  'src/services/learning/daily-session.ts', 'src/app/daily/index.tsx', 'src/components/StudySettingsSheet.tsx',
  'src/db/repository.ts',
]);
const changedFiles = Object.keys(baseline.files).filter(file => !fs.existsSync(path.join(root, file)) || digest(fs.readFileSync(path.join(root, file))) !== baseline.files[file]);
const open = (stage, name) => new DatabaseSync(path.join(qa, 'data-audit', stage, name), { readOnly: true });
const cb = open('before', 'hanzi30.db'), ca = open('after', 'hanzi30.db');
const eb = open('before', 'english-learner.db'), ea = open('after', 'english-learner.db');
const sb = open('before', 'english-skypedia-388adc0.db'), sa = open('after', 'english-skypedia-388adc0.db');
const schema = db => db.prepare('SELECT name,type,sql FROM sqlite_master ORDER BY name').all();
const changedChineseTables = cb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().filter(({ name }) => {
  const quoted = '"' + name.replaceAll('"', '""') + '"';
  return digest(cb.prepare(`SELECT * FROM ${quoted}`).all()) !== digest(ca.prepare(`SELECT * FROM ${quoted}`).all());
}).map(row => row.name);
const expectedIds = [...fs.readFileSync(path.join(root, 'src/services/stats/gamification.ts'), 'utf8').matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(match => match[1]).sort();
const actualIds = ca.prepare('SELECT id FROM achievements ORDER BY id').all().map(row => row.id);
const originalFields = 'id,deck_id,headword,meaning_vi,pos,ipa,sense_id,source_id,notes';
const originalCards = eb.prepare(`SELECT ${originalFields} FROM en_cards ORDER BY id`).all();
const newCards = ea.prepare(`SELECT ${originalFields} FROM en_cards ORDER BY id`).all().filter(row => !originalCards.some(old => old.id === row.id));
const reviews = ea.prepare('SELECT * FROM en_reviews').all();
const reviewed = reviews.length === 1 ? ea.prepare('SELECT headword,progress_json,next_review_at FROM en_cards WHERE id=?').get(reviews[0].card_id) : null;
const before = JSON.parse(fs.readFileSync(path.join(qa, 'database-before.json'), 'utf8'));
const after = JSON.parse(fs.readFileSync(path.join(qa, 'database-after.json'), 'utf8'));
const checks = {
  frozenBaselineOutsideExplicitApprovedPathsIncludingUserAddenda: changedFiles.every(file => allowed.has(file)),
  ChineseSchemaUnchanged: digest(schema(cb)) === digest(schema(ca)),
  ChineseRowsUnchangedExceptExistingAchievementSeed: changedChineseTables.length === 1 && changedChineseTables[0] === 'achievements',
  existingAchievementSeedExact: expectedIds.length === 8 && digest(expectedIds) === digest(actualIds),
  EnglishSchemaUnchanged: digest(schema(eb)) === digest(schema(ea)),
  dictionaryContentUnchanged: before['english-skypedia-388adc0.db'].semanticSha256 === after['english-skypedia-388adc0.db'].semanticSha256,
  dictionarySchemaUnchanged: digest(schema(sb)) === digest(schema(sa)),
  pinnedCorpusFileUnchanged: digest(fs.readFileSync(path.join(root, 'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db'))) === baseline.corpusSha256,
  originalEnglishCardIdentitySenseMeaningNotesPreserved: originalCards.every(row => digest(row) === digest(ea.prepare(`SELECT ${originalFields} FROM en_cards WHERE id=?`).get(row.id))),
  originalDecksPreserved: digest(eb.prepare('SELECT * FROM en_decks ORDER BY id').all()) === digest(ea.prepare('SELECT * FROM en_decks ORDER BY id').all()),
  originalDraftsPreserved: eb.prepare('SELECT * FROM en_drafts ORDER BY id').all().every(row => digest(row) === digest(ea.prepare('SELECT * FROM en_drafts WHERE id=?').get(row.id))),
  onlyExplicitNewContextCards: newCards.length === 2 && newCards.every(row => ['learning', 'learn'].includes(row.headword) && row.sense_id && row.source_id !== 'USER' && row.notes.includes('[4Chinese English context v1]')),
  oneActualCorrectNativeReview: reviews.length === 1 && reviews[0].correct === 1 && reviewed?.headword === 'hello',
  actualReviewDuePersisted: !!reviewed && Date.parse(reviewed.next_review_at) > Date.now(),
  schemasRemain45and1: ca.prepare('PRAGMA user_version').get().user_version === 45 && ea.prepare('PRAGMA user_version').get().user_version === 1,
};
const report = { result: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL', checks, changedFiles, baselineFiles: Object.keys(baseline.files).length, changedChineseTables, initialization: 'Chinese Home uses unchanged legacy seedAchievements: eight achievement definitions only; user achievement/progress/XP tables unchanged.', dictionaryCounts: after['english-skypedia-388adc0.db'].counts, dictionarySemanticSha256: after['english-skypedia-388adc0.db'].semanticSha256, newCards: newCards.map(row => ({ headword: row.headword, senseId: row.sense_id, hasConsentedContext: row.notes.includes('[4Chinese English context v1]') })), reviewCount: reviews.length, nextReviewAt: reviewed?.next_review_at };
for (const db of [cb, ca, eb, ea, sb, sa]) db.close();
fs.writeFileSync(path.join(out, 'database-verification.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.result !== 'PASS') process.exitCode = 1;
