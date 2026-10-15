const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const outputRoot = path.resolve(root, process.env.ENGLISH_V74_OUTPUT || 'artifacts/english-v7-4-2026-10-11');
const screenshotRoot = path.join(outputRoot, 'screenshots');
const sourcePath = path.join(root, 'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db');
const baselineRoot = path.join(root, 'artifacts/english-v7-3-preview/after-v6');
const base = process.env.ENGLISH_V74_WEB_URL || 'http://localhost:8116';
const expectedHash = '2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a';

if (fs.existsSync(outputRoot)) throw new Error(`Refusing to overwrite V7.4 evidence: ${outputRoot}`);
if (!fs.existsSync(sourcePath)) throw new Error(`Pinned, read-only dictionary fixture not found: ${sourcePath}`);
fs.mkdirSync(screenshotRoot, { recursive: true });

const sourceBytes = fs.readFileSync(sourcePath);
const sourceHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
if (sourceHash !== expectedHash) throw new Error(`Pinned dictionary hash mismatch: ${sourceHash}`);

const screenshots = [];
const failures = [];
const timings = [];
let sourceFetches = 0;
let browser;
let context;
let page;

async function run() {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'vi-VN',
    reducedMotion: 'reduce',
  });
  await context.route('https://raw.githubusercontent.com/skypediacode/english-vietnamese-dictionary/**/dictionary_en_vi.db', async (route) => {
    sourceFetches += 1;
    await route.fulfill({ status: 200, contentType: 'application/octet-stream', body: sourceBytes, headers: { 'access-control-allow-origin': '*' } });
  });
  page = await context.newPage();
  page.on('pageerror', (error) => failures.push({ phase: 'pageerror', message: error.stack || error.message }));

  const go = async (route) => {
    const started = performance.now();
    await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const startup = page.getByText('Đang mở dữ liệu học offline', { exact: true });
    if (await startup.count()) await startup.waitFor({ state: 'detached', timeout: 120000 });
    await page.waitForTimeout(650);
    timings.push({ route, readyAfterNavigationMs: Math.round(performance.now() - started) });
  };
  const capture = async (name, { fullPage = true, purpose = 'Expo Web visual evidence', theme = 'light', viewport = '412x915 CSS px, DPR 2' } = {}) => {
    const file = `${name}.png`;
    await page.screenshot({ path: path.join(screenshotRoot, file), fullPage, animations: 'disabled', caret: 'hide', timeout: 120000 });
    const current = new URL(page.url());
    screenshots.push({ file, route: `${current.pathname}${current.search}`, state: name, platform: 'Expo Web mobile viewport; not Android/native', purpose, theme, viewport, data: 'Fresh isolated Playwright browser profile; fixture content only' });
    console.log(`CAPTURE ${file}`);
  };
  const button = async (label) => {
    const target = page.getByRole('button', { name: label, exact: true });
    await target.waitFor({ state: 'visible', timeout: 30000 });
    await target.click();
    await page.waitForTimeout(300);
  };
  const bulkRecognize = async (text, name, deckName, { captureAfter = true } = {}) => {
    await page.getByLabel('Tên bộ từ muốn học').fill(deckName);
    await page.getByLabel('Danh sách từ tiếng Anh, mỗi dòng một từ').fill(text);
    await button('Nhận diện từ');
    await page.getByTestId('english-bulk-preview-list').waitFor({ state: 'visible', timeout: 120000 });
    await page.waitForTimeout(550);
    if (captureAfter) await capture(name);
  };
  const editBulkAgain = async () => {
    await button('Sửa danh sách');
    await page.waitForTimeout(250);
  };
  const createManualCard = async (word, meaning) => {
    if (!(await page.getByLabel('Thêm một từ thủ công').count())) {
      await go('/english');
      await button('Thêm một từ thủ công');
    } else {
      await button('Thêm một từ thủ công');
    }
    await page.getByLabel('Từ hoặc cụm tiếng Anh').fill(word);
    await page.getByLabel('Nghĩa tiếng Việt do bạn chọn').fill(meaning);
    await button('Lưu thẻ vào bộ đang chọn');
    await page.waitForTimeout(450);
  };

  try {
    await go('/(tabs)/profile');
    const englishOption = page.getByLabel('Chọn học Tiếng Anh');
    await englishOption.waitFor({ state: 'visible', timeout: 90000 });
    if (await englishOption.getAttribute('aria-checked') !== 'true') await englishOption.click();

    await go('/english');
    await page.getByTestId('english-vocabulary-overview').waitFor({ state: 'visible', timeout: 90000 });
    await capture('01-english-vocabulary-hub-empty');

    await button('Tạo bộ từ mới');
    await page.getByLabel('Tên bộ từ tiếng Anh').fill('V7.4 QA fixture — temporary');
    await button('Xác nhận tạo bộ từ');
    await page.waitForTimeout(500);
    await createManualCard('hello', 'xin chào');
    await createManualCard('shorts', 'quần đùi');
    await createManualCard('book', 'quyển sách');
    await go('/english');
    await page.getByTestId('english-vocabulary-overview').waitFor({ state: 'visible', timeout: 90000 });
    await capture('02-english-vocabulary-hub-learning-first');
    await page.getByTestId('english-vocabulary-search').fill('shorts');
    await page.waitForTimeout(400);
    await capture('03-english-hub-search-filter');
    await page.getByTestId('english-vocabulary-search').fill('');
    await go('/english/decks');
    await page.waitForTimeout(450);
    await capture('04-english-deck-list');
    await go('/english');
    await page.waitForTimeout(500);
    await capture('05-english-vocabulary-hub-with-cards');

    await go('/english/word?word=bank');
    await page.getByTestId('english-word-detail-header').waitFor({ state: 'visible', timeout: 120000 });
    await page.getByTestId('english-word-detail-meaning').waitFor({ state: 'visible' });
    await capture('06-dictionary-bank-unselected-senses');
    await page.getByRole('button', { name: /Chọn một trong .* nghĩa/ }).click();
    const picker = page.getByTestId('english-sense-picker');
    await picker.waitFor({ state: 'visible' });
    await capture('07-bank-sense-picker-all');
    await page.getByLabel('Tìm trong nghĩa, ví dụ và loại từ').fill('ngan hang');
    await page.waitForTimeout(300);
    await capture('08-bank-picker-diacritic-insensitive-search');
    await page.getByRole('radio', { name: /^Danh từ \(\d+\)$/ }).click();
    await page.waitForTimeout(250);
    await capture('09-bank-picker-pos-filter');
    await page.getByLabel('Tìm trong nghĩa, ví dụ và loại từ').fill('');
    await page.waitForTimeout(250);
    await page.getByRole('button', { name: /Xem đầy đủ nghĩa:/ }).first().click();
    await page.waitForTimeout(250);
    await capture('10-bank-picker-expanded-long-meaning');
    await page.locator('[data-testid^="english-sense-choice-"]').first().click();
    await button('Chọn nghĩa này');
    await page.getByTestId('english-word-detail-meaning').waitFor({ state: 'visible' });
    await capture('11-bank-selected-meaning-compact-detail');
    if (await page.getByRole('button', { name: 'Xem nghĩa đầy đủ từ nguồn' }).count()) {
      await button('Xem nghĩa đầy đủ từ nguồn');
      await capture('12-bank-selected-meaning-expanded-source');
    }
    await go('/english/word?word=shorts');
    await page.getByTestId('english-word-detail-header').waitFor({ state: 'visible', timeout: 120000 });
    await capture('13-shorts-dictionary-detail');
    await page.getByRole('button', { name: /Chọn một trong .* nghĩa/ }).click();
    await page.getByTestId('english-sense-picker').waitFor({ state: 'visible' });
    await capture('14-shorts-pos-and-sense-picker');
    await page.getByLabel('Đóng chọn nghĩa').click();
    await go('/english/word?word=book');
    await page.getByTestId('english-word-detail-header').waitFor({ state: 'visible', timeout: 120000 });
    await capture('15-book-dictionary-detail');
    await go('/english/dictionary-source');
    await page.waitForTimeout(350);
    await capture('16-dictionary-source-attribution');

    await go('/english/bulk');
    await page.getByLabel('Danh sách từ tiếng Anh, mỗi dòng một từ').waitFor({ state: 'visible' });
    await capture('17-bulk-empty-input');
    await page.getByLabel('Tên bộ từ muốn học').fill('V7.4 bulk sense QA — temporary');
    await page.getByLabel('Danh sách từ tiếng Anh, mỗi dòng một từ').fill('bank\nbook\nshorts\nhello\nlook up\nread\nlight\nrun\nplay\nright');
    await button('Nhận diện từ');
    await page.getByTestId('english-bulk-preview-list').waitFor({ state: 'visible', timeout: 120000 });
    await page.getByRole('button', { name: /Chọn nghĩa hoặc sửa bank, dòng 1/ }).click();
    await page.getByTestId('english-sense-picker').waitFor({ state: 'visible' });
    await capture('18-bulk-bank-sense-picker');
    await page.getByLabel('Tìm trong nghĩa, ví dụ và loại từ').fill('ngan hang');
    await page.waitForTimeout(300);
    await capture('19-bulk-picker-search-filter');
    await page.getByLabel('Đóng chọn nghĩa').click();
    await editBulkAgain();

    const manualList = (count, offset = 0) => Array.from({ length: count }, (_, index) => `v74word${String(index + offset + 1).padStart(3, '0')}\tnghĩa thử ${index + offset + 1}`).join('\n');
    await bulkRecognize(manualList(10), '20-bulk-10-eligible-rows', 'V7.4 ten QA');
    await page.getByRole('button', { name: 'Thêm 10 từ', exact: true }).waitFor({ state: 'visible' });
    await editBulkAgain();
    await bulkRecognize(manualList(50), '21-bulk-50-eligible-rows', 'V7.4 fifty QA');
    await page.getByRole('button', { name: 'Thêm 50 từ', exact: true }).waitFor({ state: 'visible' });
    await page.evaluate(() => {
      const scrollables = [...document.querySelectorAll('*')].filter((element) => {
        const style = getComputedStyle(element);
        return ['auto', 'scroll'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 30;
      }).sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
      if (scrollables[0]) scrollables[0].scrollTop = Math.min(1200, scrollables[0].scrollHeight);
    });
    await page.waitForTimeout(250);
    await capture('22-bulk-50-virtual-list-lower-rows', { fullPage: false });
    await editBulkAgain();
    await bulkRecognize(manualList(100), '23-bulk-100-eligible-rows', 'V7.4 one-hundred QA');
    await page.getByRole('button', { name: 'Thêm 100 từ', exact: true }).waitFor({ state: 'visible' });
    await capture('24-bulk-100-sticky-exact-count');
    await editBulkAgain();

    const partialRows = [
      ...Array.from({ length: 91 }, (_, index) => `v74partial${String(index + 1).padStart(3, '0')}\tnghĩa đã nhập ${index + 1}`),
      ...Array.from({ length: 9 }, (_, index) => `v74nomatch${String(index + 1).padStart(3, '0')}`),
    ].join('\n');
    await bulkRecognize(partialRows, '25-bulk-100-with-91-eligible-9-unresolved', 'V7.4 partial-save QA');
    await page.getByRole('button', { name: 'Thêm 91 từ', exact: true }).waitFor({ state: 'visible' });
    await capture('26-bulk-exact-91-save-9-unresolved');
    await button('Thêm 91 từ');
    await page.getByTestId('english-bulk-partial-save-success').waitFor({ state: 'visible', timeout: 90000 });
    await page.getByRole('button', { name: 'Thêm 0 từ', exact: true }).waitFor({ state: 'visible' });
    await capture('27-bulk-partial-save-atomic-remainder');
    await go('/english');
    await go('/english/bulk');
    await page.getByTestId('english-bulk-preview-list').waitFor({ state: 'visible', timeout: 90000 });
    await capture('28-bulk-unresolved-draft-restored');

    await go('/english/review');
    await page.waitForTimeout(450);
    await page.getByText(/Không còn thẻ đến hạn ôn/).waitFor({ state: 'visible', timeout: 90000 });
    await capture('29-review-empty-due-state');
    await go('/english/review?preview=true&mode=MEANING');
    await page.getByTestId('english-review-question').waitFor({ state: 'visible', timeout: 90000 });
    await capture('30-review-meaning-question-fixture', { purpose: 'In-memory review fixture; no database writes' });
    await button('Hiện đáp án và nghĩa đã lưu');
    await capture('31-review-answer-revealed-fixture', { purpose: 'In-memory review fixture; no database writes' });
    await button('Đã nhớ từ này');
    await page.waitForTimeout(300);
    await capture('32-review-correct-answer-feedback-fixture', { purpose: 'In-memory review fixture; no database writes' });
    await page.getByRole('radio', { name: 'Chính tả' }).click();
    await capture('33-review-spelling-question-fixture', { purpose: 'In-memory review fixture; no database writes' });
    await page.getByLabel('Nhập từ hoặc cụm tiếng Anh chính xác').fill('resiliance');
    await button('Kiểm tra chính tả');
    await capture('34-review-spelling-error-feedback-fixture', { purpose: 'In-memory review fixture; no database writes' });
    await page.getByRole('radio', { name: 'Ôn nghĩa' }).click();
    await button('Hiện đáp án và nghĩa đã lưu');
    await button('Đã nhớ từ này');
    await capture('35-review-completion-summary-fixture', { purpose: 'In-memory review fixture; no database writes' });
    await go('/english/review?preview=true&mode=LISTENING');
    await page.getByTestId('english-review-question').waitFor({ state: 'visible', timeout: 90000 });
    await capture('36-review-listening-prompt-fixture', { purpose: 'In-memory review fixture; no database writes' });
    await button('Hiện đáp án và nghĩa đã lưu');
    await capture('37-review-listening-revealed-fixture', { purpose: 'In-memory review fixture; no database writes' });

    await page.emulateMedia({ colorScheme: 'dark' });
    await go('/english');
    await capture('38-english-hub-dark-mode', { theme: 'dark system preference' });
    await go('/english/word?word=bank');
    await page.getByTestId('english-word-detail-header').waitFor({ state: 'visible', timeout: 120000 });
    await page.getByRole('button', { name: /Chọn một trong .* nghĩa/ }).click();
    await capture('39-sense-picker-dark-mode', { theme: 'dark system preference' });
    await page.getByLabel('Đóng chọn nghĩa').click();

    await page.setViewportSize({ width: 360, height: 740 });
    await go('/english/bulk');
    await capture('40-bulk-narrow-screen', { viewport: '360x740 CSS px, DPR 2' });
    await page.setViewportSize({ width: 412, height: 915 });
    await page.emulateMedia({ colorScheme: 'light' });
    await go('/english/word?word=bank');
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('*')) {
        const style = getComputedStyle(element);
        if (element.childNodes.length && [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())) {
          const size = Number.parseFloat(style.fontSize);
          if (Number.isFinite(size)) element.style.fontSize = `${size * 1.3}px`;
        }
      }
    });
    await capture('41-web-synthetic-large-text-130-percent', { purpose: 'Synthetic Web CSS scaling; not Android accessibility font scaling', viewport: '412x915 CSS px, DPR 2; text nodes scaled 130%' });

    await go('/(tabs)/profile');
    const chineseOption = page.getByLabel('Chọn học Tiếng Trung');
    await chineseOption.waitFor({ state: 'visible', timeout: 90000 });
    if (await chineseOption.count()) {
      if (await chineseOption.getAttribute('aria-checked') !== 'true') await chineseOption.click();
      await page.getByText('Đang học: Tiếng Trung', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
      await go('/(tabs)/profile');
      await capture('42-chinese-profile-isolated-regression');
      await go('/(tabs)/vocabulary');
      await capture('43-chinese-vocabulary-route-regression');
    } else {
      failures.push({ phase: 'chinese-regression', message: 'Chinese learning-language option was not present in profile UI.' });
    }

    if (sourceFetches !== 1) failures.push({ phase: 'dictionary-cache', message: `Expected one pinned dictionary fetch in fresh profile, observed ${sourceFetches}.` });
    if (failures.length) throw new Error(`Visual QA browser failures: ${JSON.stringify(failures)}`);
  } catch (error) {
    failures.push({ phase: 'flow', message: String(error.stack || error) });
    if (page) await capture('FAILED-current-state', { fullPage: false, purpose: 'Failure diagnosis' }).catch(() => undefined);
    throw error;
  } finally {
    const manifest = {
      version: 'V7.4',
      generatedAt: new Date().toISOString(),
      platform: 'Expo Web in a fresh isolated browser profile. This is not Android or native release evidence.',
      viewport: { initial: '412x915 CSS px, DPR 2', narrow: '360x740 CSS px, DPR 2' },
      dictionary: { pinnedSource: 'Skypedia English-Vietnamese dictionary commit 388adc0826300912e5b0311c089e0e70494b065f', sha256: sourceHash, interceptedFetches: sourceFetches },
      dataSafety: 'Temporary decks, cards, and bulk rows were created only inside this fresh Playwright browser profile. No production database, user phone, schema, source corpus, or SRS schedule was changed.',
      baseline: 'V7.3 Web capture set at artifacts/english-v7-3-preview/after-v6; no V7.3 SRS state screenshots are claimed.',
      timings,
      screenshots,
      failures,
      notVerified: [
        'Android emulator/native runtime: no AVD configured; physical phone installation explicitly not performed.',
        'Android system font-scale, TalkBack, IME behavior, and native release build interactions; large-text image is CSS simulation only.',
        'Real-due-card end-to-end answer on Web: visual review screens use the app’s in-memory preview fixture. Scheduler persistence is covered by isolated learner database tests, not this screenshot run.',
      ],
    };
    fs.writeFileSync(path.join(outputRoot, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
    if (browser) {
      const board = await context.newPage();
      await board.setViewportSize({ width: 1600, height: 1200 });
      const renderSheet = async (items, outputFile, heading) => {
        const tiles = items.map((item) => `<figure><img src="data:image/png;base64,${fs.readFileSync(item.filePath).toString('base64')}"><figcaption>${item.label}</figcaption></figure>`).join('');
        await board.setContent(`<meta charset="utf-8"><style>body{margin:0;padding:20px;font:15px Arial;background:#eef2f8;color:#172033}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}figure{margin:0;background:#fff;padding:8px;border-radius:8px;box-shadow:0 1px 5px #0002}img{display:block;width:100%;height:520px;object-fit:contain;object-position:top;background:#fff}figcaption{padding:8px 2px;overflow-wrap:anywhere;font-weight:600}</style><h1>${heading}</h1><div class="grid">${tiles}</div>`);
        await board.screenshot({ path: path.join(outputRoot, outputFile), fullPage: true, timeout: 120000 });
      };
      try {
        const beforeNames = fs.readdirSync(path.join(baselineRoot, 'screenshots')).filter((name) => name.endsWith('.png') && !name.startsWith('FAILED')).slice(0, 16);
        if (beforeNames.length) {
          await renderSheet(beforeNames.map((name) => ({ filePath: path.join(baselineRoot, 'screenshots', name), label: `V7.3 · ${name}` })), 'contact-sheet-before-v7.4.png', '4Chinese English UI · Before V7.4 (V7.3 Web baseline)');
        }
        for (let offset = 0; offset < screenshots.length; offset += 8) {
          const batch = screenshots.slice(offset, offset + 8);
          await renderSheet(batch.map((item) => ({ filePath: path.join(screenshotRoot, item.file), label: item.state })), `contact-sheet-after-${Math.floor(offset / 8) + 1}.png`, `4Chinese English UI · V7.4 after (${offset + 1}–${offset + batch.length})`);
        }
      } finally {
        await board.close();
      }
      await browser.close();
    }
  }
  console.log(JSON.stringify({ version: 'V7.4', screenshots: screenshots.length, sourceHash, sourceFetches, outputRoot }));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
