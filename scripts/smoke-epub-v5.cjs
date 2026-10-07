/* Isolated localhost fixture; no personal documents, accounts or remote resources. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { zipSync, strToU8 } = require('fflate');
const { chromium } = require(process.argv[2] || 'playwright');
const origin = 'http://localhost:8085';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const files = {
    mimetype: 'application/epub+zip',
    'META-INF/container.xml': '<container><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    'OPS/book.opf': '<package version="3.0"><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/><item id="b" href="b.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>',
    'OPS/a.xhtml': '<html><body><p>第一章。我喜欢学习中文。</p></body></html>',
    'OPS/b.xhtml': '<html><body><p>第二章。今天我去学校。</p></body></html>',
  };
  try {
    await page.goto(`${origin}/reader`);
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Nhập tệp TXT / EPUB', exact: true }).click();
    await (await chooser).setFiles({ name: 'ordered-fixture.epub', mimeType: 'application/epub+zip',
      buffer: Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([key, value]) => [key, strToU8(value)])), { level: 0 })) });
    await page.getByRole('button', { name: 'Lưu bài đọc', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Lưu bài đọc', exact: true }).click();
    await page.getByText('Bài đọc đã lưu', { exact: true }).waitFor();
    await page.reload();
    const saved = page.getByRole('button', { name: /^第二章。今天我去学校。/ });
    await saved.waitFor();
    assert.equal(await page.getByRole('button', { name: /^第一章。我喜欢学习中文。/ }).count(), 0);
    await saved.click();
    await page.getByText('Phần 1/1', { exact: false }).waitFor();
    await page.goto(`${origin}/speaking/recordings`);
    await page.getByText('Thư viện âm thanh riêng hiện hỗ trợ Android/iOS;', { exact: false }).waitFor();
    assert.deepEqual(errors, []);
    fs.writeFileSync('docs/EPUB_WEB_QA.json', JSON.stringify({ date: new Date().toISOString(), status: 'PASS',
      cases: ['EPUB picker/extraction', 'OPF spine order preserved in saved title', 'reload and saved document reopen', 'recording library honest web fallback'], errors,
      limitation: 'Browser fixture only; not Android document-provider QA.' }, null, 2));
    console.log('EPUB/recording web QA: PASS (4 cases)');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
