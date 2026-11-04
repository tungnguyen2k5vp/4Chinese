const fs = require('node:fs');
const path = require('node:path');
const { zipSync, strToU8 } = require('fflate');

const root = path.resolve(__dirname, '..');
const artifact = path.join(root, 'artifacts/v8-2-chinese-redesign-2026-10-14');
const screenshots = path.join(artifact, 'screenshots');
const gallery = path.join(artifact, 'gallery-10-features');
const beforeRoot = path.join(root, 'artifacts/chinese-device-ui-2026-10-14-build48');

const groups = [
  { id: '01-overview', title: '01 · Tổng quan', description: 'Trang chủ và ưu tiên học hôm nay.', shots: ['05-home-qa2'] },
  { id: '02-vocabulary', title: '02 · Kho từ', description: 'Tìm kiếm, bộ lọc và danh sách từ.', shots: ['vocabulary-tab', '44-library'] },
  { id: '03-learning-review', title: '03 · Học và ôn', description: 'Thiết lập, lịch ôn và các trạng thái của bài ôn.', shots: ['31-review-setup-empty', '32-review-upcoming', '33-review-weak'] },
  { id: '04-personal-decks', title: '04 · Bộ từ', description: 'Danh sách bộ từ và trạng thái rỗng trên máy QA.', shots: ['45-decks'] },
  { id: '05-hsk', title: '05 · HSK', description: 'Trung tâm HSK, tiến độ cấp và đề cương.', shots: ['08-hsk-hub', 'hsk-tab', 'hsk-level-1', '47-hsk-syllabus'] },
  { id: '06-grammar', title: '06 · Ngữ pháp', description: 'Danh sách quy tắc và ôn điểm dễ nhầm.', shots: ['grammar-index-settled', '35-grammar-focus'] },
  { id: '07-listening-speaking', title: '07 · Nghe và nói', description: 'Nghe, thanh điệu, cặp âm, shadowing, hội thoại và bản ghi.', shots: ['36-speaking-home', '37-speaking-tones', '38-speaking-pairs', '39-speaking-shadowing', '40-speaking-ai', '41-speaking-recordings', '42-listening'] },
  { id: '08-reading', title: '08 · Đọc', description: 'Không gian đọc, reader và truyện theo cấp.', shots: ['43-reader', '48-stories'] },
  { id: '09-exam', title: '09 · Thi', description: 'Thiết lập, lưu đáp án, điều hướng, nộp bài, kết quả và lịch sử. Bài viết thiếu ID bản nháp là trạng thái lỗi có chủ đích.', shots: ['09-exam-center-qa2', '10-exam-setup-qa2', '11-exam-session-q1-qa2', '12-exam-answer-saved', '13-exam-next-question-qa2', '14-exam-autosave', '15-exam-q2', '16-exam-q2-previous', '17-exam-q2-selected', '18-exam-question-navigator', '19-exam-exit-confirmation', '20-exam-exit-state', '21-exam-q3-qa2', '22-exam-q3-selected', '23-exam-q4-unanswered', '24-exam-submit-confirmation', '25-exam-result-qa2', '26-exam-answer-review', '27-exam-answer-explanation', '28-exam-center-history', '29-exam-center-lower', '30-exam-history', 'exam-readiness-confirmed', '50-exam-skills', '51-exam-written', '52-exam-speaking'] },
  { id: '10-account-stats', title: '10 · Tài khoản và thống kê', description: 'Tài khoản, tiến độ và thành tích.', shots: ['stats-tab', 'profile-tab', '53-achievements'] },
];

const pairs = [
  ['01-overview', '01-tong-quan/01-trang-chu.png', '05-home-qa2'],
  ['02-vocabulary', '02-kho-tu/01-kho-tu.png', 'vocabulary-tab'],
  ['03-learning-review', '03-hoc-on/02-chon-so-tu.png', '31-review-setup-empty'],
  ['04-personal-decks', '04-bo-tu/01-danh-sach.png', '45-decks'],
  ['05-hsk', '05-hsk/01-hsk.png', 'hsk-tab'],
  ['06-grammar', '06-ngu-phap/01-danh-sach.png', 'grammar-index-settled'],
  ['07-listening-speaking', '07-nghe-noi/01-nghe.png', '42-listening'],
  ['08-reading', '08-doc/02-doc.png', '43-reader'],
  ['09-exam', '09-thi/01-bai-thi.png', '09-exam-center-qa2'],
  ['10-account-stats', '10-tai-khoan/01-tai-khoan.png', 'profile-tab'],
];

fs.mkdirSync(gallery, { recursive: true });
const entries = {};
const cards = [];
let includedCount = 0;
for (const group of groups) {
  const dir = path.join(gallery, group.id);
  fs.mkdirSync(dir, { recursive: true });
  const included = [];
  for (const name of group.shots) {
    const source = path.join(screenshots, `${name}.png`);
    if (!fs.existsSync(source)) continue;
    const targetName = `${name}.png`;
    fs.copyFileSync(source, path.join(dir, targetName));
    included.push({ name, file: `${group.id}/${targetName}` });
    includedCount += 1;
  }
  entries[group.id] = included;
  const figureHtml = included.map(item => `<figure><a href="${group.id}/${item.name}.png"><img loading="lazy" src="${group.id}/${item.name}.png" alt="${group.title} · ${item.name}"></a><figcaption>${item.name}</figcaption></figure>`).join('\n');
  cards.push(`<section id="${group.id}"><h2>${group.title}</h2><p>${group.description}</p><div class="grid">${figureHtml}</div></section>`);
}

const pairDir = path.join(gallery, 'before-after');
fs.mkdirSync(pairDir, { recursive: true });
const pairLinks = [];
for (const [groupId, beforeRel, afterName] of pairs) {
  const before = path.join(beforeRoot, beforeRel);
  const after = path.join(screenshots, `${afterName}.png`);
  if (!fs.existsSync(before) || !fs.existsSync(after)) continue;
  const stem = groupId;
  const beforeTarget = `before-after/${stem}-before-build48.png`;
  const afterTarget = `before-after/${stem}-after-v82.png`;
  fs.copyFileSync(before, path.join(gallery, beforeTarget));
  fs.copyFileSync(after, path.join(gallery, afterTarget));
  pairLinks.push(`<section><h2>${stem}</h2><div class="pair"><figure><img loading="lazy" src="before-after/${stem}-before-build48.png" alt="Before ${stem}"><figcaption>Before · build 48</figcaption></figure><figure><img loading="lazy" src="before-after/${stem}-after-v82.png" alt="After ${stem}"><figcaption>After · Android QA debug build 51</figcaption></figure></div></section>`);
}

const index = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>4Chinese V8.2 · Android QA</title><style>body{font:16px/1.55 system-ui,sans-serif;color:#172033;background:#f4f6fb;margin:0;padding:24px}main{max-width:1180px;margin:auto}h1{margin:0 0 8px}section{margin:28px 0;padding:18px;background:#fff;border:1px solid #dfe5f0;border-radius:18px}.grid,.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}figure{margin:0}img{display:block;width:100%;height:auto;border:1px solid #e1e5ed;border-radius:12px}figcaption{font-size:13px;color:#687386;padding:6px 2px;overflow-wrap:anywhere}.note{padding:14px;border-radius:12px;background:#e8efff;color:#203f91}</style><main><h1>4Chinese V8.2 · ảnh QA Android</h1><p class="note">${includedCount} ảnh sau chỉnh sửa, chia theo 10 khu tính năng. Bộ Before/After dùng ảnh build 48 (điện thoại Android 13) và ảnh debug build 51 trên máy ảo API 36; khác thiết bị/kích thước nên dùng để so sánh thứ bậc và cấu trúc, không phải pixel-diff. Không phải bản release; chưa cài V8.2 lên điện thoại thật. Bài viết cần ID bản nháp; trạng thái lỗi được ghi chú trong nhóm Thi.</p><nav>${groups.map(g => `<a href="#${g.id}">${g.title}</a>`).join(' · ')}</nav>${cards.join('\n')}<h2>So sánh trước / sau</h2><p>Ảnh trước là build 48 đã có sẵn trong kho QA, ảnh sau là debug build 51 trên máy ảo.</p>${pairLinks.join('\n')}<footer><p>Manifest: manifest.json · Thư mục này chỉ chứa bản sao ảnh QA; dữ liệu nguồn không bị di chuyển hoặc xóa.</p></footer></main></html>`;
fs.writeFileSync(path.join(gallery, 'index.html'), index, 'utf8');
fs.writeFileSync(path.join(gallery, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), currentBuild: '0.1.49 / versionCode 51; DEBUG dev-client, private emulator 127.0.0.1:5563 API 36', screenshotCount: includedCount, groups: entries, beforeAfterPairs: pairLinks.length, limitations: ['Before/after use different physical form factors and builds; qualitative only.', 'No release APK was built or installed by this QA pass.', 'Screens show the retained QA database; it had no reviewed vocabulary and contained one pre-existing exam attempt before this QA run.', 'One test exam was submitted during this QA pass; score 2/4, leaving one unanswered question.', 'Audio hardware quality, Android permission flows, TalkBack, dark mode, and increased font scale were not verified.'] }, null, 2), 'utf8');
fs.writeFileSync(path.join(gallery, 'README.md'), `# 4Chinese V8.2 · QA gallery\n\n- ${includedCount} post-change Android screenshots in 10 feature folders.\n- Ten representative before/after pairs from existing build-48 Android screenshots to private-emulator debug build 51.\n- Open [index.html](index.html) for the gallery.\n- Before/after are qualitative only: the old captures are from a physical Android 13 handset and the new captures are from API 36 emulator.\n- The current build is debug/development-client, not release. This package does not indicate installation on a physical phone.\n- One QA exam was submitted (2/4 correct; 1 unanswered). All other data changes were checked against emulator snapshots.\n- Use manifest.json for filenames and boundaries.\n`, 'utf8');

const reportNames = [
  'V8_2_CHINESE_UI_AUDIT.md', 'V8_2_DESIGN_RULES.md', 'V8_2_HSK_HUB.md',
  'V8_2_EXAM_CENTER.md', 'V8_2_EXAM_QUESTION_UI.md', 'V8_2_EXAM_RESULT.md',
  'V8_2_INFORMATION_DENSITY.md', 'V8_2_DATA_CONSISTENCY_AUDIT.md',
  'V8_2_DATABASE_SAFETY.md', 'V8_2_ENGLISH_REGRESSION.md',
  'V8_2_ANDROID_VISUAL_QA.md', 'V8_2_FINAL_REPORT.md',
];
const reportsDir = path.join(gallery, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
for (const name of reportNames) {
  const source = path.join(root, 'docs', name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(reportsDir, name));
}

const zipFiles = {};
function addDir(dir, relative = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const name = path.posix.join('4chinese-v8-2-android-qa', relative, entry.name);
    if (entry.isDirectory()) addDir(absolute, path.posix.join(relative, entry.name));
    else zipFiles[name] = new Uint8Array(fs.readFileSync(absolute));
  }
}
addDir(gallery);
zipFiles['4chinese-v8-2-android-qa/QA-LIMITATIONS.txt'] = strToU8('Current app version: 0.1.49 / versionCode 51. Private Android API 36 emulator, debug dev-client only. No V8.2 release APK or physical-device installation. English source/data and SQLite schema/SRS/scoring are protected by safety verification. See manifest.json and reports/V8_2_FINAL_REPORT.md.');
const zipped = zipSync(zipFiles, { level: 0 });
fs.writeFileSync(path.join(artifact, '4chinese-v8-android-qa.zip'), zipped);
console.log(JSON.stringify({ screenshotCount: includedCount, beforeAfterPairs: pairLinks.length, archive: path.relative(root, path.join(artifact, '4chinese-v8-android-qa.zip')), archiveBytes: zipped.byteLength, groups: Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, value.length])) }, null, 2));
