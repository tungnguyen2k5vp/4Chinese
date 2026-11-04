const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts/chinese-device-ui-2026-10-14-build48');
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
for (const item of manifest) {
  if (/03-hoc-on\/0[345]-/.test(item.name)) item.route='/review/session';
  if (item.name==='09-thi/06-bai-thi-dang-lam') {
    item.route='/exam/result';
    item.note='Bài dở hết hạn tự chuyển sang kết quả 0/4; không phải ảnh câu hỏi đang làm.';
  }
  if (item.name.startsWith('08-doc/03-noi-dung')) item.note='Trang developer-only chuyển về Trang chủ trên bản release; không phải màn hình học viên.';
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(d => d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]);
const routes = walk(path.join(root,'src/app')).filter(f=>f.endsWith('.tsx')&&!f.endsWith('_layout.tsx')).map(f=>{
  const file=path.relative(root,f).replaceAll('\\','/');
  const route='/'+path.relative(path.join(root,'src/app'),f).replaceAll('\\','/').replace('(tabs)/','').replace(/\.tsx$/,'').replace(/(^|\/)index$/,'');
  const clean=route||'/';
  const excluded=clean.startsWith('/english')||['/explore','/entertainment','/__qa','/content-review'].includes(clean);
  const regex=new RegExp('^'+clean.replace(/\[[^\]]+\]/g,'[^/]+')+'$');
  const images=excluded?[]:manifest.filter(i=>i.route&&regex.test(i.route.split('?')[0])).map(i=>i.name+'.png');
  return {file,route:clean,status:excluded?'Không thuộc UI tiếng Trung bản release':images.length?'Đã chụp trạng thái thực tế':'Chưa có ảnh — cần luồng/dữ liệu tương ứng',images};
});
const checks=manifest.map(i=>{
 const b=fs.readFileSync(path.join(out,i.name+'.png'));
 return {name:i.name,width:b.readUInt32BE(16),height:b.readUInt32BE(20),sha256:crypto.createHash('sha256').update(b).digest('hex')};
});
fs.writeFileSync(path.join(out,'coverage.json'),JSON.stringify(routes,null,2));
fs.writeFileSync(path.join(out,'image-checks.json'),JSON.stringify(checks,null,2));
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
fs.writeFileSync(path.join(out,'coverage.html'),`<!doctype html><meta charset="utf-8"><title>Phạm vi ảnh tiếng Trung</title><style>body{font:16px system-ui;margin:24px}td,th{padding:10px;border:1px solid #ddd}table{border-collapse:collapse}</style><h1>Phạm vi rà soát</h1><p><a href="index.html">Mở bộ ảnh</a> · ${manifest.length} ảnh thực tế. Trang động được chụp bằng dữ liệu có sẵn; không có nghĩa mọi từ/bài/trạng thái lỗi đã được chụp.</p><table><tr><th>Trang</th><th>Trạng thái</th><th>Ảnh</th></tr>${routes.map(r=>`<tr><td>${escape(r.route)}</td><td>${r.status}</td><td>${r.images.map(i=>`<a href="${i}">${escape(i)}</a>`).join('<br>')}</td></tr>`).join('')}</table>`);
console.log(JSON.stringify({images:checks.length,invalidDimensions:checks.filter(i=>i.width!==1080||i.height!==2400).length,publicRoutesCaptured:routes.filter(r=>r.images.length).length,notCaptured:routes.filter(r=>!r.images.length&&!r.status.startsWith('Không')).map(r=>r.route)},null,2));
const groups={'01-tong-quan':'Tổng quan','02-kho-tu':'Kho từ và tra cứu','03-hoc-on':'Học và ôn tập','04-bo-tu':'Bộ từ cá nhân','05-hsk':'HSK và lộ trình','06-ngu-phap':'Ngữ pháp và luyện viết','07-nghe-noi':'Nghe và nói','08-doc':'Đọc và truyện','09-thi':'Luyện thi','10-tai-khoan':'Tài khoản và cài đặt'};
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Tiếng Trung — ảnh Realme 8 build 48</title><style>body{font:16px system-ui;margin:24px;background:#f4f5f8;color:#172033}nav{display:flex;flex-wrap:wrap;gap:12px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}img{width:100%;max-width:360px}article{background:white;padding:12px;border-radius:12px}article h3{font-size:15px;overflow-wrap:anywhere}article p{font-size:13px;overflow-wrap:anywhere}h2{margin-top:40px}input{padding:12px;width:min(90%,600px)}a{color:#2457c9}</style><h1>Tiếng Trung — Realme 8 — build 48</h1><p>${manifest.length} ảnh PNG 1080×2400 chụp trực tiếp trên điện thoại · 0.1.46 · Android 13.</p><p><a href="coverage.html">Danh sách phạm vi từng trang</a> · <a href="README.md">Ghi chú và giới hạn</a> · <a href="device.json">Thông tin thiết bị</a></p><p>Gồm màn hình chính, phần cuộn và trạng thái con; không phải ảnh của từng từ/bài hay mọi tình huống lỗi. Không chấm SRS. Khi mở một bài thi dở đã hết hạn, app tự ghi kết quả 0/4; xem ghi chú.</p><input id="filter" placeholder="Lọc tên ảnh: quiz, pinyin, bo-tu…" aria-label="Lọc ảnh"><nav>${Object.entries(groups).map(([g,t])=>`<a href="#${g}">${t}</a>`).join('')}</nav>${Object.entries(groups).map(([g,t])=>`<section id="${g}"><h2>${t}</h2><main>${manifest.filter(i=>i.name.startsWith(g+'/')).map(i=>`<article data-name="${i.name}"><h3>${escape(i.name.split('/')[1])}</h3><a href="${i.name}.png"><img loading="lazy" src="${i.name}.png" alt="${escape(i.name)}"></a><p>${escape(i.route||'Điều hướng trong app')}${i.note?'<br>'+escape(i.note):''}</p></article>`).join('')}</main></section>`).join('')}<script>document.querySelector('#filter').addEventListener('input',e=>document.querySelectorAll('article').forEach(a=>a.hidden=!a.dataset.name.includes(e.target.value.toLowerCase())));</script></html>`);
