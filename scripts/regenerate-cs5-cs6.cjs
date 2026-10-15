const fs = require('node:fs');
const path = require('node:path');

const pwPath = 'C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright';
const { chromium } = require(pwPath);

const ARTIFACTS_ROOT = path.resolve(__dirname, '../artifacts/english-ui-v7-1');
const BEFORE_DIR = path.join(ARTIFACTS_ROOT, 'before');
const AFTER_DIR = path.join(ARTIFACTS_ROOT, 'after');
const CS_DIR = path.join(ARTIFACTS_ROOT, 'contact-sheets');

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const csContext = await browser.newContext({
    viewport: { width: 920, height: 1000 },
    deviceScaleFactor: 2,
  });
  const csPage = await csContext.newPage();

  const toDataUrl = (filePath) => {
    if (!fs.existsSync(filePath)) return '';
    const buf = fs.readFileSync(filePath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  };

  const sheets = [
    {
      id: 'cs-05-bulk-comparison',
      title: 'Bulk Add — Before (Build 42) vs After (V7.1 4-Step Flow)',
      description: 'Guided 4-step wizard with format helper toggle, syntax check list, and parsed card preview cards.',
      before: path.join(BEFORE_DIR, '016-english-bulk-entry-01-top.png'),
      after: path.join(AFTER_DIR, '010-english-bulk-step1-input.png'),
    },
    {
      id: 'cs-06-review-comparison',
      title: 'English Review — Before (Build 42) vs After (V7.1 SRS Flashcards)',
      description: 'Replaced wall of text with illustrated empty state and lively flashcard surface with phonetic IPA and audio.',
      before: path.join(BEFORE_DIR, '017-english-review-meaning-01-top.png'),
      after: path.join(AFTER_DIR, '014-english-review-meaning-question.png'),
    },
  ];

  for (const cs of sheets) {
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
    console.log(`Regenerated contact sheet: ${cs.id}.png`);
  }

  await browser.close();
  console.log('Regeneration complete!');
}

run().catch(console.error);
