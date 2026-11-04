const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const folder = path.resolve(__dirname, '../artifacts/v7-2026-10-10/native/build41-emulator');
const xml = name => fs.readFileSync(path.join(folder, name + '.xml'), 'utf8');
const passed = [];
const check = (name, condition) => { assert.ok(condition, name); passed.push(name); };
check('40 to 41 retains committed review/XP', xml('01-upgrade-before-stats').includes('1 lượt ôn · 1 đúng · 10 XP tiếng Anh') && xml('09-stats-after-reader').includes('1 lượt ôn · 1 đúng · 10 XP tiếng Anh'));
check('Reader saves title and actual 462-character Android input', xml('03-reader-saved').includes('Native Reader QA') && xml('03-reader-saved').includes('Vị trí 0 / 462'));
check('Android back retains unsubmitted meaning', xml('04-reader-back-guard').includes('reader QA meaning') && xml('04-reader-back-guard').includes('Hãy lưu thẻ hoặc xóa nghĩa đang nhập'));
check('Offline USER card commit works', xml('05-reader-offline-add').includes('Đã thêm thẻ cá nhân. Chưa bắt đầu SRS, không cộng XP khi đọc.'));
check('Offline cold start restores document and exact personal meaning', xml('06-reader-cold-offline-reopen').includes('Vị trí 0 / 462') && xml('07-reader-personal-meaning-restored').includes('reader QA meaning'));
check('Quick session excludes new/future cards', xml('08-quick-no-premature-review').includes('Đã lưu 0 lượt · 0 đúng') && xml('08-quick-no-premature-review').includes('Phiên ôn nhanh đã kết thúc'));
check('Reader adds one NEW card without changing reviews or XP', xml('09-stats-after-reader').includes('2 thẻ · 1 đã học · 0 đến hạn') && xml('09-stats-after-reader').includes('1 lượt ôn · 1 đúng · 10 XP tiếng Anh'));
check('Chinese HSK syllabus still renders offline', xml('10-chinese-syllabus-offline').includes('300 mục riêng cấp này · 300 mục tích lũy') && xml('10-chinese-syllabus-offline').includes('ài · Đã liên kết với kho hiện có'));
const captures = fs.readdirSync(folder).filter(name => /^(0[13456789]|10)-.*\.png$/.test(name)).sort().map(name => {
  const data = fs.readFileSync(path.join(folder, name));
  return { filename: name, width: data.readUInt32BE(16), height: data.readUInt32BE(20), sha256: crypto.createHash('sha256').update(data).digest('hex') };
});
const result = { status: 'NATIVE_SMOKE_PASS_NOT_FULL_V7_ACCEPTANCE', app: '0.1.39', build: 41, serial: 'emulator-5562', platform: 'Android16 API36 x86_64 RELEASE_VARIANT', passed, captures,
  notVerified: ['Full V7 acceptance', 'TalkBack token focus/VoiceOver', 'Reader native nonzero page offset: long ADB text injection produced only 462 characters, no passing pagination claim', '200% font/rotation', 'Listening/audio/recording', 'Private phone SQLite row-by-row comparison', 'Store production signing (existing Android Debug certificate preserved for private upgrade)'] };
fs.writeFileSync(path.join(folder, 'result.json'), JSON.stringify(result, null, 2));
fs.writeFileSync(path.join(folder, 'capture-manifest.csv'), 'filename,width,height,sha256\n' + captures.map(row => Object.values(row).join(',')).join('\n') + '\n');
console.log(JSON.stringify(result));
