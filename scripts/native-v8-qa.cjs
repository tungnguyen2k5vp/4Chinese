/* V8 UI helper restricted to the private emulator and its dedicated ADB server. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const adb = 'C:/Users/Admin/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const serial = process.env.NATIVE_QA_SERIAL || '127.0.0.1:5561';
if (!/^(127\.0\.0\.1:5561|127\.0\.0\.1:5563)$/.test(serial)) throw new Error('Local private emulator required');
const adbPort = process.env.NATIVE_QA_ADB_PORT || '5042';
if (!/^(5042|5043)$/.test(adbPort)) throw new Error('Dedicated QA ADB server required');
const out = path.resolve(__dirname, '..', process.env.NATIVE_QA_OUTPUT || 'artifacts/v8-native-2026-10-13');
const packageName = 'com.tungnguyen2k5vp.fourchinese';
const run = (...args) => {
  try { return execFileSync(adb, ['-P', adbPort, '-s', serial, ...args], { timeout: 45000, maxBuffer: 256 * 1024 * 1024 }); }
  catch (error) { throw new Error(`ADB QA command failed: ${args.slice(0, 3).join(' ')}; ${error.stderr?.toString().slice(0, 800) || error.code || error.status}`); }
};
if (run('shell', 'getprop', 'ro.kernel.qemu').toString().trim() !== '1') throw new Error('Private Android emulator required');
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
function dump() {
  const status = run('shell', 'uiautomator', 'dump', '/sdcard/v8-qa-window.xml').toString();
  if (!/dumped/i.test(status)) throw new Error('Accessibility dump unavailable while UI is updating; no stale nodes will be used');
  const xml = run('shell', 'cat', '/sdcard/v8-qa-window.xml').toString();
  return [...xml.matchAll(/<node\b([^>]+)>/g)].map(m => Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a => [a[1], decode(a[2])])));
}
const [command, value] = process.argv.slice(2);
if (command === 'dump') console.log(JSON.stringify(dump().filter(n => n.text || n['content-desc']).map(n => ({ text: n.text, label: n['content-desc'], bounds: n.bounds, clickable: n.clickable })), null, 2));
else if (command === 'wait-text' || command === 'wait-any-text') {
  const expected = command === 'wait-any-text' ? value.split('||') : [value];
  let found = false;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      if (dump().some(n => expected.includes(n.text) || expected.includes(n['content-desc']))) { found = true; break; }
    } catch { /* Re-query fresh nodes while Android is changing its active window. */ }
  }
  if (!found) throw new Error(`Expected screen text missing: ${value}`);
  console.log(`VERIFIED UI ${value}`);
}
else if (command === 'tap' || command === 'tap-prefix') {
  let matches = dump().filter(n => (command === 'tap-prefix' ? n['content-desc'].startsWith(value) : n.text === value || n['content-desc'] === value) && n.enabled === 'true');
  const clickable = matches.filter(n => n.clickable === 'true');
  if (clickable.length === 1) matches = clickable;
  if (matches.length !== 1) throw new Error(`Expected one enabled match for ${value}; found ${matches.length}`);
  const b = matches[0].bounds.match(/\d+/g).map(Number);
  if (b[2] <= b[0] || b[3] <= b[1] || b[1] >= 1920) throw new Error('Matched control is clipped; scroll to reveal it before tapping');
  run('shell', 'input', 'tap', String((b[0]+b[2])/2|0), String((b[1]+b[3])/2|0));
} else if (command === 'tap-xy') {
  if (!/^\d{1,4},\d{1,4}$/.test(value)) throw new Error('Observed screenshot coordinates required');
  const [x,y] = value.split(',').map(Number);
  if (x < 0 || x >= 1080 || y < 0 || y >= 1920) throw new Error('Coordinate outside observed emulator screen');
  run('shell', 'input', 'tap', String(x), String(y));
} else if (command === 'capture' || command === 'capture-only') {
  if (!/^[a-z0-9-]+$/.test(value)) throw new Error('Safe capture name required');
  const nodes = command === 'capture-only' ? [] : dump();
  const pixels = run('exec-out', 'screencap', '-p');
  fs.writeFileSync(path.join(out, 'screenshots', `${value}.png`), pixels);
  fs.writeFileSync(path.join(out, 'screenshots', `${value}.json`), JSON.stringify(nodes, null, 2));
  fs.writeFileSync(path.join(out, 'screenshots', `${value}.meta.json`), JSON.stringify({
    timestamp: new Date().toISOString(), platform: 'Android native DEBUG development client; NOT release APK',
    serial, api: run('shell', 'getprop', 'ro.build.version.sdk').toString().trim(),
    size: run('shell', 'wm', 'size').toString().trim(), density: run('shell', 'wm', 'density').toString().trim(),
    fontScale: run('shell', 'settings', 'get', 'system', 'font_scale').toString().trim(),
    nightMode: run('shell', 'cmd', 'uimode', 'night').toString().trim(),
    build: process.env.NATIVE_QA_BUILD || 'V8.1 dirty source; app 0.1.43/versionCode45',
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }).trim(),
    dataMode: 'PRIVATE_EMULATOR_RETAINED_QA_DATA; original curriculum DRAFT/REVIEW_REQUIRED',
    sha256: crypto.createHash('sha256').update(pixels).digest('hex'),
  }, null, 2));
  console.log(`NATIVE CAPTURE ${value}`);
} else if (command === 'snapshot-db') {
  if (!/^(before|after|qa2-before|qa2-after)$/.test(value)) throw new Error('Database audit stage required');
  const folder = path.join(out, 'data-audit', value);
  fs.mkdirSync(folder, { recursive: true });
  const names = run('shell', 'run-as', packageName, 'ls', 'files/SQLite').toString().trim().split(/\s+/);
  const audit = {};
  for (const name of ['hanzi30.db', 'english-learner.db', 'english-skypedia-388adc0.db', 'learning-preferences.db']) {
    if (!names.includes(name)) continue;
    for (const suffix of ['', '-wal']) {
      if (names.includes(name + suffix)) fs.writeFileSync(path.join(folder, name + suffix), run('exec-out', 'run-as', packageName, 'cat', `files/SQLite/${name}${suffix}`));
    }
    const db = new DatabaseSync(path.join(folder, name), { readOnly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    const semantic = crypto.createHash('sha256');
    const counts = {};
    for (const { name: table } of tables) {
      const safe = '"' + table.replaceAll('"', '""') + '"';
      counts[table] = db.prepare(`SELECT COUNT(*) AS n FROM ${safe}`).get().n;
      semantic.update(table);
      // Stable full-content digest independent of SQLite WAL/checkpoint placement.
      for (const row of db.prepare(`SELECT * FROM ${safe}`).iterate()) semantic.update(JSON.stringify(row));
    }
    audit[name] = { userVersion: db.prepare('PRAGMA user_version').get().user_version, counts, semanticSha256: semantic.digest('hex') };
    db.close();
  }
  fs.writeFileSync(path.join(out, `database-${value}.json`), JSON.stringify(audit, null, 2));
  console.log(JSON.stringify(audit, null, 2));
} else if (command === 'route') {
  if (!/^\/[a-zA-Z0-9/_-]*(?:\?[a-zA-Z0-9=%&.,:_-]+)?$/.test(value)) throw new Error('Safe app QA route required');
  console.log(run('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'4chinese://${value}'`, packageName).toString());
} else if (command === 'type') {
  if (!/^[a-zA-Z0-9 ._:-]{1,200}$/.test(value)) throw new Error('ASCII QA input required');
  run('shell', 'input', 'text', value.replaceAll(' ', '%s'));
} else if (command === 'back') run('shell', 'input', 'keyevent', '4');
else if (command === 'scroll') run('shell', 'input', 'swipe', '500', '1600', '500', '600', '350');
else if (command === 'scroll-up') run('shell', 'input', 'swipe', '500', '600', '500', '1600', '350');
else if (command === 'scroll-sheet-up') run('shell', 'input', 'swipe', '500', '1200', '500', '1750', '350');
else throw new Error('Unknown V8 QA action');
