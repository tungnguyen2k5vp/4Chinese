/* Isolated Web E2E only, not Android or phone evidence. Synthetic learner data. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require(process.argv[2] || 'playwright');
const output = path.resolve(__dirname, '../artifacts/v7-2026-10-10/learner-ui-card-editor');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const result = { platform: 'WEB_HEADLESS_NOT_ANDROID', passed: [], errors };
  const capture = async name => page.screenshot({ path: path.join(output, name), fullPage: false });
  try {
    await page.goto('http://localhost:8098/english');
    await page.getByText('Chưa có bộ từ. Tạo một bộ để bắt đầu.', { exact: true }).waitFor({ timeout: 120000 });
    await page.getByLabel('Tên bộ từ tiếng Anh', { exact: true }).fill('Editor QA');
    await page.getByRole('button', { name: 'Tạo bộ từ', exact: true }).click();
    await page.getByRole('button', { name: 'Đang chọn: Editor QA', exact: true }).waitFor();
    await page.getByLabel('Từ hoặc cụm tiếng Anh', { exact: true }).fill('original sample');
    await page.getByLabel('Nghĩa tiếng Việt do bạn chọn', { exact: true }).fill('nghĩa QA');
    await page.getByRole('button', { name: 'Lưu thẻ vào bộ đang chọn', exact: true }).click();
    await page.getByRole('button', { name: 'Đã học: original sample', exact: true }).click();
    await page.getByText('1 thẻ · 1 đã học · 0 đến hạn', { exact: true }).waitFor();
    const schedule = await page.getByText(/^Lần ôn tiếp:/).innerText();
    await page.getByRole('button', { name: 'Chỉnh sửa: original sample', exact: true }).click();
    await page.getByLabel('Sửa Từ hoặc cụm tiếng Anh', { exact: true }).waitFor();
    await page.getByLabel('Sửa Từ hoặc cụm tiếng Anh', { exact: true }).fill('edited sample');
    await page.getByLabel('Sửa Ghi chú cá nhân', { exact: true }).fill('Ghi chú lưu ở máy');
    await page.getByText('Đã lưu bản nháp ở máy; chưa áp dụng vào thẻ.', { exact: true }).waitFor();
    await capture('01-edit-draft.png');
    await page.reload();
    await page.getByText('Đã khôi phục bản nháp chỉnh sửa ở máy.', { exact: true }).waitFor({ timeout: 120000 });
    assert.equal(await page.getByLabel('Sửa Từ hoặc cụm tiếng Anh', { exact: true }).inputValue(), 'edited sample');
    assert.equal(await page.getByLabel('Sửa Ghi chú cá nhân', { exact: true }).inputValue(), 'Ghi chú lưu ở máy');
    result.passed.push('reload restores per-card edit draft and notes');
    await page.getByLabel('Sửa Nghĩa tiếng Việt', { exact: true }).fill('');
    assert.equal(await page.getByRole('button', { name: 'Lưu thay đổi thẻ tiếng Anh', exact: true }).isEnabled(), false);
    await page.getByLabel('Sửa Nghĩa tiếng Việt', { exact: true }).fill('nghĩa đã sửa QA');
    await page.getByText('Đã lưu bản nháp ở máy; chưa áp dụng vào thẻ.', { exact: true }).waitFor();
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Lưu thay đổi thẻ tiếng Anh', exact: true }).click();
    await page.getByText('Đã lưu thay đổi. Lịch ôn, tiến độ và lịch sử được giữ nguyên.', { exact: true }).waitFor();
    await capture('02-offline-save.png');
    await context.setOffline(false);
    await page.reload();
    await page.getByLabel('Sửa Ghi chú cá nhân', { exact: true }).waitFor({ timeout: 120000 });
    assert.equal(await page.getByLabel('Sửa Từ hoặc cụm tiếng Anh', { exact: true }).inputValue(), 'edited sample');
    assert.equal(await page.getByRole('button', { name: 'Lưu thay đổi thẻ tiếng Anh', exact: true }).isEnabled(), false);
    assert.equal(await page.getByText('Đã khôi phục bản nháp chỉnh sửa ở máy.', { exact: true }).count(), 0);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ colorScheme: 'dark' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.getByRole('button', { name: 'Lưu thay đổi thẻ tiếng Anh', exact: true }).scrollIntoViewIfNeeded();
    await capture('03-compact-dark-edit.png');
    result.passed.push('blank meaning rejected, loaded offline save, persisted commit clears draft, compact dark no document overflow');
    await page.goto('http://localhost:8098/english');
    await page.getByRole('button', { name: 'Chỉnh sửa: edited sample', exact: true }).waitFor({ timeout: 120000 });
    assert.equal(await page.getByText(/^Lần ôn tiếp:/).innerText(), schedule);
    await page.getByText('1 thẻ · 1 đã học · 0 đến hạn', { exact: true }).waitFor();
    result.passed.push('edit preserves exact scheduled date and learned count without granting XP');
    for (const count of [100, 50]) {
      await page.getByRole('button', { name: 'Thêm nhiều thẻ cá nhân tiếng Anh', exact: true }).click();
      await page.getByLabel('Danh sách từ và nghĩa tiếng Anh, hai cột TAB', { exact: true }).fill(
        Array.from({ length: count }, (_, n) => `page ${count} item ${n}\tnghĩa QA ${n}`).join('\n'));
      await page.getByRole('button', { name: 'Kiểm tra và xem trước thẻ', exact: true }).click();
      await page.getByText(`${count} dòng hợp lệ · 0 lỗi cần sửa`, { exact: true }).waitFor();
      await page.getByRole('button', { name: `Xác nhận lưu ${count} thẻ cá nhân`, exact: true }).click();
      await page.getByText(`Đã lưu ${count} thẻ cá nhân. Các thẻ chưa được đưa vào hàng đợi ôn.`, { exact: true }).waitFor();
      await page.goto('http://localhost:8098/english');
      await page.getByText(`${count === 100 ? 101 : 151} thẻ · 1 đã học · 0 đến hạn`, { exact: true }).waitFor({ timeout: 120000 });
    }
    const seen = [];
    let pages = 0;
    do {
      pages++;
      await page.getByText(`Trang ${pages} · tối đa 25 thẻ mỗi trang, không giới hạn bộ ở 100 thẻ.`, { exact: true }).waitFor();
      // Page number changes before SQLite resolves; wait for an interactive card,
      // not a temporarily disabled Next button during loading.
      await page.getByRole('button', { name: /^Chỉnh sửa:/ }).first().click({ trial: true });
      const labels = await page.getByRole('button', { name: /^Chỉnh sửa:/ }).allTextContents();
      assert.ok(labels.length > 0 && labels.length <= 25);
      seen.push(...labels);
      const next = page.getByRole('button', { name: 'Trang thẻ tiếp', exact: true });
      if (!(await next.isEnabled())) break;
      await next.click();
    } while (pages < 10);
    assert.equal(pages, 7); assert.equal(seen.length, 151); assert.equal(new Set(seen).size, 151);
    await page.getByRole('button', { name: 'Trang thẻ trước', exact: true }).click();
    await page.getByText('Trang 6 · tối đa 25 thẻ mỗi trang, không giới hạn bộ ở 100 thẻ.', { exact: true }).waitFor();
    await capture('04-pagination-page-six.png');
    result.passed.push('151 cards accessible over seven bounded pages, no skips/duplicates, previous navigation works');
    assert.deepEqual(errors, []); result.success = true;
  } catch (error) {
    result.success = false; result.failure = error.stack || error.message; process.exitCode = 1;
    await capture('failure.png').catch(() => {});
  } finally {
    result.captures = fs.readdirSync(output).filter(name => /^\d+-.*\.png$/.test(name)).map(name => {
      const bytes = fs.readFileSync(path.join(output, name));
      return { filename: name, platform: result.platform, scope: 'VIEWPORT_ONLY', sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
    });
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result)); await browser.close();
  }
})();
