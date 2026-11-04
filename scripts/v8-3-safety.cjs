// Read-only source baseline. Never opens or modifies a learner database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts/v8-3-hanzi-memory');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const files = Object.fromEntries(walk(path.join(root,'src')).map(file => [path.relative(root,file).replaceAll('\\','/'),digest(file)]));
const protectedFile = name => /^src\/(data\/|db\/(?:english\/|.*schema|migrations|repository\.ts|database\.ts|backup)|services\/(?:srs\/|english\/|languages\/)|app\/english\/|components\/english\/|theme\/english)/.test(name)
  || ['src/app/(tabs)/_layout.tsx','src/app/(tabs)/explore.tsx','src/app/(tabs)/profile.tsx','src/app/(tabs)/entertainment.tsx','src/app/(tabs)/english-speaking.tsx'].includes(name);
fs.mkdirSync(out,{recursive:true});
const baseline = path.join(out,'baseline.json');
if (process.argv[2] === 'baseline') {
  if (fs.existsSync(baseline)) throw new Error('Existing baseline must not be overwritten');
  fs.writeFileSync(baseline,JSON.stringify({at:new Date().toISOString(),schemaVersion:45,files,
    testFiles:Object.keys(files).filter(f=>/\.test\.tsx?$/.test(f)),
    dataFiles:walk(path.join(root,'src/data')).map(file=>({path:path.relative(root,file).replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:digest(file)})),
    learnerDatabase:'Not opened. Source baseline and isolated SQLite fixtures only; no claim of a fresh physical-device snapshot.'},null,2));
  console.log(JSON.stringify({baseline,sourceFiles:Object.keys(files).length,testFiles:Object.keys(files).filter(f=>/\.test\.tsx?$/.test(f)).length,schemaVersion:45}));
} else {
  const before=JSON.parse(fs.readFileSync(baseline,'utf8'));
  const changed=[...new Set([...Object.keys(before.files),...Object.keys(files)])].filter(name=>before.files[name]!==files[name]);
  const violations=changed.filter(protectedFile);
  const result={at:new Date().toISOString(),changed,protectedChanges:violations,safe:violations.length===0};
  fs.writeFileSync(path.join(out,'source-safety.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  if(violations.length)process.exitCode=1;
}
