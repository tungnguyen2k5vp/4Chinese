const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts/v8-english-2026-10-13');
if (fs.existsSync(out)) throw new Error('Refusing to overwrite final V8 handoff');
const entries = [];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const html = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const nativeRoot = path.join(root,'artifacts/v8-native-2026-10-13');
const dataReport = JSON.parse(fs.readFileSync(path.join(nativeRoot,'database-verification.json'),'utf8'));
if (dataReport.result !== 'PASS') throw new Error('Data safety gate must pass');
fs.mkdirSync(out, { recursive: true });
function copy(source, target) { fs.mkdirSync(path.dirname(target),{recursive:true}); fs.copyFileSync(source,target); }
function collectWeb(sourceRoot, prefix) {
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceRoot,'capture-manifest.json'),'utf8'));
  if (manifest.runtimeIssues.length) throw new Error('Web runtime errors');
  for(const item of manifest.screenshots) {
    if(path.basename(item.file)!==item.file) throw new Error('Unsafe screenshot path');
    const source=path.join(sourceRoot,'screenshots',item.file);
    if(hash(source)!==item.sha256) throw new Error('Screenshot checksum mismatch');
    const file=`${prefix}/screenshots/${item.file}`;
    copy(source,path.join(out,file));
    entries.push({...item,file,group:'Web',capturedAt:fs.statSync(source).mtime.toISOString()});
  }
  copy(path.join(sourceRoot,'capture-manifest.json'),path.join(out,prefix,'capture-manifest.json'));
}
collectWeb(path.join(root,'artifacts/v8-english-2026-10-13-attempt-13'),'web');
collectWeb(path.join(root,'artifacts/v8-web-functional-supplement-2026-10-13'),'web-supplement');
const chosenNativeIds=[3,8,9,10,11,13,14,15,16,17,18,19,20,21,22,23,31,32,33,34,36,37,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62];
const names=fs.readdirSync(path.join(nativeRoot,'screenshots')).filter(name=>name.endsWith('.png'));
for(const id of chosenNativeIds) {
  const name=names.find(name=>name.startsWith(`${String(id).padStart(2,'0')}-`));
  if(!name) throw new Error(`Missing native capture ${id}`);
  const source=path.join(nativeRoot,'screenshots',name), file=`native/screenshots/${name}`;
  const metadata=JSON.parse(fs.readFileSync(source.replace(/\.png$/,'.json'),'utf8'));
  if(metadata.some(node=>/Unmatched Route|Page could not be found/.test(node.text||''))) throw new Error('Failed route in curated native capture');
  copy(source,path.join(out,file)); copy(source.replace(/\.png$/,'.json'),path.join(out,file.replace(/\.png$/,'.json')));
  entries.push({file,name:name.replace(/\.png$/,''),group:id===49||id===50?'Chinese regression':'Android native',platform:'Android API36 x86_64, native debug 0.1.43/build45 with Metro; not a release or phone screenshot',note:'Private read-only QA AVD. File name identifies route/state; see V8_ANDROID_QA.md for verification limits.',sha256:hash(source),capturedAt:fs.statSync(source).mtime.toISOString()});
}
for(const file of ['database-before.json','database-after.json','database-verification.json']) copy(path.join(nativeRoot,file),path.join(out,file));
const documents=fs.readdirSync(path.join(root,'docs')).filter(name=>/^V8_.*\.md$/.test(name));
if(documents.length!==18) throw new Error(`Expected 18 V8 documents, got ${documents.length}`);
for(const name of documents) copy(path.join(root,'docs',name),path.join(out,'docs',name));
const comparisons=[
 ['Vocabulary','03-vocabulary/005-vocabulary-dashboard.png','02-english-vocabulary-hub-learning-first.png','web/screenshots/07-vocabulary-hub-preview.png','Progress/decks use existing SRS; preview data is clearly marked.'],
 ['Dictionary','02-home-dictionary/052-dictionary-entry.png','54-bank-detail-mobile-stacked-unselected.png','web/screenshots/06-dictionary-selected-vi.png','Shared Quick Dictionary adds explicit sense selection; EN definition absent in the source.'],
 ['Review','01-review-session/001-current.png','30-review-meaning-question-fixture.png','native/screenshots/13-native-review-scrolled.png','Compact native focus view; actual QA card/due state, not a phone install.'],
];
const compareCards=comparisons.map(([title,ref,before,after,note])=>`<section><h2>${html(title)}</h2><div class="compare"><figure><img src="../4english-device-qa-2026-10-12/screenshots/${ref}"/><figcaption>4English reference · local link only</figcaption></figure><figure><img src="../english-v7-4-verified-2026-10-11/screenshots/${before}"/><figcaption>V7.4 before · existing Web QA</figcaption></figure><figure><img src="${after}"/><figcaption>V8 after · platform labeled in manifest</figcaption></figure></div><p>${html(note)}</p></section>`).join('');
const style='body{font-family:Arial,sans-serif;margin:24px;background:#f3f5fa;color:#172033}h1{font-size:28px}h2{font-size:20px}main,.compare{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}figure,article,section{background:white;border:1px solid #dce2ef;border-radius:14px;padding:14px;margin:0}img{width:100%;height:440px;object-fit:contain;background:#edf2f8}p,small,figcaption{line-height:1.5}small{display:block;color:#526279}nav{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}button{padding:10px 16px;border:1px solid #c7d2ea;border-radius:10px;background:white;cursor:pointer}@media(max-width:800px){main,.compare{grid-template-columns:1fr}}';
fs.writeFileSync(path.join(out,'comparison-local.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><title>V8 comparison</title><style>${style}</style><h1>Reference / Before / After</h1><p>Reference và Before dùng đường dẫn tới thư mục đã có trên máy. ZIP không chứa ảnh gốc 4English hoặc thông tin tài khoản. Khi giải nén ở máy khác, dùng bảng đối chiếu trong docs nếu các thư mục cũ không tồn tại.</p>${compareCards}</html>`);
async function finish() {
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const sheetPage=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1});
  const sheets=[];
  for(let offset=0;offset<entries.length;offset+=6) {
    const group=entries.slice(offset,offset+6);
    const markup=group.map(item=>`<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(out,item.file)).toString('base64')}"/><figcaption>${html(item.name)}<br/>${html(item.group)}</figcaption></figure>`).join('');
    await sheetPage.setContent(`<meta charset="utf-8"><style>${style}main{grid-template-columns:repeat(3,1fr)}img{height:455px}figcaption{font-size:13px}</style><h1>4Chinese V8 · QA sheet ${offset/6+1} · Native / Web labeled</h1><main>${markup}</main>`,{waitUntil:'load',timeout:120000});
    const file=`contact-sheet-${String(offset/6+1).padStart(2,'0')}.png`;
    await sheetPage.screenshot({path:path.join(out,file),fullPage:true,timeout:120000}); sheets.push(file);
  }
  await browser.close();
  const counts={native:chosenNativeIds.length,web:entries.length-chosenNativeIds.length,total:entries.length,contactSheets:sheets.length,documents:documents.length};
  const manifest={version:'V8',createdAt:new Date().toISOString(),counts,screenshots:entries,contactSheets:sheets,engineering:{testFiles:189,tests:1030,typecheck:'PASS',lintErrors:0,existingLintWarnings:7,nativeDebugBuild:'PASS'},dataSafety:dataReport,releaseStatus:'NOT BUILT/NOT INSTALLED; approval required before phone deployment',contentStatus:'PARTIAL; see V8_FEATURE_PARITY_MATRIX.md'};
  fs.writeFileSync(path.join(out,'capture-manifest.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(out,'capture-manifest.csv'),'group,file,platform,sha256\n'+entries.map(item=>[item.group,item.file,item.platform,item.sha256].map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\n'));
  const cards=entries.map(item=>`<article data-group="${html(item.group)}"><a href="${item.file}"><img loading="lazy" src="${item.file}" alt="${html(item.name)}"/></a><h2>${html(item.name)}</h2><p>${html(item.note)}</p><small>${html(item.platform)}</small></article>`).join('');
  fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>4Chinese V8 · bộ ảnh QA</title><style>${style}</style><h1>4Chinese V8 · ${counts.total} ảnh QA</h1><p>${counts.native} ảnh native máy ảo, ${counts.web} ảnh Web độc lập, ${sheets.length} contact sheets. Chưa cài lên điện thoại. Catalogue/AI và các gap được ghi trong báo cáo.</p><nav><a href="docs/V8_FINAL_REPORT.md">Báo cáo</a><a href="capture-manifest.csv">Manifest</a><a href="comparison-local.html">So sánh local</a>${sheets.map(file=>`<a href="${file}">${file}</a>`).join('')}</nav><nav>${['Tất cả','Android native','Web','Chinese regression'].map(group=>`<button type="button" data-filter="${html(group)}">${html(group)}</button>`).join('')}</nav><main>${cards}</main><script>document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>document.querySelectorAll('article').forEach(card=>card.hidden=button.dataset.filter!=='Tất cả'&&card.dataset.group!==button.dataset.filter)));</script></html>`);
  fs.writeFileSync(path.join(out,'README.md'),`# Bộ nghiệm thu V8\n\nMở index.html để xem ${counts.total} ảnh, lọc Android/Web/Chinese regression. Ảnh native là APK debug trên máy ảo riêng; ảnh Web được ghi rõ. Không có ảnh điện thoại, raw SQLite, khóa xác thực hay ảnh profile 4English trong ZIP.\n\nCó ${sheets.length} contact sheets, manifest JSON/CSV và 18 tài liệu. V8 còn PARTIAL ở các mục nêu trong docs/V8_FINAL_REPORT.md. Source dictionaries/chọn nghĩa/ngày ôn được kiểm tra trên dữ liệu QA; xem database-verification.json.\n`);
  console.log(JSON.stringify({out,counts},null,2));
}
finish().catch(error=>{console.error(error);process.exitCode=1;});
