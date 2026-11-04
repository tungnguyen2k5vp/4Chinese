/* Isolated Web integration evidence, NOT native/phone or full V7 acceptance. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.argv[2] || 'playwright');
const output = path.resolve(__dirname, '../artifacts/v7-2026-10-10/learner-ui-quick-session');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-10-10T00:00:00Z'));
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const result = { platform: 'WEB_HEADLESS_NOT_ANDROID', passed: [], errors };
  try {
    await page.goto('http://localhost:8099/english');
    await page.getByText('Chưa có bộ từ. Tạo một bộ để bắt đầu.', { exact: true }).waitFor({ timeout: 120000 });
    await page.getByLabel('Tên bộ từ tiếng Anh', { exact: true }).fill('Quick session QA');
    await page.getByRole('button', { name: 'Tạo bộ từ', exact: true }).click();
    await page.getByRole('button', { name: 'Đang chọn: Quick session QA', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Thêm nhiều thẻ cá nhân tiếng Anh', exact: true }).click();
    await page.getByLabel('Danh sách từ và nghĩa tiếng Anh, hai cột TAB', { exact: true }).fill(
      Array.from({ length: 7 }, (_, n) => `quick sample ${n}\tnghĩa QA ${n}`).join('\n'));
    await page.getByRole('button', { name: 'Kiểm tra và xem trước thẻ', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận lưu 7 thẻ cá nhân', exact: true }).click();
    await page.getByText('Đã lưu 7 thẻ cá nhân. Các thẻ chưa được đưa vào hàng đợi ôn.', { exact: true }).waitFor();
    await page.goto('http://localhost:8099/english');
    await page.getByText('7 thẻ · 0 đã học · 0 đến hạn', { exact: true }).waitFor({ timeout: 120000 });
    for (let n = 0; n < 7; n++) {
      await page.getByRole('button', { name: `Đã học: quick sample ${n}`, exact: true }).click();
      await page.getByText(`7 thẻ · ${n+1} đã học · 0 đến hạn`, { exact: true }).waitFor();
    }
    assert.equal(await page.getByRole('button', { name: 'Ôn nhanh tiếng Anh · tối đa 5 thẻ', exact: true }).isEnabled(), false);
    await page.goto('http://localhost:8099/english/review?quick=1');
    await page.getByText('Phiên ôn nhanh đã kết thúc. Có thể còn thẻ đến hạn ngoài phiên này; các thẻ chưa trả lời giữ nguyên lịch ôn.', { exact: true }).waitFor({ timeout: 120000 });
    result.passed.push('future cards excluded; quick empty state makes no premature review');
    await page.clock.setFixedTime(new Date('2026-10-10T00:31:00Z'));
    await page.goto('http://localhost:8099/english');
    await page.getByText('7 thẻ · 7 đã học · 7 đến hạn', { exact: true }).waitFor({ timeout: 120000 });
    await page.getByRole('button', { name: 'Ôn nhanh tiếng Anh · tối đa 5 thẻ', exact: true }).click();
    await page.getByText('Còn 5 thẻ · Hãy nhớ nghĩa trước khi mở đáp án.', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, '01-quick-five.png') });
    await context.setOffline(true);
    for (let n = 0; n < 5; n++) {
      await page.getByRole('button', { name: 'Hiện nghĩa đã lưu', exact: true }).click();
      await page.getByRole('button', { name: 'Đã nhớ', exact: true }).click();
      await page.getByText(new RegExp(`Đã lưu ${n+1} lượt · ${n+1} đúng`)).waitFor();
    }
    await page.getByText('Phiên ôn nhanh đã kết thúc. Có thể còn thẻ đến hạn ngoài phiên này; các thẻ chưa trả lời giữ nguyên lịch ôn.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Hiện nghĩa đã lưu', exact: true }).count(), 0);
    await page.screenshot({ path: path.join(output, '02-quick-completed-offline.png') });
    await context.setOffline(false);
    await page.goto('http://localhost:8099/english');
    await page.getByText('7 thẻ · 7 đã học · 2 đến hạn', { exact: true }).waitFor({ timeout: 120000 });
    await page.getByText('5 lượt ôn · 5 đúng · 50 XP tiếng Anh', { exact: true }).waitFor();
    result.passed.push('loaded offline quick commits exactly five; two due cards retained and XP/log count exactly five');
    await page.getByRole('button', { name: 'Ôn nhanh tiếng Anh · tối đa 5 thẻ', exact: true }).click();
    await page.getByText('Còn 2 thẻ · Hãy nhớ nghĩa trước khi mở đáp án.', { exact: true }).waitFor();
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ colorScheme: 'dark' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, '03-remainder-compact-dark.png') });
    result.passed.push('next session contains only remaining due cards; compact dark no document overflow');
    assert.deepEqual(errors, []); result.success = true;
  } catch (e) {
    result.success = false; result.failure = e.stack || e.message; process.exitCode = 1;
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  } finally {
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result)); await browser.close();
  }
})();
