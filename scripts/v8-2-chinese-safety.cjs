const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'artifacts/v8-2-chinese-redesign-2026-10-14');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}
const source = Object.fromEntries(files(path.join(root, 'src')).map(file => [path.relative(root, file).replaceAll('\\', '/'), hash(fs.readFileSync(file))]));
const protectedFile = name => /^src\/(db\/|data\/|app\/english\/|components\/english\/|services\/(english\/|review\/|exam\/(engine|session|practice-bank|vocabulary-practice)|hsk\/|languages\/|learning\/|stats\/)|theme\/english)/.test(name);
fs.mkdirSync(folder, { recursive: true });
const mode = process.argv[2] || 'verify';
const baselinePath = path.join(folder, 'source-baseline.json');
if (mode === 'baseline') {
  if (fs.existsSync(baselinePath)) throw new Error('Baseline already exists; refusing to replace it');
  fs.writeFileSync(baselinePath, JSON.stringify({ timestamp: new Date().toISOString(), version: JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version, files: source }, null, 2));
  console.log(`Baseline saved: ${Object.keys(source).length} source files`);
} else {
  const before = JSON.parse(fs.readFileSync(baselinePath)).files;
  const changed = [...new Set([...Object.keys(before), ...Object.keys(source)])].filter(name => before[name] !== source[name]);
  const protectedChanges = changed.filter(protectedFile);
  const report = { timestamp: new Date().toISOString(), sourceFilesChanged: changed.length, changed, protectedChanges, dictionaryDatabaseSchedulerScoringPreserved: protectedChanges.length === 0 };
  fs.writeFileSync(path.join(folder, 'source-safety.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (protectedChanges.length) process.exitCode = 1;
}
