import { describe, expect, it } from "vitest";

import {
  HSK30_COUNTS,
  HSK30_KINDS,
  HSK30_LEVELS,
  matchHsk30Vocabulary,
  parseHsk30Csv,
  validateHsk30Bundle,
  type Hsk30Bundle,
  type Hsk30VocabularyCandidate,
  type SourceRow,
} from "./hsk30-source";

import rawBundle from "@/data/hsk30-2025-11.json";

const bundle = rawBundle as unknown as Hsk30Bundle;
const candidate = (
  id: string,
  word: string,
  reading: string,
  pos = '["động từ"]',
): Hsk30VocabularyCandidate => ({
  id,
  simplified: word,
  pinyin: reading,
  pinyin_numeric: reading,
  pos,
  hsk_band: "6",
});
describe("HSK 3.0 2025-11 source contract", () => {
  it("parses BOM, quoted commas, escaped quotes, CRLF and multiline fields without rewriting content", () => {
    expect(
      parseHsk30Csv('\uFEFFid,text\r\nx,"他说""好"",再见。\r\n第二行"\r\n'),
    ).toEqual([{ id: "x", text: '他说"好",再见。\r\n第二行' }]);
  });
  it.each(["a,a\n1,2", "a,b\n1", 'a,b\n"x', 'a,b\n"x"z,y', 'a,b\nx"y,z'])(
    "rejects malformed CSV %s",
    (text) => {
      expect(() => parseHsk30Csv(text)).toThrow();
    },
  );
  it("validates all source IDs, seven level distributions and 2059 linked examples", () => {
    expect(() => validateHsk30Bundle(bundle)).not.toThrow();
    for (const kind of HSK30_KINDS)
      expect(
        HSK30_LEVELS.map(
          (level) =>
            bundle.rows[kind].filter((row) => row.hsk_level === "HSK" + level)
              .length,
        ),
      ).toEqual(HSK30_COUNTS[kind]);
    expect(bundle.rows.vocabulary.filter((row) => !row.pos_zh)).toHaveLength(
      495,
    );
    expect(bundle.rows.grammar.filter((row) => !row.pattern_zh)).toHaveLength(
      7,
    );
    expect(bundle.examples).toHaveLength(2059);
    expect(
      bundle.rows.vocabulary
        .filter((row) => row.word === "得")
        .map((row) => row.pinyin),
    ).toEqual(expect.arrayContaining(["de", "dé", "děi"]));
  });
  it("rejects duplicate source IDs and examples with missing/wrong parents", () => {
    const invalid = structuredClone(bundle);
    invalid.rows.vocabulary[1]!.id = invalid.rows.vocabulary[0]!.id!;
    expect(() => validateHsk30Bundle(invalid)).toThrow("DUPLICATE_SOURCE_ID");
    const wrongParent = structuredClone(bundle);
    wrongParent.examples[0]!.grammar_id = "missing";
    expect(() => validateHsk30Bundle(wrongParent)).toThrow(
      "INVALID_GRAMMAR_EXAMPLE",
    );
  });
  it("keeps tones and POS, rejects ambiguous candidates and never falls back to same headword", () => {
    const rows: SourceRow[] = [
      { id: "de-neutral", word: "得", pinyin: "de", pos_zh: "助" },
      { id: "de-two", word: "得", pinyin: "dé", pos_zh: "动" },
      { id: "de-three", word: "得", pinyin: "děi", pos_zh: "动" },
      { id: "still", word: "还", pinyin: "hái", pos_zh: "副" },
      { id: "missing", word: "缺少的词", pinyin: "quēshǎodecí", pos_zh: "" },
      { id: "pos", word: "长", pinyin: "cháng", pos_zh: "形" },
      { id: "ambiguous", word: "多", pinyin: "duō", pos_zh: "" },
    ];
    const words = [
      candidate("de2", "得", "de2"),
      candidate("dei3", "得", "dei3"),
      candidate("return", "还", "huan2"),
      candidate("long", "长", "chang2"),
      candidate("many1", "多", "duo1"),
      candidate("many2", "多", "duo1"),
    ];
    const before = JSON.stringify({ rows, words });
    const matches = matchHsk30Vocabulary(rows, words);
    expect(matches.map((row) => row.vocabularyId)).toEqual([
      null,
      "de2",
      "dei3",
      null,
      null,
      null,
      null,
    ]);
    expect(matches.map((row) => row.reason)).toEqual([
      "READING_REVIEW",
      "EXACT_READING",
      "EXACT_READING",
      "READING_REVIEW",
      "NO_HEADWORD",
      "POS_CONFLICT",
      "MULTIPLE_CANDIDATES",
    ]);
    expect(JSON.stringify({ rows, words })).toBe(before);
  });
});
