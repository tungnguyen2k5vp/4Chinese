import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import { sha256File, SKY_DB_SHA256 } from "./lib/english-pack";

const revision = "388adc0826300912e5b0311c089e0e70494b065f";
async function main() {
  const output = resolve(
    process.argv[2] ?? "artifacts/v7-english-source-" + Date.now(),
  );
  const location = relative(resolve("artifacts"), output);
  if (
    !location ||
    location.startsWith("..") ||
    isAbsolute(location) ||
    existsSync(output)
  )
    throw new Error("DOWNLOAD_REQUIRES_NEW_ARTIFACT_DIRECTORY");
  mkdirSync(output, { recursive: true });
  const files = [];
  for (const filename of [
    "README.md",
    "README.en.md",
    "ATTRIBUTION.md",
    "LICENSE",
    "schema.sql",
    "stats.md",
    "dictionary_en_vi.db",
  ]) {
    const url =
      "https://raw.githubusercontent.com/skypediacode/english-vietnamese-dictionary/" +
      revision +
      "/" +
      filename;
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok)
      throw new Error("DOWNLOAD_FAILED:" + filename + ":" + response.status);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 60 * 1024 * 1024)
      throw new Error("SOURCE_FILE_TOO_LARGE");
    const path = resolve(output, filename);
    writeFileSync(path, bytes, { flag: "wx" });
    const checksum = await sha256File(path);
    if (filename === "dictionary_en_vi.db" && checksum !== SKY_DB_SHA256)
      throw new Error("DOWNLOAD_CHECKSUM_MISMATCH");
    files.push({ filename, url, checksum, bytes: bytes.byteLength });
  }
  if (!readFileSync(resolve(output, "LICENSE"), "utf8").includes("ShareAlike"))
    throw new Error("LICENSE_UNEXPECTED");
  writeFileSync(
    resolve(output, "download-manifest.json"),
    JSON.stringify(
      {
        revision,
        downloadedAt: new Date().toISOString(),
        distributionStatus: "LICENSE_REVIEW_REQUIRED",
        files,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(output);
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
