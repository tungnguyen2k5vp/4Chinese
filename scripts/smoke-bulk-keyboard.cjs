/* Resized web viewport regression, not proof of a physical Android IME. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.argv[2]);
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const context = await browser.newContext({viewport:{width:360,height:800}});
  const page = await context.newPage(); const errors = []; const results = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('http://localhost:8085/decks/bulk-add');
    const editor = page.getByRole('textbox',{name:'Danh sách từ cần thêm'});
    await editor.fill('Siêu thị\nĐồ\nLàm\nChơi');
    await editor.focus();
    await page.setViewportSize({width:360,height:360});
    await editor.press('End');
    await editor.press('Enter'); await editor.press('H');
    await page.waitForFunction(() => {
      const el = document.querySelector('[aria-label="Danh sách từ cần thêm"]');
      const r = el?.getBoundingClientRect();
      return r && r.top >= 0 && r.bottom <= innerHeight;
    });
    assert.match(await editor.inputValue(), /Chơi\nH$/);
    results.push('Fourth/fifth line editor stays in 360px resized viewport; text retained');
    const lines = Array.from({length:100},(_,i)=>`Từ dòng ${i + 1}`).join('\n');
    await editor.fill(lines); await editor.press('Control+End'); await editor.press('Space');
    const dimensions = await editor.evaluate(el=>({height:el.clientHeight,content:el.scrollHeight,value:el.value}));
    assert.ok(dimensions.height < 180 && dimensions.content > dimensions.height);
    assert.equal(dimensions.value.trim(),lines);
    await editor.press('Control+Home'); await editor.press('ArrowRight'); await editor.press('X');
    assert.equal((await editor.inputValue()).startsWith('TXừ dòng 1'),true);
    results.push('100-line paste uses bounded native editor scrolling; editing early line does not force cursor to end');
    await page.setViewportSize({width:800,height:360});
    await page.waitForFunction(()=>document.querySelector('[aria-label="Danh sách từ cần thêm"]')?.getBoundingClientRect().bottom <= innerHeight);
    results.push('Responsive resize retains contents and visible editor');
    await page.screenshot({path:'docs/bulk-keyboard-web.png'});
    assert.deepEqual(errors,[]);
    fs.writeFileSync('docs/BULK_KEYBOARD_WEB_QA.json',JSON.stringify({results,errors,physicalKeyboard:false,viewport:'resized web only'},null,2));
    console.log(JSON.stringify({results,errors}));
  } finally {await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
