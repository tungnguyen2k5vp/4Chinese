import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseHsk30Csv } from "../src/services/hsk/hsk30-source";

import { sha256File } from "./lib/english-pack";

async function main() {
  const directory = resolve("artifacts/v7-2026-10-10/sources/cefrj-d4e45b7");
  const reports = [];
  for (const filename of [
    "cefrj-vocabulary-profile-1.5.csv",
    "octanove-vocabulary-profile-c1c2-1.0.csv",
  ]) {
    const path = resolve(directory, filename),
      rows = parseHsk30Csv(readFileSync(path, "utf8"));
    reports.push({
      filename,
      sha256: await sha256File(path),
      records: rows.length,
      levels: Object.fromEntries(
        ["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => [
          level,
          rows.filter((row) => row.CEFR === level).length,
        ]),
      ),
      pos: [...new Set(rows.map((row) => row.pos))],
      notSenseSpecific: true,
    });
  }
  const output = {
    revision: "d4e45b75b38f27b30dfc5c44d8c571aec7e7092f",
    reports,
    mappedWords: 0,
    mappedSenses: 0,
    status: "SOURCE_AUDITED_NOT_MAPPED",
  };
  writeFileSync(
    resolve("artifacts/v7-2026-10-10/cefr-source-audit.json"),
    JSON.stringify(output, null, 2),
    { flag: "wx" },
  );
  console.log(JSON.stringify(output));
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
