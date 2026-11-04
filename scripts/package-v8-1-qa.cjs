const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts/v8-1-verified-2026-10-13');
const audit = path.join(root, 'artifacts/v8-1-english-2026-10-13');
const native = path.join(root, 'artifacts/v8-1-native-2026-10-13/screenshots');
const web = path.join(root, 'artifacts/v8-1-web-attempt-09');
if (fs.existsSync(out)) throw new Error('Do not overwrite the verified handoff');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
const data = JSON.parse(fs.readFileSync(path.join(audit, 'database-verification.json'), 'utf8'));
const tests = JSON.parse(fs.readFileSync(path.join(audit, 'tests-final.json'), 'utf8'));
if (data.result !== 'PASS' || !tests.success || tests.numFailedTests) throw new Error('Data/test gate must pass');
const webManifest = JSON.parse(fs.readFileSync(path.join(web, 'capture-manifest.json'), 'utf8'));
if (webManifest.issues.length || webManifest.screenshots.length !== 46) throw new Error('Web E2E gate failed');
const baseline = JSON.parse(fs.readFileSync(path.join(audit, 'baseline.json'), 'utf8'));
const files = {};
function walk(folder) { for (const entry of fs.readdirSync(folder, { withFileTypes: true })) { const full = path.join(folder, entry.name); if (entry.isDirectory()) walk(full); else files[path.relative(root, full).replaceAll('\\', '/')] = sha(fs.readFileSync(full)); } }
walk(path.join(root, 'src'));
for (const file of ['app.json', 'package.json', 'package-lock.json', 'android/app/src/debug/AndroidManifest.xml']) files[file] = sha(fs.readFileSync(path.join(root, file)));
const sourceState = { commit: baseline.commit, dirty: true, timestamp: new Date().toISOString(), fingerprint: sha(JSON.stringify(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)))), files, changedExistingFiles: data.changedFiles, addedSourceFiles: Object.keys(files).filter(file => !(file in baseline.files)), approvedChineseAddenda: ['Pinyin below audio in lesson', 'All-level/deck due count on Home', 'Maximum 10 distinct words per review session'], apkStatus: 'Native debug45 + Metro source; release NOT BUILT/NOT INSTALLED' };
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'source-state.json'), JSON.stringify(sourceState, null, 2));
copy(path.join(audit, 'baseline.json'), path.join(out, 'baseline.json'));
for (const file of ['performance.json', 'database-verification.json']) copy(path.join(audit, file), path.join(out, file));
const engineering = { testFiles: tests.testResults.length, tests: tests.numTotalTests, passed: tests.numPassedTests, failed: tests.numFailedTests, lint: { errors: 0, preExistingWarnings: 7 }, typecheck: 'PASS', nativeDebugCompile: 'PASS x86_64; app0.1.43/debug45', androidProductionBundleExport: 'PASS; artifacts/v8-1-final-verified-export', release: 'NOT VERIFIED/NOT INSTALLED', physicalDevice: 'NOT USED', acousticPlaybackAndMeaningfulSTT: 'NOT VERIFIED' };
fs.writeFileSync(path.join(out, 'engineering.json'), JSON.stringify(engineering, null, 2));
const entries = [];
for (const item of webManifest.screenshots) {
  if (path.basename(item.file) !== item.file) throw new Error('Unsafe Web path');
  const source = path.join(web, 'screenshots', item.file);
  if (sha(fs.readFileSync(source)) !== item.sha256) throw new Error('Web PNG hash mismatch');
  const file = `web/screenshots/${item.file}`;
  copy(source, path.join(out, file));
  entries.push({ ...item, file, group: 'Web', sourceStage: 'Final V8.1 source after explicit user addenda. Web is not native evidence.' });
}
const chosen = [42,52,53,54,55,60,63,64,65,66,67,68,69,70,71,72,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,107,109,112,119,120,122,123,124,125,126,127];
const names = fs.readdirSync(native).filter(file => file.endsWith('.png'));
for (const id of chosen) {
  const name = names.find(file => file.startsWith(`${String(id).padStart(2, '0')}-`));
  if (!name) throw new Error(`Missing selected native state ${id}`);
  const metaFile = path.join(native, name.replace('.png', '.meta.json'));
  const metadata = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const source = path.join(native, name), file = `native/screenshots/${name}`;
  if (sha(fs.readFileSync(source)) !== metadata.sha256) throw new Error('Native PNG hash mismatch');
  const nodes = JSON.parse(fs.readFileSync(path.join(native, name.replace('.png', '.json')), 'utf8'));
  if (nodes.some(node => /Unmatched Route|Page could not be found|Đang mở dữ liệu học offline/.test(node.text || ''))) throw new Error('Invalid native state');
  copy(source, path.join(out, file));
  copy(metaFile, path.join(out, file.replace('.png', '.meta.json')));
  const group = [109,112,120].includes(id) ? 'Chinese addenda/regression' : 'Android native';
  entries.push({ ...metadata, file, name: name.replace('.png', ''), group, flow: id === 84 ? 'Android permission dialog only; not transcript proof' : id === 85 ? 'Denied permission with useful native fallback; no microphone/score' : id === 112 ? 'Actual Chinese lesson word pinyin directly below audio; no completed word' : 'Native state observed in isolated QA; filename identifies scenario', sourceStage: id < 63 ? 'Earlier V8.1 native implementation, not whole final-source recapture' : id < 113 ? 'V8.1 runtime staged capture; see timestamp and source baseline' : 'Final source after explicit user addenda' });
}
const docs = fs.readdirSync(path.join(root, 'docs')).filter(file => /^V8_1_.*\.md$/.test(file));
if (docs.length !== 15) throw new Error(`Expected 15 required V8.1 reports, got ${docs.length}`);
for (const file of [...docs, 'CHINESE_LESSON_PINYIN_2026-10-13.md', 'HOME_DUE_REVIEW_SYNC_2026-10-13.md']) copy(path.join(root, 'docs', file), path.join(out, 'docs', file));
const style = 'body{font-family:Arial,sans-serif;background:#f3f5fa;color:#172033;margin:24px}h1{font-size:27px}h2{font-size:17px}p,small{line-height:1.5}main,.compare{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}article,figure,section{background:white;border:1px solid #dce2ef;border-radius:12px;padding:14px;margin:0;min-width:0}img{width:100%;height:470px;object-fit:contain;background:#edf2f8}small{display:block;color:#536278}nav{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}button{padding:12px;border:1px solid #b7c7e3;background:white;border-radius:8px}article[hidden]{display:none}@media(max-width:800px){main,.compare{grid-template-columns:1fr}}';
async function finish() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
  const sheets = [];
  // Prioritize the requested pinyin, then real native flows, then separately labeled Web.
  entries.sort((a,b) => (a.name.includes('pinyin-under') ? -1 : b.name.includes('pinyin-under') ? 1 : a.group === 'Web' && b.group !== 'Web' ? 1 : b.group === 'Web' && a.group !== 'Web' ? -1 : a.file.localeCompare(b.file)));
  for (let offset = 0; offset < entries.length; offset += 6) {
    const markup = entries.slice(offset, offset + 6).map(item => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(out,item.file)).toString('base64')}"><figcaption>${esc(item.name)}<br>${esc(item.group)}</figcaption></figure>`).join('');
    await page.setContent(`<meta charset="utf-8"><style>${style}img{height:440px}figcaption{font-size:13px}</style><h1>V8.1 · QA sheet ${offset / 6 + 1} · Native/Web separated</h1><main>${markup}</main>`, { waitUntil: 'load', timeout: 120000 });
    const file = `contact-sheet-${String(offset / 6 + 1).padStart(2,'0')}.png`;
    await page.screenshot({ path: path.join(out,file), fullPage: true, timeout: 120000 }); sheets.push(file);
  }
  const counts = { native: entries.filter(item => item.group !== 'Web').length, web: 46, total: entries.length, contactSheets: sheets.length, requiredReports: 15, addendumReports: 2 };
  const manifest = { version: 'V8.1 + explicit user addenda', createdAt: new Date().toISOString(), counts, sourceStateFingerprint: sourceState.fingerprint, engineering, dataSafety: data.result, contentGate: 'PARTIAL/DRAFT/REVIEW_REQUIRED', corpusRedistribution: 'BLOCKED/LICENSE_REVIEW_REQUIRED', releaseDevice: 'NOT VERIFIED/NOT INSTALLED', screenshots: entries, contactSheets: sheets };
  fs.writeFileSync(path.join(out,'capture-manifest.json'), JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(out,'capture-manifest.csv'), 'group,file,platform,time,build,dataMode,sourceStage,sha256\n' + entries.map(item => [item.group,item.file,item.platform,item.timestamp,item.build,item.dataMode,item.sourceStage,item.sha256].map(value => '"'+String(value ?? '').replaceAll('"','""')+'"').join(',')).join('\n'));
  const cards = entries.map(item => `<article data-group="${esc(item.group)}"><a href="${item.file}"><img loading="lazy" src="${item.file}" alt="${esc(item.name)}"></a><h2>${esc(item.name)}</h2><p>${esc(item.flow)}</p><small>${esc(item.platform)}<br>${esc(item.sourceStage)}<br>${esc(item.timestamp)}</small></article>`).join('');
  fs.writeFileSync(path.join(out,'index.html'), `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>V8.1 · ảnh QA</title><style>${style}</style><h1>V8.1 · ${counts.total} ảnh nghiệm thu theo scope</h1><p>Pinyin dưới loa · Tổng đến hạn mọi bộ/cấp · Tối đa10 từ/phiên. ${counts.native} ảnh native máy ảo, ${counts.web} ảnh Web. Chưa cài điện thoại; content review PARTIAL, corpus license BLOCKED; debug không phải release.</p><nav><a href="docs/V8_1_FINAL_REPORT.md">Báo cáo đầy đủ</a><a href="docs/HOME_DUE_REVIEW_SYNC_2026-10-13.md">Tổng đến hạn/10 từ</a><a href="capture-manifest.csv">Manifest</a><a href="comparison-local.html">So sánh local</a>${sheets.map(file => `<a href="${file}">${file}</a>`).join('')}</nav><nav>${['Tất cả','Android native','Chinese addenda/regression','Web'].map(group => `<button data-filter="${esc(group)}">${esc(group)}</button>`).join('')}</nav><main>${cards}</main><script>document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>document.querySelectorAll('article').forEach(card=>card.hidden=button.dataset.filter!=='Tất cả'&&card.dataset.group!==button.dataset.filter)));</script></html>`);
  const pairs = [['Dictionary','02-home-dictionary/052-dictionary-entry.png','web/screenshots/04-dictionary-multi-sense-entry.png','native/screenshots/68-reader-learning-current.png'],['Reader','04-explore/009-explore-tab.png','web/screenshots/15-reader-preview.png','native/screenshots/67-reader-current.png'],['Speaking','05-speak/014-conversation-detail.png','web/screenshots/08-speaking.png','native/screenshots/78-role-current.png']];
  const compare = pairs.map(([title,reference,before,after]) => `<section><h2>${esc(title)}</h2><p>Reference là link local nếu file tồn tại; không có trong ZIP. Before V8 và After V8.1 khác stage/platform được ghi rõ; không đại diện public release.</p><div class="compare"><figure><img src="../4english-device-qa-2026-10-12/screenshots/${reference}"><figcaption>4English reference local</figcaption></figure><figure><img src="../v8-english-2026-10-13/${before}"><figcaption>Before V8</figcaption></figure><figure><img src="${after}"><figcaption>After V8.1</figcaption></figure></div></section>`).join('');
  fs.writeFileSync(path.join(out,'comparison-local.html'), `<!doctype html><html lang="vi"><meta charset="utf-8"><style>${style}</style><h1>Reference / Before / After</h1><p>Không nhân bản commercial assets. Các link reference/before cần các bộ ảnh cũ trên cùng máy; báo cáo visual comparison vẫn đọc được trong ZIP.</p>${compare}</html>`);
  fs.writeFileSync(path.join(out,'README.md'), `# V8.1 verified-scope preview\n\nMở index.html: ${counts.total} ảnh (${counts.native} native máy ảo +46 Web), ${sheets.length} contact sheets,15 báo cáo và2 addenda. Không raw DB/WAL, key,APK hoặc ảnh thương mại trong gói. Platform/source stage được ghi rõ. Content và license/release chưa PASS; đọc final report.\n`);
  await browser.close();
  console.log(JSON.stringify({ out, counts, sourceFingerprint: sourceState.fingerprint }));
}
finish().catch(error => { console.error(error); process.exitCode = 1; });
