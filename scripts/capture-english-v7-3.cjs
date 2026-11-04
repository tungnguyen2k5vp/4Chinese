const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const outputRoot = path.resolve(root, process.env.ENGLISH_V73_OUTPUT || 'artifacts/english-v7-3-preview/after');
const sourcePath = path.join(root, 'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db');
const base = process.env.ENGLISH_V73_WEB_URL || 'http://localhost:8116';
if (fs.existsSync(outputRoot)) throw new Error(`Refusing to overwrite existing V7.3 captures: ${outputRoot}`);
fs.mkdirSync(path.join(outputRoot, 'screenshots'), { recursive: true });

const sourceBytes = fs.readFileSync(sourcePath);
const sourceHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
if (sourceHash !== '2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a') throw new Error('Pinned Skypedia database hash mismatch.');

const captured = [];
const failures = [];
const timings = [];
let downloadRequests = 0;

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await context.route('https://raw.githubusercontent.com/skypediacode/english-vietnamese-dictionary/**/dictionary_en_vi.db', async route => {
    downloadRequests++;
    await route.fulfill({ status: 200, contentType: 'application/octet-stream', body: sourceBytes, headers: { 'access-control-allow-origin': '*' } });
  });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push({ stage: 'pageerror', error: error.stack || error.message }));

  async function go(route) {
    const started = performance.now();
    await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
    const loader = page.getByText('Đang mở dữ liệu học offline', { exact: true });
    if (await loader.count()) await loader.waitFor({ state: 'detached', timeout: 90000 });
    await page.waitForTimeout(450);
    timings.push({ route, readyMs: Math.round(performance.now() - started), note: 'Route readiness includes SQLite/runtime and browser scheduling; not an isolated React render benchmark.' });
  }
  async function capture(name, fullPage = true) {
    const file = `${name}.png`;
    await page.screenshot({ path: path.join(outputRoot, 'screenshots', file), fullPage, animations: 'disabled', caret: 'hide' });
    captured.push({ file, route: new URL(page.url()).pathname + new URL(page.url()).search, state: name, platform: 'Expo Web mobile viewport — not Android' });
    console.log(`CAPTURE ${file}`);
  }
  async function button(label) {
    const target = page.getByRole('button', { name: label, exact: true });
    await target.waitFor({ state: 'visible', timeout: 15000 });
    await target.click();
    await page.waitForTimeout(350);
  }
  async function createManualCard(word, meaning) {
    if (!(await page.getByLabel('Thêm một từ thủ công').count())) await go('/english');
    await button('Thêm một từ thủ công');
    await page.getByLabel('Từ hoặc cụm tiếng Anh').fill(word);
    await page.getByLabel('Nghĩa tiếng Việt do bạn chọn').fill(meaning);
    await button('Lưu thẻ vào bộ đang chọn');
    await page.waitForTimeout(450);
  }
  async function recognize(text, captureName) {
    await page.getByTestId('english-personal-list-input').fill(text);
    await button('Nhận diện từ');
    await page.getByText('Bước 2/3 · Kiểm tra', { exact: true }).waitFor({ timeout: 90000 });
    if (captureName) await capture(captureName);
  }

  try {
    await go('/(tabs)/profile');
    const englishMode = page.getByLabel('Chọn học Tiếng Anh');
    await englishMode.waitFor({ state: 'visible', timeout: 90000 });
    if (await englishMode.getAttribute('aria-checked') !== 'true') await englishMode.click();
    await go('/english');
    await capture('01-vocabulary-empty');

    await button('Tạo bộ từ mới');
    await page.getByLabel('Tên bộ từ tiếng Anh').fill('V7.3 preview — temporary');
    await button('Xác nhận tạo bộ từ');
    await page.waitForTimeout(700);
    await createManualCard('hello', 'xin chào');
    await createManualCard('bank', 'ngân hàng (ghi chú của người học)');
    await createManualCard('shorts', 'quần đùi');
    await go('/english');
    await capture('02-vocabulary-hub-compact');

    const search = page.getByTestId('english-vocabulary-search');
    await search.fill('bank');
    await page.waitForTimeout(400);
    await capture('03-vocabulary-search-filter');
    await search.fill('');
    await page.waitForTimeout(400);

    await go('/english/word?word=shorts');
    await page.getByTestId('english-word-detail-header').waitFor({ timeout: 90000 });
    await page.getByText('Các nghĩa trong từ điển', { exact: true }).waitFor();
    await capture('04-word-detail-shorts');
    await go('/english/word?word=bank');
    await page.getByTestId('english-word-detail-header').waitFor({ timeout: 90000 });
    await page.getByText('Các nghĩa trong từ điển', { exact: true }).waitFor();
    await capture('05-word-detail-bank');

    await go('/english/bulk');
    await page.getByTestId('english-personal-list-input').waitFor({ state: 'visible' });
    await capture('06-bulk-empty-input');
    await page.getByLabel('Tên bộ từ muốn học').fill('V7.3 bulk review — temporary');
    const ten = 'shorts\nbank\nbook\nlove\nlook up\nwent\nlead\nread\nwind\nhello';
    await recognize(ten, '07-bulk-10-rows');

    await page.getByRole('button', { name: /Chọn nghĩa hoặc sửa bank, dòng 2/ }).click();
    const picker = page.getByTestId('english-sense-picker');
    await picker.waitFor({ state: 'visible' });
    await capture('08-sense-picker-bank');
    const bankChoice = picker.getByRole('radio').first();
    await bankChoice.click();
    await button('Chọn nghĩa này');
    await page.getByRole('button', { name: /Chọn nghĩa hoặc sửa shorts, dòng 1/ }).click();
    await picker.waitFor({ state: 'visible' });
    await capture('09-sense-picker-shorts');
    await picker.getByRole('radio').first().click();
    await button('Chọn nghĩa này');
    await page.getByRole('button', { name: /Chọn nghĩa hoặc sửa book, dòng 3/ }).click();
    await picker.waitFor({ state: 'visible' });
    await capture('10-sense-picker-book');
    await button('Đóng chọn nghĩa');

    await button('Sửa danh sách');
    const raw = new DatabaseSync(sourcePath, { readOnly: true });
    const sourceWords = raw.prepare("SELECT word FROM words WHERE lang_code='en' ORDER BY id LIMIT 160").all().map(row => row.word);
    raw.close();
    const unique = [...new Set(sourceWords.map(word => String(word).trim()).filter(Boolean))];
    for (const size of [50, 100]) {
      const list = (size === 50 ? unique.slice(0, 50) : unique.slice(0, 100)).join('\n');
      await recognize(list, `bulk-${size}-top`);
      await page.evaluate(() => {
        const candidates = [...document.querySelectorAll('*')].filter(el => {
          const style = getComputedStyle(el);
          return ['auto', 'scroll'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 30;
        }).sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
        if (candidates[0]) candidates[0].scrollTop = Math.min(1100, candidates[0].scrollHeight);
      });
      await page.waitForTimeout(250);
      await capture(`bulk-${size}-virtualized-scroll`, false);
      await button('Sửa danh sách');
    }

    const longNames = Array.from({ length: 100 }, (_, index) => `custom-${String(index + 1).padStart(3, '0')}\tmeaning ${index + 1}`).join('\n');
    await recognize(longNames, '11-bulk-100-custom-lines');
    await capture('12-bulk-100-sticky-save');

    await go('/english');
    const firstSkip = page.getByLabel('Bỏ qua từ hello');
    if (await firstSkip.count()) {
      await firstSkip.click();
      await page.waitForTimeout(500);
    }
    await go('/english/suspended');
    await capture('13-suspended-list');

    await page.emulateMedia({ colorScheme: 'dark' });
    await go('/english');
    await page.getByTestId('english-vocabulary-overview').waitFor({ timeout: 90000 });
    await page.waitForTimeout(500);
    await capture('14-dark-mode-hub');
    await page.setViewportSize({ width: 360, height: 740 });
    await page.getByTestId('english-vocabulary-overview').waitFor({ timeout: 90000 });
    await page.waitForTimeout(300);
    await capture('15-narrow-screen-hub');
    await page.setViewportSize({ width: 390, height: 844 });
    await go('/english/word?word=bank');
    await page.getByTestId('english-word-detail-header').waitFor({ timeout: 90000 });
    await page.getByText('Các nghĩa trong từ điển', { exact: true }).waitFor({ timeout: 90000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('*')) {
        const style = getComputedStyle(element);
        if (element.childNodes.length && [...element.childNodes].some(node => node.nodeType === 3 && node.textContent.trim())) {
          const size = Number.parseFloat(style.fontSize);
          if (Number.isFinite(size)) element.style.fontSize = `${size * 1.3}px`;
        }
      }
    });
    await capture('16-web-synthetic-130-percent-text');

    // Exercise the actual bulk-save success path in the isolated profile too.
    // This is temporary QA data only; it never touches the user's device DB.
    await page.emulateMedia({ colorScheme: 'light' });
    await go('/english/bulk');
    const existingPreview = page.getByRole('button', { name: 'Sửa danh sách', exact: true });
    if (await existingPreview.count()) await existingPreview.click();
    await page.getByLabel('Danh sách từ tiếng Anh, mỗi dòng một từ').waitFor({ state: 'visible' });
    await page.getByLabel('Tên bộ từ muốn học').fill('V7.3 bulk save — temporary');
    await recognize(ten, null);
    const bulkWords = ['shorts', 'bank', 'book', 'love', 'look up', 'went', 'lead', 'read', 'wind', 'hello'];
    for (let index = 0; index < bulkWords.length; index++) {
      const word = bulkWords[index];
      await page.getByRole('button', { name: `Chọn nghĩa hoặc sửa ${word}, dòng ${index + 1}`, exact: true }).click();
      const picker = page.getByTestId('english-sense-picker');
      await picker.waitFor({ state: 'visible' });
      const choices = picker.getByRole('radio');
      if (await choices.count()) {
        await choices.first().click();
        await button('Chọn nghĩa này');
      } else {
        await button('Đóng chọn nghĩa');
      }
    }
    await button('Thêm 10 từ đã chọn');
    await page.getByText(/Đã thêm 10 từ vào bộ/).waitFor({ timeout: 90000 });
    await capture('17-bulk-save-success');
    await button('Xem bộ vừa thêm');
    await page.getByTestId('english-vocabulary-overview').waitFor({ timeout: 90000 });
    await page.getByText('V7.3 bulk save — temporary', { exact: true }).waitFor({ timeout: 90000 });
    await capture('18-bulk-added-deck');

    if (downloadRequests !== 1) throw new Error(`Dictionary cache fetched ${downloadRequests} times; expected one first-load fetch in isolated Web profile.`);
    if (failures.length) throw new Error(`Browser errors: ${JSON.stringify(failures)}`);
  } catch (error) {
    failures.push({ stage: 'flow', error: String(error.stack || error) });
    await capture('FAILED-current-state', false).catch(() => undefined);
    throw error;
  } finally {
    const manifest = {
      generatedAt: new Date().toISOString(),
      platform: 'Expo Web in isolated browser context; not Android evidence',
      viewport: { initial: '390×844 CSS px, DPR 2', narrow: '360×740 CSS px' },
      source: { file: 'Skypedia pinned SQLite cache', sha256: sourceHash, networkFetches: downloadRequests },
      temporaryData: 'A fresh browser context with temporary decks/cards; no physical-phone data or SQLite export touched.',
      timings,
      screenshots: captured,
      failures,
      notCaptured: [
        'Android native release emulator: no AVD is currently configured; this capture must not be labelled native.',
        'SRS answer/review result: the app only puts started cards into the existing due queue after its scheduled interval; no scheduler override was used to fake a due card.',
        'Font scale 130% is synthetic browser text resizing, not Android accessibility font scaling.',
      ],
    };
    fs.writeFileSync(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
    const board = await context.newPage();
    await board.setViewportSize({ width: 1440, height: 1100 });
    for (let offset = 0; offset < captured.length; offset += 8) {
      const batch = captured.slice(offset, offset + 8);
      const tiles = batch.map(item => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(outputRoot, 'screenshots', item.file)).toString('base64')}"><figcaption>${item.state}</figcaption></figure>`).join('');
      await board.setContent(`<meta charset="utf-8"><style>body{margin:0;padding:20px;font:15px Arial;background:#eef2f8;color:#172033}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}figure{margin:0}img{display:block;width:100%;max-height:700px;object-fit:contain;object-position:top;background:white}figcaption{padding:8px 0;overflow-wrap:anywhere}</style><h1>4Chinese V7.3 English — after-update QA (${offset + 1}–${offset + batch.length})</h1><div class="grid">${tiles}</div>`);
      await board.screenshot({ path: path.join(outputRoot, `contact-sheet-${Math.floor(offset / 8) + 1}.png`), fullPage: true });
    }
    await browser.close();
  }
  console.log(JSON.stringify({ screenshots: captured.length, sourceHash, downloadRequests, outputRoot }));
}

run().catch(error => { console.error(error); process.exitCode = 1; });
