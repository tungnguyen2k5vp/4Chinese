const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.argv[2] || "playwright");
const bundle = require("../src/data/hsk30-2025-11.json");
const origin = process.env.HSK30_QA_URL || "http://localhost:8096";
const destination = path.resolve(
  __dirname,
  "../.runtime/hsk30-catalog-qa-2026-10-20/screens",
);
const kinds = {
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  topic: "Chủ đề",
  task: "Giao tiếp",
  hanzi: "Hán tự",
};
const levels = ["1", "2", "3", "4", "5", "6", "7-9"];
fs.mkdirSync(destination, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [],
    manifest = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    for (const level of levels) {
      await page.goto(origin + "/hsk/syllabus?band=" + level);
      await page
        .getByText("Danh mục HSK 3.0 · 11/2025", { exact: true })
        .waitFor({ timeout: 120000 });
      for (const [kind, label] of Object.entries(kinds)) {
        const count = bundle.rows[kind].filter(
          (row) => row.hsk_level === "HSK" + level,
        ).length;
        await page
          .getByRole("tab", { name: `${label}, ${count} mục`, exact: true })
          .click();
        const first = bundle.rows[kind].find(
          (row) => row.hsk_level === "HSK" + level,
        );
        const title =
          kind === "vocabulary"
            ? first.word
            : kind === "grammar"
              ? first.pattern_zh || first.title_zh
              : kind === "hanzi"
                ? first.character
                : kind === "task"
                  ? first.task_title_zh
                  : [first.topic_l1_zh, first.topic_l2_zh, first.topic_l3_zh]
                      .filter(Boolean)
                      .join(" · ");
        const firstItem = page.getByRole("button", {
          name: "Xem " + title + " · mục " + first.level_order,
          exact: true,
        });
        if (kind === "task") {
          const action = first.task_title_zh.startsWith("问答")
            ? "Hỏi – đáp"
            : first.task_title_zh.startsWith("介绍")
              ? "Giới thiệu"
              : first.task_title_zh.startsWith("交流")
                ? "Trao đổi"
                : first.task_title_zh.startsWith("告知")
                  ? "Thông báo"
                  : first.task_title_zh.startsWith("描述")
                    ? "Miêu tả"
                    : first.task_title_zh.startsWith("讨论")
                      ? "Thảo luận"
                      : first.task_title_zh.startsWith("谈论")
                        ? "Thảo luận"
                        : first.task_title_zh.startsWith("讲述")
                          ? "Kể chuyện"
                          : first.task_title_zh.startsWith("日常言语交往")
                            ? "Giao tiếp hằng ngày"
                            : "Kỹ năng giao tiếp";
          const groupedCount = bundle.rows.task.filter(
            (row) =>
              row.hsk_level === "HSK" + level &&
              row.task_title_zh === first.task_title_zh,
          ).length;
          await page
            .getByRole("button", {
              name: `${action}: ${first.task_title_zh}, ${groupedCount} mục tiêu`,
              exact: true,
            })
            .click();
        }
        await firstItem.waitFor({ timeout: 30000 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
          ),
          false,
          "Horizontal overflow " + kind + " " + level,
        );
        const name = kind + "-hsk" + level + ".png";
        if (level === "1")
          await page.screenshot({
            path: path.join(destination, name),
            fullPage: true,
          });
        manifest.push({
          kind,
          level,
          expectedCount: count,
          screenshot: level === "1" ? name : null,
          viewport: "390x844",
          platform: "web",
        });
        if (kind === "grammar" && level === "1") {
          await page
            .getByRole("button", {
              name: "Xem " + title + " · mục " + first.level_order,
              exact: true,
            })
            .click();
          await page.getByText("小高去哪儿了？", { exact: true }).waitFor();
          await page
            .getByText("今天我们学习第一课。", { exact: true })
            .waitFor();
          await page.screenshot({
            path: path.join(destination, "grammar-hsk1-examples.png"),
            fullPage: true,
          });
          manifest.push({
            kind: "grammar_examples",
            level: "1",
            screenshot: "grammar-hsk1-examples.png",
            platform: "web",
          });
          await page
            .getByRole("button", { name: "Đóng chi tiết", exact: true })
            .last()
            .click();
        }
      }
    }
    await page.goto(origin + "/hsk/syllabus?band=3");
    await page
      .getByText("1000 từ tích lũy đến HSK 3", { exact: true })
      .waitFor({ timeout: 30000 });
    await page.getByRole("textbox").fill("还");
    await page
      .getByRole("button", { name: "Xem 还 · mục 178", exact: true })
      .waitFor({ timeout: 30000 });
    await page
      .getByRole("button", { name: "Xem 还 · mục 178", exact: true })
      .click();
    await page
      .getByText("Mã tham chiếu: HSK30-2025-VOC-HSK3-00178", { exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(destination, "polyphonic-hai-hsk3.png"),
      fullPage: true,
    });
    await page.goto(origin + "/hsk/syllabus?band=1&source=legacy-pdf");
    await page
      .getByText("Mở tài liệu chính thức", { exact: true })
      .waitFor({ timeout: 30000 });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(destination, "manifest.json"),
      JSON.stringify(
        {
          platform: "web",
          freshIsolatedBrowserProfile: true,
          notPhysicalDeviceQA: true,
          checks:
            "35 source-count views + grammar examples + HSK3 cumulative + polyphonic search + legacy PDF route",
          errors,
          manifest,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: 35 source-count screens; examples; 500/1000 counts; polyphonic search; legacy route; no page errors.",
    );
  } catch (error) {
    await page
      .screenshot({
        path: path.join(destination, "failure.png"),
        fullPage: true,
      })
      .catch(() => {});
    console.error(error);
    console.error((await page.locator("body").innerText()).slice(0, 4500));
    console.error(errors);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
