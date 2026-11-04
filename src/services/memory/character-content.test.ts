import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildStructureTree,
  characterContrastGroups,
  characterStructure,
  canonicalRadical,
  hanCharacters,
  relatedCharacters,
} from "./character-content";
const localStrokes = Object.assign(
  {},
  ...Array.from({ length: 8 }, (_, i) =>
    JSON.parse(
      readFileSync(
        new URL(`../../data/stroke-shard-${i}.json`, import.meta.url),
        "utf8",
      ),
    ),
  ),
) as Record<string, string[]>;
Object.assign(
  localStrokes,
  JSON.parse(
    readFileSync(
      new URL("../handwriting/supplemental-strokes.json", import.meta.url),
      "utf8",
    ),
  ),
);
describe("editorial character contrasts and bounded structures", () => {
  it("covers all requested groups, preserves tone marks and highlights actual local strokes", () => {
    expect(characterContrastGroups.map((g) => g.title)).toEqual([
      "未 / 末",
      "土 / 士",
      "日 / 目",
      "己 / 已 / 巳",
      "请 / 情 / 清 / 晴",
    ]);
    expect(
      characterContrastGroups.flatMap((g) => g.characters).map((c) => c.pinyin),
    ).toEqual([
      "wèi",
      "mò",
      "tǔ",
      "shì",
      "rì",
      "mù",
      "jǐ",
      "yǐ",
      "sì",
      "qǐng",
      "qíng",
      "qīng",
      "qíng",
    ]);
    for (const group of characterContrastGroups) {
      expect(group.basis).toBe("EDITORIAL");
      for (const char of group.characters) {
        const paths = localStrokes[char.hanzi] ?? [];
        expect(paths.length).toBeGreaterThan(0);
        expect(
          char.highlightStrokes.every((i) => i >= 0 && i < paths.length),
        ).toBe(true);
        expect(char.sourceUrl).toContain("zdic.net");
      }
    }
  });
  it("does not manufacture phonetic roles or unknown decomposition and bounds cycles", () => {
    expect(characterStructure("龘")).toBeNull();
    expect(characterStructure("清")?.roles.map(({ part, role }) => [part, role])).toEqual([["氵", "semantic"], ["青", "phonetic"]]);
    expect(characterStructure("休")?.roles).toEqual([]);
    expect(buildStructureTree("明").children.map((c) => c.character)).toEqual([
      "日",
      "月",
    ]);
    expect(
      buildStructureTree("甲", (char) => (char === "甲" ? ["乙"] : ["甲"]))
        .children[0]?.children[0]?.truncated,
    ).toBe(true);
  });
  it("uses explicit dictionary radicals, Unicode Han characters and consistent families", () => {
    expect(["学", "看", "拿", "想", "热"].map(char => characterStructure(char)?.radical)).toEqual(["子", "目", "手", "心", "灬"]);
    expect(hanCharacters("汉A汉𠮷，字3🙂")).toEqual(["汉", "𠮷", "字"]);
    expect(relatedCharacters("清").radical).toContain("海");
    expect(relatedCharacters("清").component).toEqual(expect.arrayContaining(["请", "情", "晴"]));
    expect(relatedCharacters("龘")).toEqual({ radical: [], component: [] });
    for (const char of relatedCharacters("拿").radical) {
      expect(canonicalRadical(characterStructure(char)!.radical!)).toBe("手");
    }
    const value = characterStructure("林")!;
    value.parts.pop();
    expect(characterStructure("林")?.parts).toEqual(["木", "木"]);
  });
});
