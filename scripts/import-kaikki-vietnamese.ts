import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { csvCell, csvTables, sha256File } from "./lib/english-pack";
import {
  importKaikkiVietnamese,
  readKaikkiGzip,
} from "./lib/kaikki-vietnamese";

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || process.argv.length !== 4)
    throw new Error(
      "USAGE:tsx scripts/import-kaikki-vietnamese.ts SOURCE_GZ NEW_ARTIFACT_DIRECTORY",
    );
  const source = resolve(input),
    out = resolve(output),
    location = relative(resolve("artifacts"), out);
  if (
    !location ||
    location.startsWith("..") ||
    isAbsolute(location) ||
    existsSync(out)
  )
    throw new Error("OUTPUT_MUST_BE_NEW_ARTIFACT_DIRECTORY");
  const manifest = JSON.parse(
    readFileSync(resolve(dirname(source), "download-manifest.json"), "utf8"),
  ) as {
    edition?: string;
    format?: string;
    files?: { filename: string; sha256: string }[];
  };
  const hash = await sha256File(source);
  if (
    manifest.edition !== "viwiktionary" ||
    manifest.format !== "raw-wiktextract-jsonl" ||
    manifest.files?.find(
      (item) => item.filename === "raw-wiktextract-data.jsonl.gz",
    )?.sha256 !== hash
  )
    throw new Error("SOURCE_MANIFEST_OR_CHECKSUM_MISMATCH");
  const snapshotPath = resolve(dirname(source), "rawdata.html");
  const page = readFileSync(snapshotPath, "utf8");
  if (
    manifest.files?.find((item) => item.filename === "rawdata.html")?.sha256 !==
    (await sha256File(snapshotPath))
  )
    throw new Error("SNAPSHOT_METADATA_CHECKSUM_MISMATCH");
  const dump = page.match(/dump dated (\d{4}-\d{2}-\d{2})/u)?.[1];
  const extracted = page.match(/extracted on (\d{4}-\d{2}-\d{2})/u)?.[1];
  if (!dump || !extracted) throw new Error("SNAPSHOT_METADATA_DRIFT");
  mkdirSync(out, { recursive: true });
  const path = resolve(out, "english-dictionary.sqlite"),
    db = new DatabaseSync(path);
  let report;
  try {
    const counts = await importKaikkiVietnamese(db, readKaikkiGzip(source), {
      sha256: hash,
      version: "dump:" + dump + ";extract:" + extracted,
    });
    for (const [name, query] of Object.entries(csvTables)) {
      const statement = db.prepare(query),
        columns = statement.columns().map((item) => item.name);
      const handle = openSync(resolve(out, name + ".csv"), "wx");
      try {
        writeSync(handle, "\ufeff" + columns.map(csvCell).join(",") + "\r\n");
        for (const row of statement.iterate())
          writeSync(
            handle,
            columns.map((column) => csvCell(row[column])).join(",") + "\r\n",
          );
      } finally {
        closeSync(handle);
      }
    }
    report = {
      counts,
      dump,
      extracted,
      sourceSha256: hash,
      sourceBytes: statSync(source).size,
      headwords: db
        .prepare(
          "SELECT COUNT(DISTINCT normalized_headword) n FROM english_words",
        )
        .get()?.n,
      pos: db
        .prepare(
          "SELECT part_of_speech,COUNT(*) n FROM english_senses GROUP BY part_of_speech ORDER BY n DESC",
        )
        .all(),
      accents: db
        .prepare(
          "SELECT accent,COUNT(*) n FROM english_pronunciations GROUP BY accent",
        )
        .all(),
      missingSenseEntries: db
        .prepare(
          "SELECT COUNT(*) n FROM english_words w WHERE NOT EXISTS(SELECT 1 FROM english_senses s WHERE s.word_id=w.word_id)",
        )
        .get()?.n,
      noRuntimeInstallation: true,
      licenseApproved: false,
    };
  } finally {
    db.close();
  }
  if ((await sha256File(source)) !== hash)
    throw new Error("SOURCE_CHANGED_DURING_IMPORT");
  const result = {
    ...report,
    dictionaryBytes: statSync(path).size,
    dictionarySha256: await sha256File(path),
  };
  writeFileSync(
    resolve(out, "pack-report.json"),
    JSON.stringify(result, null, 2),
    { flag: "wx" },
  );
  console.log(JSON.stringify(result, null, 2));
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
