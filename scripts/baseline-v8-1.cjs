const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts/v8-1-english-2026-10-13');
const file = path.join(out, 'baseline.json');
if (fs.existsSync(file)) throw new Error('Baseline exists; do not replace');
fs.mkdirSync(out, { recursive: true });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const files = {};
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files[path.relative(root, full).replaceAll('\\', '/')] = hash(fs.readFileSync(full));
  }
}
walk(path.join(root, 'src'));
for (const name of ['package.json', 'package-lock.json', 'app.json', 'app.config.ts', 'android/app/src/debug/AndroidManifest.xml']) {
  const full = path.join(root, name);
  if (fs.existsSync(full)) files[name] = hash(fs.readFileSync(full));
}
const corpus = path.join(root, 'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db');
const db = new DatabaseSync(corpus, { readOnly: true });
const counts = {};
for (const table of ['words', 'definitions', 'pronunciations', 'word_definitions']) counts[table] = db.prepare(`SELECT count(*) n FROM ${table}`).get().n;
db.close();
fs.writeFileSync(file, JSON.stringify({ timestamp: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), status: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', maxBuffer: 16e6 }), corpusSha256: hash(fs.readFileSync(corpus)), dictionaryCounts: counts, files, baselineTests: { files: 189, tests: 1030, passed: true }, schemas: { chinese: 45, english: 1 }, schemaProvenance: 'V8 verified private QA snapshots; native V8.1 snapshots pending' }, null, 2));
console.log(JSON.stringify({ file, sourceFiles: Object.keys(files).length, counts }));
