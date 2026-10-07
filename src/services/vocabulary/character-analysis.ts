import { findCommonRadical } from "@/data/common-radicals";
import type { Vocabulary } from "@/types/models";

export type CharacterAnalysis = {
  character: string;
  decomposition: string;
  radical: string | null;
  radicalName: string;
  radicalMeaning: string;
  mnemonic: string;
};

const decompositionMap: Record<string, string[]> = {
  "\u8fd9": ["\u8fb6", "\u6587"],
  "\u6837": ["\u6728", "\u7f8a"],
  你: ["亻", "尔"],
  他: ["亻", "也"],
  她: ["女", "也"],
  们: ["亻", "门"],
  住: ["亻", "主"],
  休: ["亻", "木"],
  信: ["亻", "言"],
  好: ["女", "子"],
  妈: ["女", "马"],
  学: ["⺍", "冖", "子"],
  字: ["宀", "子"],
  家: ["宀", "豕"],
  安: ["宀", "女"],
  明: ["日", "月"],
  晚: ["日", "免"],
  时: ["日", "寸"],
  早: ["日", "十"],
  林: ["木", "木"],
  校: ["木", "交"],
  杯: ["木", "不"],
  河: ["氵", "可"],
  海: ["氵", "每"],
  洗: ["氵", "先"],
  湖: ["氵", "胡"],
  说: ["讠", "兑"],
  话: ["讠", "舌"],
  请: ["讠", "青"],
  课: ["讠", "果"],
  读: ["讠", "卖"],
  语: ["讠", "吾"],
  吃: ["口", "乞"],
  喝: ["口", "曷"],
  吗: ["口", "马"],
  听: ["口", "斤"],
  看: ["手", "目"],
  打: ["扌", "丁"],
  找: ["扌", "戈"],
  拿: ["合", "手"],
  快: ["忄", "夬"],
  情: ["忄", "青"],
  想: ["相", "心"],
  爱: ["爫", "冖", "心"],
  热: ["执", "灬"],
  钱: ["钅", "戋"],
  银: ["钅", "艮"],
  铁: ["钅", "失"],
  花: ["艹", "化"],
  茶: ["艹", "人", "木"],
  菜: ["艹", "采"],
  饭: ["饣", "反"],
  跑: ["足", "包"],
  路: ["足", "各"],
  轻: ["车", "圣"],
  问: ["门", "口"],
  间: ["门", "日"],
  雪: ["雨", "彗"],
  国: ["囗", "玉"],
  电: ["雨", "申"],
  男: ["田", "力"],
  妹: ["女", "未"],
};

const componentMeanings: Record<string, string> = {
  "亻": "người",
  人: "người",
  讠: "lời nói",
  言: "lời nói",
  氵: "nước",
  水: "nước",
  扌: "tay và hành động",
  手: "tay",
  忄: "cảm xúc, tâm trí",
  心: "trái tim, tâm trí",
  钅: "kim loại",
  金: "kim loại",
  艹: "cỏ, thực vật",
  宀: "mái nhà",
  日: "mặt trời, ngày",
  月: "mặt trăng, tháng",
  木: "cây, gỗ",
  口: "miệng, lời nói",
  女: "phụ nữ",
  子: "con, trẻ nhỏ",
  贝: "tiền, tài sản",
  门: "cửa",
  目: "mắt",
  足: "chân, bước đi",
  车: "xe cộ",
  雨: "mưa, thời tiết",
  田: "ruộng",
  力: "sức mạnh",
  "\u8fb6": "b\u01b0\u1edbc ch\u00e2n, di chuy\u1ec3n",
  "\u6587": "v\u0103n; ph\u1ea7n g\u1ee3i \u00e2m",
  "\u7f8a": "con d\u00ea; ph\u1ea7n g\u1ee3i \u00e2m",
  "\u7eba": "t\u01a1, s\u1ee3i",
  "\u5f84": "\u0111\u01b0\u1eddng nh\u1ecf",
  饣: "ăn uống",
  囗: "khung bao quanh",
};
const mnemonicOverrides: Record<string, string> = {
  "\u8fd9": "\u8fb6 g\u1ee3i b\u01b0\u1edbc ch\u00e2n \u0111ang \u0111i, \u6587 l\u00e0 ph\u1ea7n g\u1ee3i \u00e2m. H\u00ecnh dung b\u01b0\u1edbc ch\u00e2n ch\u1ec9 \u0111\u00fang n\u01a1i n\u00e0y: \u8fd9 = n\u00e0y.",
  "\u6837": "\u6728 g\u1ee3i v\u1eadt b\u1eb1ng g\u1ed7, \u7f8a g\u1ee3i \u00e2m y\u00e1ng. H\u00ecnh dung m\u1ed9t m\u00f3n \u0111\u1ed3 g\u1ed7 c\u00f3 ki\u1ec3u d\u00e1ng con d\u00ea: \u6837 = ki\u1ec3u, lo\u1ea1i.",
  "\u4e3a": "Nh\u1edb \u4e3a qua hai c\u00e1ch d\u00f9ng: w\u00e8i l\u00e0 \u201cv\u00ec, cho\u201d; w\u00e9i l\u00e0 \u201cl\u00e0m, tr\u1edf th\u00e0nh\u201d. Lu\u00f4n nh\u00ecn c\u1ea3 c\u00e2u \u0111\u1ec3 ch\u1ecdn ngh\u0129a.",
  "\u5df2": "N\u00e9t cong nh\u01b0 m\u1ed9t v\u00f2ng \u0111\u00e3 kh\u00e9p l\u1ea1i. Vi\u1ec7c \u0111\u00e3 k\u1ebft th\u00fac th\u00ec d\u00f9ng \u5df2: \u201c\u0111\u00e3\u201d.",
  "\u7ecf": "\u7eba b\u00ean tr\u00e1i l\u00e0 s\u1ee3i t\u01a1; \u5f84 b\u00ean ph\u1ea3i g\u1ee3i m\u1ed9t l\u1ed1i \u0111i. N\u1ed1i c\u00e1c s\u1ee3i l\u1ea1i th\u00e0nh m\u1ed9t tuy\u1ebfn quen thu\u1ed9c: \u7ecf = \u0111\u00e3 tr\u1ea3i qua, kinh qua.",
  "\u65b0": "\u4eb2 g\u1ee3i s\u1ef1 g\u1ea7n g\u0169i, \u65a4 l\u00e0 c\u00e1i r\u00ecu ch\u1eb7t ra ph\u1ea7n m\u1edbi. H\u00ecnh dung ch\u1eb7t m\u1ed9t l\u00e1t m\u1edbi: \u65b0 = m\u1edbi.",
};


function uniqueCharacters(value: string): string[] {
  return [...value].filter((character, index, characters) => characters.indexOf(character) === index);
}

function findComponentInfo(component: string) {
  return findCommonRadical(component) ?? findCommonRadical(componentMeanings[component] ? component : "");
}

function componentDescription(component: string): string {
  const info = findComponentInfo(component);
  return `${component} (${info?.meaningVi ?? componentMeanings[component] ?? "thành phần gợi ý"})`;
}

export function analyzeCharacter(
  character: string,
  primaryMeaning: string,
  preferredRadical?: string | null,
): CharacterAnalysis {
  const preferred = preferredRadical?.trim() || null;
  const parts = decompositionMap[character] ?? (
    preferred && preferred !== character ? [preferred, character] : [character]
  );
  const radical = findComponentInfo(parts[0] ?? "") ?? (preferred ? findComponentInfo(preferred) : undefined);
  const partText = parts.map(componentDescription).join(" + ");
  const leadMeaning = radical?.meaningVi ?? componentMeanings[parts[0] ?? ""] ?? "hình dáng chữ";
  const generatedMnemonic = parts.length > 1
    ? `Hãy hình dung ${parts.map((part) => componentMeanings[part] ?? part).join(" + ")} → liên tưởng đến “${primaryMeaning}” để nhớ ${character}.`
    : `Nhìn ${character} như “${leadMeaning}”; gắn hình ảnh này với nghĩa “${primaryMeaning}” để nhớ lâu.`;

  const mnemonic = mnemonicOverrides[character] ?? generatedMnemonic;
  return {
    character,
    decomposition: partText,
    radical: radical?.character ?? preferred,
    radicalName: radical?.name ?? "Thành phần gợi ý",
    radicalMeaning: leadMeaning,
    mnemonic,
  };
}

/** Creates an explanation for every distinct Hanzi in a word, including custom words. */
export function analyzeVocabulary(word: Pick<Vocabulary, "simplified" | "primaryMeaningVi" | "radical">): CharacterAnalysis[] {
  return uniqueCharacters(word.simplified).map((character, index) => (
    analyzeCharacter(character, word.primaryMeaningVi, index === 0 ? word.radical : null)
  ));
}

export function buildMnemonicNote(analyses: CharacterAnalysis[]): string {
  return analyses.map((item) => `${item.character}: ${item.mnemonic}`).join("\n");
}
