const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');

const baseUrl = process.env.ENGLISH_UI_BASE_URL || 'http://localhost:8112';
const outputRoot = path.resolve(__dirname, '../artifacts/english-ui-after-update-2026-10-11');
const screenshotsDir = path.join(outputRoot, 'screenshots');
const contactSheetsDir = path.join(outputRoot, 'contact-sheets');
const viewport = { width: 390, height: 844 };
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(contactSheetsDir, { recursive: true });
for (const directory of [screenshotsDir, contactSheetsDir]) {
  for (const file of fs.readdirSync(directory)) {
    if (file.endsWith('.png')) fs.unlinkSync(path.join(directory, file));
  }
}

const captured = [];
const failures = [];

async function settle(page) {
  await page.waitForTimeout(700);
  const loader = page.getByText('Đang mở dữ liệu học offline', { exact: true });
  if (await loader.count()) await loader.waitFor({ state: 'detached', timeout: 45000 });
  if (await loader.count()) throw new Error('Offline database loader remained visible; refusing to capture a spinner as UI evidence.');
  await page.waitForTimeout(200);
}

async function go(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
}

async function clickLabel(page, label, options = {}) {
  const control = page.getByLabel(label, options);
  if (!(await control.count())) return false;
  await control.first().click({ timeout: 5000 });
  await page.waitForTimeout(350);
  return true;
}

async function capture(page, name, route, interact) {
  try {
    await go(page, route);
    if (interact) await interact(page);
    const file = `${name}.png`;
    await page.screenshot({ path: path.join(screenshotsDir, file), fullPage: true, animations: 'disabled' });
    captured.push({ file, route, state: name });
    console.log(`CAPTURED ${file}`);
  } catch (error) {
    failures.push({ name, route, error: String(error?.message || error) });
    console.error(`FAILED ${name}: ${error?.message || error}`);
  }
}

async function requireClick(page, label) {
  if (!(await clickLabel(page, label))) throw new Error(`Required control not found: ${label}`);
}

async function seedTemporaryBrowserData(page) {
  await go(page, '/english');
  await requireClick(page, 'Tạo bộ từ mới');
  const deckName = page.getByLabel('Tên bộ từ tiếng Anh');
  if (!(await deckName.count())) throw new Error('Temporary deck name field missing.');
  await deckName.first().fill('QA preview deck (temporary)');
  await requireClick(page, 'Xác nhận tạo bộ từ');
  await page.waitForTimeout(700);

  await requireClick(page, 'Thêm một từ thủ công');
  const headword = page.getByLabel('Từ hoặc cụm tiếng Anh');
  const meaning = page.getByLabel('Nghĩa tiếng Việt do bạn chọn');
  if (!(await headword.count()) || !(await meaning.count())) throw new Error('Temporary card fields missing.');
  await headword.first().fill('resilience');
  await meaning.first().fill('khả năng phục hồi');
  await requireClick(page, 'Lưu thẻ vào bộ đang chọn');
  await page.waitForTimeout(900);
}

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 4Chinese English UI visual QA',
  });
  const page = await context.newPage();

  await go(page, '/(tabs)/profile');
  try {
    const englishRadio = page.getByLabel('Chọn học Tiếng Anh');
    await englishRadio.waitFor({ state: 'visible', timeout: 90000 });
    if (await englishRadio.count()) {
      await englishRadio.click({ timeout: 7000 });
      await page.waitForTimeout(1200);
    }
  } catch (error) {
    failures.push({ name: 'English-mode-initialization', route: '/(tabs)/profile', error: String(error?.message || error) });
  }

  await capture(page, '01-settings-english-mode', '/(tabs)/profile');
  await capture(page, '02-home-empty', '/english/activity');
  await capture(page, '03-home-demo-populated', '/english/activity?preview=true');
  await capture(page, '04-home-demo-scroll', '/english/activity?preview=true', async (p) => p.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55)));

  await capture(page, '05-cefr-a1', '/(tabs)/hsk');
  await capture(page, '06-cefr-b1', '/(tabs)/hsk', async (p) => {
    const tab = p.getByRole('tab', { name: /B1/i });
    if (await tab.count()) await tab.first().click();
  });

  await capture(page, '07-vocabulary-empty', '/english');
  await capture(page, '08-vocabulary-demo-populated', '/english?preview=true');
  await capture(page, '09-vocabulary-create-deck-form', '/english', async (p) => clickLabel(p, 'Tạo bộ từ mới'));
  await capture(page, '10-vocabulary-add-card-form', '/english', async (p) => clickLabel(p, 'Thêm một từ thủ công'));
  await capture(page, '11-deck-management-empty', '/english/decks');
  await capture(page, '12-bulk-no-deck-empty-state', '/english/bulk');

  await seedTemporaryBrowserData(page);
  await capture(page, '13-vocabulary-temporary-deck-and-card', '/english');
  await capture(page, '14-deck-management-temporary-deck', '/english/decks');
  await capture(page, '15-bulk-step-1-input', '/english/bulk');
  await capture(page, '16-bulk-sample-format-guide-open', '/english/bulk', async (p) => requireClick(p, 'Xem hướng dẫn định dạng mẫu'));
  await capture(page, '17-bulk-step-2-validation-preview', '/english/bulk', async (p) => {
    const input = p.getByLabel('Danh sách từ và nghĩa tiếng Anh, hai cột TAB');
    if (!(await input.count())) throw new Error('Bulk input missing despite temporary deck being present.');
    await input.first().fill('perseverance\tkiên trì\nresilience\tkhả năng hồi phục');
    await requireClick(p, 'Kiểm tra và xem trước thẻ');
    await page.waitForTimeout(600);
  });

  await capture(page, '18-review-empty-meaning', '/english/review');
  await capture(page, '19-review-demo-question', '/english/review?preview=true');
  await capture(page, '20-review-demo-answer-revealed', '/english/review?preview=true', async (p) => requireClick(p, 'Hiện đáp án và nghĩa đã lưu'));
  await capture(page, '21-review-demo-spelling', '/english/review?mode=SPELLING&preview=true');
  await capture(page, '22-review-demo-quick-session', '/english/review?quick=1&preview=true');

  await capture(page, '23-reader-empty-landing', '/english/reader');
  await capture(page, '24-reader-demo-reading-view', '/english/reader?preview=true');
  await capture(page, '25-reader-demo-word-lookup', '/english/reader?preview=true', async (p) => {
    const token = p.getByLabel(/^Tra từ cá nhân:/, { exact: false });
    if (!(await token.count())) throw new Error('No lookup token available in preview reading text.');
    await token.first().click();
  });
  await capture(page, '26-reader-add-text-modal', '/english/reader', async (p) => {
    const action = p.getByLabel('Dán & Nhập văn bản mới');
    if (!(await action.count())) throw new Error('Reader add-text action not found.');
    await action.first().click();
  });
  await capture(page, '27-reader-large-text', '/english/reader?preview=true', async (p) => requireClick(p, 'Đổi cỡ chữ'));

  await capture(page, '28-statistics-empty', '/(tabs)/stats');
  await capture(page, '29-statistics-demo-populated', '/(tabs)/stats?preview=true');
  await capture(page, '30-card-editor-without-card-id', '/english/card-edit');

  await page.emulateMedia({ colorScheme: 'dark' });
  await capture(page, '31-dark-home', '/english/activity?preview=true');
  await capture(page, '32-dark-vocabulary', '/english?preview=true');
  await capture(page, '33-dark-review', '/english/review?preview=true');
  await capture(page, '34-dark-reader', '/english/reader?preview=true');
  await capture(page, '35-dark-statistics', '/(tabs)/stats?preview=true');

  const sheets = [];
  for (let offset = 0; offset < captured.length; offset += 8) {
    const group = captured.slice(offset, offset + 8);
    const htmlItems = group.map(({ file, route }) => {
      const data = fs.readFileSync(path.join(screenshotsDir, file)).toString('base64');
      return `<figure><img src="data:image/png;base64,${data}"/><figcaption>${file}<br/><small>${route}</small></figcaption></figure>`;
    }).join('');
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;padding:24px;background:#eef2f8;color:#182235;font:14px Arial,sans-serif}
      h1{font-size:22px;margin:0 0 16px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
      figure{margin:0;background:#fff;padding:10px;border-radius:10px;box-shadow:0 2px 8px #15233a22;overflow:hidden}
      img{display:block;width:100%;height:auto;border:1px solid #dce3ed}figcaption{padding-top:8px;font-weight:700;word-break:break-word}
      small{font-weight:400;color:#627085}
    </style></head><body><h1>English UI · after source update · ${offset + 1}–${offset + group.length}</h1><div class="grid">${htmlItems}</div></body></html>`);
    const file = `contact-sheet-${String(sheets.length + 1).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(contactSheetsDir, file), fullPage: true, animations: 'disabled' });
    sheets.push(file);
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    source: 'Current Expo web export served from localhost:8112; bundle timestamp 2026-10-11 11:29:54, after latest English source update at 11:28:23.',
    platform: 'Web render at mobile viewport 390x844, DPR 2; not native Android.',
    deviceInstall: 'None. Physical phone not targeted. Native build was blocked offline because org.gradle.toolchains.foojay-resolver-convention:1.0.0 is not cached and network access is unavailable.',
    dataSafety: 'Isolated ephemeral browser context. A synthetic deck/card was created only in that temporary browser database to unlock bulk UI; bulk validation was not saved as cards. Closing the context discarded its data.',
    totalCaptured: captured.length,
    viewport,
    screenshots: captured,
    contactSheets: sheets,
    failures,
  };
  fs.writeFileSync(path.join(outputRoot, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outputRoot, 'README.md'), [
    '# English UI screenshots after latest source update',
    '',
    `Captured ${captured.length} screens at ${manifest.capturedAt}.`,
    '',
    'These are current-source web renders at a mobile viewport, not native Android screenshots. No APK was installed or updated on the physical phone. Native build could not run offline because org.gradle.toolchains.foojay-resolver-convention:1.0.0 is not cached.',
    '',
    'Demo previews and a synthetic deck/card used to unlock bulk-entry states existed only in the isolated temporary browser context. The bulk-entry sample was validated but not saved; closing the browser discarded that context.',
    '',
    'See `capture-manifest.json` for routes and coverage. Contact sheets are in `contact-sheets/`; individual screenshots are in `screenshots/`.',
    '',
  ].join('\n'));

  await context.close();
  await browser.close();
  console.log(`Finished ${captured.length} screenshots; ${failures.length} capture/interaction failures; output ${outputRoot}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
