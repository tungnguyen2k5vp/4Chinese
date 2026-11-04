const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {chromium}=require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'artifacts/english-personal-vocabulary-2026-10-11');
const base='http://localhost:8116';
fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
const files=[],checks=[],errors=[];
let downloads=0;
async function run(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage(); page.on('pageerror',e=>{errors.push(e.stack || e.message);console.log('PAGEERROR '+(e.stack || e.message));});
 const bytes=fs.readFileSync(path.join(root,'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db'));
 const hash=crypto.createHash('sha256').update(bytes).digest('hex');
 if(hash!=='2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a')throw Error('Source hash mismatch');
 await context.route('https://raw.githubusercontent.com/skypediacode/english-vietnamese-dictionary/**/dictionary_en_vi.db',async r=>{downloads++;await r.fulfill({status:200,contentType:'application/octet-stream',body:bytes,headers:{'access-control-allow-origin':'*'}});});
 const go=async route=>{await page.goto(base+route);await page.waitForTimeout(900);await page.getByText('Đang mở dữ liệu học offline',{exact:true}).waitFor({state:'hidden',timeout:90000});};
 const tap=async label=>{await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(400);};
 const snap=async name=>{await page.waitForTimeout(250);const file=name+'.png';await page.screenshot({path:path.join(out,'screenshots',file),animations:'disabled',caret:'hide'});files.push({file,route:new URL(page.url()).pathname,state:name,platform:'Web mobile viewport — NOT Android screenshot'});console.log('CAPTURE '+file);};
 const scroll=async bottom=>{await page.evaluate(bottom=>{const e=[...document.querySelectorAll('*')].filter(e=>['auto','scroll'].includes(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+40).sort((a,b)=>(b.scrollHeight-b.clientHeight)-(a.scrollHeight-a.clientHeight))[0];if(e)e.scrollTop=bottom?e.scrollTop+650:0;},bottom);await page.waitForTimeout(250);};
 const all=async name=>{await scroll(false);await snap(name+'-top');let last=-1;for(let i=1;i<=12;i++){await scroll(true);const pos=await page.evaluate(()=>Math.max(0,...[...document.querySelectorAll('*')].map(e=>e.scrollTop)));if(pos===last||pos===0)break;last=pos;await snap(name+'-scroll-'+i);}};
 try {
 await go('/(tabs)/profile');const radio=page.getByLabel('Chọn học Tiếng Anh');await radio.waitFor({timeout:90000});if(await radio.getAttribute('aria-checked')!=='true')await radio.click();
 await go('/english');await snap('01-empty-vocabulary');
 await go('/english/bulk');await all('02-empty-add-list');
 await page.getByLabel('Tên bộ từ muốn học').fill('Unit 8');
 await page.getByTestId('english-personal-list-input').fill('hello\nlove\nshorts\nbank\nlook up\nzzzznotaword999\nhello');
 await snap('03-filled-list');await tap('Nhận diện từ');
 await page.getByText('Kiểm tra trước khi thêm',{exact:true}).waitFor({timeout:45000});
 await all('04-recognized-preview');
 if(await page.getByRole('button',{name:'Thêm toàn bộ 7 từ đã chọn',exact:true}).isEnabled())throw Error('Invalid preview allows submit');
 checks.push('unknown and duplicate block submit');
 await tap('Đổi nghĩa của bank, dòng 4');await page.getByTestId('english-preview-row-4').scrollIntoViewIfNeeded();await snap('05-select-bank-meaning');
 await page.getByTestId('english-preview-row-4').getByRole('radio').filter({hasText:'Nhà ngân hàng.'}).click();
 await tap('Đổi nghĩa của shorts, dòng 3');await page.getByTestId('english-preview-row-3').getByRole('radio').filter({hasText:'Quần sóoc'}).click();await page.getByTestId('english-preview-row-3').scrollIntoViewIfNeeded();await snap('05b-shorts-noun-selected');
 await tap('Bỏ zzzznotaword999 khỏi danh sách, dòng 6');await tap('Giữ lại zzzznotaword999');
 await page.getByLabel('Nghĩa của zzzznotaword999, dòng 6').fill('nghĩa tự nhập để kiểm tra');await page.getByTestId('english-preview-row-6').scrollIntoViewIfNeeded();await snap('06-manual-meaning');
 await tap('Bỏ zzzznotaword999 khỏi danh sách, dòng 6');await tap('Bỏ hello khỏi danh sách, dòng 7');await all('07-confirmed-selection');
 await page.reload();await page.getByText('Kiểm tra trước khi thêm',{exact:true}).waitFor({timeout:90000});
 if(await page.getByRole('button',{name:'Thêm toàn bộ 5 từ đã chọn',exact:true}).isDisabled())throw Error('Draft not restored');
 checks.push('preview including exclusions and selected sense survives reload');
 await tap('Thêm toàn bộ 5 từ đã chọn');await page.getByText('Đã thêm 5 từ',{exact:false}).waitFor({timeout:15000});await snap('08-save-success');
 await tap('Xem bộ vừa thêm');await all('09-deck-new-cards');
 await tap('Bắt đầu học hello · LV1');await scroll(false);await snap('10-started-lv1-chart');
 await tap('Bỏ qua từ hello');await go('/english/suspended');await all('11-suspended');await tap('Khôi phục từ hello');await snap('12-restored-empty-suspended');
 checks.push('start enters LV1; suspend/restore preserves schedule');
 await go('/english/dictionary-source');await all('13-source-attribution');
 await go('/english/bulk');await page.getByRole('radio',{name:'Unit 8',exact:true}).click();await page.getByTestId('english-personal-list-input').fill('hello');await tap('Nhận diện từ');await page.getByText('Kiểm tra trước khi thêm',{exact:true}).waitFor({timeout:90000});await tap('Thêm toàn bộ 1 từ đã chọn');await page.getByText('với nghĩa này đã có trong bộ',{exact:false}).waitFor();await scroll(false);await snap('14-existing-duplicate-rejected');
 await page.reload();await page.getByText('Kiểm tra trước khi thêm',{exact:true}).waitFor({timeout:90000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
 await tap('Sửa lại danh sách nhập');await page.getByTestId('english-personal-list-input').fill('apple\nbook');
 await context.setOffline(true);await tap('Nhận diện từ');await page.getByText('Kiểm tra trước khi thêm',{exact:true}).waitFor({timeout:90000});await all('15-cached-offline-preview');await context.setOffline(false);
 if(downloads!==1)throw Error('Cache downloads repeated: '+downloads);checks.push('offline lookup after reload, original cached source, exactly one source download');
 await page.setViewportSize({width:320,height:640});await all('16-compact-preview');
 await page.emulateMedia({colorScheme:'dark'});await all('17-dark-preview');await go('/english');await all('18-dark-vocabulary');
 await page.emulateMedia({colorScheme:'light'});await page.setViewportSize({width:390,height:844});await go('/english');
 await page.evaluate(()=>{for(const e of document.querySelectorAll('*')){const s=getComputedStyle(e);if(e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))e.style.fontSize=(parseFloat(s.fontSize)*1.4)+'px';}});await all('19-synthetic-large-text');
 }catch(error){
 console.log('FAILED UI '+error.message);console.log((await page.locator('body').innerText()).slice(-5000));await snap('FAILED-current-state');throw error;
 }finally{
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),sourceHash:hash,downloads,checks,errors,screenshots:files,nativeStatus:'Not tested on Android in this capture; physical phone untouched.'},null,2));
 const cards=files.map(f=>`<figure><a href="screenshots/${f.file}"><img loading="lazy" src="screenshots/${f.file}"></a><figcaption>${f.state}</figcaption></figure>`).join('');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>English personal vocabulary</title><style>body{font-family:Arial;background:#eef2f8;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}figure{margin:0}img{width:100%}figcaption{padding:10px;overflow-wrap:anywhere}</style><h1>Từ vựng tiếng Anh cá nhân — ảnh sau thay đổi</h1><p>Web 390×844 / 320×640. Không phải ảnh Android. Chưa cài điện thoại.</p><main>${cards}</main>`);
 const board=await context.newPage();await board.setViewportSize({width:1280,height:900});
 for(let offset=0;offset<files.length;offset+=8){const group=files.slice(offset,offset+8);await board.setContent(`<style>body{margin:0;padding:20px;font:14px Arial;background:#eef2f8}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}img{width:100%}figure{margin:0}figcaption{overflow-wrap:anywhere}</style><h1>English vocabulary — Web QA — ${offset+1}–${offset+group.length}</h1><div class="grid">${group.map(f=>`<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(out,'screenshots',f.file)).toString('base64')}"><figcaption>${f.state}</figcaption></figure>`).join('')}</div>`);await board.screenshot({path:path.join(out,`contact-sheet-${1+offset/8}.png`),fullPage:true});}
 await browser.close();
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({screenshots:files.length,checks,downloads}));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
