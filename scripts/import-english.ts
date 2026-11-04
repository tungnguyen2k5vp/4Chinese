import { randomUUID } from "node:crypto";
import {
  closeSync,
  copyFileSync,
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

import {
  auditEnglishSource,
  csvCell,
  csvTables,
  importSkypedia,
  sha256File,
  SKY_DB_SHA256,
  SKY_SOURCE_URL,
} from "./lib/english-pack";

async function main() {
  const args = process.argv.slice(2);
  const allowed = new Set(["--source", "--out", "--apply"]);
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]!;
    if (!allowed.has(flag) || values.has(flag))
      throw new Error("INVALID_OR_DUPLICATE_ARGUMENT:" + flag);
    if (flag === "--apply") {
      values.set(flag, "true");
      continue;
    }
    const value = args[++index];
    if (!value || value.startsWith("--"))
      throw new Error("MISSING_ARGUMENT:" + flag);
    values.set(flag, value);
  }
  const sourcePath = resolve(
    values.get("--source") ??
      "artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db",
  );
  const out = resolve(
    values.get("--out") ?? "artifacts/v7-2026-10-10/english-" + randomUUID(),
  );
  const location = relative(resolve("artifacts"), out);
  if (location.startsWith("..") || isAbsolute(location) || !location)
    throw new Error("OUTPUT_MUST_BE_NEW_ARTIFACT_DIRECTORY");
  if (existsSync(out)) throw new Error("REFUSING_OUTPUT_OVERWRITE");
  const sha = await sha256File(sourcePath);
  if (sha !== SKY_DB_SHA256) throw new Error("PINNED_SOURCE_CHECKSUM_MISMATCH");
  // downloaded dictionary stays quarantined; nothing is copied into src/assets.
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    const audit = auditEnglishSource(source);
    mkdirSync(out, { recursive: true });
    const report = {
      sourceUrl: SKY_SOURCE_URL,
      sha256: sha,
      bytes: statSync(sourcePath).size,
      mode: values.has("--apply") ? "staging-apply" : "dry-run",
      audit,
    };
    writeFileSync(
      resolve(out, "source-audit.json"),
      JSON.stringify(report, null, 2),
      { flag: "wx" },
    );
    if (!values.has("--apply")) {
      console.log(JSON.stringify({ output: out, ...report }));
      return;
    }
    const attributionPath = resolve(dirname(sourcePath), "ATTRIBUTION.md");
    const licensePath = resolve(dirname(sourcePath), "LICENSE");
    if (!existsSync(attributionPath) || !existsSync(licensePath))
      throw new Error("ATTRIBUTION_AND_LICENSE_REQUIRED");
    copyFileSync(attributionPath, resolve(out, "ATTRIBUTION.md"));
    copyFileSync(licensePath, resolve(out, "LICENSE"));
    const targetPath = resolve(out, "english-dictionary.sqlite");
    const target = new DatabaseSync(targetPath);
    try {
      importSkypedia(
        source,
        target,
        sha,
        readFileSync(attributionPath, "utf8"),
      );
      for (const [name, query] of Object.entries(csvTables)) {
        const statement = target.prepare(query);
        const headers = statement.columns().map((column) => column.name);
        const handle = openSync(resolve(out, name + ".csv"), "wx");
        try {
          writeSync(handle, "\ufeff" + headers.map(csvCell).join(",") + "\r\n");
          for (const row of statement.iterate())
            writeSync(
              handle,
              headers.map((header) => csvCell(row[header])).join(",") + "\r\n",
            );
        } finally {
          closeSync(handle);
        }
      }
      target.exec("PRAGMA optimize");
      if (target.prepare("PRAGMA quick_check").get()?.quick_check !== "ok")
        throw new Error("OUTPUT_INTEGRITY_FAILED");
    } finally {
      target.close();
    }
    if ((await sha256File(sourcePath)) !== sha)
      throw new Error("SOURCE_WAS_CHANGED");
    const output = {
      output: out,
      sourceUnchanged: true,
      distributionStatus: "LICENSE_REVIEW_REQUIRED",
      dictionaryBytes: statSync(targetPath).size,
      dictionarySha256: await sha256File(targetPath),
      audit,
    };
    writeFileSync(
      resolve(out, "pack-report.json"),
      JSON.stringify(output, null, 2),
      { flag: "wx" },
    );
    console.log(JSON.stringify(output));
  } finally {
    source.close();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
