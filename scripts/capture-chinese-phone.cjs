/* Read-only navigation and screenshot evidence for the user's connected phone. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const adb = 'C:/Users/Admin/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const serial = 'FAJFPNTCPFGEKZB6';
const pkg = 'com.tungnguyen2k5vp.fourchinese';
const out = path.resolve(process.env.CHINESE_DEVICE_QA_OUT || path.resolve(__dirname, '../artifacts/chinese-device-ui-2026-10-14-build48'));
const label = process.env.CHINESE_DEVICE_QA_LABEL || 'Build 48';
fs.mkdirSync(out, { recursive: true });
const run = (...args) => execFileSync(adb, ['-s', serial, ...args], { timeout: 30000, maxBuffer: 16 * 1024 * 1024 });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const decode = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function dump() {
  run('shell', 'uiautomator', 'dump', '/sdcard/4chinese-build48-qa.xml');
  const xml = run('shell', 'cat', '/sdcard/4chinese-build48-qa.xml').toString();
  const nodes = [...xml.matchAll(/<node\b([^>]+)>/g)].map(m => Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a => [a[1], decode(a[2])])));
  return { xml, nodes };
}
function gallery() {
  const manifestPath = path.join(out, 'manifest.json');
  const items = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
  const escape = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Tiếng Trung — ${escape(label)}</title><style>body{font:16px system-ui;margin:24px;background:#f4f5f8}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}img{width:100%;max-width:360px}article{background:white;padding:12px;border-radius:12px}h2{font-size:16px}</style><h1>Tiếng Trung — Realme 8 — ${escape(label)}</h1><p>${items.length} ảnh thực tế. Chỉ điều hướng và chụp màn hình; không chấm điểm SRS, không xóa hay nhập thêm dữ liệu.</p><main>${items.map(i => `<article><h2>${escape(i.name)}</h2><a href="${i.name}.png"><img loading="lazy" src="${i.name}.png"></a><p>${escape(i.route || 'Điều hướng trực tiếp trong app')}</p></article>`).join('')}</main>`);
  return items;
}
function capture(name, route) {
  if (!/^[a-z0-9/-]+$/.test(name) || name.includes('..')) throw Error('Invalid filename');
  const state = dump();
  if (!state.nodes.some(n => n.package === pkg)) throw Error('Not an app-owned screen; capture stopped');
  fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
  fs.writeFileSync(path.join(out, name + '.png'), run('exec-out', 'screencap', '-p'));
  fs.writeFileSync(path.join(out, name + '.xml'), state.xml);
  const items = gallery().filter(i => i.name !== name);
  items.push({ name, route, time: new Date().toISOString(), texts: state.nodes.map(n => n.text || n['content-desc']).filter(Boolean) });
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(items, null, 2));
  gallery();
  console.log(name + ': ' + items.at(-1).texts.join(' | ').slice(0, 1600));
}
async function scroll() {
  const node = dump().nodes.find(n => n.scrollable === 'true' && n.package === pkg);
  if (!node) return false;
  const b = node.bounds.match(/\d+/g).map(Number), x = Math.floor((b[0]+b[2])/2), h = b[3]-b[1];
  run('shell','input','swipe',''+x,''+Math.floor(b[1]+h*.8),''+x,''+Math.floor(b[1]+h*.25),'400');
  await wait(500); return true;
}
async function main() {
  const [cmd, arg, name] = process.argv.slice(2);
  if (cmd === 'metadata') {
    const info = {capturedAt:new Date().toISOString(),serial,package:pkg,model:run('shell','getprop','ro.product.model').toString().trim(),os:run('shell','getprop','ro.build.version.release').toString().trim(),api:run('shell','getprop','ro.build.version.sdk').toString().trim(),abi:run('shell','getprop','ro.product.cpu.abi').toString().trim(),fontScale:run('shell','settings','get','system','font_scale').toString().trim(),locale:run('shell','getprop','persist.sys.locale').toString().trim(),wifiEnabled:run('shell','settings','get','global','wifi_on').toString().trim(),mobileData:run('shell','settings','get','global','mobile_data').toString().trim(),packageInfo:run('shell','dumpsys','package',pkg).toString().split('\n').filter(l=>/versionCode=|versionName=|firstInstallTime=|lastUpdateTime=|ceDataInode=|android.permission.*granted=/.test(l)).map(l=>l.trim())};
    fs.writeFileSync(path.join(out,'device.json'),JSON.stringify(info,null,2));console.log(info);
  } else if (cmd === 'batch' || cmd === 'group') {
    const groups = {
      main: [['/','01-tong-quan/01-trang-chu'],['/hsk','05-hsk/01-hsk'],['/vocabulary','02-kho-tu/01-kho-tu'],['/stats','01-tong-quan/02-thong-ke'],['/profile','10-tai-khoan/01-tai-khoan']],
      review: [['/review/upcoming','03-hoc-on/06-lich-on'],['/review/weak','03-hoc-on/07-tu-yeu'],['/mistakes','03-hoc-on/08-loi-sai'],['/mistakes/practice','03-hoc-on/09-luyen-loi-sai'],['/learn/setup','03-hoc-on/10-chon-tu-moi'],['/daily?minutes=3','03-hoc-on/11-phien-nhanh']],
      decks: [['/decks','04-bo-tu/01-danh-sach'],['/decks/trash','04-bo-tu/02-thung-rac'],['/decks/bulk-add','04-bo-tu/03-them-nhieu-tu'],['/decks/word','04-bo-tu/04-them-tu-thu-cong']],
      hsk: [['/path','05-hsk/02-lo-trinh'],['/path/hsk-1-path','05-hsk/03-ban-do'],['/path/lesson/hsk-1-lesson-1','05-hsk/04-bai-hoc'],['/hsk/syllabus','05-hsk/05-de-cuong'],['/library','02-kho-tu/02-thu-vien'],['/search','02-kho-tu/03-tim-kiem'],['/confusables','02-kho-tu/04-tu-de-nham']],
      grammar: [['/grammar','06-ngu-phap/01-danh-sach'],['/grammar/focus','06-ngu-phap/02-trong-tam'],['/writing','06-ngu-phap/03-viet-chu'],['/writing/学','06-ngu-phap/04-viet-han-tu'],['/practice','06-ngu-phap/05-luyen-tap']],
      audio: [['/listening','07-nghe-noi/01-nghe'],['/speaking','07-nghe-noi/02-noi'],['/speaking/tones','07-nghe-noi/03-thanh-dieu'],['/speaking/pairs','07-nghe-noi/04-cap-am'],['/speaking/shadowing','07-nghe-noi/05-shadowing'],['/speaking/recordings','07-nghe-noi/06-ban-thu'],['/speaking/ai','07-nghe-noi/07-ai']],
      reader: [['/stories','08-doc/01-truyen'],['/reader','08-doc/02-doc'],['/content-review','08-doc/03-noi-dung']],
      exam: [['/exam','09-thi/01-bai-thi'],['/exam/readiness','09-thi/02-san-sang'],['/exam/skills','09-thi/03-ky-nang'],['/exam/written','09-thi/04-viet'],['/exam/speaking','09-thi/05-noi']],
      account: [['/achievements','10-tai-khoan/02-thanh-tich'],['/cloud','10-tai-khoan/03-dong-bo']]
      ,details: [['/word/hsk-d1731a1a750d','02-kho-tu/05-chi-tiet-tu-mau-sac'],['/grammar/gram-bu','06-ngu-phap/06-chi-tiet-ngu-phap'],['/confusables/know','02-kho-tu/06-chi-tiet-tu-de-nham'],['/stories/story-family-dinner-hsk1','08-doc/04-chi-tiet-truyen'],['/reader?storyId=story-family-dinner-hsk1','08-doc/05-doc-truyen'],['/decks/listening','04-bo-tu/05-nghe-ghep-nghia'],['/decks/quiz','04-bo-tu/06-quiz'],['/decks/pronunciation','04-bo-tu/07-phat-am']]
    };
    const items = cmd === 'group' ? groups[arg].map(([route,name]) => ({route,name})) : JSON.parse(arg);
    for (const item of items) {
      run('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `'4chinese://${item.route}'`, pkg);
      await wait(1400);
      capture(item.name, item.route);
      for (let i=1; i<=Number(name || 0); i++) if (await scroll()) capture(item.name + '-scroll-' + i, item.route);
    }
  } else if (cmd === 'route') {
    run('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `'4chinese://${arg}'`, pkg);
    await wait(1400); if (name) capture(name, arg);
  } else if (cmd === 'dump') console.log(JSON.stringify(dump().nodes.filter(n => n.text || n['content-desc']).map(n => ({ text:n.text, desc:n['content-desc'], bounds:n.bounds, clickable:n.clickable })), null, 2));
  else if (cmd === 'capture') capture(arg, name);
  else if (cmd === 'tap') {
    const all = dump().nodes.filter(n => (n.text === arg || n['content-desc'] === arg) && n.enabled === 'true');
    const clickable = all.filter(n => n.clickable === 'true');
    const matches = clickable.length ? clickable : all;
    if (matches.length !== 1) throw Error('Expected one match; found ' + matches.length);
    const b = matches[0].bounds.match(/\d+/g).map(Number);
    run('shell', 'input', 'tap', '' + Math.floor((b[0]+b[2])/2), '' + Math.floor((b[1]+b[3])/2));
    await wait(700);
  } else if (cmd === 'scroll') {
    if (!await scroll()) throw Error('No observed scrollable surface');
    if (arg) capture(arg);
  } else if (cmd === 'back') run('shell','input','keyevent','4');
  else throw Error('Unknown command');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
