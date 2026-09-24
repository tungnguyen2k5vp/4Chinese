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
const simplifiedFallbacks = new Map<string, string>();
const supportedWords = [
  ...vocabulary.filter((item) => [1, 2, 3, 4].includes(Number(item.hskBand))),
  ...supplementalVocabulary,
];

for (const word of supportedWords) {
  const simplifiedCharacters = Array.from(word.simplified);
  const traditionalCharacters = Array.from(word.traditional);
  if (simplifiedCharacters.length === traditionalCharacters.length) {
    traditionalCharacters.forEach((character, index) => {
      const simplified = simplifiedCharacters[index];
      if (simplified && character !== simplified) simplifiedFallbacks.set(character, simplified);
    });
  }
  for (const character of Array.from(`${word.simplified}${word.traditional}`)) {
    if (/^[\u3400-\u9fff]$/u.test(character)) characters.add(character);
  }
}

const strokes: Record<string, string[]> = {};
const missing: string[] = [];
for (const character of [...characters].sort()) {
  const source = resolve(packageRoot, `${character}.json`);
  if (existsSync(source)) {
    const data = JSON.parse(readFileSync(source, "utf8")) as SourceStrokeData;
    if (data.strokes?.length) strokes[character] = data.strokes;
    continue;
  }
  const fallback = simplifiedFallbacks.get(character);
  const fallbackSource = fallback && resolve(packageRoot, `${fallback}.json`);
  if (fallbackSource && existsSync(fallbackSource)) {
    const fallbackData = JSON.parse(readFileSync(fallbackSource, "utf8")) as SourceStrokeData;
    if (fallbackData.strokes?.length) {
      strokes[character] = fallbackData.strokes;
      continue;
    }
  }
  missing.push(character);
}

writeFileSync(output, `${JSON.stringify(strokes)}\n`, "utf8");
copyFileSync(resolve(packageRoot, "ARPHICPL.TXT"), licenseOutput);
console.log(`Wrote ${Object.keys(strokes).length}/${characters.size} HSK 1-4 characters to ${output}`);
console.log(`Copied the stroke data license to ${licenseOutput}`);
if (missing.length) console.log(`Missing ${missing.length}: ${missing.join("")}`);
