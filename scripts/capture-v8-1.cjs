const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, process.env.V81_WEB_OUTPUT || 'artifacts/v8-1-english-2026-10-13/web');
if (fs.existsSync(out)) throw new Error('Do not overwrite QA captures');
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
const bytes = fs.readFileSync(path.join(root, 'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
if (sha(bytes) !== '2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a') throw new Error('Corpus changed');
const images = [], issues = [], timings = [];
let browser, context, page;
const base = process.env.V81_WEB_URL || 'http://127.0.0.1:8123';
async function capture(name, flow) {
  if (await page.getByText('Đang mở dữ liệu học offline', { exact: true }).isVisible().catch(() => false)) throw new Error('Loading screen is not acceptance evidence');
  const file = `${String(images.length + 1).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(out, 'screenshots', file), fullPage: true, animations: 'disabled', caret: 'hide', timeout: 60000 });
  images.push({ file, name, route: new URL(page.url()).pathname + new URL(page.url()).search, platform: 'Expo Web; NOT Android', device: 'MS Edge isolated mobile browser', viewport: page.viewportSize(), build: 'V8.1 source; app0.1.43/build45 debug', theme: await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), dataMode: 'DISPOSABLE_BROWSER + PINNED_READONLY_DICTIONARY_FIXTURE; original lessons DRAFT', flow, timestamp: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sha256: sha(fs.readFileSync(path.join(out, 'screenshots', file))) });
  console.log(`V8.1 CAPTURE ${file}`);
}
async function go(route, target) {
  const start = performance.now();
  if (page.url().startsWith(base)) {
    await page.evaluate(pathname => { history.pushState({}, '', pathname); dispatchEvent(new PopStateEvent('popstate', { state: {} })); }, route);
  } else await page.goto(base + route, { waitUntil: 'commit', timeout: 60000 });
  await target().waitFor({ state: 'visible', timeout: 300000 });
  timings.push({ route, millisecondsToTarget: +(performance.now() - start).toFixed(1), platform: 'DEV_WEB', includesNavigationAndStartup: true });
}
async function closeDictionary() { await page.getByRole('button', { name: 'Đóng', exact: true }).click(); }
async function openSearch(query) {
  await page.getByRole('button', { name: 'Tra từ tiếng Anh hoặc nghĩa tiếng Việt' }).click();
  await page.getByRole('textbox', { name: 'Tra từ tiếng Anh hoặc nghĩa tiếng Việt' }).fill(query);
}
async function selectSense() {
  await page.getByRole('button', { name: /Chọn nghĩa phù hợp trong/ }).click();
  await page.getByTestId('english-sense-list').getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Chọn nghĩa này', exact: true }).click();
}
async function run() {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce', locale: 'vi-VN' });
  await context.route('**/dictionary_en_vi.db', route => route.fulfill({ status: 200, contentType: 'application/octet-stream', body: bytes, headers: { 'access-control-allow-origin': '*' } }));
  page = await context.newPage();
  page.on('pageerror', error => issues.push(error.message));
  await go('/profile', () => page.getByRole('radio', { name: 'Chọn học Tiếng Anh' }));
  await page.getByRole('radio', { name: 'Chọn học Tiếng Anh' }).click();
  await page.getByText('Đã lưu lựa chọn ngôn ngữ trên thiết bị.', { exact: true }).waitFor();
  await capture('language-switch', 'English selected, existing settings screen');
  await go('/', () => page.getByRole('button', { name: 'Tra từ tiếng Anh hoặc nghĩa tiếng Việt' }));
  await capture('english-home', 'Real empty isolated learner state; no preview fixtures');
  await openSearch('learning');
  await page.getByRole('button', { name: /^learn learning/ }).waitFor({ timeout: 120000 });
  await capture('home-search-learning', 'Exact plus lemma; surface input remains learning');
  await closeDictionary();
  await openSearch('bank');
  await page.getByRole('button', { name: /^bank Mục từ/ }).click();
  await capture('quick-dictionary-bank', 'Ambiguity requires explicit sense selection');
  await page.getByRole('button', { name: /Chọn nghĩa phù hợp trong/ }).click();
  await page.getByTestId('english-sense-list').waitFor();
  await capture('sense-picker-bank', 'No automatic sense; compact source info');
  await page.getByTestId('english-sense-list').getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Chọn nghĩa này' }).click();
  await capture('dictionary-selected-sense', 'Selected source meaning; save disabled until deck exists');
  await closeDictionary();
  await go('/english/decks', () => page.getByLabel('Tên bộ từ tiếng Anh mới'));
  await page.getByLabel('Tên bộ từ tiếng Anh mới').fill('V8.1 QA deck');
  await page.getByRole('button', { name: 'Tạo bộ từ', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi tên bộ từ' }).waitFor();
  const deckRoute = new URL(page.url()).pathname;
  await capture('deck-detail', 'Real creation; one page title');
  await go('/english/reader?lesson=everyday-learning&draft=1', () => page.getByTestId('english-reader-reading-surface'));
  await capture('reading-article', 'Original article DRAFT, explicit preview URL; personal document not replaced');
  await page.getByLabel('Tra từ: learning', { exact: true }).click();
  await page.getByRole('button', { name: /^learn learning/ }).waitFor({ timeout: 120000 });
  await capture('reader-lookup-learning', 'Natural text token learning -> valid learn lemma');
  await page.getByRole('button', { name: /^learn learning/ }).click();
  await selectSense();
  await capture('reader-lemma-learn', 'Source verb senses selected explicitly');
  await page.getByRole('checkbox', { name: /Lưu dạng/ }).click();
  await page.getByRole('checkbox', { name: /Lưu câu này riêng/ }).click();
  await page.getByRole('button', { name: 'Lưu nghĩa này', exact: true }).click();
  await page.getByText(/Đã lưu “learning” vào bộ/).waitFor();
  await capture('reader-save-word-context', 'User consent + learning surface + selected learn sense saved atomically in notes');
  await closeDictionary();
  await page.getByTestId('english-reader-reading-surface').waitFor();
  await capture('reader-context-return', 'Modal closes on same Reader; text and scroll remain');
  for (const [surface, lemma] of [['went', 'go'], ['children', 'child'], ['better', 'good']]) {
    await page.getByLabel(`Tra từ: ${surface}`, { exact: true }).click();
    await page.getByRole('button', { name: new RegExp(`^${lemma} ${surface}`) }).waitFor();
    await capture(`reader-form-${surface}`, `${surface} -> ${lemma}; ambiguity preserved`);
    await closeDictionary();
  }
  await page.getByLabel('Tra từ: look', { exact: true }).click();
  await page.getByRole('button', { name: /^look up Mục từ/ }).waitFor();
  await capture('reader-phrasal-look-up', 'Adjacent phrase retained as source headword');
  await closeDictionary();
  await page.getByRole('button', { name: 'Two words', exact: true }).click();
  await page.getByText(/Đã đọc và trả lời câu hỏi/).waitFor();
  await capture('reading-question-complete', 'Completion from actual answer, not fake reading percentage');
  await go('/english/library', () => page.getByRole('button', { name: 'Xem bài thử chưa duyệt', exact: true }));
  await page.getByRole('button', { name: 'Xem bài thử chưa duyệt', exact: true }).click();
  await page.getByText('Learning a little every day', { exact: true }).waitFor();
  await capture('reading-library', 'Four original drafts; real saved completion shown');
  await go('/explore', () => page.getByRole('button', { name: 'Mở thư viện bài đọc →' }));
  await capture('explore-home', 'Reading library and dialogue entry points, no unlicensed fake catalog');
  await go('/english-speaking', () => page.getByRole('button', { name: 'Xem bài thử chưa duyệt', exact: true }));
  await capture('speaking-home', 'Published lesson gate; draft previews require an explicit action');
  await page.getByRole('button', { name: 'Xem bài thử chưa duyệt', exact: true }).click();
  await page.getByText('Meeting a new neighbour', { exact: true }).waitFor();
  await capture('conversation-list', 'Six draft conversations with real multiple turns');
  await page.getByRole('button', { name: /Meeting a new neighbour/ }).click();
  await page.getByRole('button', { name: 'Nghe mẫu từng lượt', exact: true }).waitFor();
  await capture('conversation-detail', 'Scenario, participants, duration estimate, modes');
  await page.getByRole('button', { name: 'Nghe mẫu từng lượt' }).click();
  await page.getByTestId('english-dialogue-turn').waitFor();
  await capture('speaking-listen-mode', 'First actual dialogue turn with token lookup');
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Đã nghe/xem · lượt tiếp' }).click();
  await page.getByTestId('english-dialogue-result').waitFor();
  await capture('speaking-result', 'Eight acknowledged turns, not invented listening accuracy');
  await page.getByRole('button', { name: 'Chọn hội thoại tiếp theo' }).click();
  await page.getByRole('button', { name: /Meeting a new neighbour/ }).click();
  await page.getByRole('button', { name: 'Nghe và nhắc lại' }).click();
  await page.getByRole('button', { name: 'Thử nói lượt này' }).click();
  await page.getByText('Web không kiểm thử nhận dạng native. Bạn có thể tự nói rồi tiếp tục.', { exact: true }).waitFor();
  await capture('speaking-repeat-mode', 'Honest Web unavailable fallback, no fake transcript');
  await page.getByRole('button', { name: 'Dừng và về danh sách' }).click();
  await page.getByRole('button', { name: /Meeting a new neighbour/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu hội thoại đóng vai' }).click();
  await page.getByTestId('english-dialogue-turn').waitFor();
  await capture('speaking-role-practice', 'Role A user turn, source script no scoring');
  await page.getByRole('button', { name: 'Đã tự luyện · lượt tiếp' }).click();
  await capture('speaking-role-app-turn', 'Role B app turn; device TTS requested, audio quality not proven by screenshot');
  await go('/entertainment', () => page.getByRole('button', { name: 'Bắt đầu chơi' }));
  await capture('word-chain-easy', 'Difficulty from curated source-checked candidate pool, not length');
  await page.getByRole('button', { name: 'Bắt đầu chơi' }).click();
  await page.getByTestId('english-word-chain-current').waitFor();
  await capture('word-chain-active', 'Actual familiar source word selected offline');
  await page.getByRole('button', { name: 'Kết thúc ván', exact: true }).click();
  await capture('word-chain-result', 'Explicit stop; encountered words can be looked up, no SRS writes');
  await go('/vocabulary', () => page.getByText('Kho từ tiếng Anh', { exact: true }));
  await page.getByText('Quản lý bộ', { exact: true }).waitFor();
  await capture('vocabulary-dashboard', 'One real saved contextual card, current learner state');
  await go(deckRoute, () => page.getByText('1 từ do bạn tự chọn', { exact: true }));
  await page.getByRole('button', { name: 'Chọn từ để học (0/1)', exact: true }).click();
  await page.getByTestId('english-new-word-card').waitFor();
  await capture('new-word-contextual', 'Saved surface learning with learner-selected source sense');
  await go('/english/review?preview=true', () => page.getByTestId('english-review-card'));
  await capture('flashcard-front', 'DEV_FIXTURE preview; no review writes');
  await page.getByRole('button', { name: 'Anh → Việt · đổi chiều' }).click();
  await capture('flashcard-vi-to-en', 'DEV_FIXTURE reverse front hides answer audio');
  await page.getByRole('button', { name: 'Hiện đáp án và nghĩa đã lưu' }).click();
  await capture('flashcard-revealed', 'DEV_FIXTURE, explicit reveal');
  await page.getByRole('button', { name: 'Đã nhớ từ này' }).click();
  await page.getByRole('button', { name: 'Chưa nhớ từ này' }).count().then(async count => { if (count) return; await page.getByRole('button', { name: 'Hiện đáp án và nghĩa đã lưu' }).click(); });
  await page.getByRole('button', { name: 'Chưa nhớ từ này' }).click();
  await capture('review-feedback', 'DEV_FIXTURE self assessment feedback, no production grade claim');
  await page.getByRole('button', { name: 'Hiện đáp án và nghĩa đã lưu' }).click();
  await page.getByRole('button', { name: 'Đã nhớ từ này' }).click();
  await page.getByTestId('english-review-complete').waitFor();
  await capture('review-complete', 'DEV_FIXTURE measured preview answers, persisted native review tested separately');
  await go('/english/profile', () => page.getByRole('button', { name: 'Lưu tùy chọn' }));
  await capture('english-profile', 'Existing preferences controls, no repeated title');
  await go('/english/onboarding', () => page.getByText('Bạn học tiếng Anh để làm gì?', { exact: true }));
  await capture('english-onboarding', 'Optional four-step setup');
  await go('/english/reader', () => page.getByRole('button', { name: /Bật chế độ thử nghiệm bài đọc có sẵn/ }));
  await capture('reader-home', 'Personal Reader retained, bundled lesson did not replace the document');
  await page.emulateMedia({ colorScheme: 'dark' });
  await go('/', () => page.getByRole('button', { name: 'Tra từ tiếng Anh hoặc nghĩa tiếng Việt' }));
  await capture('dark-home', 'System dark mode, isolated profile');
  await go('/english/reader?lesson=everyday-learning&draft=1', () => page.getByTestId('english-reader-reading-surface'));
  await capture('dark-reader', 'Dark original draft with saved progress');
  await go('/english-speaking', () => page.getByText('Luyện nói tiếng Anh', { exact: true }));
  await capture('dark-speaking', 'Dark speaking hub after real session');
  await page.emulateMedia({ colorScheme: 'light' });
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 915 });
    await go('/english/reader?lesson=everyday-learning&draft=1', () => page.getByTestId('english-reader-reading-surface'));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow) throw new Error(`Horizontal overflow ${width}`);
    await capture(`reader-${width}dp`, 'Web small-width sample, not native dp proof');
  }
  fs.writeFileSync(path.join(out, 'capture-manifest.json'), JSON.stringify({ screenshots: images, issues, timings, dictionarySha256: sha(bytes) }, null, 2));
  console.log(JSON.stringify({ screenshots: images.length, issues }));
  await context.close(); await browser.close();
  if (issues.length) throw new Error(issues.join('\n'));
}
run().catch(async error => {
  console.error(error.stack);
  fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ error: error.message, screenshots: images, issues }, null, 2));
  try { await page?.screenshot({ path: path.join(out, 'failed-state.png') }); } catch {}
  try { await context?.close(); await browser?.close(); } catch {}
  process.exitCode = 1;
});
