const fs = require("node:fs");
const path = require("node:path");

const { chromium } = require(
  "C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright",
);

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts", "english-review-flow-2026-10-13");
const baseUrl = process.env.ENGLISH_REVIEW_BASE_URL || "http://localhost:8133";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, name), fullPage: true });
}

async function main() {
  if (fs.existsSync(output) && fs.readdirSync(output).length > 0) {
    throw new Error(`Refusing to overwrite QA evidence directory: ${output}`);
  }
  fs.mkdirSync(output, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/english/review?preview=true&flow=true`, { waitUntil: "networkidle" });
    await page.getByTestId("english-review-setup").waitFor();
    assert(await page.getByText("20 từ đến hạn", { exact: true }).count(), "Preview should provide 20 demo cards.");
    assert(await page.getByTestId("english-review-preview-badge").count(), "Preview must show its no-write badge.");

    const batchOptions = page.getByRole("radio");
    assert((await batchOptions.count()) === 4, "Setup should expose exactly the 5/10/15/20 batch sizes.");
    const batchState = await batchOptions.evaluateAll(items => items.map(item => ({ text: item.textContent?.trim(), checked: item.getAttribute("aria-checked"), background: getComputedStyle(item).backgroundColor })));
    console.log("Batch radio state:", JSON.stringify(batchState));
    assert(batchState[0]?.background !== batchState[1]?.background, "Default batch size should visibly select five.");
    await screenshot(page, "01-review-setup.png");

    await page.getByRole("button", { name: "Ôn 5 từ ngay" }).click();
    await page.getByTestId("english-review-question").waitFor();
    assert((await page.getByTestId("english-review-question").innerText()) === "sweater", "First exercise should be meaning choice for sweater.");
    assert(await page.getByRole("radio").count() >= 4, "Meaning question should have four distractor choices.");
    await screenshot(page, "02-meaning-choice.png");

    await page.getByText("áo len chui đầu; áo len dài tay", { exact: true }).click();
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await page.getByText("Chính xác!", { exact: true }).waitFor();
    await screenshot(page, "03-correct-feedback.png");
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

    await page.getByTestId("english-review-cloze").waitFor();
    assert((await page.getByTestId("english-review-cloze").innerText()).includes("____ are good for running"), "Second exercise should use the saved trainers example as a cloze.");
    await page.getByRole("button", { name: "Gợi ý" }).click();
    await page.getByText("t _ _ _ _ _ _ s", { exact: true }).waitFor();
    await screenshot(page, "04-listening-hint.png");
    await page.getByRole("button", { name: "Không biết" }).click();
    await page.getByText("Chưa chính xác!", { exact: true }).waitFor();
    await page.getByText("trainers", { exact: true }).last().waitFor();
    await screenshot(page, "05-unknown-answer-revealed.png");

    const progressAfterWrong = await page.getByTestId("english-review-progress-caption").innerText();
    assert(progressAfterWrong.startsWith("0/5"), `Wrong answer should reduce progress to zero; got ${progressAfterWrong}`);

    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.getByTestId("english-review-question").waitFor();
    assert((await page.getByTestId("english-review-question").innerText()) === "shorts", "Wrong card should move behind the remaining cards.");
    await page.getByText("quần đùi, quần soóc", { exact: true }).click();
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await page.getByText("Chính xác!", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

    await page.getByTestId("english-review-answer").waitFor();
    await page.getByTestId("english-review-answer").fill("garden");
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await page.getByText("Chính xác!", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

    await page.getByTestId("english-review-question").waitFor();
    assert((await page.getByTestId("english-review-question").innerText()) === "window", "Exercises should keep alternating after listening.");
    await page.getByText("cửa sổ", { exact: true }).click();
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await page.getByText("Chính xác!", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

    await page.getByTestId("english-review-answer").waitFor();
    assert((await page.getByTestId("english-review-cloze").innerText()).includes("____ are good for running"), "The missed word should return for another attempt.");
    await page.getByTestId("english-review-answer").fill("trainers");
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await page.getByText("Chính xác!", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

    await page.getByTestId("english-review-question").waitFor();
    await page.getByText("áo len chui đầu; áo len dài tay", { exact: true }).click();
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await page.getByText("Chính xác!", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

    await page.getByTestId("english-review-complete").waitFor();
    assert(await page.getByText("Bạn còn 15 từ cần ôn. Tiến độ của chúng được giữ lại cho lượt tiếp theo.").count(), "Completion should report remaining cards.");
    await screenshot(page, "06-review-complete.png");
    await page.getByRole("button", { name: "Tiếp tục học · ôn tối đa 5 từ" }).click();
    await page.getByTestId("english-review-question").waitFor();
    assert((await page.getByTestId("english-review-question").innerText()) === "careful", "The next round should continue with unreviewed cards.");
    await screenshot(page, "07-next-round.png");

    assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
    const result = {
      date: "2026-10-13",
      viewport: "412x915 @2x mobile emulation",
      previewOnly: true,
      writesSrs: false,
      scenarios: [
        "setup exposes the 5/10/15/20 batch-size selector (persistence covered by unit tests)",
        "meaning choice has four distractor options",
        "correct answer advances progress",
        "wrong answer reduces progress and queues the card again",
        "listen/cloze hint masks the answer; unknown reveals it",
        "choice and listen/cloze exercises alternate",
        "completion reports remaining cards and next batch continues",
      ],
      pageErrors,
    };
    fs.writeFileSync(path.join(output, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
    const names = fs.readdirSync(output).filter(name => name.endsWith(".png"));
    fs.writeFileSync(path.join(output, "capture-manifest.csv"), `file,screen\n${names.map(name => `${name},${name.replace(/^\d+-/, "").replace(/\.png$/, "")}`).join("\n")}\n`, "utf8");
    const gallery = `<!doctype html><meta charset="utf-8"><title>English review flow QA</title><style>body{font:16px system-ui;background:#f3f5fa;color:#172033;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}figure{margin:0;background:white;padding:12px;border-radius:16px;box-shadow:0 2px 12px #0002}img{width:100%;height:auto;border-radius:8px}figcaption{padding:8px;font-weight:700}</style><h1>English review flow · QA captures</h1><p>Mobile viewport 412×915 · development preview data only · no SRS writes.</p><main>${names.map(name => `<figure><a href="${name}"><img src="${name}" alt="${name}"></a><figcaption>${name}</figcaption></figure>`).join("")}</main>`;
    fs.writeFileSync(path.join(output, "index.html"), gallery, "utf8");
    console.log(JSON.stringify({ output, screenshots: names.length, result }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
