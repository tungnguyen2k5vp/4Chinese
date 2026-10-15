import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { pipeline } from "node:stream/promises";

// Raw Vietnamese-edition export: no post-processed third-party merges.
const base = "https://kaikki.org/viwiktionary/";
async function main() {
  const output = resolve(
    process.argv[2] ?? "artifacts/v7-kaikki-" + Date.now(),
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
  for (const item of [
    { name: "rawdata.html", url: base + "rawdata.html", limit: 2_000_000 },
    {
      name: "copyright-policy.html",
      url: "https://vi.wiktionary.org/w/index.php?title=Wiktionary:Quy%E1%BB%81n_t%C3%A1c_gi%E1%BA%A3&oldid=2210567",
      limit: 2_000_000,
    },
    {
      name: "raw-wiktextract-data.jsonl.gz",
      url: base + "raw-wiktextract-data.jsonl.gz",
      limit: 60_000_000,
    },
  ]) {
    const response = await fetch(item.url, {
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok || !response.body)
      throw new Error("DOWNLOAD_FAILED:" + item.name + ":" + response.status);
    const hash = createHash("sha256");
    let bytes = 0;
    async function* chunks() {
      for await (const chunk of response.body!) {
        bytes += chunk.byteLength;
        if (bytes > item.limit)
          throw new Error("SOURCE_FILE_TOO_LARGE:" + item.name);
        hash.update(chunk);
        yield chunk;
      }
    }
    await pipeline(
      chunks(),
      createWriteStream(resolve(output, item.name), { flags: "wx" }),
    );
    files.push({
      filename: item.name,
      url: item.url,
      finalUrl: response.url,
      bytes,
      sha256: hash.digest("hex"),
    });
    console.log("Downloaded " + item.name + ": " + bytes + " bytes");
  }
  writeFileSync(
    resolve(output, "download-manifest.json"),
    JSON.stringify(
      {
        downloadedAt: new Date().toISOString(),
        edition: "viwiktionary",
        format: "raw-wiktextract-jsonl",
        distributionStatus: "LICENSE_REVIEW_REQUIRED",
        checksumTrust: "LOCALLY_OBSERVED_NOT_UPSTREAM_SIGNED",
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
