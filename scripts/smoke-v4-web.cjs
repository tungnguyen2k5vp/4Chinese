/* Optional browser smoke: node scripts/smoke-v4-web.cjs <playwright module> [origin].
 * Uses an isolated Edge profile; never opens the user's browser or calls AI.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.argv[2] || "playwright");
const origin = process.argv[3] || "http://localhost:8084";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw new Error("LOCALHOST_ONLY");

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
  });
  let page = await context.newPage();
  const errors = [];
  const results = [];
  let passed = false;
  let failure = null;
  page.on("pageerror", (error) => errors.push(error.message));
  // Alert confirmations are accepted only within this isolated QA browser.
  page.on("dialog", (dialog) => dialog.accept());
  const text = (value) => page.getByText(value, { exact: true });
  const waitSaved = () => text("Đáp án hiện tại đã lưu trên máy.").waitFor();
  try {
    await page.goto(`${origin}/exam`);
    await text("Bắt đầu mức 1").click();
    await page.getByRole("radio").first().waitFor();
    await page.getByRole("radio").first().click();
    await waitSaved();
    await text("Đánh dấu xem lại").click();
    await text("Bỏ đánh dấu xem lại").waitFor();
    await page.reload();
    await text("Bỏ đánh dấu xem lại").waitFor();
    assert.equal(
      await page.getByRole("radio").first().getAttribute("aria-checked"),
      "true",
    );
    results.push("Mini test answer + flag survive reload");
    await text("Câu tiếp").click();
    await page.getByText("Câu 2/4", { exact: false }).waitFor();
    await text("Nộp bài").click();
    const confirm = page.getByRole("button", {
      name: "Xác nhận nộp bài",
      exact: true,
    });
    await confirm.waitFor();
    await text("Làm tiếp").click();
    await page.getByRole("radio").first().waitFor();
    await text("Nộp bài").click();
    await confirm.click();
    await page.waitForURL(/\/exam\/result/, { timeout: 10000 });
    await page
      .getByText("Kết quả bài luyện", { exact: false })
      .first()
      .waitFor();
    results.push("Submit + result breakdown");

    await page.goto(`${origin}/exam/skills`);
    await text("Mở bài / tiếp tục bản nháp").first().click();
    const answer = page.getByRole("textbox", { name: "Bài viết của tôi" });
    await answer.fill("我叫小明。我是学生。我喜欢学习中文。");
    await page.getByText("Đã lưu trên máy", { exact: false }).waitFor();
    await page.reload();
    await answer.waitFor();
    assert.equal(
      await answer.inputValue(),
      "我叫小明。我是学生。我喜欢学习中文。",
    );
    await text("Đối chiếu bài và xem mẫu").click();
    await text("Tự kiểm tra — không phải điểm số").waitFor();
    results.push("Writing draft survives reload + self-review");
    await page.goto(`${origin}/exam/skills`);
    await page.getByRole("tab", { name: "Luyện dịch" }).click();
    assert.equal(await text("Mở bài / tiếp tục bản nháp").count(), 7);
    results.push("Translation tab exposes seven tasks");
    await page.goto(`${origin}/exam/speaking`);
    await page.getByText("Ghi âm hiện chỉ hỗ trợ", { exact: false }).waitFor();
    await page.getByRole("checkbox").first().click();
    results.push("Speaking web fallback + self-review");
    await page.goto(`${origin}/exam/readiness`);
    await page.getByText("Mức độ chuẩn bị", { exact: false }).first().waitFor();
    await page.goto(`${origin}/grammar/focus`);
    await page.getByText("Người Việt", { exact: false }).first().waitFor();
    results.push("Readiness + grammar focus render");
    await page.goto(`${origin}/practice`);
    await page.getByRole("button", { name: "Ngữ pháp", exact: true }).click();
    await page.waitForURL(/\/grammar$/);
    await page.goBack();
    await page.getByRole("button", { name: "Ngữ pháp", exact: true }).waitFor();
    await page.goto(`${origin}/library`);
    await page
      .getByRole("button", { name: "Truyện ngắn", exact: true })
      .click();
    await page.waitForURL(/\/stories$/);
    await page.goBack();
    await page
      .getByRole("button", { name: "Truyện ngắn", exact: true })
      .waitFor();
    results.push("Practice/library destinations + browser back");
    await page.goto(`${origin}/confusables/know`);
    await page
      .getByRole("radiogroup")
      .first()
      .getByRole("radio", { name: "认识", exact: true })
      .click();
    await text("Kiểm tra câu này").first().click();
    await text("Ở đây dùng 知道.").waitFor();
    await page.reload();
    await page.getByRole("radiogroup").first().waitFor();
    await page.goto(`${origin}/confusables`);
    await page.getByText("Đã luyện 1 câu", { exact: false }).waitFor();
    results.push("Confusable context feedback + durable progress after reload");
    const secondPage = await context.newPage();
    secondPage.on("pageerror", (error) => errors.push(error.message));
    await secondPage.goto(`${origin}/confusables`);
    await secondPage
      .getByText("Dữ liệu đang mở ở tab khác", { exact: true })
      .waitFor();
    await page.close();
    await secondPage
      .getByRole("button", { name: "Tải lại trang, giữ dữ liệu", exact: true })
      .click();
    await secondPage.getByText("Đã luyện 1 câu", { exact: false }).waitFor();
    page = secondPage;
    await page.goto(`${origin}/library`);
    await page
      .getByRole("button", { name: "Truyện ngắn", exact: true })
      .waitFor();
    results.push(
      "Second tab blocked safely; after owner closes, progress survives takeover",
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.reload();
    await page
      .getByRole("button", { name: "Truyện ngắn", exact: true })
      .waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "Compact viewport overflow",
    );
    await page.screenshot({
      path: "docs/v4-web-library-dark.png",
      fullPage: true,
    });
    results.push(
      "Compact 360px + dark/reduced-motion library renders without horizontal overflow",
    );
    await context.setOffline(true);
    await page
      .getByRole("button", { name: "Truyện ngắn", exact: true })
      .click();
    await page.waitForURL(/\/stories$/);
    await page.getByText("Truyện theo cấp độ", { exact: true }).waitFor();
    results.push("Offline in-app library to stories navigation");
    await context.setOffline(false);
    assert.deepEqual(errors, [], "Unexpected browser errors");
    passed = true;
  } catch (error) {
    failure = error.message;
    throw error;
  } finally {
    fs.mkdirSync(path.resolve("docs"), { recursive: true });
    await page.screenshot({ path: "docs/v4-web-smoke.png", fullPage: true });
    fs.writeFileSync(
      "docs/V4_WEB_SMOKE.json",
      JSON.stringify(
        {
          at: new Date().toISOString(),
          origin,
          viewports: ["412x915", "360x800"],
          passed,
          failure,
          results,
          errors,
        },
        null,
        2,
      ),
    );
    await browser.close();
  }
  console.log(JSON.stringify({ results, errors }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
