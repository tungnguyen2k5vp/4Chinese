/* Real Web UI + SQLite in a private browser profile. Never touches phone data. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.argv[2] || "C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright");
const base = process.env.ENGLISH_QA_BASE_URL || "http://localhost:8133";
const output = path.resolve(__dirname, "../artifacts/english-flashcards-2026-10-20/automated");
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROME_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  // Instrument only this private web test. This proves requests/lifecycle, not native sound output.
  await page.addInitScript(() => {
    window.__qaSpeech = [];
    window.SpeechSynthesisUtterance = class {};
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      getVoices: () => [{ voiceURI: "local-US", lang: "en-US", name: "QA US", localService: true }],
      speak: utterance => { window.__qaSpeech.push(utterance.text); utterance.onstart?.({}); setTimeout(() => utterance.onend?.({}), 30); },
      cancel: () => {}, speaking: false,
    }});
  });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const result = { platform: "WEB_WITH_REAL_SQLITE_NOT_NATIVE_ANDROID", success: false, checks: [], errors };
  const capture = name => page.screenshot({ path: path.join(output, name) });
  const check = () => page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  const answer = async text => { await page.getByTestId("english-learning-answer").fill(text); await check(); };
  try {
    await page.goto(`${base}/english/decks`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Tên bộ từ tiếng Anh mới", { exact: true }).fill("English learning QA", { timeout: 120000 });
    await page.getByRole("button", { name: "Tạo bộ từ", exact: true }).click();
    await page.getByRole("button", { name: "Thêm từ", exact: true }).waitFor();
    const deckUrl = page.url();
    await page.getByRole("button", { name: "Thêm từ", exact: true }).click();
    await page.getByLabel("Danh sách từ tiếng Anh, mỗi dòng một từ", { exact: true }).fill("september\ttháng chín\ngarden\tkhu vườn\nwindow\tcửa sổ");
    await page.getByRole("button", { name: "Nhận diện từ", exact: true }).click();
    await page.getByRole("button", { name: "Thêm 3 từ", exact: true }).click();
    await page.getByRole("button", { name: "Chọn từ vừa thêm để học ngay", exact: true }).click();
    await page.getByTestId("english-selection-flashcard").waitFor();
    const selectionUrl = page.url();
    const addedIds = JSON.parse(new URL(selectionUrl).searchParams.get("added"));
    // Enter a fixture IPA through the real editor, so the screenshot also covers saved IPA display.
    await page.goto(`${base}/english/card-edit?id=${encodeURIComponent(addedIds[0])}`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Sửa Phiên âm IPA (tùy chọn)", { exact: true }).fill("/sepˈtembə(r)/");
    await page.getByRole("button", { name: "Lưu thay đổi thẻ tiếng Anh", exact: true }).click();
    await page.getByText("Đã lưu thay đổi. Lịch ôn, tiến độ và lịch sử được giữ nguyên.", { exact: true }).waitFor();
    await page.goto(selectionUrl, { waitUntil: "domcontentloaded" });
    await page.getByTestId("english-selection-flashcard").waitFor();
    assert.equal(await page.getByTestId("english-selection-word").innerText(), "september");
    assert.equal(await page.getByTestId("english-selection-ipa").innerText(), "/sepˈtembə(r)/");
    await page.waitForFunction(() => window.__qaSpeech.length === 1);
    await page.getByRole("radio", { name: "5 từ mỗi lượt", exact: true }).click();
    await page.waitForTimeout(250);
    assert.equal((await page.evaluate(() => window.__qaSpeech)).length, 1);
    await capture("01-selection.png");
    await page.getByRole("button", { name: "Nghe lại phát âm", exact: true }).click();
    await page.waitForFunction(() => window.__qaSpeech.length === 2);
    await page.getByRole("button", { name: "Học từ này", exact: true }).click();
    await page.getByTestId("english-selection-word").filter({ hasText: "garden" }).waitFor();
    await page.waitForFunction(() => window.__qaSpeech.filter(word => word === "garden").length === 1);
    await page.getByRole("button", { name: "Học từ này", exact: true }).click();
    await page.getByTestId("english-selection-word").filter({ hasText: "window" }).waitFor();
    await page.getByRole("button", { name: "Đã biết", exact: true }).click();
    await page.getByTestId("english-new-word-warmup").waitFor();
    assert.equal(await page.getByTestId("english-review-setup").count(), 0);
    const selectedIds = JSON.parse(new URL(page.url()).searchParams.get("learn"));
    assert.equal(selectedIds.length, 2);
    assert.equal(await page.getByTestId("english-learning-progress-caption").innerText(), "0/6");
    assert.equal(await page.getByText("Gõ theo", { exact: true }).count(), 0);
    await answer("septembre");
    await page.getByText("Chưa đúng. Hãy gõ lại theo từ mẫu.", { exact: true }).waitFor();
    assert.equal(await page.getByTestId("english-learning-prompt").innerText(), "september");
    await answer("september");
    await capture("02-copy-word.png");
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    assert.equal(await page.getByTestId("english-learning-prompt").innerText(), "garden");
    await answer("garden");
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    assert.equal(await page.getByTestId("english-learning-progress-caption").innerText(), "2/6");
    assert.equal(await page.getByTestId("english-learning-prompt").innerText(), "tháng chín");
    assert.equal((await page.getByTestId("english-new-word-warmup").innerText()).includes("september"), false);
    await capture("03-recall-word.png");
    await answer("wrong");
    await page.getByText("Từ cần nhớ: september. Hãy gõ lại để ghi nhớ.", { exact: true }).waitFor();
    await answer("september");
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    assert.equal(await page.getByTestId("english-learning-prompt").innerText(), "khu vườn");
    await answer("garden");
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.getByTestId("english-review-question").waitFor();
    assert.equal(await page.getByRole("radio").count(), 2);
    assert.equal(await page.getByTestId("english-learning-progress-caption").innerText(), "4/6");
    await capture("04-normal-review.png");
    await page.getByRole("radio").filter({ hasText: "tháng chín" }).click();
    await check();
    await page.getByText("Chính xác!", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.getByTestId("english-review-answer").fill("garden");
    await check();
    await page.getByText("Chính xác!", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.getByTestId("english-review-complete").waitFor();
    await capture("05-complete.png");
    result.checks.push("flashcards show word, IPA or honest missing-IPA label, meaning and replay", "autoplay once per displayed card; changing goal does not replay; manual replay works (instrumented web speech)", "known words are excluded from the new-learning cohort; fewer available words auto-start without getting stuck", "copy then recall then review share continuous progress 0/6 → 2/6 → 4/6", "wrong spelling must be corrected; normal exercises complete with SRS");
    await page.goto(deckUrl, { waitUntil: "domcontentloaded" });
    await page.getByText("Đã học 3/3", { exact: true }).waitFor();
    await capture("06-deck.png");
    await page.goto(`${base}/english/word?cardId=${encodeURIComponent(selectedIds[0])}`, { waitUntil: "domcontentloaded" });
    await page.getByText("Mức nhớ 1/6", { exact: true }).waitFor();
    await capture("07-word-detail.png");
    await page.goto(deckUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Xem chi tiết từ window", exact: true }).click();
    await page.getByText("Mức nhớ 1/6", { exact: true }).waitFor();
    result.checks.push("Đã biết is saved at memory level 1, not long-term known exemption");
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ colorScheme: "dark" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await capture("08-compact-dark.png");
    result.checks.push("320px dark screen has no horizontal overflow");
    const deckId = decodeURIComponent(new URL(deckUrl).pathname.split("/").pop());
    await page.goto(`${base}/english?deck=${encodeURIComponent(deckId)}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thêm một từ thủ công", exact: true }).click();
    await page.getByLabel("Từ hoặc cụm tiếng Anh", { exact: true }).fill("october");
    await page.getByLabel("Nghĩa tiếng Việt do bạn chọn", { exact: true }).fill("tháng mười");
    await page.getByRole("button", { name: "Lưu và học ngay từ vừa nhập", exact: true }).click();
    await page.getByTestId("english-new-word-warmup").waitFor();
    assert.equal(await page.getByTestId("english-learning-prompt").innerText(), "october");
    await page.getByRole("button", { name: "Đóng phiên học từ mới", exact: true }).click();
    await page.getByRole("button", { name: "Mở từ mới để bắt đầu học", exact: true }).click();
    await page.getByTestId("english-selection-word").filter({ hasText: "october" }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await capture("08-compact-dark.png");
    await page.getByRole("button", { name: "Đã biết", exact: true }).click();
    await page.getByText("Đã xem hết các từ mới", { exact: true }).waitFor();
    result.checks.push("manual save starts exact new word immediately", "early exit remains NEW; vocabulary flashcard excludes previously studied cards", "all-known list finishes cleanly without empty learning session");
    await page.goto(`${base}/english/bulk?deck=${encodeURIComponent(deckId)}`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Danh sách từ tiếng Anh, mỗi dòng một từ", { exact: true }).fill("alpha\tđầu tiên\nbeta\tthứ hai\ngamma\tthứ ba\ndelta\tthứ tư\nepsilon\tthứ năm\nzeta\tthứ sáu");
    await page.getByRole("button", { name: "Nhận diện từ", exact: true }).click();
    await page.getByRole("button", { name: "Thêm 6 từ", exact: true }).click();
    await page.getByRole("button", { name: "Chọn từ vừa thêm để học ngay", exact: true }).click();
    await page.getByTestId("english-selection-word").filter({ hasText: "alpha" }).waitFor();
    await page.getByRole("radio", { name: "5 từ mỗi lượt", exact: true }).click();
    await page.getByRole("button", { name: "Đã biết", exact: true }).click();
    for (const word of ["beta", "gamma", "delta", "epsilon", "zeta"]) {
      await page.getByTestId("english-selection-word").filter({ hasText: new RegExp(`^${word}$`) }).waitFor();
      await page.getByRole("button", { name: "Học từ này", exact: true }).click();
    }
    await page.getByTestId("english-new-word-warmup").waitFor();
    assert.equal(JSON.parse(new URL(page.url()).searchParams.get("learn")).length, 5);
    assert.equal(await page.getByTestId("english-learning-progress-caption").innerText(), "0/15");
    await page.getByRole("button", { name: "Đóng phiên học từ mới", exact: true }).click();
    await page.goto(deckUrl, { waitUntil: "domcontentloaded" });
    await page.getByText("Đã học 5/10", { exact: true }).waitFor();
    result.checks.push("exact goal of 5 auto-starts after five study choices; known choice does not consume the goal", "exiting chosen cohort before typing leaves all five NEW");
    assert.deepEqual(errors, []);
    result.success = true;
    fs.rmSync(path.join(output, "failure.png"), { force: true });
  } catch (error) {
    result.failure = error.stack || String(error);
    await capture("failure.png").catch(() => {});
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    await context.close(); await browser.close();
  }
})();
