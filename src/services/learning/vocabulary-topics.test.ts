import { describe, expect, it } from "vitest";

import { groupLearningTopics, groupVocabularyByTopic, vocabularyTopicId } from "./vocabulary-topics";

import type { Vocabulary } from "@/types/models";

function word(simplified: string, meaning: string, pos = "danh từ"): Vocabulary {
  return {
    id: simplified, simplified, traditional: simplified, pinyin: "", pinyinNumeric: "",
    primaryMeaningVi: meaning, meaningsVi: [meaning], meaningsEn: [], pos: [pos], hskBand: 1,
    frequencyRank: null, classifiers: [], radical: null, strokeCount: null, visualType: "none",
    imageUri: null, imageSource: null, imageLicense: null, imageAttribution: null, audioUri: null,
    source: "test", sourceVersion: "1", sourceUrl: "", translationStatus: "verified",
    examples: [], masteryLevel: 0, status: "NEW", studied: false, nextReviewAt: null,
    reviewCount: 0, isFavorite: false, due: null, isCustom: false, deckId: null,
  };
}

describe("vocabulary topics", () => {
  it('yields without losing topic order and cancels work when a source is changed', async () => {
    const words = Array.from({ length: 250 }, (_, index) => word(String(index), index % 2 ? 'quả táo' : 'trường học'));
    expect(await groupLearningTopics(words, () => true)).toEqual(groupVocabularyByTopic(words));
    let active = true;
    const pending = groupLearningTopics(words, () => active);
    active = false;
    expect(await pending).toBeNull();
  });
  it("classifies common meanings into useful themes", () => {
    expect(vocabularyTopicId(word("苹果", "quả táo; trái cây"))).toBe("food");
    expect(vocabularyTopicId(word("学校", "trường học"))).toBe("school-work");
    expect(vocabularyTopicId(word("妈妈", "mẹ; người mẹ"))).toBe("people");
    expect(vocabularyTopicId(word("跑", "chạy", "động từ"))).toBe("actions");
  });

  it("keeps deterministic word order inside every topic", () => {
    const words = [word("茶", "trà"), word("水", "nước uống"), word("谁", "ai")];
    const groups = groupVocabularyByTopic(words);
    expect(groups.get("food")?.map((item) => item.simplified)).toEqual(["茶", "水"]);
    expect(groups.get("communication")?.map((item) => item.simplified)).toEqual(["谁"]);
  });
});
