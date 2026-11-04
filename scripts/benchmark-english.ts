import { writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  analyzeEnglishBulk,
  findEnglishCandidates,
  getEnglishSenses,
} from "../src/db/english/dictionary";
import { englishHeadwordSensePage } from "../src/db/english/dictionary-detail";
import { expoAdapter } from "../src/db/fixtures/legacy_database";

async function main() {
  const input = resolve(
    process.argv[2] ??
      "artifacts/v7-2026-10-10/staging-pack-02/english-dictionary.sqlite",
  );
  const output = resolve(
    process.argv[3] ?? "artifacts/v7-2026-10-10/english-benchmark.json",
  );
  if (
    [input, output].some((path) => {
      const location = relative(resolve("artifacts"), path);
      return !location || location.startsWith("..") || isAbsolute(location);
    })
  )
    throw new Error("ARTIFACT_PATH_REQUIRED");
  const sqlite = new DatabaseSync(input, { readOnly: true });
  try {
    const db = expoAdapter(sqlite),
      samples = [];
    for (const query of ["book", "run", "take off", "sách", "went", "don't"]) {
      const start = performance.now();
      const candidates = await findEnglishCandidates(db, query);
      samples.push({
        query,
        milliseconds: performance.now() - start,
        count: candidates.length,
        exact: candidates.filter((row) => row.match === "exact").length,
      });
    }
    const word = (await findEnglishCandidates(db, "book"))[0];
    const senses = word ? await getEnglishSenses(db, word.word_id) : [];
    let cursor: Awaited<ReturnType<typeof englishHeadwordSensePage>>["next"] =
      null;
    let allBookSenses = 0;
    const allBookPos = new Set<string>();
    do {
      const page = await englishHeadwordSensePage(db, "book", cursor);
      allBookSenses += page.senses.length;
      for (const row of page.senses) allBookPos.add(row.part_of_speech);
      cursor = page.next;
    } while (cursor);
    const bulk = [];
    for (const count of [10, 50, 100]) {
      const start = performance.now();
      const rows = await analyzeEnglishBulk(
        db,
        Array.from(
          { length: count },
          (_, index) =>
            [
              "book",
              "run",
              "take off",
              "went",
              "sách",
              "unknown-fixture-test-" + index,
            ][index % 6],
        ).join("\n"),
      );
      bulk.push({
        count,
        milliseconds: performance.now() - start,
        rows: rows.length,
        autoSelected: rows.filter((row) => row.selectedSenseId !== null).length,
      });
    }
    const report = {
      platform: "WINDOWS_NODE_SQLITE_NOT_ANDROID",
      samples,
      bulk,
      bookSenses: senses.length,
      allBookSenses,
      allBookPos: [...allBookPos],
      counts: {
        words: sqlite.prepare("SELECT COUNT(*) n FROM english_words").get(),
        senses: sqlite.prepare("SELECT COUNT(*) n FROM english_senses").get(),
        forms: sqlite.prepare("SELECT COUNT(*) n FROM english_forms").get(),
        cefr: sqlite.prepare("SELECT COUNT(*) n FROM english_cefr").get(),
      },
      ipa: sqlite
        .prepare(
          "SELECT accent,COUNT(*) n FROM english_pronunciations GROUP BY accent",
        )
        .all(),
      queryPlan: sqlite
        .prepare(
          "EXPLAIN QUERY PLAN SELECT word_id FROM english_words WHERE normalized_headword=?",
        )
        .all("book"),
      independentlyReviewed: 0,
    };
    writeFileSync(output, JSON.stringify(report, null, 2), { flag: "wx" });
    console.log(JSON.stringify(report));
  } finally {
    sqlite.close();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
