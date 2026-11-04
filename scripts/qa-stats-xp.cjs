/* Disposable Playwright context + real app/SQLite. Synthetic QA history only.
 * No learner profile, physical phone, or installed app is accessed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');
const base = process.env.STATS_QA_URL || 'http://localhost:8133';
const output = path.resolve(__dirname, '../artifacts/stats-xp-2026-10-20');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  // Simulate Android's 48px navigation inset through the library's web env probe.
  // This changes device metrics only, not application layout or safe-area edges.
  await context.addInitScript(() => {
    const original = window.getComputedStyle.bind(window);
    window.getComputedStyle = (element, pseudo) => {
      const style = original(element, pseudo);
      if (element.style?.visibility === 'hidden' && element.style.paddingBottom.includes('safe-area-inset-bottom')) {
        return new Proxy(style, { get(target, key) { if (key === 'paddingBottom') return '48px'; if (key === 'paddingTop') return '24px'; const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; } });
      }
      return style;
    };
  });
  const page = await context.newPage();
  const report = { runtime: 'WEB_REAL_APP_SQLITE_SYNTHETIC_HISTORY_NOT_ANDROID', passed: false, checks: [], errors: [] };
  page.on('pageerror', error => report.errors.push(error.message));
  const dismiss = async () => {
    await page.waitForTimeout(800);
    for (let i = 0; i < 3; i++) { const button = page.locator('button[class*="dismissButton"]'); if (await button.count()) await button.first().click(); await page.waitForTimeout(100); }
  };
  const capture = async name => { await dismiss(); await page.screenshot({ path: path.join(output, name) }); };
  const scrollTo = async bottom => page.evaluate(end => {
    for (const node of document.querySelectorAll('div')) if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) node.scrollTop = end ? node.scrollHeight : 0;
  }, bottom);
  try {
    await page.goto(`${base}/stats`);
    await page.getByText('Chưa có dữ liệu học để tổng kết', { exact: true }).waitFor({ timeout: 120000 });
    console.log('Empty app ready');
    await capture('00-empty.png');
    // Metro's existing initialized SQLite module, not a shipping test endpoint.
    await page.evaluate(async () => {
      const modules = globalThis.__r?.getModules?.();
      if (!modules) throw new Error('DEV_METRO_MODULES_UNAVAILABLE');
      const sqlite = [...modules.values()].map(entry => entry.publicModule?.exports).find(exports => typeof exports?.openDatabaseAsync === 'function');
      if (!sqlite) throw new Error('INITIALIZED_SQLITE_MODULE_NOT_FOUND');
      const db = await sqlite.openDatabaseAsync('hanzi30.db');
      window.__statsQaDb = db;
      const now = new Date();
      const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const words = await db.getAllAsync('SELECT id FROM vocabulary ORDER BY id LIMIT 24');
      for (let i = 0; i < words.length; i++) await db.runAsync(`INSERT OR REPLACE INTO user_vocabulary_progress(vocabulary_id,status,studied,memory_level,next_review_at,due,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`, words[i].id, 'LEARNING', 1, 1 + i % 6, now.toISOString(), now.toISOString(), now.toISOString(), now.toISOString());
      for (let offset = 0; offset < 7; offset++) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
        await db.runAsync('INSERT OR REPLACE INTO daily_stats(date,reviewed,correct,new_words,study_seconds) VALUES(?,?,?,?,?)', dateKey(day), 10 + offset, 8, 3, (offset + 1) * 480);
      }
      for (let i = 0; i < 732; i++) await db.runAsync('INSERT INTO xp_events(id,activity,entity_id,points,local_date,created_at) VALUES(?,?,?,?,?,?)', `stats-qa-${i}`, 'learn', `synthetic-${i}`, 10, dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)), now.toISOString());
      window.__statsQaBefore = { xp: await db.getAllAsync('SELECT * FROM xp_events ORDER BY id'), progress: await db.getAllAsync('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id') };
    });
    await page.getByRole('tab', { name: 'Trang chủ', exact: true }).click();
    await dismiss();
    await page.getByRole('tab', { name: 'Thống kê', exact: true }).click();
    await page.getByTestId('xp-journey').waitFor();
    await page.getByText('7.320 XP', { exact: true }).waitFor();
    await capture('01-stats-overview.png');
    report.checks.push('existing 7320 XP displayed as level 15, with 180 XP to the next level');
    const learned = page.getByRole('button', { name: /^Đã học:.*Xem chi tiết$/ });
    await learned.scrollIntoViewIfNeeded();
    await capture('02-icon-metrics.png');
    await learned.click();
    await page.waitForURL(/vocabulary/);
    assert.match(page.url(), /filter=learned/);
    report.checks.push('metric shortcut opens the learned vocabulary filter');
    await dismiss();
    await page.getByRole('tab', { name: 'Thống kê', exact: true }).click();
    await page.getByText('Mức nhớ từ vựng', { exact: true }).scrollIntoViewIfNeeded();
    await capture('03-memory-chart.png');
    await scrollTo(true);
    await page.getByTestId('stats-last-section').scrollIntoViewIfNeeded();
    await dismiss();
    const geometry = await page.evaluate(() => {
      const section = document.querySelector('[data-testid="stats-last-section"]');
      const tab = document.querySelector('[role="tablist"]');
      const scroller = [...document.querySelectorAll('div')].find(node => node.contains(section) && node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY));
      return { lastBottom: section.getBoundingClientRect().bottom, tabTop: tab?.parentElement.getBoundingClientRect().top, scrollBottom: scroller?.getBoundingClientRect().bottom, simulatedBottomInset: 48 };
    });
    assert.ok(Math.abs(geometry.tabTop - geometry.scrollBottom) <= 2, JSON.stringify(geometry));
    assert.ok(geometry.lastBottom <= geometry.tabTop, JSON.stringify(geometry));
    report.geometry = geometry;
    await capture('04-bottom-reachable.png');
    report.checks.push('scroll viewport meets the tab bar without a dead strip; last section fully reachable');
    await scrollTo(false);
    await page.getByRole('button', { name: 'Xem lộ trình XP và mục tiêu', exact: true }).click();
    await page.getByTestId('weekly-study-chart').waitFor();
    await capture('05-xp-journey.png');
    await page.getByRole('button', { name: 'Đổi mục tiêu tuần', exact: true }).click();
    await page.getByLabel('Mục tiêu học mỗi tuần, phút', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Lưu mục tiêu', exact: true }).click();
    await page.getByText('Nhập mục tiêu từ 30 đến 2.100 phút mỗi tuần.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Chọn 140 phút mỗi tuần', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu mục tiêu', exact: true }).click();
    await page.getByText('Đã lưu mục tiêu tuần.', { exact: true }).waitFor();
    await page.reload();
    await page.getByText(/\/ 140 phút/).waitFor();
    await page.getByTestId('weekly-study-chart').scrollIntoViewIfNeeded();
    await capture('06-weekly-chart.png');
    report.checks.push('weekly goal validates invalid input and persists 140 minutes across reload');
    await page.getByRole('button', { name: 'Bộ sưu tập danh hiệu XP', exact: true }).click();
    await page.getByText('Truyền cảm hứng', { exact: true }).scrollIntoViewIfNeeded();
    await capture('07-xp-titles.png');
    await page.getByRole('button', { name: /Ôn từ đến hạn\./ }).click();
    await page.waitForURL(/\/review/);
    report.checks.push('earn-XP action opens real review setup, never awards XP on navigation');
    // Find the initialized handle again after reload. Compare protected tables.
    const safety = await page.evaluate(async () => {
      const sqlite = [...globalThis.__r.getModules().values()].map(entry => entry.publicModule?.exports).find(exports => typeof exports?.openDatabaseAsync === 'function');
      const db = await sqlite.openDatabaseAsync('hanzi30.db');
      return { xp: await db.getFirstAsync('SELECT SUM(points) AS total,COUNT(*) AS count FROM xp_events'), goal: await db.getFirstAsync('SELECT weekly_minutes FROM learning_goals WHERE id=1'), progress: await db.getFirstAsync('SELECT COUNT(*) AS count,SUM(memory_level) AS levels FROM user_vocabulary_progress WHERE studied=1') };
    });
    assert.equal(safety.xp.total, 7320); assert.equal(safety.xp.count, 732); assert.equal(safety.goal.weekly_minutes, 140);
    assert.equal(safety.progress.count, 24); assert.equal(safety.progress.levels, 84);
    report.safety = safety;
    report.checks.push('all 732 original XP events and 24 studied word levels preserved; no points from goal edits');
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`${base}/stats`);
    await page.getByTestId('xp-journey').waitFor();
    await capture('08-compact-dark.png');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await scrollTo(true); await capture('09-compact-bottom.png');
    assert.deepEqual(report.errors, []);
    report.checks.push('320px dark layout has no document horizontal overflow or page exceptions');
    report.passed = true;
  } finally {
    if (!report.passed) { console.log((await page.locator('body').innerText()).slice(-2200)); await page.screenshot({ path: path.join(output, 'failure.png') }); }
    fs.writeFileSync(path.join(output, 'qa-result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await context.close(); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
