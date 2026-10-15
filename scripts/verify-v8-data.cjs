const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');
const qa = path.join(root, 'artifacts/v8-native-2026-10-13');
const open = (stage, name) => new DatabaseSync(path.join(qa, 'data-audit', stage, name), { readOnly: true });
const digest = rows => crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const cb = open('before', 'hanzi30.db'), ca = open('after', 'hanzi30.db');
const tableNames = cb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row => row.name);
const changedTables = [];
for (const table of tableNames) {
  const quoted = '"' + table.replaceAll('"','""') + '"';
  if (digest(cb.prepare(`SELECT * FROM ${quoted}`).all()) !== digest(ca.prepare(`SELECT * FROM ${quoted}`).all())) changedTables.push(table);
}
const definitions = fs.readFileSync(path.join(root, 'src/services/stats/gamification.ts'), 'utf8');
const expectedAchievementIds = [...definitions.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(match => match[1]).sort();
const actualAchievementIds = ca.prepare('SELECT id FROM achievements ORDER BY id').all().map(row => row.id);
const schemaSql = db => db.prepare("SELECT name,type,sql FROM sqlite_master ORDER BY name").all();
const eb = open('before','english-learner.db'), ea = open('after','english-learner.db');
const sb = open('before','english-skypedia-388adc0.db'), sa = open('after','english-skypedia-388adc0.db');
const beforeAudit = JSON.parse(fs.readFileSync(path.join(qa,'database-before.json'),'utf8'));
const afterAudit = JSON.parse(fs.readFileSync(path.join(qa,'database-after.json'),'utf8'));
const originalCards = eb.prepare('SELECT id,deck_id,headword,meaning_vi,pos,ipa,sense_id,source_id,notes FROM en_cards ORDER BY id').all();
const preserved = originalCards.every(card => digest(card) === digest(ea.prepare('SELECT id,deck_id,headword,meaning_vi,pos,ipa,sense_id,source_id,notes FROM en_cards WHERE id=?').get(card.id)));
const reviews = ea.prepare('SELECT * FROM en_reviews').all();
const reviewed = reviews.length === 1 ? ea.prepare('SELECT progress_json,next_review_at FROM en_cards WHERE id=?').get(reviews[0].card_id) : null;
const checks = {
  chineseSchemaUnchanged: digest(schemaSql(cb)) === digest(schemaSql(ca)),
  chineseRowsUnchangedExceptExistingAchievementSeed: changedTables.length === 1 && changedTables[0] === 'achievements',
  achievementSeedMatchesExistingDefinitionIds: expectedAchievementIds.length === 8 && JSON.stringify(expectedAchievementIds) === JSON.stringify(actualAchievementIds),
  dictionaryContentUnchanged: beforeAudit['english-skypedia-388adc0.db'].semanticSha256 === afterAudit['english-skypedia-388adc0.db'].semanticSha256,
  englishSchemaUnchanged: digest(schemaSql(eb)) === digest(schemaSql(ea)),
  originalEnglishCardsAndSelectedSensesPreserved: preserved,
  originalDecksPreserved: digest(eb.prepare('SELECT * FROM en_decks ORDER BY id').all()) === digest(ea.prepare('SELECT * FROM en_decks ORDER BY id').all()),
  exactlyOneReviewEvent: reviews.length === 1 && reviews[0].correct === 1,
  reviewedDueDatePersistedInFuture: !!reviewed && Date.parse(reviewed.next_review_at) > Date.now(),
  selectedBankSenseSaved: ea.prepare("SELECT COUNT(*) AS n FROM en_cards WHERE headword='bank' AND sense_id IS NOT NULL AND source_id<>'USER'").get().n === 1,
  englishOnlyProfilePreferencesPersisted: (() => { const row=ea.prepare("SELECT payload_json FROM en_drafts WHERE id='profile-preferences:v1'").get(); const p=row && JSON.parse(row.payload_json); return p?.goal==='work' && p.level==='intermediate' && p.topics.includes('technology') && p.dailyMinutes===15; })(),
};
const report = { result: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL', checks, changedChineseTables: changedTables, expectedInitialization: 'Opening the unchanged Chinese Home calls existing getGamificationSummary/seedAchievements, inserting the eight predefined achievement definitions. No user_achievements or progress was written.', dictionaryCounts: afterAudit['english-skypedia-388adc0.db'].counts, schemaVersions: { chinese: ca.prepare('PRAGMA user_version').get().user_version, englishLearner: ea.prepare('PRAGMA user_version').get().user_version }, reviewProgress: reviewed ? JSON.parse(reviewed.progress_json) : null, reviewDue: reviewed?.next_review_at };
for(const db of [cb,ca,eb,ea,sb,sa]) db.close();
fs.writeFileSync(path.join(qa,'database-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(report.result!=='PASS') process.exitCode=1;
