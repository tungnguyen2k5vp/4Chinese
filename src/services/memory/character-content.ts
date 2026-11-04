/** Original editorial contrast notes. These are study groups, not a diagnosis of the learner. */
export type ContrastCharacter = {
  hanzi: string;
  pinyin: string;
  meaning: string;
  contrast: string;
  highlightStrokes: number[];
  sourceUrl: string;
};
export type ContrastGroup = {
  id: string;
  title: string;
  characters: ContrastCharacter[];
  basis: "EDITORIAL";
};
const entry = (
  hanzi: string,
  pinyin: string,
  meaning: string,
  contrast: string,
  highlightStrokes: number[],
): ContrastCharacter => ({
  hanzi,
  pinyin,
  meaning,
  contrast,
  highlightStrokes,
  sourceUrl: `https://www.zdic.net/hans/${encodeURIComponent(hanzi)}`,
});
export const characterContrastGroups: ContrastGroup[] = [
  {
    id: "wei-mo",
    title: "未 / 末",
    basis: "EDITORIAL",
    characters: [
      entry(
        "未",
        "wèi",
        "chưa",
        "Nét ngang trên ngắn hơn nét ngang bên dưới.",
        [0, 1],
      ),
      entry(
        "末",
        "mò",
        "cuối; ngọn",
        "Nét ngang trên dài hơn nét ngang bên dưới.",
        [0, 1],
      ),
    ],
  },
  {
    id: "tu-shi",
    title: "土 / 士",
    basis: "EDITORIAL",
    characters: [
      entry(
        "土",
        "tǔ",
        "đất",
        "Nét ngang dưới dài hơn nét ngang trên.",
        [0, 2],
      ),
      entry(
        "士",
        "shì",
        "kẻ sĩ; người có chuyên môn",
        "Nét ngang trên dài hơn nét ngang dưới.",
        [0, 2],
      ),
    ],
  },
  {
    id: "ri-mu",
    title: "日 / 目",
    basis: "EDITORIAL",
    characters: [
      entry(
        "日",
        "rì",
        "ngày; mặt trời",
        "Bên trong khung có một nét ngang.",
        [2],
      ),
      entry(
        "目",
        "mù",
        "mắt; mục",
        "Bên trong khung có hai nét ngang.",
        [2, 3],
      ),
    ],
  },
  {
    id: "ji-yi-si",
    title: "己 / 已 / 巳",
    basis: "EDITORIAL",
    characters: [
      entry(
        "己",
        "jǐ",
        "bản thân",
        "Đầu nét cong bên trái thấp, còn mở ở phía trên.",
        [2],
      ),
      entry(
        "已",
        "yǐ",
        "đã",
        "Đầu nét cong bên trái vươn tới nét ngang giữa.",
        [2],
      ),
      entry(
        "巳",
        "sì",
        "Tỵ (địa chi thứ sáu)",
        "Phần trên khép kín; nhìn chỗ nối phía trái.",
        [2],
      ),
    ],
  },
  {
    id: "qing-family",
    title: "请 / 情 / 清 / 晴",
    basis: "EDITORIAL",
    characters: [
      entry(
        "请",
        "qǐng",
        "mời; xin",
        "Phía trái là 讠, phân biệt với 忄, 氵 và 日.",
        [0, 1],
      ),
      entry(
        "情",
        "qíng",
        "tình cảm",
        "Phía trái là 忄. Cùng phần 青 không có nghĩa là đồng nghĩa.",
        [0, 1, 2],
      ),
      entry(
        "清",
        "qīng",
        "trong; sạch",
        "Phía trái là 氵; đọc thanh 1.",
        [0, 1, 2],
      ),
      entry(
        "晴",
        "qíng",
        "trời quang; nắng ráo",
        "Phía trái là 日; đọc thanh 2.",
        [0, 1, 2, 3],
      ),
    ],
  },
];
export const contrastGroupForCharacter = (character: string) =>
  characterContrastGroups.find((group) =>
    group.characters.some((item) => item.hanzi === character),
  );

export type CharacterStructure = {
  layout: string;
  parts: string[];
  radical: string | null;
  pinyin: string;
  meaning: string;
  sourceUrl: string;
  roles: readonly {
    part: string;
    role: "semantic" | "phonetic";
    sourceUrl: string;
  }[];
};
// Independently authored modern-shape study notes, not an etymology/IDS corpus.
// Radical is explicit: it is not necessarily the first visible component.
type StructureRow = [string, string, string, string, string, string];
const rows: StructureRow[] = [
  // character, pinyin, short character meaning, radical, layout, components
  ["你", "nǐ", "bạn", "亻", "Trái – phải", "亻 尔"],
  ["他", "tā", "anh ấy", "亻", "Trái – phải", "亻 也"],
  ["她", "tā", "cô ấy", "女", "Trái – phải", "女 也"],
  ["们", "men", "hậu tố chỉ số nhiều", "亻", "Trái – phải", "亻 门"],
  ["住", "zhù", "ở, cư trú", "亻", "Trái – phải", "亻 主"],
  ["休", "xiū", "nghỉ", "亻", "Trái – phải", "亻 木"],
  ["信", "xìn", "tin; thư", "亻", "Trái – phải", "亻 言"],
  ["好", "hǎo / hào", "tốt; thích", "女", "Trái – phải", "女 子"],
  ["妈", "mā", "mẹ", "女", "Trái – phải", "女 马"],
  ["妹", "mèi", "em gái", "女", "Trái – phải", "女 未"],
  ["姐", "jiě", "chị gái", "女", "Trái – phải", "女 且"],
  ["学", "xué", "học", "子", "Trên – dưới", "⺍ 冖 子"],
  ["字", "zì", "chữ", "子", "Trên – dưới", "宀 子"],
  ["家", "jiā", "nhà, gia đình", "宀", "Trên – dưới", "宀 豕"],
  ["安", "ān", "yên, an toàn", "宀", "Trên – dưới", "宀 女"],
  ["明", "míng", "sáng, rõ", "日", "Trái – phải", "日 月"],
  ["晚", "wǎn", "muộn, buổi tối", "日", "Trái – phải", "日 免"],
  ["时", "shí", "thời gian", "日", "Trái – phải", "日 寸"],
  ["早", "zǎo", "sớm", "日", "Trên – dưới", "日 十"],
  ["晴", "qíng", "trời quang", "日", "Trái – phải", "日 青"],
  ["林", "lín", "rừng", "木", "Trái – phải", "木 木"],
  ["森", "sēn", "rừng rậm", "木", "Trên – dưới", "木 林"],
  ["校", "xiào / jiào", "trường; hiệu đính", "木", "Trái – phải", "木 交"],
  ["杯", "bēi", "cốc", "木", "Trái – phải", "木 不"],
  ["样", "yàng", "kiểu, dạng", "木", "Trái – phải", "木 羊"],
  ["相", "xiāng / xiàng", "lẫn nhau; dáng vẻ", "目", "Trái – phải", "木 目"],
  ["河", "hé", "sông", "氵", "Trái – phải", "氵 可"],
  ["海", "hǎi", "biển", "氵", "Trái – phải", "氵 每"],
  ["洗", "xǐ", "rửa, giặt", "氵", "Trái – phải", "氵 先"],
  ["湖", "hú", "hồ", "氵", "Trái – phải", "氵 胡"],
  ["清", "qīng", "trong, sạch", "氵", "Trái – phải", "氵 青"],
  ["说", "shuō / shuì", "nói; thuyết phục", "讠", "Trái – phải", "讠 兑"],
  ["话", "huà", "lời nói", "讠", "Trái – phải", "讠 舌"],
  ["请", "qǐng", "mời, xin", "讠", "Trái – phải", "讠 青"],
  ["课", "kè", "bài, tiết học", "讠", "Trái – phải", "讠 果"],
  ["读", "dú / dòu", "đọc; dấu ngắt câu", "讠", "Trái – phải", "讠 卖"],
  ["语", "yǔ / yù", "ngôn ngữ; nói với", "讠", "Trái – phải", "讠 吾"],
  ["吃", "chī", "ăn", "口", "Trái – phải", "口 乞"],
  ["喝", "hē / hè", "uống; hô", "口", "Trái – phải", "口 曷"],
  ["吗", "ma / má / mǎ", "trợ từ hỏi; cách đọc tùy từ", "口", "Trái – phải", "口 马"],
  ["听", "tīng", "nghe", "口", "Trái – phải", "口 斤"],
  ["看", "kàn / kān", "nhìn; trông coi", "目", "Trên – dưới", "龵 目"],
  ["打", "dǎ / dá", "đánh; tá (đơn vị)", "扌", "Trái – phải", "扌 丁"],
  ["找", "zhǎo", "tìm", "扌", "Trái – phải", "扌 戈"],
  ["拿", "ná", "cầm, lấy", "手", "Trên – dưới", "合 手"],
  ["快", "kuài", "nhanh; vui", "忄", "Trái – phải", "忄 夬"],
  ["情", "qíng", "tình cảm", "忄", "Trái – phải", "忄 青"],
  ["想", "xiǎng", "nghĩ, muốn, nhớ", "心", "Trên – dưới", "相 心"],
  ["热", "rè", "nóng", "灬", "Trên – dưới", "执 灬"],
  ["钱", "qián", "tiền", "钅", "Trái – phải", "钅 戋"],
  ["银", "yín", "bạc", "钅", "Trái – phải", "钅 艮"],
  ["铁", "tiě", "sắt", "钅", "Trái – phải", "钅 失"],
  ["花", "huā", "hoa; tiêu (tiền)", "艹", "Trên – dưới", "艹 化"],
  ["茶", "chá", "trà", "艹", "Trên – giữa – dưới", "艹 人 木"],
  ["菜", "cài", "rau; món ăn", "艹", "Trên – dưới", "艹 采"],
  ["饭", "fàn", "cơm, bữa ăn", "饣", "Trái – phải", "饣 反"],
  ["跑", "pǎo / páo", "chạy; bới (chân)", "足", "Trái – phải", "𧾷 包"],
  ["路", "lù", "đường", "足", "Trái – phải", "𧾷 各"],
  ["问", "wèn", "hỏi", "门", "Bao từ trên", "门 口"],
  ["间", "jiān / jiàn", "giữa; khoảng cách", "门", "Bao từ trên", "门 日"],
  ["国", "guó", "nước, quốc gia", "囗", "Bao kín", "囗 玉"],
  ["男", "nán", "nam", "田", "Trên – dưới", "田 力"],
  ["这", "zhè / zhèi", "này", "辶", "Bao từ dưới trái", "辶 文"],
];
const structures = new Map(rows.map(([character, pinyin, meaning, radical, layout, parts]) =>
  [character, { pinyin, meaning, radical, layout, parts: parts.split(" ") }]));
const roleParts: Record<string, [string, string]> = {
  妈: ["女", "马"], 清: ["氵", "青"], 请: ["讠", "青"], 情: ["忄", "青"], 晴: ["日", "青"],
};
const componentMeanings: Record<string, string> = {
  亻: "người", 人: "người", 讠: "lời nói", 言: "lời nói", 氵: "nước", 水: "nước",
  扌: "tay", 手: "tay", 龵: "dạng tay phía trên", 忄: "tâm trí, cảm xúc", 心: "tim, tâm trí",
  钅: "kim loại", 金: "kim loại", 艹: "cỏ, cây", 宀: "mái nhà", 日: "mặt trời, ngày",
  月: "mặt trăng, tháng", 木: "cây, gỗ", 口: "miệng", 女: "phụ nữ", 子: "con, trẻ nhỏ",
  门: "cửa", 目: "mắt", 足: "chân", "𧾷": "dạng chân bên trái", 田: "ruộng", 力: "sức mạnh",
  辶: "bước chân, di chuyển", 文: "văn", 羊: "con dê", 饣: "ăn uống", 囗: "khung bao kín",
  灬: "dạng lửa ở đáy", 马: "ngựa", 青: "xanh", 十: "mười", 也: "cũng", 主: "chủ",
  不: "không", 可: "có thể", 先: "trước", 果: "quả", 舌: "lưỡi", 斤: "cân; rìu",
  丁: "đinh", 戈: "qua (vũ khí)", 合: "hợp, khép", 未: "chưa", 玉: "ngọc", 冖: "mái che",
  "⺍": "cụm nét phía trên", 豕: "lợn", 尔: "nhĩ", 寸: "tấc", 免: "miễn", 交: "giao",
};
export function componentMeaning(part: string): string {
  return componentMeanings[part] ?? structures.get(part)?.meaning ?? "thành phần hình thể";
}
const radicalForms: Record<string, string> = { 亻: "人", 氵: "水", 忄: "心", 扌: "手", 灬: "火", 讠: "言", 钅: "金", 饣: "食", "𧾷": "足" };
export const canonicalRadical = (radical: string) => radicalForms[radical] ?? radical;

/** Only the curated inventory is used; similarity never implies identical meaning or sound. */
export function relatedCharacters(character: string) {
  const current = structures.get(character);
  if (!current) return { radical: [], component: [] };
  const others = rows.filter(([char]) => char !== character);
  return {
    radical: others.filter(([, , , radical]) => canonicalRadical(radical) === canonicalRadical(current.radical)).map(([char]) => char),
    component: others.filter(([, , , , , parts]) => parts.split(" ").some(part =>
      current.parts.includes(part) && canonicalRadical(part) !== canonicalRadical(current.radical))).map(([char]) => char),
  };
}
/** Han script only; punctuation/Latin never becomes a character-analysis card. */
export const hanCharacters = (value: string) => [...new Set([...value].filter(char => /\p{Script=Han}/u.test(char)))];
export function characterStructure(
  character: string,
): CharacterStructure | null {
  const value = structures.get(character);
  const sourceUrl = `https://www.zdic.net/hans/${encodeURIComponent(character)}`;
  return value
    ? {
        ...value,
        parts: [...value.parts],
        roles: roleParts[character]?.map((part, index) => ({ part, role: index === 0 ? "semantic" as const : "phonetic" as const, sourceUrl })) ?? [],
        sourceUrl,
      }
    : null;
}
export type StructureNode = {
  character: string;
  children: StructureNode[];
  truncated: boolean;
};
/** Both a path guard and a depth cap protect future decomposition data from cycles. */
export function buildStructureTree(
  character: string,
  lookup: (char: string) => readonly string[] = (char) =>
    characterStructure(char)?.parts ?? [],
  seen: readonly string[] = [],
  depth = 0,
): StructureNode {
  if (seen.includes(character) || depth >= 6)
    return { character, children: [], truncated: true };
  return {
    character,
    children: lookup(character).map((part) =>
      buildStructureTree(part, lookup, [...seen, character], depth + 1),
    ),
    truncated: false,
  };
}
