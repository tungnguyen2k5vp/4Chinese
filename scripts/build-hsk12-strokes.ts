import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import vocabulary from "../src/data/hsk-vocabulary.json";
import { supplementalVocabulary } from "../src/data/supplemental-vocabulary";

interface SourceStrokeData {
  strokes?: string[];
}

const root = resolve(import.meta.dirname, "..");
const packageRoot = resolve(root, "node_modules", "hanzi-writer-data");
const output = resolve(root, "src", "data", "hsk12-strokes.json");
const licenseOutput = resolve(root, "src", "data", "ARPHICPL.TXT");
const characters = new Set<string>();

for (const word of [...vocabulary.filter((item) => item.hskBand === 1 || item.hskBand === 2), ...supplementalVocabulary]) {
  for (const character of Array.from(`${word.simplified}${word.traditional}`)) {
    if (/^[\u3400-\u9fff]$/u.test(character)) characters.add(character);
  }
}

const strokes: Record<string, string[]> = {};
const missing: string[] = [];
for (const character of [...characters].sort()) {
  const source = resolve(packageRoot, `${character}.json`);
  if (!existsSync(source)) {
    missing.push(character);
    continue;
  }
  const data = JSON.parse(readFileSync(source, "utf8")) as SourceStrokeData;
  if (data.strokes?.length) strokes[character] = data.strokes;
}

writeFileSync(output, `${JSON.stringify(strokes)}\n`, "utf8");
copyFileSync(resolve(packageRoot, "ARPHICPL.TXT"), licenseOutput);
console.log(`Wrote ${Object.keys(strokes).length}/${characters.size} HSK 1-2 characters to ${output}`);
console.log(`Copied the stroke data license to ${licenseOutput}`);
if (missing.length) console.log(`Missing ${missing.length}: ${missing.join("")}`);
