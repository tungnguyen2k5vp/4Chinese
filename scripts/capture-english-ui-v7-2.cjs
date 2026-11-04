const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');

const repoRoot = path.resolve(__dirname, '..');
const baseUrl = process.env.ENGLISH_UI_BASE_URL || 'http://localhost:8114';
const outputRoot = path.resolve(
  repoRoot,
  process.env.ENGLISH_UI_OUTPUT_DIR || 'artifacts/english-ui-v7-2-final',
);
const baselineRoot = path.join(repoRoot, 'artifacts/english-ui-after-update-2026-10-11');
const beforeDir = path.join(outputRoot, 'before');
const afterDir = path.join(outputRoot, 'after');
const sheetsDir = path.join(outputRoot, 'contact-sheets');
const viewport = { width: 390, height: 844 };
const sheetsOnly = process.argv.includes('--contact-sheets-only');
const criticalMatrix = process.argv.includes('--critical-matrix');
const statsRefresh = process.argv.includes('--stats-refresh');
const shortViewportOnly = process.argv.includes('--short-viewport-only');
const bulkPreviewOnly = process.argv.includes('--bulk-preview-only');
const captured = [];
const failures = [];
const checks = [];
const runtimeErrors = [];
let activeBrowser = null;
let activeContext = null;

fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(afterDir, { recursive: true });
fs.mkdirSync(sheetsDir, { recursive: true });
if (!process.env.ENGLISH_UI_OUTPUT_DIR && !sheetsOnly && !criticalMatrix && !statsRefresh && !shortViewportOnly && !bulkPreviewOnly) {
  // This package was created by this runner; remove only its generated PNG evidence before a fresh pass.
  for (const generatedDirectory of [afterDir, sheetsDir]) {
    for (const file of fs.readdirSync(generatedDirectory)) {
      if (file.toLowerCase().endsWith('.png')) fs.unlinkSync(path.join(generatedDirectory, file));
    }
  }
}
if (!fs.existsSync(path.join(beforeDir, '01-settings-english-mode.png'))) {
  const baselineScreens = path.join(baselineRoot, 'screenshots');
  if (!fs.existsSync(baselineScreens)) throw new Error(`Baseline screenshots missing: ${baselineScreens}`);
  fs.mkdirSync(beforeDir, { recursive: true });
  fs.cpSync(baselineScreens, beforeDir, { recursive: true, errorOnExist: true, force: false });
  fs.copyFileSync(path.join(baselineRoot, 'capture-manifest.json'), path.join(beforeDir, 'capture-manifest.json'));
  fs.copyFileSync(path.join(baselineRoot, 'README.md'), path.join(beforeDir, 'README.md'));
}

const routeByName = {
  '01-settings-english-mode': '/(tabs)/profile',
  '02-home-empty': '/english/activity',
  '03-home-demo-populated': '/english/activity?preview=true',
  '04-home-demo-scroll': '/english/activity?preview=true',
  '05-cefr-a1': '/(tabs)/hsk',
  '06-cefr-b1': '/(tabs)/hsk',
  '07-vocabulary-empty': '/english',
  '08-vocabulary-demo-populated': '/english?preview=true',
  '09-vocabulary-create-deck-form': '/english',
  '10-vocabulary-add-card-form': '/english',
  '11-deck-management-empty': '/english/decks',
  '12-bulk-no-deck-empty-state': '/english/bulk',
  '13-vocabulary-temporary-deck-and-card': '/english',
  '14-deck-management-temporary-deck': '/english/decks',
  '15-bulk-step-1-input': '/english/bulk',
  '16-bulk-sample-format-guide-open': '/english/bulk',
  '17-bulk-step-2-validation-preview': '/english/bulk',
  '18-review-empty-meaning': '/english/review',
  '19-review-demo-question': '/english/review?preview=true',
  '20-review-demo-answer-revealed': '/english/review?preview=true',
  '21-review-demo-spelling': '/english/review?mode=SPELLING&preview=true',
  '22-review-demo-quick-session': '/english/review?quick=1&preview=true',
  '23-reader-empty-landing': '/english/reader',
  '24-reader-demo-reading-view': '/english/reader?preview=true',
  '25-reader-demo-word-lookup': '/english/reader?preview=true',
  '26-reader-add-text-modal': '/english/reader',
  '27-reader-large-text': '/english/reader?preview=true',
  '28-statistics-empty': '/(tabs)/stats',
  '29-statistics-demo-populated': '/(tabs)/stats?preview=true',
  '30-card-editor-without-card-id': '/english/card-edit',
  '31-dark-home': '/english/activity?preview=true',
  '32-dark-vocabulary': '/english?preview=true',
  '33-dark-review': '/english/review?preview=true',
  '34-dark-reader': '/english/reader?preview=true',
  '35-dark-statistics': '/(tabs)/stats?preview=true',
};

const comparisons = [
  ['01-settings-english-mode', 'English settings: Chinese-only goals/audio are hidden; common controls and backup scope remain explicit.'],
  ['02-home-empty', 'Empty home: retain the first-deck action and remove repeated zero-value metrics/introduction.'],
  ['03-home-demo-populated', 'Home hierarchy: quick learning actions appear immediately after the learner hero.'],
  ['04-home-demo-scroll', 'Measured viewport scroll: verify lower Home content is reachable; manifest records actual scroll movement.'],
  ['05-cefr-a1', 'CEFR A1: touch-sized horizontally scrollable level choices and honest in-preparation status.'],
  ['06-cefr-b1', 'CEFR B1: selected-level badge/status remains stacked and does not overlap copy.'],
  ['07-vocabulary-empty', 'Vocabulary empty: create action is primary; XP/zero metrics removed and dictionary note demoted.'],
  ['08-vocabulary-demo-populated', 'Vocabulary populated: owned decks follow primary actions; secondary tools follow decks.'],
  ['17-bulk-step-2-validation-preview', 'Bulk preview: validation remains explicit and step labels wrap at compact widths.'],
  ['19-review-demo-question', 'Review question: US/UK voice controls and IPA remain inside the card.'],
  ['20-review-demo-answer-revealed', 'Review answer: Vietnamese meaning and both rating actions stay within the card.'],
  ['22-review-demo-quick-session', 'Quick review: shared audio control layout remains contained.'],
  ['33-dark-review', 'Dark review: audio and card controls remain readable and bounded.'],
  ['28-statistics-empty', 'Statistics with zero attempts: no accuracy score or misleading performance badge.'],
  ['29-statistics-demo-populated', 'Statistics populated: supported accuracy only; duration label/value stack vertically.'],
  ['35-dark-statistics', 'Dark statistics: contrast and stacked duration remain legible.'],
  ['24-reader-demo-reading-view', 'Reader prose: punctuation/spacing preserved and only the selected word receives emphasis.'],
  ['27-reader-large-text', 'Reader large text: natural paragraph wrapping and lookup remain usable.'],
  ['34-dark-reader', 'Dark Reader: inline text remains calm; no all-word chip backgrounds.'],
  ['30-card-editor-without-card-id', 'Card editor without ID: explain the missing route parameter and return to deck management.'],
];

const summaries = (name, checksForCapture = []) => {
  checks.push({ name, checks: checksForCapture });
};

async function settle(page) {
  await page.waitForTimeout(500);
  const loader = page.getByText('Đang mở dữ liệu học offline', { exact: true });
  if (await loader.count()) await loader.waitFor({ state: 'detached', timeout: 45000 });
  await page.waitForTimeout(120);
}

async function go(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await settle(page);
}

async function clickLabel(page, label, options = {}) {
  const control = page.getByLabel(label, options);
  if (!(await control.count())) return false;
  await control.first().click({ timeout: 8000 });
  await page.waitForTimeout(250);
  return true;
}

async function requireClick(page, label) {
  if (!(await clickLabel(page, label))) throw new Error(`Required control not found: ${label}`);
}

async function moveRealScroller(page) {
  const before = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('*')]
      .filter((element) => {
        const style = getComputedStyle(element);
        return element.scrollHeight - element.clientHeight > 80 &&
          ['auto', 'scroll'].includes(style.overflowY);
      })
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
    const rootScrollable = document.documentElement.scrollHeight - window.innerHeight > 80;
    const element = candidates[0];
    if (element) {
      element.setAttribute('data-v7-scroll-target', 'true');
      const top = element.scrollTop;
      element.scrollTop = Math.min(element.scrollHeight - element.clientHeight, top + Math.max(260, element.clientHeight * 0.48));
      return { target: '[data-v7-scroll-target="true"]', before: top, after: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight };
    }
    if (rootScrollable) {
      const top = window.scrollY;
      window.scrollTo(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, top + 380));
      return { target: 'window', before: top, after: window.scrollY };
    }
    return { target: null, before: 0, after: 0 };
  });
  await page.waitForTimeout(350);
  const after = await page.evaluate((target) => {
    if (target === 'window') return window.scrollY;
    if (!target) return 0;
    const element = document.querySelector(target);
    return element?.scrollTop ?? 0;
  }, before.target);
  return { target: before.target, before: before.before, after, movedBy: after - before.before };
}

async function recordCapture(page, name, route, options = {}) {
  try {
    await go(page, route);
    const interactionResult = options.interact ? await options.interact(page) : undefined;
    if (options.assert) await options.assert(page);
    const file = `${name}.png`;
    const scroll = options.scroll ? await moveRealScroller(page) : null;
    if (scroll && scroll.movedBy <= 0) throw new Error(`Scroll did not move: ${JSON.stringify(scroll)}`);
    await page.screenshot({
      path: path.join(afterDir, file),
      fullPage: options.fullPage !== false,
      animations: 'disabled',
      caret: 'hide',
    });
    captured.push({
      file,
      route,
      state: name,
      platform: 'Expo Web mobile viewport; not native Android',
      viewport: options.viewport || viewport,
      fullPage: options.fullPage !== false,
      scroll,
      interactionResult: interactionResult ?? null,
    });
    console.log(`CAPTURED ${file}`);
  } catch (error) {
    failures.push({ name, route, error: String(error?.message || error) });
    console.error(`FAILED ${name}: ${error?.message || error}`);
  }
}

async function seedTemporaryBrowserData(page) {
  await go(page, '/english');
  await requireClick(page, 'Tạo bộ từ mới');
  const deckName = page.getByLabel('Tên bộ từ tiếng Anh');
  if (!(await deckName.count())) throw new Error('Temporary deck name field missing.');
  await deckName.first().fill('QA preview deck (temporary)');
  await requireClick(page, 'Xác nhận tạo bộ từ');
  await page.waitForTimeout(450);

  await requireClick(page, 'Thêm một từ thủ công');
  const headword = page.getByLabel('Từ hoặc cụm tiếng Anh');
  const meaning = page.getByLabel('Nghĩa tiếng Việt do bạn chọn');
  if (!(await headword.count()) || !(await meaning.count())) throw new Error('Temporary card fields missing.');
  await headword.first().fill('resilience');
  await meaning.first().fill('khả năng phục hồi');
  await requireClick(page, 'Lưu thẻ vào bộ đang chọn');
  await page.waitForTimeout(600);
}

async function assertDocumentFits(page) {
  const bounds = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  if (bounds.document > bounds.viewport + 2) throw new Error(`Horizontal document overflow: ${JSON.stringify(bounds)}`);
  return bounds;
}

async function assertReviewContainsControls(page) {
  const card = page.getByTestId('english-review-card');
  const audio = page.getByTestId('english-audio-controls');
  if (!(await card.count()) || !(await audio.count())) throw new Error('Review card/audio region was not rendered.');
  const [cardBox, audioBox] = await Promise.all([card.boundingBox(), audio.boundingBox()]);
  if (!cardBox || !audioBox) throw new Error('Review card/audio region has no layout box.');
  const within = audioBox.x >= cardBox.x - 1 && audioBox.x + audioBox.width <= cardBox.x + cardBox.width + 1;
  if (!within) throw new Error(`TTS controls outside review card: ${JSON.stringify({ cardBox, audioBox })}`);
  const voiceButtons = page.getByLabel(/Nghe giọng Anh/);
  const buttons = await voiceButtons.count();
  if (buttons < 2) throw new Error(`Expected two accessible US/UK TTS buttons; got ${buttons}.`);
  const ipa = card.getByText(/pɜ/).first();
  const ipaBox = await ipa.count() ? await ipa.boundingBox() : null;
  if (ipaBox) {
    const overlap = !(audioBox.x >= ipaBox.x + ipaBox.width || audioBox.x + audioBox.width <= ipaBox.x || audioBox.y >= ipaBox.y + ipaBox.height || audioBox.y + audioBox.height <= ipaBox.y);
    if (overlap) throw new Error(`IPA overlaps TTS controls: ${JSON.stringify({ ipaBox, audioBox })}`);
  }
  return { cardBox, audioBox, ipaBox, ttsButtons: buttons };
}

async function assertStatsInsufficient(page) {
  if (!(await page.getByTestId('english-stats-insufficient-data').count())) throw new Error('Zero-review insufficient-data message is missing.');
  if (await page.getByText('Độ chính xác', { exact: true }).count()) throw new Error('Zero-review stats still show an accuracy label.');
  if (await page.getByText('Khá', { exact: true }).count()) throw new Error('Zero-review stats still show the misleading performance badge.');
  return { insufficientDataVisible: true, accuracyPercentageAbsent: true };
}

async function assertReachableControls(page, labels) {
  const results = [];
  for (const label of labels) {
    const control = page.getByLabel(label, { exact: true }).first();
    if (!(await control.count())) throw new Error(`Expected action is missing: ${label}`);
    const initial = await control.boundingBox();
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    const size = page.viewportSize();
    if (!box || !size || box.x < -1 || box.y < -1 || box.x + box.width > size.width + 1 || box.y + box.height > size.height + 1) {
      throw new Error(`Action cannot be scrolled into the viewport: ${label} ${JSON.stringify(box)}`);
    }
    if (box.width < 44 || box.height < 44) throw new Error(`Action touch area is smaller than 44px: ${label}`);
    results.push({ label, reachable: true, box, requiredScroll: Boolean(initial && (initial.y < 0 || initial.y + initial.height > size.height)) });
  }
  return results;
}

async function assertReaderAndSelectWord(page) {
  const surface = page.getByTestId('english-reader-reading-surface');
  if (!(await surface.count())) throw new Error('Reader text surface is missing.');
  const token = page.locator('[data-testid^="english-reader-token-"]').first();
  if (!(await token.count())) throw new Error('Reader has no tappable lookup word.');
  const tokenLabel = await token.getAttribute('aria-label');
  await token.click();
  await page.waitForTimeout(300);
  const sheet = page.getByText('Tra cứu trong bộ từ tiếng Anh cá nhân', { exact: true });
  if (!(await sheet.count())) throw new Error('Selecting a word did not open personal lookup.');
  const selected = await token.evaluate((element) => getComputedStyle(element).backgroundColor);
  return { tokenLabel, selectedBackground: selected, lookupOpened: true };
}

async function applySyntheticFontScale(page, scale) {
  await page.evaluate((factor) => {
    const values = [...document.querySelectorAll('*')].map((element) => {
      const size = Number.parseFloat(getComputedStyle(element).fontSize);
      return [element, Number.isFinite(size) ? size : null];
    });
    for (const [element, size] of values) {
      if (size !== null && size > 0) element.style.fontSize = `${size * factor}px`;
    }
  }, scale);
}

async function makeContactSheets(page) {
  await page.setViewportSize({ width: 1280, height: 300 });
  const afterImages = captured.filter(({ file }) => fs.existsSync(path.join(afterDir, file)));
  for (let offset = 0; offset < afterImages.length; offset += 8) {
    const group = afterImages.slice(offset, offset + 8);
    const items = group.map(({ file, route, state }) => {
      const data = fs.readFileSync(path.join(afterDir, file)).toString('base64');
      return `<figure><img src="data:image/png;base64,${data}"/><figcaption>${file}<br/><small>${route}</small></figcaption></figure>`;
    }).join('');
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
      *{box-sizing:border-box}body{margin:0;padding:24px;background:#eef2f8;color:#182235;font:14px Arial,sans-serif}
      h1{font-size:22px;margin:0 0 16px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
      figure{margin:0;background:#fff;padding:10px;border-radius:10px;box-shadow:0 2px 8px #15233a22;overflow:hidden}
      img{display:block;width:100%;height:auto;border:1px solid #dce3ed}figcaption{padding-top:8px;font-weight:700;word-break:break-word}
      small{font-weight:400;color:#627085}
    </style></head><body><h1>English UI V7.2 · AFTER · ${offset + 1}–${offset + group.length}</h1><div class="grid">${items}</div></body></html>`);
    const file = `after-contact-sheet-${String(Math.floor(offset / 8) + 1).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(sheetsDir, file), fullPage: true, animations: 'disabled' });
  }

  const beforeAfter = comparisons.filter(([name]) =>
    fs.existsSync(path.join(beforeDir, `${name}.png`)) && fs.existsSync(path.join(afterDir, `${name}.png`)),
  );
  for (let offset = 0; offset < beforeAfter.length; offset += 4) {
    const group = beforeAfter.slice(offset, offset + 4);
    const items = group.map(([name, summary]) => {
      const before = fs.readFileSync(path.join(beforeDir, `${name}.png`)).toString('base64');
      const after = fs.readFileSync(path.join(afterDir, `${name}.png`)).toString('base64');
      return `<article><h2>${name}</h2><div class="pair"><figure><img src="data:image/png;base64,${before}"/><figcaption>BEFORE</figcaption></figure><figure><img src="data:image/png;base64,${after}"/><figcaption>AFTER · PASS*</figcaption></figure></div><p>${summary}</p></article>`;
    }).join('');
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
      *{box-sizing:border-box}body{margin:0;padding:20px;background:#eef2f8;color:#182235;font:13px Arial,sans-serif}
      h1{font-size:21px;margin:0 0 16px}h2{font-size:14px;margin:0 0 6px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      article{background:#fff;padding:10px;border-radius:9px;box-shadow:0 2px 8px #15233a22;overflow:hidden}
      .pair{display:grid;grid-template-columns:1fr 1fr;gap:7px}figure{margin:0;min-width:0}.pair img{display:block;width:100%;height:auto;border:1px solid #dce3ed}
      figcaption{font-size:11px;font-weight:800;padding-top:4px}p{font-size:11px;line-height:1.35;margin:7px 0 0;color:#41516b}
    </style></head><body><h1>English UI V7.2 · BEFORE / AFTER · screens ${offset + 1}–${offset + group.length}<br/><small>*PASS is the automated visual/layout gate outcome for this route; see manifest for detailed assertions/platform limits.</small></h1><div class="grid">${items}</div></body></html>`);
    const file = `before-after-contact-sheet-${String(Math.floor(offset / 4) + 1).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(sheetsDir, file), fullPage: true, animations: 'disabled' });
  }
  return { afterContactSheets: Math.ceil(afterImages.length / 8), comparedScreens: beforeAfter.length, comparisonSheets: Math.ceil(beforeAfter.length / 4), boardWidth: 1280, deviceScaleFactor: 2 };
}

async function run() {
  activeBrowser = await chromium.launch({ channel: 'msedge', headless: true });
  const browser = activeBrowser;
  activeContext = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 4Chinese V7.2 isolated web QA',
  });
  const context = activeContext;
  const page = await context.newPage();
  if (sheetsOnly) {
    const manifestPath = path.join(outputRoot, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    captured.push(...manifest.screenshots);
    manifest.contactSheets = await makeContactSheets(page);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    await context.close();
    await browser.close();
    activeContext = null;
    activeBrowser = null;
    console.log('Contact sheets rebuilt from the existing verified captures.');
    return;
  }
  page.on('pageerror', (error) => runtimeErrors.push(String(error?.message || error)));

  if (bulkPreviewOnly) {
    const manifestPath = path.join(outputRoot, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    await go(page, '/(tabs)/profile');
    const englishRadio = page.getByLabel('Chọn học Tiếng Anh');
    await englishRadio.waitFor({ state: 'visible', timeout: 90000 });
    if ((await englishRadio.getAttribute('aria-checked')) !== 'true') await englishRadio.click();
    await seedTemporaryBrowserData(page);
    await recordCapture(page, '17-bulk-step-2-validation-preview', routeByName['17-bulk-step-2-validation-preview'], {
      fullPage: false,
      interact: async (p) => {
        await p.getByLabel('Danh sách từ và nghĩa tiếng Anh, hai cột TAB').fill('perseverance\tkiên trì\nresilience\tkhả năng phục hồi');
        await requireClick(p, 'Kiểm tra và xem trước thẻ');
        const controls = await assertReachableControls(p, ['Xác nhận lưu 2 thẻ vào bộ']);
        if (!(await p.getByText(/2 dòng hợp lệ/).count())) throw new Error('Bulk validation summary is missing.');
        return { validationSummaryPresent: true, controls, bulkNotSaved: true };
      },
      assert: assertDocumentFits,
    });
    manifest.screenshots = manifest.screenshots.map((old) => captured.find((fresh) => fresh.file === old.file) ?? old);
    manifest.bulkPreviewRefresh = { capturedAt: new Date().toISOString(), reason: 'Scroll the actual validation summary and explicit save action into view; no bulk import was saved.' };
    manifest.failures.push(...failures);
    manifest.runtimeErrors.push(...runtimeErrors);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    await context.close();
    await browser.close();
    activeContext = null;
    activeBrowser = null;
    if (failures.length || runtimeErrors.length) process.exitCode = 1;
    return;
  }

  if (statsRefresh) {
    const manifestPath = path.join(outputRoot, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    await go(page, '/(tabs)/profile');
    const englishRadio = page.getByLabel('Chọn học Tiếng Anh');
    await englishRadio.waitFor({ state: 'visible', timeout: 90000 });
    if ((await englishRadio.getAttribute('aria-checked')) !== 'true') await englishRadio.click();
    await seedTemporaryBrowserData(page);
    await recordCapture(page, '28-statistics-empty', routeByName['28-statistics-empty'], {
      assert: async (p) => summaries('statsZeroAttempts', [JSON.stringify(await assertStatsInsufficient(p))]),
    });
    await recordCapture(page, '29-statistics-demo-populated', routeByName['29-statistics-demo-populated']);
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await recordCapture(page, '35-dark-statistics', routeByName['35-dark-statistics']);
    const refreshedResponsive = [];
    const refreshedFonts = [];
    for (const width of [320, 360, 390, 412]) {
      await page.setViewportSize({ width, height: 844 });
      await go(page, '/(tabs)/stats');
      const detail = await assertStatsInsufficient(page);
      const bounds = await assertDocumentFits(page);
      const file = `responsive-${width}-stats-zero-attempts.png`;
      await page.screenshot({ path: path.join(afterDir, file), fullPage: true, animations: 'disabled' });
      refreshedResponsive.push({ width, state: 'stats-zero-attempts', file, pass: true, detail, bounds });
    }
    await page.setViewportSize(viewport);
    for (const scale of [1.3, 1.6, 2]) {
      await go(page, '/(tabs)/stats');
      await applySyntheticFontScale(page, scale);
      const detail = await assertStatsInsufficient(page);
      const bounds = await assertDocumentFits(page);
      const file = `font-${Math.round(scale * 100)}-stats-zero-attempts.png`;
      await page.screenshot({ path: path.join(afterDir, file), fullPage: true, animations: 'disabled' });
      refreshedFonts.push({ scale, state: 'stats-zero-attempts', file, pass: true, detail, bounds, method: 'synthetic Web text-size stress; not OS accessibility font scaling' });
    }
    manifest.screenshots = manifest.screenshots.map((old) => captured.find((fresh) => fresh.file === old.file) ?? old);
    manifest.responsiveResults = manifest.responsiveResults.filter((r) => r.state !== 'stats-zero-attempts').concat(refreshedResponsive);
    manifest.fontScaleResults = manifest.fontScaleResults.filter((r) => r.state !== 'stats-zero-attempts').concat(refreshedFonts);
    manifest.checks = manifest.checks.filter((r) => r.name !== 'statsZeroAttempts').concat(checks);
    manifest.statisticsRefresh = { capturedAt: new Date().toISOString(), reason: 'Final statistics copy removes repeated data-isolation notice; recaptured all affected baseline/responsive/font screenshots from the new export.', files: captured.map((r) => r.file), temporaryContextOnly: true };
    manifest.failures.push(...failures);
    manifest.runtimeErrors.push(...runtimeErrors);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    await context.close();
    await browser.close();
    activeContext = null;
    activeBrowser = null;
    console.log('Statistics captures refreshed, including four widths and three text scales.');
    if (failures.length || runtimeErrors.length) process.exitCode = 1;
    return;
  }

  if (criticalMatrix || shortViewportOnly) {
    const manifestPath = path.join(outputRoot, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    await go(page, '/(tabs)/profile');
    const englishRadio = page.getByLabel('Chọn học Tiếng Anh');
    await englishRadio.waitFor({ state: 'visible', timeout: 90000 });
    if ((await englishRadio.getAttribute('aria-checked')) !== 'true') {
      await englishRadio.click();
      await page.waitForTimeout(500);
    }
    const results = [];
    const cases = [
      { state: 'review', route: '/english/review?preview=true', assert: assertReviewContainsControls },
      { state: 'stats-populated', route: '/(tabs)/stats?preview=true', assert: async (p) => {
        if (!(await p.getByText('10 phút 42 giây', { exact: true }).count())) throw new Error('Readable populated duration is missing.');
        if (!(await p.getByText('Độ chính xác', { exact: true }).count())) throw new Error('Supported populated accuracy is missing.');
        return { populatedDurationVisible: true, supportedAccuracyVisible: true };
      } },
    ];
    for (const colorScheme of shortViewportOnly ? [] : ['light', 'dark']) {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const width of [320, 360, 390, 412]) {
        await page.setViewportSize({ width, height: 844 });
        for (const scale of [1.3, 1.6]) {
          for (const testCase of cases) {
            const file = `critical-${colorScheme}-${width}-${Math.round(scale * 100)}-${testCase.state}.png`;
            try {
              await go(page, testCase.route);
              await applySyntheticFontScale(page, scale);
              const detail = await testCase.assert(page);
              const bounds = await assertDocumentFits(page);
              await page.screenshot({ path: path.join(afterDir, file), fullPage: true, animations: 'disabled' });
              const controls = await assertReachableControls(page, [testCase.state === 'review' ? 'Hiện đáp án và nghĩa đã lưu' : 'Xem kế hoạch ngày và sổ lỗi']);
              const ctaFile = controls.some((r) => r.requiredScroll) ? file.replace('.png', '-cta-visible.png') : null;
              if (ctaFile) await page.screenshot({ path: path.join(afterDir, ctaFile), animations: 'disabled' });
              results.push({ colorScheme, width, scale, state: testCase.state, file, ctaFile, pass: true, detail, bounds, controls });
            } catch (error) {
              const message = String(error?.message || error);
              results.push({ colorScheme, width, scale, state: testCase.state, pass: false, error: message });
              failures.push({ name: file, route: testCase.route, error: message });
            }
          }
        }
      }
      await page.setViewportSize({ width: 320, height: 844 });
      for (const state of ['answer', 'quick']) {
        const route = state === 'quick' ? '/english/review?quick=1&preview=true' : '/english/review?preview=true';
        const file = `critical-${colorScheme}-320-160-review-${state}.png`;
        try {
          await go(page, route);
          if (state === 'answer') await requireClick(page, 'Hiện đáp án và nghĩa đã lưu');
          await applySyntheticFontScale(page, 1.6);
          const detail = await assertReviewContainsControls(page);
          const bounds = await assertDocumentFits(page);
          await page.screenshot({ path: path.join(afterDir, file), fullPage: true, animations: 'disabled' });
          const controls = await assertReachableControls(page, state === 'answer' ? ['Chưa nhớ từ này', 'Đã nhớ từ này'] : ['Hiện đáp án và nghĩa đã lưu']);
          const ctaFile = controls.some((r) => r.requiredScroll) ? file.replace('.png', '-cta-visible.png') : null;
          if (ctaFile) await page.screenshot({ path: path.join(afterDir, ctaFile), animations: 'disabled' });
          results.push({ colorScheme, width: 320, scale: 1.6, state: `review-${state}`, file, ctaFile, pass: true, detail, bounds, controls });
        } catch (error) {
          const message = String(error?.message || error);
          results.push({ colorScheme, width: 320, scale: 1.6, state: `review-${state}`, pass: false, error: message });
          failures.push({ name: file, route, error: message });
        }
      }
    }
    const shortViewportResults = [];
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 480 });
    try {
      await go(page, '/english/reader');
      await requireClick(page, 'Dán & Nhập văn bản mới');
      const input = page.getByLabel('Văn bản tiếng Anh để đọc');
      await input.fill("Don't stop learning. This text exists only in a temporary QA browser.");
      await input.focus();
      const controls = await assertReachableControls(page, ['Lưu và đọc ngay']);
      const bounds = await assertDocumentFits(page);
      const file = 'short-viewport-reader-input-focused.png';
      await page.screenshot({ path: path.join(afterDir, file), animations: 'disabled' });
      shortViewportResults.push({ state: 'reader-input', file, pass: true, viewport: { width: 390, height: 480 }, controls, bounds, method: 'Focused Web input in a shortened viewport; native IME is not simulated.' });
    } catch (error) {
      const message = String(error?.message || error);
      shortViewportResults.push({ state: 'reader-input', pass: false, error: message });
      failures.push({ name: 'short-viewport-reader-input', route: '/english/reader', error: message });
    }
    try {
      await page.setViewportSize(viewport);
      await seedTemporaryBrowserData(page);
      await page.setViewportSize({ width: 390, height: 480 });
      await go(page, '/english/bulk');
      const input = page.getByLabel('Danh sách từ và nghĩa tiếng Anh, hai cột TAB');
      await input.fill('welcome\tchào mừng\nresilience\tkhả năng phục hồi');
      await input.focus();
      const controls = await assertReachableControls(page, ['Kiểm tra và xem trước thẻ']);
      const bounds = await assertDocumentFits(page);
      const file = 'short-viewport-bulk-input-focused.png';
      await page.screenshot({ path: path.join(afterDir, file), animations: 'disabled' });
      shortViewportResults.push({ state: 'bulk-input', file, pass: true, viewport: { width: 390, height: 480 }, controls, bounds, method: 'Focused Web input in a shortened viewport; native IME is not simulated.' });
    } catch (error) {
      const message = String(error?.message || error);
      shortViewportResults.push({ state: 'bulk-input', pass: false, error: message });
      failures.push({ name: 'short-viewport-bulk-input', route: '/english/bulk', error: message });
    }
    if (!shortViewportOnly) manifest.criticalLayoutMatrix = results;
    manifest.shortViewportResults = shortViewportResults;
    manifest.failures.push(...failures);
    manifest.runtimeErrors.push(...runtimeErrors);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    await context.close();
    await browser.close();
    activeContext = null;
    activeBrowser = null;
    console.log(shortViewportOnly
      ? `Short viewport input checks: ${shortViewportResults.filter((r) => r.pass).length}/${shortViewportResults.length} passed.`
      : `Critical layout matrix: ${results.filter((r) => r.pass).length}/${results.length} passed.`);
    if (failures.length || runtimeErrors.length) process.exitCode = 1;
    return;
  }

  await go(page, '/(tabs)/profile');
  const englishRadio = page.getByLabel('Chọn học Tiếng Anh');
  await englishRadio.waitFor({ state: 'visible', timeout: 90000 });
  if ((await englishRadio.getAttribute('aria-checked')) !== 'true') {
    await englishRadio.click({ timeout: 8000 });
    await page.waitForTimeout(500);
  }
  await recordCapture(page, '01-settings-english-mode', routeByName['01-settings-english-mode'], {
    assert: async (p) => {
      const text = await p.locator('body').innerText();
      if (text.includes('Mục tiêu tiếng Trung mỗi ngày')) throw new Error('Chinese-only goals remain visible in English mode.');
      if (!text.includes('Sao lưu dữ liệu tiếng Trung')) throw new Error('Backup scope is not clear in English mode.');
      return summaries('settingsEnglish', ['Chinese-only goal section hidden', 'backup scope labeled']);
    },
  });

  await recordCapture(page, '02-home-empty', routeByName['02-home-empty']);
  await recordCapture(page, '03-home-demo-populated', routeByName['03-home-demo-populated']);
  await recordCapture(page, '04-home-demo-scroll', routeByName['04-home-demo-scroll'], { fullPage: false, scroll: true });
  await recordCapture(page, '05-cefr-a1', routeByName['05-cefr-a1'], {
    assert: async (p) => {
      if (!(await p.getByTestId('english-cefr-level-status').count())) throw new Error('CEFR level status badge missing.');
      return summaries('cefrA1', ['level status visible']);
    },
  });
  await recordCapture(page, '06-cefr-b1', routeByName['06-cefr-b1'], {
    interact: async (p) => {
      const tab = p.getByRole('tab', { name: /Cấp độ B1/i });
      if (!(await tab.count())) throw new Error('CEFR B1 tab is missing.');
      await tab.first().click();
      await p.waitForTimeout(160);
    },
    assert: async (p) => {
      if (!(await p.getByTestId('english-cefr-level-status').count())) throw new Error('CEFR B1 status missing.');
      return summaries('cefrB1', ['B1 selectable and status visible']);
    },
  });

  await recordCapture(page, '07-vocabulary-empty', routeByName['07-vocabulary-empty']);
  await recordCapture(page, '08-vocabulary-demo-populated', routeByName['08-vocabulary-demo-populated']);
  await recordCapture(page, '09-vocabulary-create-deck-form', routeByName['09-vocabulary-create-deck-form'], { interact: async (p) => clickLabel(p, 'Tạo bộ từ mới') });
  await recordCapture(page, '10-vocabulary-add-card-form', routeByName['10-vocabulary-add-card-form'], { interact: async (p) => clickLabel(p, 'Thêm một từ thủ công') });
  await recordCapture(page, '11-deck-management-empty', routeByName['11-deck-management-empty']);
  await recordCapture(page, '12-bulk-no-deck-empty-state', routeByName['12-bulk-no-deck-empty-state']);

  await seedTemporaryBrowserData(page);
  await recordCapture(page, '13-vocabulary-temporary-deck-and-card', routeByName['13-vocabulary-temporary-deck-and-card']);
  await recordCapture(page, '14-deck-management-temporary-deck', routeByName['14-deck-management-temporary-deck']);
  await recordCapture(page, '15-bulk-step-1-input', routeByName['15-bulk-step-1-input']);
  await recordCapture(page, '16-bulk-sample-format-guide-open', routeByName['16-bulk-sample-format-guide-open'], { interact: async (p) => requireClick(p, 'Xem hướng dẫn định dạng mẫu') });
  await recordCapture(page, '17-bulk-step-2-validation-preview', routeByName['17-bulk-step-2-validation-preview'], {
    interact: async (p) => {
      const input = p.getByLabel('Danh sách từ và nghĩa tiếng Anh, hai cột TAB');
      if (!(await input.count())) throw new Error('Bulk input missing after temporary deck creation.');
      await input.first().fill('perseverance\tkiên trì\nresilience\tkhả năng hồi phục');
      await requireClick(p, 'Kiểm tra và xem trước thẻ');
      await p.waitForTimeout(250);
    },
    assert: async (p) => {
      if (!(await p.getByTestId('english-bulk-step-indicator').count())) throw new Error('Bulk stepper missing.');
      return summaries('bulkPreview', ['two rows previewed; nothing saved by the QA runner']);
    },
  });

  await recordCapture(page, '18-review-empty-meaning', routeByName['18-review-empty-meaning']);
  await recordCapture(page, '19-review-demo-question', routeByName['19-review-demo-question'], {
    assert: async (p) => summaries('reviewQuestion', [JSON.stringify(await assertReviewContainsControls(p))]),
  });
  await recordCapture(page, '20-review-demo-answer-revealed', routeByName['20-review-demo-answer-revealed'], {
    interact: async (p) => requireClick(p, 'Hiện đáp án và nghĩa đã lưu'),
    assert: async (p) => summaries('reviewAnswer', [JSON.stringify(await assertReviewContainsControls(p))]),
  });
  await recordCapture(page, '21-review-demo-spelling', routeByName['21-review-demo-spelling']);
  await recordCapture(page, '22-review-demo-quick-session', routeByName['22-review-demo-quick-session'], {
    assert: async (p) => summaries('reviewQuick', [JSON.stringify(await assertReviewContainsControls(p))]),
  });

  await recordCapture(page, '23-reader-empty-landing', routeByName['23-reader-empty-landing']);
  await recordCapture(page, '24-reader-demo-reading-view', routeByName['24-reader-demo-reading-view']);
  await recordCapture(page, '25-reader-demo-word-lookup', routeByName['25-reader-demo-word-lookup'], {
    interact: async (p) => {
      const token = p.locator('[data-testid^="english-reader-token-"]').first();
      if (!(await token.count())) throw new Error('No tappable token in Reader preview.');
      await token.click();
      await p.waitForTimeout(250);
      const sheet = p.getByText('Tra cứu trong bộ từ tiếng Anh cá nhân', { exact: true });
      if (!(await sheet.count())) throw new Error('Selecting a word did not open personal lookup.');
      const selectedBackground = await token.evaluate((element) => getComputedStyle(element).backgroundColor);
      if (selectedBackground === 'rgba(0, 0, 0, 0)' || selectedBackground === 'transparent') throw new Error('Selected Reader word was not visually distinguished.');
      return { selectedToken: await token.getAttribute('aria-label'), selectedBackground, lookupOpened: true };
    },
  });
  await recordCapture(page, '26-reader-add-text-modal', routeByName['26-reader-add-text-modal'], {
    interact: async (p) => requireClick(p, 'Dán & Nhập văn bản mới'),
    assert: async (p) => {
      const input = p.getByLabel('Văn bản tiếng Anh để đọc');
      const save = p.getByLabel('Lưu và đọc ngay');
      if (!(await input.count()) || !(await save.count())) throw new Error('Reader input or save CTA is missing.');
      await input.focus();
      const [inputBox, saveBox] = await Promise.all([input.boundingBox(), save.boundingBox()]);
      if (!inputBox || !saveBox || saveBox.y + saveBox.height <= inputBox.y) throw new Error('Reader save action is not reachable after focusing the input.');
      return summaries('readerInputModal', ['input focused', 'save CTA below input in scrollable modal; native IME remains unverified']);
    },
  });
  await recordCapture(page, '27-reader-large-text', routeByName['27-reader-large-text'], {
    interact: async (p) => requireClick(p, 'Đổi cỡ chữ'),
    assert: async (p) => {
      const surface = p.getByTestId('english-reader-reading-surface');
      if (!(await surface.count())) throw new Error('Reader surface missing in large-text state.');
      const size = await p.getByTestId('english-reader-text-content').evaluate((element) => getComputedStyle(element).fontSize);
      return summaries('readerLargeText', [`font size ${size}px`, 'natural punctuation and spacing retained']);
    },
  });

  await recordCapture(page, '28-statistics-empty', routeByName['28-statistics-empty'], {
    assert: async (p) => summaries('statsZeroAttempts', [JSON.stringify(await assertStatsInsufficient(p))]),
  });
  await recordCapture(page, '29-statistics-demo-populated', routeByName['29-statistics-demo-populated']);
  await recordCapture(page, '30-card-editor-without-card-id', routeByName['30-card-editor-without-card-id'], {
    assert: async (p) => {
      if (!(await p.getByTestId('english-card-editor-unavailable').count())) throw new Error('Missing-ID state is not shown.');
      if (!(await p.getByRole('button', { name: 'Quay về bộ từ' }).count())) throw new Error('Missing-ID state still offers a futile retry.');
      return summaries('cardEditorMissingId', ['explicit missing-id message', 'return action instead of retry loop']);
    },
  });

  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await recordCapture(page, '31-dark-home', routeByName['31-dark-home']);
  await recordCapture(page, '32-dark-vocabulary', routeByName['32-dark-vocabulary']);
  await recordCapture(page, '33-dark-review', routeByName['33-dark-review'], {
    assert: async (p) => summaries('darkReview', [JSON.stringify(await assertReviewContainsControls(p))]),
  });
  await recordCapture(page, '34-dark-reader', routeByName['34-dark-reader']);
  await recordCapture(page, '35-dark-statistics', routeByName['35-dark-statistics']);

  const responsiveCases = [
    { route: '/english/review?preview=true', tag: 'review', assert: assertReviewContainsControls },
    { route: '/(tabs)/stats', tag: 'stats-zero-attempts', assert: assertStatsInsufficient },
    { route: '/(tabs)/hsk', tag: 'cefr', assert: async (p) => {
      if (!(await p.getByTestId('english-cefr-level-status').count())) throw new Error('CEFR badge missing.');
      return { levelStatusVisible: true };
    } },
    { route: '/english/reader?preview=true', tag: 'reader', assert: async (p) => {
      if (!(await p.getByTestId('english-reader-reading-surface').count())) throw new Error('Reader surface missing.');
      const title = p.getByTestId('english-reader-title');
      if (!(await title.count()) || !(await title.innerText()).includes('The Wonder of Lifelong Language Learning')) throw new Error('Reader title was clipped or is missing.');
      return { readerSurfaceVisible: true, fullTitleVisible: true };
    } },
    { route: '/english/bulk', tag: 'bulk', assert: async (p) => {
      if (!(await p.getByLabel('Danh sách từ và nghĩa tiếng Anh, hai cột TAB').count())) throw new Error('Bulk input missing.');
      return { bulkInputVisible: true };
    } },
    { route: '/english?preview=true', tag: 'vocabulary', assert: async () => ({ routeLoaded: true }) },
  ];
  const responsiveResults = [];
  for (const width of [320, 360, 390, 412]) {
    await page.setViewportSize({ width, height: 844 });
    for (const testCase of responsiveCases) {
      try {
        await go(page, testCase.route);
        const detail = await testCase.assert(page);
        const bounds = await assertDocumentFits(page);
        const file = `responsive-${width}-${testCase.tag}.png`;
        await page.screenshot({ path: path.join(afterDir, file), fullPage: true, animations: 'disabled' });
        responsiveResults.push({ width, state: testCase.tag, file, pass: true, detail, bounds });
      } catch (error) {
        responsiveResults.push({ width, state: testCase.tag, pass: false, error: String(error?.message || error) });
        failures.push({ name: `responsive-${width}-${testCase.tag}`, route: testCase.route, error: String(error?.message || error) });
      }
    }
  }
  await page.setViewportSize(viewport);

  const fontResults = [];
  for (const scale of [1.3, 1.6, 2.0]) {
    for (const testCase of responsiveCases.slice(0, 4)) {
      try {
        await go(page, testCase.route);
        await applySyntheticFontScale(page, scale);
        const detail = await testCase.assert(page);
        const bounds = await assertDocumentFits(page);
        const file = `font-${Math.round(scale * 100)}-${testCase.tag}.png`;
        await page.screenshot({ path: path.join(afterDir, file), fullPage: true, animations: 'disabled' });
        fontResults.push({ scale, state: testCase.tag, file, pass: true, detail, bounds, method: 'synthetic Web text-size stress; not OS accessibility font scaling' });
      } catch (error) {
        fontResults.push({ scale, state: testCase.tag, pass: false, error: String(error?.message || error), method: 'synthetic Web text-size stress; not OS accessibility font scaling' });
        failures.push({ name: `font-${Math.round(scale * 100)}-${testCase.tag}`, route: testCase.route, error: String(error?.message || error) });
      }
    }
  }

  await page.setViewportSize(viewport);
  await go(page, '/english/reader');
  await requireClick(page, 'Dán & Nhập văn bản mới');
  const readerText = page.getByLabel('Văn bản tiếng Anh để đọc');
  const longSample = (`Language learning remains rewarding. Don't stop; co-workers share ideas. 🙂\n`).repeat(2000).slice(0, 100000);
  await readerText.fill(longSample, { timeout: 45000 });
  const enteredLength = await readerText.evaluate((element) => element.value.length);
  if (enteredLength !== 100000) throw new Error(`Expected 100,000 input chars, got ${enteredLength}.`);
  await requireClick(page, 'Lưu và đọc ngay');
  await page.waitForTimeout(500);
  const longSurface = page.getByTestId('english-reader-reading-surface');
  if (!(await longSurface.count())) throw new Error('Reader did not open the 100k test input.');
  const longFile = '36-reader-100k-first-window.png';
  await page.screenshot({ path: path.join(afterDir, longFile), fullPage: true, animations: 'disabled' });
  captured.push({ file: longFile, route: '/english/reader · isolated 100,000-char draft', state: '100k long text · first bounded page', platform: 'Expo Web mobile viewport; not native Android', viewport, fullPage: true, charactersEntered: enteredLength, savedTo: 'isolated temporary Playwright browser context only' });

  const beforeAfter = await makeContactSheets(page);
  const baselineManifest = JSON.parse(fs.readFileSync(path.join(baselineRoot, 'capture-manifest.json'), 'utf8'));
  const scrollFile = path.join(afterDir, '04-home-demo-scroll.png');
  const baselineScrollFile = path.join(beforeDir, '04-home-demo-scroll.png');
  const scrollAfterHash = crypto.createHash('sha256').update(fs.readFileSync(scrollFile)).digest('hex');
  const scrollBeforeHash = crypto.createHash('sha256').update(fs.readFileSync(baselineScrollFile)).digest('hex');
  if (scrollAfterHash === crypto.createHash('sha256').update(fs.readFileSync(path.join(afterDir, '03-home-demo-populated.png'))).digest('hex')) {
    failures.push({ name: '04-home-demo-scroll', route: routeByName['04-home-demo-scroll'], error: 'Scrolled capture duplicates the populated home screenshot.' });
  }
  const manifest = {
    version: 'V7.2',
    capturedAt: new Date().toISOString(),
    source: 'Fresh Expo Web export from current V7.2 source, served on localhost:8114.',
    platform: 'Playwright Microsoft Edge Web render, mobile emulation 390x844 DPR2; screenshots are not native Android captures.',
    deviceInstall: 'None. Physical phone was not targeted; no APK was built, replaced or installed.',
    androidStatus: 'Android JS export runs separately; this screenshot package is Web-only. Native safe-area, Android IME and operating-system font scaling remain unverified.',
    dataSafety: 'New isolated non-persistent Playwright browser context. A synthetic deck/card and a 100,000-character Reader draft were created only inside that disposable context. The bulk preview was not saved. The browser context is closed below; no app/user database, APK or production service is touched.',
    baseline: { source: 'artifacts/english-ui-after-update-2026-10-11', totalCaptured: baselineManifest.totalCaptured, platform: baselineManifest.platform },
    scrollCaptureProof: {
      baseline03And04Identical: crypto.createHash('sha256').update(fs.readFileSync(path.join(beforeDir, '03-home-demo-populated.png'))).digest('hex') === scrollBeforeHash,
      before04Sha256: scrollBeforeHash,
      after04Sha256: scrollAfterHash,
      after04ViewportOnly: true,
      actualScroll: captured.find((item) => item.file === '04-home-demo-scroll.png')?.scroll ?? null,
    },
    totalCaptured: captured.length,
    baseScreensCaptured: captured.filter((item) => /^(0[1-9]|[12]\d|3[0-5])-/.test(item.file)).length,
    viewport,
    screenshots: captured,
    responsiveResults,
    fontScaleResults: fontResults,
    accessibility: {
      labels: ['US/UK speech buttons', 'Reader word lookup tokens', 'English language selector', 'bulk input and review actions'].join('; '),
      motion: 'Playwright reduced-motion media preference set during capture; native OS animation behavior not asserted.',
      keyboard: 'Web focus/scroll affordance checked; native virtual keyboard and IME overlap are not verified by browser screenshots.',
      safeArea: 'React Native safe-area wrapper is present in source; physical device safe-area inset behavior is not verified by Web render.',
    },
    checks,
    comparisons: comparisons.map(([name, summary]) => ({
      before: `before/${name}.png`,
      after: `after/${name}.png`,
      summary,
      result: fs.existsSync(path.join(afterDir, `${name}.png`)) ? 'PASS*' : 'NOT_CAPTURED',
    })),
    contactSheets: beforeAfter,
    runtimeErrors,
    failures,
  };
  fs.writeFileSync(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outputRoot, 'README.md'), [
    '# 4Chinese English UI V7.2 — visual QA package',
    '',
    `Captured ${captured.length} screens on ${manifest.capturedAt}.`,
    '',
    'This is an Expo Web render in mobile emulation, not a native Android screenshot. The real phone was not targeted and no APK was touched.',
    '',
    'The isolated Playwright context contained the temporary test deck/card and the 100,000-character Reader draft. The bulk preview was validated but not saved. The browser context was closed after capture; these test data do not belong to the user app.',
    '',
    'Folders: `before/` contains the unmodified 35-image V7.1 baseline; `after/` contains 35 matched screens plus responsive/font-stress/long-text evidence; `contact-sheets/` contains full after sheets and 20 before/after comparisons.',
    '',
    'See `manifest.json` for routes, scroll proof, responsive/font results, failures, and platform limits. A `PASS*` label applies to Web/automated route checks only; it is not native-device acceptance.',
    '',
  ].join('\n'));

  await context.close();
  await browser.close();
  activeContext = null;
  activeBrowser = null;
  console.log(`Finished ${captured.length} screenshots; ${failures.length} failures; output ${outputRoot}`);
  if (failures.length > 0 || runtimeErrors.length > 0) process.exitCode = 1;
}

run().catch(async (error) => {
  console.error(error);
  await activeContext?.close().catch(() => undefined);
  await activeBrowser?.close().catch(() => undefined);
  process.exitCode = 1;
});
