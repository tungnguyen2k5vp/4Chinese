const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  "C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright",
);

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts", "english-personal-decks-ui-2026-10-13");
const baseUrl = process.env.ENGLISH_REVIEW_BASE_URL || "http://localhost:8133";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function capture(page, name) {
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
    await page.goto(`${baseUrl}/english`, { waitUntil: "networkidle" });
    await page.getByText("Bộ từ của bạn", { exact: true }).waitFor();
    await capture(page, "01-personal-decks-section.png");

    await page.getByRole("button", { name: "Thêm mới bộ từ tiếng Anh" }).click();
    await page.getByRole("button", { name: "Tạo bộ từ cá nhân" }).waitFor();
    await capture(page, "02-add-deck-action-sheet.png");

    await page.getByRole("button", { name: "Tạo bộ từ cá nhân" }).click();
    await page.getByTestId("english-personal-list-input").waitFor();
    await capture(page, "03-create-deck-and-word-form.png");

    await page.getByLabel("Tên bộ từ muốn học").fill("Unit 8");
    await page.getByTestId("english-personal-list-input").fill("hello\tchào\nlove\ttình yêu\nshorts\tquần đùi");
    await page.getByRole("button", { name: "Nhận diện từ" }).click();
    await page.getByTestId("english-preview-row-1").waitFor();
    assert(await page.getByTestId("english-preview-row-2").count() === 1, "The review list should include the second word.");
    assert(await page.getByRole("button", { name: "Bỏ hello khỏi danh sách, dòng 1" }).count() === 1, "Each recognized row should have an individual remove control.");
    await capture(page, "04-word-list-review-and-remove.png");

    assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
    const names = fs.readdirSync(output).filter(name => name.endsWith(".png"));
    const result = {
      date: "2026-10-13",
      viewport: "412x915 @2x mobile emulation",
      previewOnly: true,
      savedVocabulary: false,
      sampleInput: "Three explicit TAB-separated English/Vietnamese entries; this visual capture does not download or alter the dictionary.",
      checks: [
        "collection heading and add-new entry point",
        "personal deck / friends deck action sheet",
        "single create deck plus multiline word-list form (no three-step progress indicator)",
        "editable review list and per-word remove control before saving",
      ],
      pageErrors,
    };
    fs.writeFileSync(path.join(output, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(output, "capture-manifest.csv"), `file,screen\n${names.map(name => `${name},${name.replace(/^\d+-/, "").replace(/\.png$/, "")}`).join("\n")}\n`, "utf8");
    const gallery = `<!doctype html><meta charset="utf-8"><title>English personal decks UI QA</title><style>body{font:16px system-ui;background:#f3f5fa;color:#172033;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}figure{margin:0;background:white;padding:12px;border-radius:16px;box-shadow:0 2px 12px #0002}img{width:100%;height:auto;border-radius:8px}figcaption{padding:8px;font-weight:700}</style><h1>English personal decks · QA captures</h1><p>Mobile viewport 412×915 · private browser context · sample list not saved to the app.</p><main>${names.map(name => `<figure><a href="${name}"><img src="${name}" alt="${name}"></a><figcaption>${name}</figcaption></figure>`).join("")}</main>`;
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
