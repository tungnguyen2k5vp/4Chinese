const fs = require('node:fs');
const path = require('node:path');

const pwPath = 'C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright';
const { chromium } = require(pwPath);

const BASE_URL = 'http://localhost:8112';
const ARTIFACTS_ROOT = path.resolve(__dirname, '../artifacts/english-ui-v7-1');
const BEFORE_DIR = path.join(ARTIFACTS_ROOT, 'before');
const AFTER_DIR = path.join(ARTIFACTS_ROOT, 'after');
const DARK_DIR = path.join(ARTIFACTS_ROOT, 'dark');
const CS_DIR = path.join(ARTIFACTS_ROOT, 'contact-sheets');
const ORIGINAL_BEFORE_DIR = path.resolve(__dirname, '../artifacts/v7-2026-10-11/native-english-phone-build42');

[BEFORE_DIR, AFTER_DIR, DARK_DIR, CS_DIR].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Copy all 19 original before screenshots into BEFORE_DIR
if (fs.existsSync(ORIGINAL_BEFORE_DIR)) {
  const files = fs.readdirSync(ORIGINAL_BEFORE_DIR);
  for (const file of files) {
    if (file.endsWith('.png')) {
      fs.copyFileSync(path.join(ORIGINAL_BEFORE_DIR, file), path.join(BEFORE_DIR, file));
    }
  }
}

async function safeGoto(page, url) {
  await page.goto(url);
  try {
    const loader = page.getByText('Đang mở dữ liệu học offline');
    if (await loader.count() > 0) {
      await loader.waitFor({ state: 'detached', timeout: 45000 });
    }
  } catch (e) {
    // continue
  }
  await page.waitForTimeout(1000);
}

async function run() {
  console.log('Launching Edge headless browser...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // Mobile viewport matching modern device (390 x 844 at 2x DPR)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Realme RMX3085) AppleWebKit/537.36 4Chinese/0.1.40',
  });
  const page = await context.newPage();

  const capturedList = [];

  // ==========================================
  // INITIALIZATION: SWITCH TO ENGLISH MODE VIA SETTINGS
  // ==========================================
  console.log('0. Initializing: Opening Profile & selecting English mode...');
  await safeGoto(page, `${BASE_URL}/(tabs)/profile`);
  try {
    await page.getByText('Ngôn ngữ học tập').waitFor({ timeout: 40000 });
    const enSwitch = page.getByLabel('Chọn học Tiếng Anh');
    if (await enSwitch.count() > 0) {
      await enSwitch.click();
      await page.waitForTimeout(1200);
      console.log(' -> Switched to English mode.');
    }
  } catch (e) {
    console.log(' -> Notice during language switch init:', e.message);
  }

  // ==========================================
  // 1. ENGLISH HOME (ACTIVITY)
  // ==========================================
  console.log('1. Capturing English Home (Empty & Populated)...');
  await safeGoto(page, `${BASE_URL}/english/activity`);
  await page.getByText('Hôm nay học thêm tiếng Anh nhé').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1000);

  // 001 - Home empty
  try {
    await page.screenshot({ path: path.join(AFTER_DIR, '001-english-home-empty.png') });
    capturedList.push('001-english-home-empty.png');
    console.log(' -> Saved 001-english-home-empty.png');
  } catch (e) { console.error('Error 001:', e.message); }

  // 002 - Home populated demo
  try {
    await safeGoto(page, `${BASE_URL}/english/activity?preview=true`);
    await page.getByText('Hôm nay học thêm tiếng Anh nhé').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '002-english-home-populated.png') });
    capturedList.push('002-english-home-populated.png');
    console.log(' -> Saved 002-english-home-populated.png');
  } catch (e) { console.error('Error 002:', e.message); }

  // 003 - Home scroll
  try {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(AFTER_DIR, '003-english-home-scroll.png') });
    capturedList.push('003-english-home-scroll.png');
    console.log(' -> Saved 003-english-home-scroll.png');
  } catch (e) { console.error('Error 003:', e.message); }

  // ==========================================
  // 2. CEFR LEVELS
  // ==========================================
  console.log('2. Capturing CEFR Levels...');
  try {
    await safeGoto(page, `${BASE_URL}/(tabs)/hsk`);
    await page.getByText('Cấp độ tiếng Anh · CEFR').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '004-cefr-level-explorer-a1.png') });
    capturedList.push('004-cefr-level-explorer-a1.png');
    console.log(' -> Saved 004-cefr-level-explorer-a1.png');

    // Select B1 level
    const b1Tab = page.getByRole('tab', { name: /B1/i });
    if (await b1Tab.count() > 0) {
      await b1Tab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(AFTER_DIR, '005-cefr-level-explorer-b1.png') });
      capturedList.push('005-cefr-level-explorer-b1.png');
      console.log(' -> Saved 005-cefr-level-explorer-b1.png');
    }
  } catch (e) { console.error('Error CEFR:', e.message); }

  // ==========================================
  // 3. ENGLISH VOCABULARY HUB
  // ==========================================
  console.log('3. Capturing English Vocabulary Hub (Empty & Populated)...');
  try {
    await safeGoto(page, `${BASE_URL}/english`);
    await page.getByText('Kho từ tiếng Anh').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '006-english-vocabulary-empty.png') });
    capturedList.push('006-english-vocabulary-empty.png');
    console.log(' -> Saved 006-english-vocabulary-empty.png');

    // Populated demo
    await safeGoto(page, `${BASE_URL}/english?preview=true`);
    await page.getByText('Kho từ tiếng Anh').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '007-english-vocabulary-populated.png') });
    capturedList.push('007-english-vocabulary-populated.png');
    console.log(' -> Saved 007-english-vocabulary-populated.png');

    // Inline forms
    const createDeckBtn = page.getByRole('button', { name: /Tạo bộ từ/i }).first();
    if (await createDeckBtn.count() > 0) {
      await createDeckBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(AFTER_DIR, '008-english-vocabulary-create-deck.png') });
      capturedList.push('008-english-vocabulary-create-deck.png');
      console.log(' -> Saved 008-english-vocabulary-create-deck.png');
    }

    const addWordBtn = page.getByRole('button', { name: /Thêm từ thủ công/i });
    if (await addWordBtn.count() > 0) {
      await addWordBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(AFTER_DIR, '009-english-vocabulary-add-card.png') });
      capturedList.push('009-english-vocabulary-add-card.png');
      console.log(' -> Saved 009-english-vocabulary-add-card.png');
    }
  } catch (e) { console.error('Error Vocab:', e.message); }

  // ==========================================
  // 4. BULK ADD
  // ==========================================
  console.log('4. Capturing Bulk Add...');
  try {
    await safeGoto(page, `${BASE_URL}/english/bulk`);
    await page.getByRole('heading', { name: 'Thêm nhiều thẻ tiếng Anh' }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '010-english-bulk-step1-input.png') });
    capturedList.push('010-english-bulk-step1-input.png');
    console.log(' -> Saved 010-english-bulk-step1-input.png');

    // Sample format guide toggle
    const sampleGuideBtn = page.getByRole('button', { name: /Xem định dạng mẫu/i });
    if (await sampleGuideBtn.count() > 0) {
      await sampleGuideBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(AFTER_DIR, '011-english-bulk-sample-guide.png') });
      capturedList.push('011-english-bulk-sample-guide.png');
      console.log(' -> Saved 011-english-bulk-sample-guide.png');
    }

    // Fill sample rows and preview
    const bulkInput = page.locator('textarea').first();
    if (await bulkInput.count() > 0) {
      await bulkInput.fill("perseverance\tsự kiên trì, bền bỉ\nresilience\tkhả năng hồi phục nhanh\neloquent\thùng hồn, lưu loát");
      await page.waitForTimeout(400);
      const checkBtn = page.getByRole('button', { name: /Kiểm tra và xem trước thẻ/i });
      if (await checkBtn.count() > 0) {
        await checkBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(AFTER_DIR, '012-english-bulk-step2-preview.png') });
        capturedList.push('012-english-bulk-step2-preview.png');
        console.log(' -> Saved 012-english-bulk-step2-preview.png');
      }
    }
  } catch (e) { console.error('Error Bulk:', e.message); }

  // ==========================================
  // 5. REVIEW / SRS
  // ==========================================
  console.log('5. Capturing Review...');
  try {
    await safeGoto(page, `${BASE_URL}/english/review`);
    await page.getByText('Ôn tập Flashcard').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '013-english-review-empty.png') });
    capturedList.push('013-english-review-empty.png');
    console.log(' -> Saved 013-english-review-empty.png');

    // Active flashcard in demo mode
    await safeGoto(page, `${BASE_URL}/english/review?preview=true`);
    await page.getByText('Ôn tập Flashcard').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '014-english-review-meaning-question.png') });
    capturedList.push('014-english-review-meaning-question.png');
    console.log(' -> Saved 014-english-review-meaning-question.png');

    // Click reveal
    const revealBtn = page.getByRole('button', { name: /Hiện nghĩa tiếng Việt/i });
    if (await revealBtn.count() > 0) {
      await revealBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(AFTER_DIR, '015-english-review-meaning-revealed.png') });
      capturedList.push('015-english-review-meaning-revealed.png');
      console.log(' -> Saved 015-english-review-meaning-revealed.png');
    }

    // Spelling mode
    await safeGoto(page, `${BASE_URL}/english/review?mode=SPELLING&preview=true`);
    await page.getByText('LUYỆN CHÍNH TẢ', { exact: true }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '016-english-review-spelling.png') });
    capturedList.push('016-english-review-spelling.png');
    console.log(' -> Saved 016-english-review-spelling.png');
  } catch (e) { console.error('Error Review:', e.message); }

  // ==========================================
  // 6. READER
  // ==========================================
  console.log('6. Capturing Reader...');
  try {
    await safeGoto(page, `${BASE_URL}/english/reader`);
    await page.getByText('Đọc tiếng Anh cá nhân').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '017-english-reader-empty-landing.png') });
    capturedList.push('017-english-reader-empty-landing.png');
    console.log(' -> Saved 017-english-reader-empty-landing.png');

    // Reading view in demo mode
    await safeGoto(page, `${BASE_URL}/english/reader?preview=true`);
    await page.getByText('Đọc tiếng Anh cá nhân').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '018-english-reader-reading-view.png') });
    capturedList.push('018-english-reader-reading-view.png');
    console.log(' -> Saved 018-english-reader-reading-view.png');

    // Tap a word token for bottom sheet lookup
    const wordToken = page.getByRole('button', { name: /Tra từ: /i }).first();
    if (await wordToken.count() > 0) {
      await wordToken.click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(AFTER_DIR, '019-english-reader-word-lookup.png') });
      capturedList.push('019-english-reader-word-lookup.png');
      console.log(' -> Saved 019-english-reader-word-lookup.png');
    }
  } catch (e) { console.error('Error Reader:', e.message); }

  // ==========================================
  // 7. STATISTICS
  // ==========================================
  console.log('7. Capturing Statistics...');
  try {
    await safeGoto(page, `${BASE_URL}/(tabs)/stats`);
    await page.getByText('Thống kê tiếng Anh').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '020-english-statistics-empty.png') });
    capturedList.push('020-english-statistics-empty.png');
    console.log(' -> Saved 020-english-statistics-empty.png');

    // Populated demo
    await safeGoto(page, `${BASE_URL}/(tabs)/stats?preview=true`);
    await page.getByText('Thống kê tiếng Anh').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '021-english-statistics-populated.png') });
    capturedList.push('021-english-statistics-populated.png');
    console.log(' -> Saved 021-english-statistics-populated.png');
  } catch (e) { console.error('Error Stats:', e.message); }

  // ==========================================
  // 8. DECK MANAGEMENT & TRASH
  // ==========================================
  console.log('8. Capturing Deck Management...');
  try {
    await safeGoto(page, `${BASE_URL}/english/decks`);
    await page.getByRole('heading', { name: 'Quản lý bộ từ tiếng Anh' }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '022-english-deck-management.png') });
    capturedList.push('022-english-deck-management.png');
    console.log(' -> Saved 022-english-deck-management.png');
  } catch (e) { console.error('Error Decks:', e.message); }

  // ==========================================
  // 9. SETTINGS & LANGUAGE SWITCHER
  // ==========================================
  console.log('9. Capturing Language Settings...');
  try {
    await safeGoto(page, `${BASE_URL}/(tabs)/profile`);
    await page.getByText('Ngôn ngữ học tập').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(AFTER_DIR, '023-english-settings-language-switch.png') });
    capturedList.push('023-english-settings-language-switch.png');
    console.log(' -> Saved 023-english-settings-language-switch.png');
  } catch (e) { console.error('Error Settings:', e.message); }

  // ==========================================
  // 10. DARK MODE VARIANTS
  // ==========================================
  console.log('10. Capturing Dark Mode...');
  try {
    await page.emulateMedia({ colorScheme: 'dark' });

    await safeGoto(page, `${BASE_URL}/english/activity?preview=true`);
    await page.getByText('Hôm nay học thêm tiếng Anh nhé').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(DARK_DIR, '024-english-dark-home.png') });
    capturedList.push('024-english-dark-home.png');
    console.log(' -> Saved 024-english-dark-home.png');

    await safeGoto(page, `${BASE_URL}/english?preview=true`);
    await page.getByText('Kho từ tiếng Anh').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(DARK_DIR, '025-english-dark-vocabulary.png') });
    capturedList.push('025-english-dark-vocabulary.png');
    console.log(' -> Saved 025-english-dark-vocabulary.png');

    await safeGoto(page, `${BASE_URL}/english/review?preview=true`);
    await page.getByText('Ôn tập Flashcard').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(DARK_DIR, '026-english-dark-review.png') });
    capturedList.push('026-english-dark-review.png');
    console.log(' -> Saved 026-english-dark-review.png');

    await safeGoto(page, `${BASE_URL}/english/reader?preview=true`);
    await page.getByText('Đọc tiếng Anh cá nhân').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(DARK_DIR, '027-english-dark-reader.png') });
    capturedList.push('027-english-dark-reader.png');
    console.log(' -> Saved 027-english-dark-reader.png');

    await safeGoto(page, `${BASE_URL}/(tabs)/stats?preview=true`);
    await page.getByText('Thống kê tiếng Anh').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(DARK_DIR, '028-english-dark-statistics.png') });
    capturedList.push('028-english-dark-statistics.png');
    console.log(' -> Saved 028-english-dark-statistics.png');
  } catch (e) { console.error('Error Dark Mode:', e.message); }

  // ==========================================
  // 11. SIDE-BY-SIDE CONTACT SHEETS (BEFORE vs AFTER)
  // ==========================================
  console.log('11. Generating Contact Sheets...');
  await page.emulateMedia({ colorScheme: 'light' });

  const contactSheets = [
    {
      id: 'cs-01-home-comparison',
      title: 'English Home — Before (Build 42) vs After (V7.1 Redesign)',
      description: 'Replaced flat button stack with Hero card, Today’s Progress metrics, Quick sessions, and Mistake book.',
      before: path.join(BEFORE_DIR, '001-home-english-activity-01-top.png'),
      after: path.join(AFTER_DIR, '002-english-home-populated.png'),
    },
    {
      id: 'cs-02-cefr-comparison',
      title: 'CEFR Screen — Before (Build 42) vs After (V7.1 Level Explorer)',
      description: 'Replaced empty error notice with 6-level interactive journey explorer with honest curriculum status.',
      before: path.join(BEFORE_DIR, '003-cefr-levels-01-top.png'),
      after: path.join(AFTER_DIR, '004-cefr-level-explorer-a1.png'),
    },
    {
      id: 'cs-03-vocabulary-comparison',
      title: 'Vocabulary Hub — Before (Build 42) vs After (V7.1 Hub)',
      description: 'Replaced administrative button list with rich cards, deck metrics, quick actions, and inline forms.',
      before: path.join(BEFORE_DIR, '004-english-library-01-top.png'),
      after: path.join(AFTER_DIR, '007-english-vocabulary-populated.png'),
    },
    {
      id: 'cs-04-reader-comparison',
      title: 'English Reader — Before (Build 42) vs After (V7.1 Reader)',
      description: 'Separated landing onboarding from calm reading surface with font control & word-tap lookup bottom sheet.',
      before: path.join(BEFORE_DIR, '013-english-reader-01-top.png'),
      after: path.join(AFTER_DIR, '018-english-reader-reading-view.png'),
    },
    {
      id: 'cs-05-bulk-comparison',
      title: 'Bulk Add — Before (Build 42) vs After (V7.1 4-Step Flow)',
      description: 'Guided 4-step wizard with format helper toggle, syntax check list, and parsed card preview cards.',
      before: path.join(BEFORE_DIR, '016-english-bulk-entry-01-top.png'),
      after: path.join(AFTER_DIR, '012-english-bulk-step2-preview.png'),
    },
    {
      id: 'cs-06-review-comparison',
      title: 'English Review — Before (Build 42) vs After (V7.1 SRS Flashcards)',
      description: 'Replaced wall of text with illustrated empty state and lively flashcard reveal with audio and timer.',
      before: path.join(BEFORE_DIR, '017-english-review-meaning-01-top.png'),
      after: path.join(AFTER_DIR, '015-english-review-meaning-revealed.png'),
    },
    {
      id: 'cs-07-statistics-comparison',
      title: 'English Statistics — Before (Build 42) vs After (V7.1 Dashboard)',
      description: 'Replaced zero-stat text card with seedling growth illustration, metric grid, and XP spotlight.',
      before: path.join(BEFORE_DIR, '007-english-statistics-01-top.png'),
      after: path.join(AFTER_DIR, '021-english-statistics-populated.png'),
    },
    {
      id: 'cs-08-settings-comparison',
      title: 'Language Settings — Before (Build 42) vs After (V7.1 Card Switcher)',
      description: 'Isolated Chinese pinyin/tone settings from English, adding language cards and US/UK voice chips.',
      before: path.join(BEFORE_DIR, '008-account-language-settings-01-top.png'),
      after: path.join(AFTER_DIR, '023-english-settings-language-switch.png'),
    },
  ];

  const toDataUrl = (filePath) => {
    if (!fs.existsSync(filePath)) return '';
    const buf = fs.readFileSync(filePath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  };

  const csContext = await browser.newContext({
    viewport: { width: 920, height: 1000 },
    deviceScaleFactor: 2,
  });
  const csPage = await csContext.newPage();

  for (const cs of contactSheets) {
    const beforeData = toDataUrl(cs.before);
    const afterData = toDataUrl(cs.after);

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #0B0F19;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #F8FAFC;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .header { text-align: center; margin-bottom: 24px; max-width: 840px; }
        .title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 6px 0; color: #FFFFFF; }
        .desc { font-size: 13.5px; color: #94A3B8; margin: 0; line-height: 1.5; }
        .row { display: flex; gap: 24px; justify-content: center; width: 100%; max-width: 860px; }
        .col { flex: 1; display: flex; flex-direction: column; align-items: center; max-width: 400px; }
        .pill {
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .pill-old { background: #334155; color: #CBD5E1; border: 1px solid #475569; }
        .pill-new { background: #2563EB; color: #FFFFFF; border: 1px solid #3B82F6; box-shadow: 0 0 16px rgba(37,99,235,0.4); }
        .frame {
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          border: 2px solid #1E293B;
          background: #000000;
          box-shadow: 0 20px 30px rgba(0,0,0,0.6);
        }
        .frame img {
          width: 100%;
          height: auto;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${cs.title}</h1>
        <p class="desc">${cs.description}</p>
      </div>
      <div class="row">
        <div class="col">
          <div class="pill pill-old">BASELINE BUILD 42 (TRƯỚC)</div>
          <div class="frame">
            <img src="${beforeData}" alt="Before" />
          </div>
        </div>
        <div class="col">
          <div class="pill pill-new">V7.1 REDESIGN (SAU)</div>
          <div class="frame">
            <img src="${afterData}" alt="After" />
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    await csPage.setContent(html, { waitUntil: 'load' });
    await csPage.waitForTimeout(500);
    const csOutPath = path.join(CS_DIR, `${cs.id}.png`);
    await csPage.screenshot({ path: csOutPath, fullPage: true });
    console.log(`Generated contact sheet: ${cs.id}.png`);
  }

  await browser.close();
  console.log('Capture finished successfully. Total screenshots:', capturedList.length);

  // Generate manifest.json
  const manifest = {
    version: '7.1.0',
    date: new Date().toISOString(),
    totalCaptured: capturedList.length,
    viewport: '390x844 (2x DPR)',
    themeModes: ['light', 'dark'],
    capturedFiles: capturedList,
    contactSheets: contactSheets.map(c => `${c.id}.png`),
    note: 'Visual QA captured in headless browser matching mobile form factor. Zero database mutations.',
  };
  fs.writeFileSync(path.join(ARTIFACTS_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
