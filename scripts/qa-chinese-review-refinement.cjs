/* Real app + SQLite in a disposable browser profile. No phone or learner files. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.argv[2] || "C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright");
const base = process.env.CHINESE_QA_BASE_URL || "http://localhost:8133";
const output = path.resolve(__dirname, "../artifacts/chinese-review-refinement-2026-10-20");
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on("dialog", dialog => void dialog.accept());
  await page.addInitScript(() => {
    const RealDate = Date;
    window.__qaOffset = Number(localStorage.getItem("chineseQAOffset") || 0);
    window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [RealDate.now() + window.__qaOffset])); } static now() { return RealDate.now() + window.__qaOffset; } };
  });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const report = { platform: "WEB_REAL_UI_AND_SQLITE_NOT_ANDROID", success: false, checks: [], errors };
  const capture = async file => {
    const dismiss = page.locator('button[class*="dismissButton"]');
    // Close known development-only React DOM warning toasts using their normal UI.
    // Keep pageerror collection active; this does not suppress application exceptions.
    await page.waitForTimeout(600);
    for (let i = 0; i < 3; i++) {
      if (await dismiss.count()) await dismiss.first().click();
      await page.waitForTimeout(200);
    }
    if (file === "01-learn-pinyin.png") await page.evaluate(() => {
      for (const element of document.querySelectorAll("div")) if (element.scrollHeight > element.clientHeight && /auto|scroll/.test(getComputedStyle(element).overflowY)) element.scrollTop = 0;
    });
    return page.screenshot({ path: path.join(output, file) });
  };
  const advance = ms => page.evaluate(delta => { window.__qaOffset += delta; localStorage.setItem("chineseQAOffset", String(window.__qaOffset)); }, ms);
  const grade = async () => {
    for (const label of ["Tiếp tục", "Đã nhớ", "Nhớ"]) {
      const button = page.getByRole("button", { name: label, exact: true });
      if (await button.count()) { await button.click(); return; }
    }
    throw new Error("No correct-answer confirmation button");
  };
  const startReview = async mode => {
    await page.goto(`${base}/review?mode=${mode}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Bắt đầu ôn 1 từ", exact: true }).click({ timeout: 120000 });
    await page.getByTestId("chinese-review-question").waitFor();
    await page.getByTestId("review-memory-level").filter({ hasText: /^Cấp [1-6]$/ }).waitFor();
    if (mode.endsWith("meaning")) await page.getByTestId("chinese-review-options").getByRole("button").nth(3).waitFor();
  };
  try {
    await page.goto(`${base}/decks`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Tạo bộ từ mới/ }).click({ timeout: 120000 });
    await page.getByPlaceholder("Ví dụ: Tiếng Trung công việc", { exact: true }).fill("Chinese refinement QA");
    await page.getByRole("button", { name: "Tạo bộ từ", exact: true }).click();
    await page.getByRole("button", { name: "Đã học hết · thêm từ mới", exact: true }).waitFor();
    const deckUrl = page.url();
    await page.getByRole("button", { name: "Đã học hết · thêm từ mới", exact: true }).click();
    await page.getByLabel("Danh sách từ cần thêm", { exact: true }).fill("用");
    await page.getByRole("button", { name: "Nhận diện 1 từ", exact: true }).click();
    await page.getByRole("button", { name: "Thêm 1 từ", exact: true }).click();
    await page.waitForTimeout(3000); // Allow the isolated web VFS to finish the bulk transaction before reloading.
    await page.waitForFunction(() => document.querySelector('[aria-label="Thêm 1 từ"]')?.getAttribute("aria-busy") !== "true");
    await page.goto(deckUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Học từ mới (1)", exact: true }).click();
    await page.getByRole("button", { name: "Học từ này", exact: true }).click();
    await page.getByRole("radio", { name: "Nhập pinyin", exact: true }).click();
    const correctMeaning = (await page.getByTestId("chinese-learn-meaning").innerText()).trim();
    await capture("01-learn-pinyin.png");
    for (let pass = 1; pass <= 3; pass++) {
      await page.getByRole("textbox", { name: "Nhập pinyin", exact: true }).fill("yong");
      await page.getByRole("button", { name: "Chọn 用", exact: true }).click();
      await page.getByRole("button", { name: pass < 3 ? `Xác nhận · sang lượt ${pass + 1}` : "Hoàn tất 3 lượt · lưu Cấp 1", exact: true }).click();
    }
    report.checks.push("new learning uses the compact pinyin composer through all three passes");
    await advance(31 * 60000);
    for (let level = 1; level <= 2; level++) {
      await startReview("hanzi-meaning");
      for (let pass = 0; pass < 3; pass++) {
        await page.getByTestId("chinese-review-options").waitFor();
        const meaning = page.getByTestId("chinese-review-options").getByRole("button", { name: correctMeaning, exact: true });
        await meaning.click(); await grade();
      }
      await page.waitForURL(/review\/result/);
      const changes = JSON.parse(new URL(page.url()).searchParams.get("changes"));
      assert.equal(changes[0].levelAfter, level + 1);
      await advance((level + 1) * 86400000);
    }
    await startReview("audio-meaning");
    await page.getByRole("button", { name: "Gợi ý", exact: true }).click();
    await page.getByTestId("review-light-hint").waitFor();
    assert.equal(await page.getByTestId("chinese-review-options").getByRole("button").count(), 4);
    assert.equal(await page.getByText("Chưa chính xác", { exact: true }).count(), 0);
    await capture("02-gentle-hint.png");
    for (let pass = 0; pass < 3; pass++) {
      await page.getByTestId("chinese-review-options").getByRole("button", { name: correctMeaning, exact: true }).click();
      if (pass === 0) await capture("03-assisted-correct.png");
      await grade();
    }
    await page.waitForURL(/review\/result/);
    const url = new URL(page.url());
    const changes = JSON.parse(url.searchParams.get("changes"));
    assert.equal(url.searchParams.get("wrong"), "0");
    assert.equal(changes[0].levelBefore, 3); assert.equal(changes[0].levelAfter, 3); assert.equal(changes[0].direction, "same");
    await capture("04-kept-level.png");
    report.checks.push("hint leaves four answers and does not submit or mark wrong", "three correct passes with one hint persist level 3 and zero wrong words in the actual review result");
    await advance(2 * 86400000);
    await startReview("hanzi-recall-pinyin-compose");
    await capture("05-review-composer.png");
    await page.getByRole("textbox", { name: "Nhập pinyin", exact: true }).fill("yong");
    await page.getByRole("button", { name: "Chọn 用", exact: true }).click();
    assert.equal(await page.getByTestId("pinyin-composed-answer").innerText(), "用");
    await page.getByRole("button", { name: "Xóa chữ Hán cuối cùng", exact: true }).click();
    assert.equal(await page.getByTestId("pinyin-composed-answer").innerText(), "Chọn chữ ở bên dưới");
    await page.setViewportSize({ width: 320, height: 740 }); await page.emulateMedia({ colorScheme: "dark" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await capture("06-composer-dark.png");
    report.checks.push("composer candidates, explicit selection, delete, compact dark layout work without blank candidate area");
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`${base}/daily`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("daily-primary-action").waitFor({ timeout: 120000 });
    assert.equal(await page.getByTestId("daily-plan-details").count(), 0);
    await capture("07-daily.png");
    await page.getByRole("button", { name: "Chi tiết kế hoạch", exact: true }).click();
    await page.getByTestId("daily-plan-details").waitFor();
    report.checks.push("daily shows a single primary start action and keeps explanations in an optional disclosure");
    assert.deepEqual(errors, []); report.success = true;
    fs.rmSync(path.join(output, "failure.png"), { force: true });
  } catch (error) { report.failure = error.stack || String(error); await capture("failure.png").catch(() => {}); process.exitCode = 1; }
  finally { fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); }
})();
