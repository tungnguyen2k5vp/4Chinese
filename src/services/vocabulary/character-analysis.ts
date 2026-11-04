import { findCommonRadical } from "@/data/common-radicals";
import { characterStructure, componentMeaning, hanCharacters } from "@/services/memory/character-content";
import type { Vocabulary } from "@/types/models";

export type CharacterAnalysis = {
  character: string;
  decomposition: string;
  radical: string | null;
  radicalName: string;
  radicalMeaning: string;
  mnemonic: string;
};

const mnemonicOverrides: Record<string, string> = {
  "\u8fd9": "Liên tưởng cá nhân: hình dung bước chân chỉ vào đúng nơi này để nhớ 这. Đây không phải giải thích từ nguyên.",
  "\u6837": "Liên tưởng cá nhân: một món đồ gỗ có kiểu dáng con dê để nhớ 样. Đây không phải giải thích từ nguyên.",
  "\u4e3a": "Nh\u1edb \u4e3a qua hai c\u00e1ch d\u00f9ng: w\u00e8i l\u00e0 \u201cv\u00ec, cho\u201d; w\u00e9i l\u00e0 \u201cl\u00e0m, tr\u1edf th\u00e0nh\u201d. Lu\u00f4n nh\u00ecn c\u1ea3 c\u00e2u \u0111\u1ec3 ch\u1ecdn ngh\u0129a.",
  "已": "Mẹo nhớ cá nhân: gắn 已 với một việc bạn đã hoàn thành. Chữ 已 chưa khép kín phía trên như 巳; hãy đối chiếu mẫu chữ. Không phải từ nguyên.",
  "\u7ecf": "Liên tưởng cá nhân: gắn 经 với một trải nghiệm đã qua của bạn. Không suy ra cấu tạo hoặc nguồn gốc chữ từ câu chuyện này.",
  "新": "Mẹo nhớ cá nhân: hình dung một trang vở mới để gắn với nghĩa mới của 新. Không suy ra nguồn gốc chữ từ câu chuyện này.",
};


export function analyzeCharacter(
  character: string,
  primaryMeaning: string,
  preferredRadical?: string | null,
): CharacterAnalysis {
  const structure = characterStructure(character);
  const parts = structure?.parts ?? [];
  const radicalGlyph = structure?.radical ?? preferredRadical?.trim() ?? null;
  const radical = radicalGlyph ? findCommonRadical(radicalGlyph) : undefined;
  const partText = parts.length
    ? parts.map(part => `${part} (${componentMeaning(part)})`).join(" + ")
    : "Chưa có phân rã đã kiểm tra";
  const leadMeaning = radical?.meaningVi ?? (radicalGlyph ? componentMeaning(radicalGlyph) : "chưa xác minh");
  const meaning = structure?.meaning || primaryMeaning;
  const generatedMnemonic = parts.length
    ? `Liên tưởng cá nhân: nhìn ${parts.join(" + ")} rồi gắn với nghĩa “${meaning}” của ${character}. Đây không phải giải thích từ nguyên.`
    : `Gắn ${character}${meaning ? ` với nghĩa “${meaning}”` : " với một ngữ cảnh quen thuộc"}. Chưa có cấu tạo đã kiểm tra để tạo mẹo theo bộ thủ.`;

  const mnemonic = mnemonicOverrides[character] ?? generatedMnemonic;
  return {
    character,
    decomposition: partText,
    radical: radicalGlyph,
    radicalName: radical?.name ?? (radicalGlyph ? `Bộ ${radicalGlyph}` : "Chưa xác minh bộ thủ"),
    radicalMeaning: leadMeaning,
    mnemonic,
  };
}

/** A word's meaning/radical must not be silently assigned to every constituent character. */
export function analyzeVocabulary(word: Pick<Vocabulary, "simplified" | "primaryMeaningVi" | "radical">): CharacterAnalysis[] {
  const characters = hanCharacters(word.simplified);
  const single = characters.length === 1 && word.simplified.trim() === characters[0];
  return characters.map(character => analyzeCharacter(character, single ? word.primaryMeaningVi : "", single ? word.radical : null));
}

export function buildMnemonicNote(analyses: CharacterAnalysis[]): string {
  return analyses.map((item) => `${item.character}: ${item.mnemonic}`).join("\n");
}
