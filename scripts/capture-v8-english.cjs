const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const outputRoot = path.join(root, process.env.V8_OUTPUT_DIRECTORY || 'artifacts/v8-english-2026-10-13');
const screenshotRoot = path.join(outputRoot, 'screenshots');
const sourcePath = path.join(root, 'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db');
const expectedHash = '2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a';
const base = process.env.V8_WEB_URL || 'http://localhost:8123';

if (fs.existsSync(outputRoot)) throw new Error(`Refusing to overwrite V8 artifacts: ${outputRoot}`);
if (!fs.existsSync(sourcePath)) throw new Error(`Pinned local dictionary fixture not found: ${sourcePath}`);
const sourceBytes = fs.readFileSync(sourcePath);
const sourceHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
if (sourceHash !== expectedHash) throw new Error(`Dictionary fixture hash mismatch: ${sourceHash}`);
fs.mkdirSync(screenshotRoot, { recursive: true });

const captures = [];
const failures = [];
const knownDevelopmentWarnings = [];
let interceptedDictionaryLoads = 0;
let browser;
let context;
let page;

async function capture(name, note) {
  const file = `${String(captures.length + 1).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(screenshotRoot, file), fullPage: true, animations: 'disabled', caret: 'hide', timeout: 120000 });
  captures.push({
    file,
    route: `${new URL(page.url()).pathname}${new URL(page.url()).search}`,
    name,
    note,
    platform: `Expo Web / mobile viewport ${page.viewportSize().width}×${page.viewportSize().height} CSS px / DPR 2; not an Android screenshot`,
    dataProfile: 'Fresh isolated Playwright context; local disposable learner DB; no personal data',
    sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(screenshotRoot, file))).digest('hex'),
  });
  console.log(`CAPTURE ${file}`);
}

async function go(route) {
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const startup = page.getByText('Đang mở dữ liệu học offline', { exact: true });
  if (await startup.count()) await startup.waitFor({ state: 'detached', timeout: 120000 });
  await page.waitForTimeout(700);
}

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
  await context.route('**/dictionary_en_vi.db', async (route) => {
    interceptedDictionaryLoads += 1;
    await route.fulfill({ status: 200, contentType: 'application/octet-stream', body: sourceBytes, headers: { 'access-control-allow-origin': '*' } });
  });
  page = await context.newPage();
  page.on('pageerror', (error) => failures.push({ type: 'pageerror', message: error.stack || error.message }));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const detail = message.text();
    if (/React does not recognize the `accessibilityElementsHidden` prop/i.test(detail)) {
      knownDevelopmentWarnings.push({ type: 'React Native Web compatibility warning', message: detail });
    } else {
      failures.push({ type: 'console', message: detail });
    }
  });

  await go('/(tabs)/profile');
  const englishOption = page.getByRole('radio', { name: 'Chọn học Tiếng Anh' });
  if ((await englishOption.getAttribute('aria-checked')) !== 'true') {
    await englishOption.click();
    await page.waitForFunction(() => document.body.innerText.includes('Đã lưu lựa chọn ngôn ngữ trên thiết bị.'), null, { timeout: 30000 });
  }

  await page.getByRole('tab', { name: 'Trang chủ' }).click();
  await page.getByRole('button', { name: 'Tra từ tiếng Anh hoặc nghĩa tiếng Việt' }).waitFor({ state: 'visible', timeout: 30000 });
  const homePreview = page.getByRole('button', { name: 'Chuyển chế độ xem thử nghiệm dữ liệu đầy đủ' });
  if (await homePreview.count()) await homePreview.click();
  await page.waitForTimeout(400);
  await capture('home-preview', 'English home with isolated in-memory preview fixtures.');
  await page.getByRole('button', { name: 'Tra từ tiếng Anh hoặc nghĩa tiếng Việt' }).click();
  await capture('quick-dictionary-empty', 'Quick Dictionary opened from Home; no card is created.');
  const dictionaryInput = page.getByRole('textbox', { name: 'Tra từ tiếng Anh hoặc nghĩa tiếng Việt' });
  await dictionaryInput.fill('bank');
  await page.getByRole('button', { name: /bank/ }).first().waitFor({ state: 'visible', timeout: 120000 });
  await page.waitForTimeout(500);
  await capture('dictionary-search-results', 'Exact English lookup returns bounded source-backed results.');
  await page.getByRole('button', { name: /bank/ }).first().click();
  await page.getByRole('button', { name: /Chọn nghĩa phù hợp trong/ }).waitFor({ state: 'visible', timeout: 30000 });
  await capture('dictionary-multi-sense-entry', 'Multi-sense result presents an explicit sense-choice action.');
  await page.getByRole('button', { name: /Chọn nghĩa phù hợp trong/ }).click();
  await page.waitForTimeout(300);
  await capture('dictionary-sense-picker', 'Sense picker shown before any save action.');
  await page.getByRole('radio', { name: /^Danh từ:/ }).first().click();
  await page.getByRole('button', { name: 'Chọn nghĩa này' }).click();
  await capture('dictionary-selected-vi', 'An explicit source sense is selected; existing learner data is not overwritten.');
  await page.getByRole('button', { name: 'Đóng' }).first().click({ force: true });

  await go('/vocabulary?preview=true');
  await capture('vocabulary-hub-preview', 'Existing English vocabulary hub with non-persistent QA fixtures.');
  await go('/english-speaking');
  await capture('speaking', 'English practice scenarios; Web transcription support is disclosed.');
  await page.getByRole('button', { name: 'Thử nói câu này' }).click();
  await page.getByText(/Bản Web không kiểm tra nhận dạng trên thiết bị/).waitFor({ state: 'visible', timeout: 30000 });
  await capture('speaking-web-fallback', 'Web does not request microphone transcription and explains native-only behavior.');
  await go('/explore');
  await capture('explore', 'Links to real shipped destinations and honest unavailable-content notes.');
  await go('/entertainment');
  await capture('word-chain-ready', 'Local game ready state; no learner records changed.');
  await page.getByRole('button', { name: 'Bắt đầu chơi' }).click();
  await page.getByLabel('Từ tiếp theo trong trò chơi Word Chain').waitFor({ state: 'visible', timeout: 120000 });
  await capture('word-chain-active', 'Game start word is selected from the local English–Vietnamese dictionary.');
  await go('/english/profile');
  await capture('english-profile', 'Local goals and self-described level; no forced onboarding or certification claim.');
  await page.getByRole('button', { name: 'Lưu tùy chọn' }).click();
  await page.getByText(/Đã lưu lựa chọn tiếng Anh trên thiết bị/).waitFor({ state: 'visible', timeout: 30000 });
  await capture('english-profile-saved', 'Profile preference save confirmed in disposable local data.');
  await go('/english/reader?preview=true');
  await capture('reader-preview', 'Existing personal Reader preview; quick lookup is separately available.');
  await page.getByLabel(/^Tra từ cá nhân:/).first().click();
  await page.getByRole('button', { name: 'Tra từ điển Anh–Việt · chọn nghĩa chính xác' }).waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('button', { name: 'Tra từ điển Anh–Việt · chọn nghĩa chính xác' }).click();
  await capture('reader-quick-dictionary', 'Reader opens source dictionary as a separate explicit action; it does not auto-save.');
  await page.getByRole('button', { name: 'Đóng' }).first().click({ force: true });
  await go('/english/review?quick=1&preview=true');
  await capture('flashcard-review-preview', 'Review preview data; actions are isolated from learner history.');
  await page.getByRole('button', { name: 'Cài đặt flashcard' }).click();
  await capture('flashcard-settings', 'Actual shuffle/autoplay options; no automatic grade/advance.');
  await page.getByRole('button', { name: 'Đóng' }).first().click({ force: true });
  await page.getByRole('button', { name: /Tra từ điển:/ }).click();
  await capture('review-quick-dictionary', 'Review opens dictionary without recording a grade or changing SRS.');
  await page.getByRole('button', { name: 'Đóng' }).first().click({ force: true });
  await go('/english/decks');
  await capture('personal-decks', 'Existing local English deck manager, including sharing/import entry points.');
  await page.getByRole('button', { name: 'Thêm bộ từ của bạn bè' }).click();
  await capture('friend-deck-code-entry', 'Existing Supabase share/import code entry, not a live backend transaction.');
  await go('/english/bulk');
  await page.getByLabel('Tên bộ từ muốn học').fill('V8 QA · disposable');
  await page.getByLabel('Danh sách từ tiếng Anh, mỗi dòng một từ').fill('hello\nbank\nnotawordzz');
  await page.getByRole('button', { name: 'Nhận diện từ' }).click();
  await page.getByTestId('english-bulk-preview-list').waitFor({ state: 'visible', timeout: 120000 });
  await capture('bulk-recognition-preview', 'Recognition results remain a reviewable draft; no cards are saved.');
  await page.getByRole('button', { name: /Bỏ notawordzz khỏi danh sách/ }).click();
  await capture('bulk-review-exclusion', 'An unsuitable dictionary miss is excluded before the explicit save step.');

  await go('/english/word?word=shorts');
  await capture('word-detail-shorts', 'Source-backed word detail; missing English definitions and regional IPA are not invented.');
  await go('/english/review?quick=1&preview=true');
  await page.getByRole('button', { name: 'Hiện đáp án và nghĩa đã lưu' }).click();
  await capture('flashcard-back', 'Revealed selected learner meaning and explicit self-assessment actions.');
  await page.getByRole('button', { name: 'Đã nhớ từ này' }).click();
  await page.getByRole('button', { name: 'Hiện đáp án và nghĩa đã lưu' }).waitFor();
  await page.getByRole('button', { name: 'Hiện đáp án và nghĩa đã lưu' }).click();
  await page.getByRole('button', { name: 'Chưa nhớ từ này' }).click();
  await page.getByRole('button', { name: 'Hiện đáp án và nghĩa đã lưu' }).waitFor();
  await page.getByRole('button', { name: 'Hiện đáp án và nghĩa đã lưu' }).click();
  await page.getByRole('button', { name: 'Đã nhớ từ này' }).click();
  await page.getByTestId('english-review-complete').waitFor();
  await capture('review-completion-preview', 'One completed preview session; no result written to production or learner fixtures.');
  await go('/english/review?quick=1&preview=true&mode=SPELLING');
  await page.getByLabel('Nhập từ hoặc cụm tiếng Anh chính xác').fill('wronganswer');
  await page.getByRole('button', { name: 'Kiểm tra chính tả' }).click();
  await page.getByText(/Chính tả chưa đúng/).waitFor();
  await capture('spelling-incorrect-preview', 'Incorrect answer feedback in an isolated non-persistent exercise preview.');

  await go('/english/onboarding');
  await capture('onboarding-goal', 'Optional English setup starts without forcing existing Chinese users.');
  await page.getByRole('radio', { name: 'Công việc', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await capture('onboarding-self-level', 'Self-described level, clearly separated from CEFR assessment.');
  await page.getByRole('radio', { name: 'Trung cấp', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await capture('onboarding-topics', 'Multiple topic choices with checkbox semantics.');
  await page.getByRole('checkbox', { name: 'Công nghệ', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await capture('onboarding-daily-goal', 'Daily-minute goal does not modify the SRS schedule.');
  await page.getByRole('radio', { name: '15 phút', exact: true }).click();
  await page.getByRole('button', { name: 'Hoàn tất và vào trang chủ' }).click();
  await page.getByRole('button', { name: 'Tra từ tiếng Anh hoặc nghĩa tiếng Việt' }).waitFor();
  await capture('english-home-empty-real', 'Fresh English Home after optional setup; no mock counts and no Chinese onboarding redirect.');

  await go('/entertainment');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Bắt đầu chơi' }).click();
  const chainInput = page.getByLabel('Từ tiếp theo trong trò chơi Word Chain');
  await chainInput.waitFor({ state: 'visible', timeout: 120000 });
  await chainInput.fill('123');
  await page.getByRole('button', { name: 'Nối từ' }).click();
  await page.getByText('Chỉ dùng một từ tiếng Anh gồm chữ cái A–Z.').waitFor();
  await capture('word-chain-invalid-input', 'Invalid input is rejected without changing score or learner progress.');
  const chainDictionary = new DatabaseSync(sourcePath, { readOnly: true });
  const used = new Set();
  let firstGuess;
  for (let turn = 0; turn < 10 && await chainInput.count(); turn += 1) {
    const current = (await page.getByTestId('english-word-chain-current').innerText()).trim().toLowerCase();
    used.add(current);
    if (turn === 1) {
      await chainInput.fill(firstGuess);
      await page.getByRole('button', { name: 'Nối từ' }).click();
      await page.getByText('Từ này đã được dùng trong ván.').waitFor();
      await capture('word-chain-repeated-word', 'A previously played word is rejected.');
    }
    const rows = chainDictionary.prepare(`SELECT w.word FROM words w WHERE w.lang_code='en' AND w.word LIKE ? COLLATE NOCASE AND length(w.word)>=3 AND EXISTS (SELECT 1 FROM word_definitions wd JOIN definitions d ON d.id=wd.definition_id WHERE wd.word_id=w.id AND d.definition_lang='vi') ORDER BY w.word COLLATE NOCASE LIMIT 180`).all(`${current.at(-1)}%`);
    const candidate = rows.map(row => row.word.toLowerCase()).find(word => /^[a-z]+$/.test(word) && !used.has(word));
    if (!candidate) throw new Error(`No valid QA word for ${current}`);
    firstGuess ||= candidate;
    used.add(candidate);
    await chainInput.fill(candidate);
    await page.getByRole('button', { name: 'Nối từ' }).click();
    await page.waitForFunction((oldWord) => document.querySelector('[data-testid="english-word-chain-current"]')?.textContent?.trim().toLowerCase() !== oldWord, current, { timeout: 30000 });
  }
  chainDictionary.close();
  await page.getByRole('button', { name: 'Chơi lại' }).waitFor();
  await capture('word-chain-result', 'Completed dictionary-validated game with browser networking disabled; score stays within the game.');
  await context.setOffline(false);

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 915 });
    await go('/english/onboarding');
    await capture(`onboarding-${width}dp`, `Responsive Web check at ${width}px CSS width; Android font-scale checks are separate.`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) failures.push({ type: 'horizontal-overflow', width, route: '/english/onboarding' });
  }
  await page.setViewportSize({ width: 412, height: 915 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await go('/entertainment');
  await capture('word-chain-dark', 'System dark-theme rendering on Web; native dark capture is separate.');

  const contactSheetFiles = [];
  for (let offset = 0; offset < captures.length; offset += 6) {
    const group = captures.slice(offset, offset + 6);
    const cards = group.map((item) => {
      const data = fs.readFileSync(path.join(screenshotRoot, item.file)).toString('base64');
      return `<figure><img src="data:image/png;base64,${data}"/><figcaption>${item.file}<br/>${item.note}</figcaption></figure>`;
    }).join('');
    const sheetPage = await context.newPage();
    await sheetPage.setViewportSize({ width: 1600, height: 1200 });
    await sheetPage.setContent(`<!doctype html><meta charset="utf-8"><title>V8 contact sheet ${offset / 6 + 1}</title><style>body{font-family:Arial,sans-serif;background:#f3f5fa;color:#172033;margin:24px}h1{font-size:26px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}figure{margin:0;padding:12px;background:white;border:1px solid #dce2ef;border-radius:16px;box-shadow:0 3px 10px #17203318}img{display:block;width:100%;height:470px;object-fit:contain;background:#eef2f8;border-radius:10px}figcaption{padding:10px 2px 2px;line-height:1.4;font-size:13px}</style><h1>4Chinese V8 — English UI · Expo Web 412×915 · sheet ${offset / 6 + 1}</h1><main>${cards}</main>`, { waitUntil: 'load', timeout: 120000 });
    const file = `contact-sheet-${String(offset / 6 + 1).padStart(2, '0')}.png`;
    await sheetPage.screenshot({ path: path.join(outputRoot, file), fullPage: true, animations: 'disabled', timeout: 120000 });
    contactSheetFiles.push(file);
    await sheetPage.close();
  }

  const manifest = {
    version: 'V8',
    createdAt: new Date().toISOString(),
    reference: 'artifacts/4english-device-qa-2026-10-12 (observational only; sensitive captures not copied)',
    platform: 'Expo Web, mobile viewport 412x915 CSS px, DPR 2. Not Android/native.',
    fixture: { kind: 'fresh isolated browser context', dictionarySha256: sourceHash, dictionaryLoadsIntercepted: interceptedDictionaryLoads, learnerData: 'disposable; destroyed when the browser context closes' },
    screenshots: captures,
    contactSheets: contactSheetFiles,
    knownDevelopmentWarnings,
    runtimeIssues: failures,
  };
  fs.writeFileSync(path.join(outputRoot, 'capture-manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  const cards = captures.map((item) => `<article><a href="screenshots/${item.file}"><img src="screenshots/${item.file}" alt="${item.name}"/></a><h2>${item.name}</h2><p>${item.note}</p><code>${item.route}</code><small>${item.platform}</small></article>`).join('');
  const sheets = contactSheetFiles.map((file) => `<a href="${file}">${file}</a>`).join(' · ');
  fs.writeFileSync(path.join(outputRoot, 'index.html'), `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>4Chinese V8 English UI QA</title><style>body{font:16px/1.5 system-ui;background:#f3f5fa;color:#172033;margin:24px}h1{font-size:28px}header{padding:18px;background:white;border-radius:18px;margin-bottom:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px}article{background:white;padding:12px;border:1px solid #dce2ef;border-radius:18px}img{width:100%;height:520px;object-fit:contain;background:#edf1f7;border-radius:10px}h2{font-size:18px;margin:8px 0 2px}p{margin:4px 0 10px}small{display:block;color:#596579}code{font-size:12px}</style><header><h1>4Chinese V8 — English UI QA</h1><p>Expo Web / 412×915 CSS px / fresh isolated browser context. These captures are not Android screenshots and contain no personal data.</p><p>Contact sheets: ${sheets}</p><p>Dictionary fixture SHA-256: ${sourceHash}; lookup load interceptions: ${interceptedDictionaryLoads}.</p></header><main>${cards}</main></html>`, { flag: 'wx' });
  const qa = `# V8 visual QA capture report\n\n- Date: ${new Date().toISOString()}\n- Result: ${captures.length} named Expo Web captures created; see capture-manifest.json for per-screen notes and hashes.\n- Platform: mobile viewport 412×915 CSS px, DPR 2. This is not Android/native evidence.\n- Data: isolated disposable browser context; pinned read-only dictionary fixture SHA-256 ${sourceHash}; no personal learner data.\n- Runtime page/console errors: ${failures.length}.\n- Reference images: not included.\n- Native status: see ../../docs/V8_ANDROID_QA.md (ADB authorization and Gradle distribution download blocked).\n\nCaptures:\n${captures.map((item) => `- ${item.file}: ${item.note}`).join('\n')}\n`;
  fs.writeFileSync(path.join(outputRoot, 'QA_REPORT.md'), qa, { flag: 'wx' });
  fs.writeFileSync(path.join(outputRoot, 'README.md'), `# 4Chinese V8 English QA artifacts\n\nOpen [index.html](index.html) to browse all captured screens. PNG files are mobile Expo Web evidence from a clean, isolated profile—not screenshots from Android or the user's phone. The contact sheets are previews; originals and SHA-256 hashes are recorded in capture-manifest.json. No 4English reference capture, private profile image, learner data, or raw source DB is included in this folder.\n`, { flag: 'wx' });
  console.log(JSON.stringify({ outputRoot, screenshots: captures.length, contactSheets: contactSheetFiles.length, errors: failures.length, knownDevelopmentWarnings: knownDevelopmentWarnings.length, dictionaryLoadsIntercepted: interceptedDictionaryLoads }, null, 2));
  await context.close();
  await browser.close();
  if (failures.length) process.exitCode = 2;
}

run().catch(async (error) => {
  console.error(error);
  if (page && !page.isClosed()) {
    try {
      await page.screenshot({ path: path.join(outputRoot, 'failed-state.png'), timeout: 15000 });
      fs.writeFileSync(path.join(outputRoot, 'failed-state.json'), JSON.stringify({ url: page.url(), text: await page.locator('body').innerText(), error: error.message }, null, 2));
    } catch {}
  }
  try { await context?.close(); } catch {}
  try { await browser?.close(); } catch {}
  process.exitCode = 1;
});
