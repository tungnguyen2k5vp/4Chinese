/* Read-only UI smoke after an explicitly requested private APK upgrade. No learner writes. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const adb = 'C:/Users/Admin/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const serial = 'FAJFPNTCPFGEKZB6';
const pkg = 'com.tungnguyen2k5vp.fourchinese';
const folder = path.resolve(__dirname, '../artifacts/v7-2026-10-10/native/build42-phone');
fs.mkdirSync(folder, { recursive: true });
const run = (...args) => execFileSync(adb, ['-s', serial, ...args], { timeout: 30000 });
const result = { status: 'IN_PROGRESS', version: '0.1.40', build: 42, serial, platform: 'Realme RMX3085 Android13 ARM64 RELEASE_VARIANT', passed: [], pids: [] };
const capture = name => {
  run('shell', 'uiautomator', 'dump', '/sdcard/4chinese-build42-qa.xml');
  const xml = run('shell', 'cat', '/sdcard/4chinese-build42-qa.xml').toString();
  fs.writeFileSync(path.join(folder, name + '.xml'), xml);
  fs.writeFileSync(path.join(folder, name + '.png'), run('exec-out', 'screencap', '-p'));
  return xml;
};
try {
  const metadata = run('shell', 'dumpsys', 'package', pkg).toString();
  assert.ok(metadata.includes('versionCode=42') && metadata.includes('versionName=0.1.40'));
  for (let attempt = 1; attempt <= 2; attempt++) {
    run('shell', 'am', 'force-stop', pkg);
    run('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', '4chinese://english/reader', pkg);
    let ready = false;
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      run('shell', 'uiautomator', 'dump', '/sdcard/4chinese-build42-qa.xml');
      const xml = run('shell', 'cat', '/sdcard/4chinese-build42-qa.xml').toString();
      if (xml.includes('Văn bản tiếng Anh để đọc') || xml.includes('Vị trí ')) { ready = true; break; }
    }
    assert.ok(ready, 'Reader must load, not just startup spinner');
    const pid = run('shell', 'pidof', pkg).toString().trim();
    assert.match(pid, /^\d+$/);
    result.pids.push(pid);
    assert.ok(!run('logcat', '-d', '-b', 'crash', '--pid=' + pid).toString().includes('Fatal signal'));
    capture('0' + attempt + '-reader-cold-launch');
    result.passed.push('cold launch ' + attempt + ' loads actual Reader without fatal signal for this process');
  }
  run('shell', 'am', 'start', '-W', '-n', pkg + '/.MainActivity', '-a', 'android.intent.action.VIEW', '-d', '4chinese://');
  const deadline = Date.now() + 60000;
  let home = false;
  while (Date.now() < deadline) {
    const xml = capture('03-home-after-upgrade');
    if (xml.includes('Xin chào') || xml.includes('Hôm nay')) { home = true; break; }
  }
  assert.ok(home, 'Home loads with existing user data');
  result.passed.push('returns to actual home; no added test cards, reviews or preference edits on phone');
  result.status = 'PHONE_STARTUP_SMOKE_PASS_NOT_FULL_V7_ACCEPTANCE';
} catch (error) { result.status = 'PHONE_SMOKE_FAIL'; result.failure = String(error); process.exitCode = 1; }
finally {
  fs.writeFileSync(path.join(folder, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
