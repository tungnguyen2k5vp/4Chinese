const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const folder = path.resolve(__dirname, '../artifacts/v7-2026-10-10/native/build40-emulator');
const read = name => fs.readFileSync(path.join(folder, `${name}.xml`), 'utf8');
const before = read('02-card-schedule-before').match(/text="(Lần ôn tiếp:[^"]+)"/)[1];
const after = read('07-card-schedule-after').match(/text="(Lần ôn tiếp:[^"]+)"/)[1];
assert.equal(after, before);
assert.ok(read('01-upgrade-preserved-stats').includes('1 lượt ôn · 1 đúng · 10 XP tiếng Anh'));
assert.ok(read('05-cold-reopened-edit-draft').includes('native edited sample'));
assert.ok(read('05-cold-reopened-edit-draft').includes('Đã khôi phục bản nháp chỉnh sửa ở máy.'));
assert.ok(read('06-edit-save-offline').includes('Đã lưu thay đổi. Lịch ôn, tiến độ và lịch sử được giữ nguyên.'));
assert.ok(read('08-committed-notes').includes('native saved note'));
assert.ok(!read('08-committed-notes').includes('Đã khôi phục bản nháp chỉnh sửa ở máy.'));
const captures = fs.readdirSync(folder).filter(name => /^\d+-.*\.png$/.test(name)).sort().map(name => {
  const bytes = fs.readFileSync(path.join(folder, name));
  return { filename: name, platform: 'ANDROID_EMULATOR_RELEASE_BUILD40', scope: 'VIEWPORT_STATE_NOT_ALL_SCREENS', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
});
const result = { status: 'CARD_EDITOR_NATIVE_SMOKE_PASS_NOT_FULL_V7_ACCEPTANCE', app: '0.1.38', build: 40,
  emulator: 'V7_QA_Build38 / emulator-5562 / Android16 x86_64',
  passed: ['39→40 upgrade retained committed review and XP', 'editing keyboard and Android back', 'saved edit draft retained after process stop/reopen offline', 'edit committed offline and notes retained after route reopen', 'exact scheduled date unchanged, draft cleared after commit'],
  scheduleBefore: before, scheduleAfter: after,
  notVerified: ['native pagination with 151 cards (Web and repository only)', 'editor TalkBack/200% text/rotation', 'native sourced dictionary card editing', 'full V7 acceptance', 'phone install'], captures };
fs.writeFileSync(path.join(folder, 'result.json'), JSON.stringify(result, null, 2));
fs.writeFileSync(path.join(folder, 'capture-manifest.csv'), 'filename,platform,scope,width,height,sha256\n' + captures.map(row => Object.values(row).join(',')).join('\n') + '\n');
console.log(JSON.stringify(result));
