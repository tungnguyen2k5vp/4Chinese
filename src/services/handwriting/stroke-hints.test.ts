import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import vocabulary from "@/data/hsk-vocabulary.json";
import strokeData from "@/data/hsk12-strokes.json";
import coverage from "@/data/stroke-coverage.json";

const strokes = strokeData as Record<string, string[]>;

const hsk14Characters = new Set(
  vocabulary
    .filter((word) => [1, 2, 3, 4].includes(Number(word.hskBand)))
    .flatMap((word) => Array.from(`${word.simplified}${word.traditional}`))
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 0x3400 && codePoint <= 0x9fff;
    }),
);

describe("offline HSK 1-4 stroke hints", () => {
  it("bundles ordered paths for common review characters", () => {
    for (const character of ["我", "你", "学", "习", "是", "国"]) {
      expect(strokes[character]?.length, character).toBeGreaterThan(0);
    }
  });

  it("covers HSK 1-4 except explicitly documented source gaps, without substituting other characters", () => {
    const missing = [...hsk14Characters].filter((character) => !strokes[character]?.length);
    expect(missing.sort()).toEqual(coverage.missing.filter((character) => hsk14Characters.has(character)).sort());
  });

  it("keeps broad offline coverage", () => {
    expect(Object.keys(strokes).length).toBeGreaterThanOrEqual(4_100);
    expect(Object.keys(strokes)).toHaveLength(coverage.supported);
  });
  it("stores the exact source paths and lazy shards for each supported character", () => {
    const shards = Array.from({ length: 8 }, (_, index) => JSON.parse(readFileSync(
      resolve('src/data', `stroke-shard-${index}.json`), 'utf8')) as Record<string, string[]>);
    const mismatches: string[] = [];
    for (const [character, paths] of Object.entries(strokes)) {
      const source = JSON.parse(readFileSync(resolve('node_modules/hanzi-writer-data', `${character}.json`), 'utf8'));
      if (JSON.stringify(paths) !== JSON.stringify(source.strokes) ||
          JSON.stringify(shards[character.charCodeAt(0) % 8]?.[character]) !== JSON.stringify(paths) ||
          !paths.every((path) => /^M\s*[-\d.]/u.test(path))) mismatches.push(character);
    }
    expect(mismatches).toEqual([]);
    expect(shards.flatMap((shard) => Object.keys(shard))).toHaveLength(coverage.supported);
  }, 30_000);
});
