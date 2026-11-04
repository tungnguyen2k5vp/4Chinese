const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');

/* global __dirname */
const root = path.resolve(__dirname, '..');
const outputRoot = path.join(root, 'artifacts/english-v7-4-2026-10-11');
const screenshotRoot = path.join(outputRoot, 'screenshots');
const sourcePath = path.join(root, 'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db');
const base = process.env.ENGLISH_V74_WEB_URL || 'http://localhost:8116';
const expectedHash = '2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a';
const manifestPath = path.join(outputRoot, 'capture-manifest.json');

if (!fs.existsSync(manifestPath)) throw new Error(`V7.4 capture manifest not found: ${manifestPath}`);
const sourceBytes = fs.readFileSync(sourcePath);
const sourceHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
if (sourceHash !== expectedHash) throw new Error(`Pinned dictionary hash mismatch: ${sourceHash}`);

const screenshots = [];
const failures = [];
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

  const go = async (route, readyLocator) => {
    await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const startup = page.getByText('Đang mở dữ liệu học offline', { exact: true });
    if (await startup.count()) await startup.waitFor({ state: 'detached', timeout: 120000 });
    await readyLocator.waitFor({ state: 'visible', timeout: 120000 });
    const loading = page.getByLabel('Đang tra từ', { exact: true });
    if (await loading.count()) await loading.waitFor({ state: 'detached', timeout: 120000 });
    if (await page.getByText('Đang mở dữ liệu học offline', { exact: true }).count()) {
      throw new Error(`Startup loading screen remained visible after ${route} became ready.`);
    }
  };
  const capture = async (name, { theme = 'light', viewport = '412x915 CSS px, DPR 2', purpose = 'Supplemental Expo Web capture; not Android/native' } = {}) => {
    const file = `${name}.png`;
    const fullPath = path.join(screenshotRoot, file);
    if (!fs.existsSync(fullPath)) {
      await page.screenshot({ path: fullPath, fullPage: true, animations: 'disabled', caret: 'hide', timeout: 120000 });
    } else {
      console.log(`REUSE ${file} (preserved from the preceding successful capture phase)`);
    }
    const current = new URL(page.url());
    screenshots.push({
      file,
      route: `${current.pathname}${current.search}`,
      state: name,
      platform: 'Expo Web mobile viewport; not Android/native',
      purpose,
      theme,
      viewport,
      data: 'Fresh isolated Playwright browser profile; pinned read-only dictionary fixture',
      validity: 'VALID',
    });
    console.log(`CAPTURE ${file}`);
  };
  const click = async (label) => {
    const target = page.getByRole('button', { name: label, exact: true });
    await target.waitFor({ state: 'visible', timeout: 30000 });
    await target.click();
  };

  try {
    await go('/(tabs)/profile', page.getByLabel('Chọn học Tiếng Anh'));
    const englishOption = page.getByLabel('Chọn học Tiếng Anh');
    if (await englishOption.getAttribute('aria-checked') !== 'true') await englishOption.click();

    await go('/english/word?word=bank', page.getByTestId('english-word-detail-header'));
    await page.getByTestId('english-word-detail-meaning').waitFor({ state: 'visible' });
    await capture('54-bank-detail-mobile-stacked-unselected');
    await page.getByTestId('english-word-detail-meaning-heading').waitFor({ state: 'visible' });
    const responsive = await page.getByTestId('english-word-detail-meaning-heading').evaluate((element) => getComputedStyle(element).flexDirection);
    if (responsive !== 'column') throw new Error(`Mobile word-detail meaning heading should stack; got ${responsive}.`);

    await page.getByRole('button', { name: /Chọn một trong .* nghĩa/ }).click();
    await page.getByTestId('english-sense-picker').waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => {
      const copy = document.querySelector('[data-testid="english-sense-pronunciation-copy"]');
      const audioControl = document.querySelector('[data-testid="english-sense-pronunciation-audio"]');
      const filters = document.querySelector('[data-testid="english-sense-pos-filters"]');
      const rect = (element) => {
        const box = element.getBoundingClientRect();
        return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
      };
      return { copy: rect(copy), audio: rect(audioControl), filters: rect(filters), text: copy.textContent.trim() };
    });
    if (layout.copy.width < 150 || layout.audio.width < 120 || layout.copy.width + layout.audio.width > 390 || layout.filters.height < 40) {
      throw new Error(`Sense picker layout failed its width/height checks: ${JSON.stringify(layout)}`);
    }
    await capture('55-bank-sense-picker-mobile-all-rows-visible');
    await page.getByLabel('Tìm trong nghĩa, ví dụ và loại từ').fill('ngan hang');
    await capture('56-bank-picker-diacritic-search-mobile');
    await page.getByRole('radio', { name: /^Danh từ \(\d+\)$/ }).click();
    await capture('57-bank-picker-pos-filter-mobile');
    await page.getByLabel('Tìm trong nghĩa, ví dụ và loại từ').fill('');
    await page.getByRole('button', { name: /Xem đầy đủ nghĩa:/ }).first().click();
    await capture('58-bank-picker-expanded-sense-mobile');
    await page.locator('[data-testid^="english-sense-choice-"]').first().click();
    await click('Chọn nghĩa này');
    await page.getByTestId('english-word-detail-meaning').waitFor({ state: 'visible' });
    await capture('63-bank-detail-mobile-stacked-selected');

    await go('/english/bulk', page.getByLabel('Danh sách từ tiếng Anh, mỗi dòng một từ'));
    await page.getByLabel('Tên bộ từ muốn học').fill('V7.4 final picker QA — temporary');
    await page.getByLabel('Danh sách từ tiếng Anh, mỗi dòng một từ').fill('bank\nbook\nshorts');
    await click('Nhận diện từ');
    await page.getByTestId('english-bulk-preview-list').waitFor({ state: 'visible', timeout: 120000 });
    await page.getByRole('button', { name: /Chọn nghĩa hoặc sửa bank, dòng 1/ }).click();
    await page.getByTestId('english-sense-picker').waitFor({ state: 'visible' });
    await capture('59-bulk-sense-picker-mobile');
    await page.getByLabel('Tìm trong nghĩa, ví dụ và loại từ').fill('ngan hang');
    await capture('60-bulk-sense-picker-search-mobile');
    await page.getByLabel('Đóng chọn nghĩa').click();

    await page.emulateMedia({ colorScheme: 'dark' });
    await go('/english/word?word=bank', page.getByTestId('english-word-detail-header'));
    await page.getByRole('button', { name: /Chọn một trong .* nghĩa/ }).click();
    await page.getByTestId('english-sense-picker').waitFor({ state: 'visible' });
    await capture('61-sense-picker-dark-mode-mobile', { theme: 'dark system preference' });
    await page.getByLabel('Đóng chọn nghĩa').click();

    await page.emulateMedia({ colorScheme: 'light' });
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('*')) {
        const style = getComputedStyle(element);
        if (element.childNodes.length && [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())) {
          const size = Number.parseFloat(style.fontSize);
          if (Number.isFinite(size)) element.style.fontSize = `${size * 1.3}px`;
        }
      }
    });
    await page.waitForTimeout(500);
    const largeTextLayout = await page.getByTestId('english-word-detail-meaning-heading').evaluate((element) => getComputedStyle(element).flexDirection);
    if (largeTextLayout !== 'column') throw new Error(`Large text word-detail heading should remain stacked; got ${largeTextLayout}.`);
    await capture('62-web-synthetic-large-text-mobile-layout', {
      purpose: 'Synthetic Web CSS scaling; not Android accessibility font scaling',
      viewport: '412x915 CSS px, DPR 2; text nodes scaled 130%',
    });

    if (sourceFetches !== 1) failures.push({ phase: 'dictionary-cache', message: `Expected one pinned dictionary fetch in fresh profile; observed ${sourceFetches}.` });
    if (failures.length) throw new Error(`Supplemental visual QA failed: ${JSON.stringify(failures)}`);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.version !== 'V7.4') throw new Error('Unexpected manifest version; refusing to patch.');
    const supersededInitial = new Map([
      ['06-dictionary-bank-unselected-senses.png', '54-bank-detail-mobile-stacked-unselected.png'],
      ['07-bank-sense-picker-all.png', '55-bank-sense-picker-mobile-all-rows-visible.png'],
      ['08-bank-picker-diacritic-insensitive-search.png', '56-bank-picker-diacritic-search-mobile.png'],
      ['09-bank-picker-pos-filter.png', '57-bank-picker-pos-filter-mobile.png'],
      ['10-bank-picker-expanded-long-meaning.png', '58-bank-picker-expanded-sense-mobile.png'],
      ['11-bank-selected-meaning-compact-detail.png', '63-bank-detail-mobile-stacked-selected.png'],
      ['13-shorts-dictionary-detail.png', '63-bank-detail-mobile-stacked-selected.png'],
      ['14-shorts-pos-and-sense-picker.png', '55-bank-sense-picker-mobile-all-rows-visible.png'],
      ['15-book-dictionary-detail.png', '54-bank-detail-mobile-stacked-unselected.png'],
      ['18-bulk-bank-sense-picker.png', '59-bulk-sense-picker-mobile.png'],
      ['39-sense-picker-dark-mode.png', '61-sense-picker-dark-mode-mobile.png'],
      ['40-bulk-narrow-screen.png', '50-bulk-preview-narrow-screen-after-ready.png'],
      ['41-web-synthetic-large-text-130-percent.png', '62-web-synthetic-large-text-mobile-layout.png'],
    ]);
    const supersededSupplemental = new Map([
      ['44-bank-sense-picker-layout-fixed.png', '55-bank-sense-picker-mobile-all-rows-visible.png'],
      ['45-bank-picker-diacritic-search-layout-fixed.png', '56-bank-picker-diacritic-search-mobile.png'],
      ['46-bank-picker-pos-filter-layout-fixed.png', '57-bank-picker-pos-filter-mobile.png'],
      ['47-bank-picker-expanded-sense-layout-fixed.png', '58-bank-picker-expanded-sense-mobile.png'],
      ['48-bulk-picker-layout-fixed.png', '59-bulk-sense-picker-mobile.png'],
      ['49-sense-picker-dark-mode-layout-fixed.png', '61-sense-picker-dark-mode-mobile.png'],
      ['51-web-synthetic-large-text-after-ready.png', '62-web-synthetic-large-text-mobile-layout.png'],
    ]);
    for (const item of manifest.screenshots) {
      if (supersededInitial.has(item.file)) {
        item.validity = 'SUPERSEDED_VISUAL_POLISH';
        item.supersededBy = supersededInitial.get(item.file);
      } else {
        item.validity = 'VALID';
      }
    }
    for (const item of manifest.supplementalScreenshots) {
      if (supersededSupplemental.has(item.file)) {
        item.validity = 'SUPERSEDED_VISUAL_POLISH';
        item.supersededBy = supersededSupplemental.get(item.file);
      } else {
        item.validity = 'VALID';
      }
    }
    manifest.supplementalScreenshots.push(...screenshots);
    const supersededAll = [...supersededInitial, ...supersededSupplemental];
    manifest.visualReview = {
      initialCaptureCount: manifest.screenshots.length,
      initialSupersededCount: supersededInitial.size,
      earlierSupplementalCaptureCount: 8,
      earlierSupplementalSupersededCount: supersededSupplemental.size,
      finalPolishCaptureCount: screenshots.length,
      validCaptureCount: manifest.screenshots.filter((item) => item.validity === 'VALID').length + manifest.supplementalScreenshots.filter((item) => item.validity === 'VALID').length,
      supersededCaptures: supersededAll.map(([file, supersededBy]) => ({ file, supersededBy })),
      note: 'First visual review caught a full-width TTS control compressing IPA, clipped part-of-speech filter chips, and a tight mobile detail heading at large text. The shared picker now reserves width for pronunciation and a fixed-height filter row; mobile word detail stacks the meaning heading/action. Captures were retained and superseded, not overwritten.',
      knownChineseWebWarning: 'Chinese vocabulary route rendered but showed a React Native Web warning: <button> cannot contain a nested <button>. Not changed in this English-only scope; see 43-chinese-vocabulary-route-regression.png.',
    };
    manifest.supplementalDictionaryFetches = sourceFetches;
    manifest.validScreenshotCount = manifest.visualReview.validCaptureCount;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    await renderFinalSheets(manifest);
    console.log(JSON.stringify({ finalPolishScreenshots: screenshots.length, validScreenshotCount: manifest.validScreenshotCount, pickerLayout: layout, responsiveHeading: responsive, largeTextHeading: largeTextLayout, sourceFetches }));
  } catch (error) {
    failures.push({ phase: 'supplement', message: String(error.stack || error) });
    if (page && !fs.existsSync(path.join(screenshotRoot, '65-final-polish-failure-state.png'))) {
      await page.screenshot({ path: path.join(screenshotRoot, '65-final-polish-failure-state.png'), fullPage: false, timeout: 120000 }).catch(() => undefined);
    }
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

async function renderFinalSheets(manifest) {
  const all = [...manifest.screenshots, ...manifest.supplementalScreenshots]
    .filter((item) => item.validity === 'VALID')
    .sort((left, right) => Number.parseInt(left.file, 10) - Number.parseInt(right.file, 10));
  const board = await context.newPage();
  await board.setViewportSize({ width: 1600, height: 1200 });
  const render = async (items, file, heading) => {
    const tiles = items.map((item) => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(screenshotRoot, item.file)).toString('base64')}"><figcaption>${item.state}</figcaption></figure>`).join('');
    await board.setContent(`<meta charset="utf-8"><style>body{margin:0;padding:20px;font:15px Arial;background:#eef2f8;color:#172033}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}figure{margin:0;background:#fff;padding:8px;border-radius:8px;box-shadow:0 1px 5px #0002}img{display:block;width:100%;height:520px;object-fit:contain;object-position:top;background:#fff}figcaption{padding:8px 2px;overflow-wrap:anywhere;font-weight:600}</style><h1>${heading}</h1><div class="grid">${tiles}</div>`);
    await board.screenshot({ path: path.join(outputRoot, file), fullPage: true, timeout: 120000 });
  };
  try {
    for (let offset = 0; offset < all.length; offset += 8) {
      const items = all.slice(offset, offset + 8);
      await render(items, `final-contact-sheet-v7.4-polished-${String(Math.floor(offset / 8) + 1).padStart(2, '0')}.png`, `4Chinese English UI · V7.4 verified Web captures (${offset + 1}–${offset + items.length})`);
    }
  } finally {
    await board.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
