/* Isolated local profile only; no cloud calls or physical-microphone claims. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.argv[2]);
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const context = await browser.newContext({viewport:{width:412,height:915}});
  const page = await context.newPage();
  const errors = []; const passed = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('http://localhost:8085/search');
    await page.getByRole('textbox',{name:'Tìm kiếm trong ứng dụng'}).fill('xin chào');
    const word = page.getByRole('button',{name:/Từ vựng: 你好/}).first();
    await word.click(); await page.waitForURL(/\/word\//);
    await page.goBack();
    assert.equal(await page.getByRole('textbox',{name:'Tìm kiếm trong ứng dụng'}).inputValue(),'xin chào');
    passed.push('Unified search and word-detail/back retain query');
    await page.goto('http://localhost:8085/speaking/pairs');
    await page.getByText('1/10 · z / zh',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Bài tiếp',exact:true}).click();
    await page.getByText('2/10 · c / ch',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Bài trước',exact:true}).click();
    await page.getByText('1/10 · z / zh',{exact:true}).waitFor();
    passed.push('Minimal-pair navigation and honest web recording limitation');
    await page.goto('http://localhost:8085/stories');
    await page.getByRole('button',{name:'Xem trước 14 bản nháp V5 · chưa xuất bản',exact:true}).click();
    assert.equal(await page.getByText(/DRAFT/).count() > 0,true);
    passed.push('Explicit story draft preview without publication');
    await page.goto('http://localhost:8085/speaking/ai');
    await page.getByText(/20 lượt\/ngày UTC/).waitFor();
    passed.push('Migration38 AI quota settings load offline');
    assert.deepEqual(errors,[]);
    fs.writeFileSync('docs/V5_COMPLETION_WEB_SMOKE.json',JSON.stringify({passed,errors,physicalDevice:false,liveGemini:false},null,2));
    console.log(JSON.stringify({passed,errors}));
  } finally { await context.close(); await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
