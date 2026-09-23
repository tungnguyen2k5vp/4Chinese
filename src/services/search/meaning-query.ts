import { normalizeSearch } from "@/services/search/normalize";

const aliases: Record<string, string[]> = {
  "cam on": ["cam ta", "ta on"],
  "xin chao": ["chao", "chao hoi"],
  "tam biet": ["chao tam biet", "chia tay"],
  "giao vien": ["thay giao", "co giao", "nguoi day hoc"],
  "hoc sinh": ["sinh vien", "nguoi hoc"],
  "di hoc": ["den truong", "hoc"],
  "rat": ["vo cung", "het suc", "qua"],
  "ban be": ["ban"],
  "nguoi ban": ["ban"],
  "an com": ["an", "bua an"],
  "uong nuoc": ["uong", "nuoc"],
  "gia dinh": ["nha", "nguoi than"],
  "cong viec": ["lam viec", "nghe nghiep"],
  "yeu thich": ["thich", "men"],
  "mua sam": ["mua", "ban hang"],
  "uong": ["do uong", "喝"],
  "com": ["bua an", "an com", "饭", "米饭"],
  "doi": ["doi bung", "饿"],
  "nha an": ["nha hang", "quan an", "phong an", "cang tin", "食堂", "餐厅"],
  "do an": ["thuc an", "thuc pham", "mon an", "食物"],
  "cai bat": ["bat", "chen", "碗"],
  "my": ["mi", "mi soi", "mỳ", "面条儿", "面条"],
  "muon": ["mong muon", "想"],
  "cham": ["cham chap", "慢"],
  "banh man thau": ["man thau", "馒头"],
  "banh bao": ["banh bao hap", "包子"],
  "banh sui cao": ["sui cao", "饺子"],
  "nuoc viet nam": ["viet nam", "越南"],
  "viet nam": ["nuoc viet nam", "越南"],
  "nuoc my": ["hoa ky", "hoa ki", "美国"],
  "hoa ky": ["nuoc my", "my", "美国"],
  "nuoc anh": ["anh quoc", "英国"],
  "nuoc phap": ["phap", "法国"],
  "nuoc duc": ["duc", "德国"],
  "nhat ban": ["nuoc nhat", "日本"],
  "han quoc": ["nam han", "韩国"],
  "thai lan": ["nuoc thai", "泰国"],
  "trung quoc": ["nuoc trung quoc", "中国"],
  "buoi sang": ["sang", "sang som", "buoi sang som", "上午", "早上"],
  "sang som": ["buoi sang som", "som", "早上", "清晨"],
  "buoi sang som": ["sang som", "buoi sang", "早上", "清晨"],
  "buoi trua": ["trua", "giua trua", "中午"],
  "trua": ["buoi trua", "giua trua", "中午"],
  "som": ["sang som", "buoi sang som", "早", "早上"],
};

export function meaningSearchAlternatives(query: string): string[] {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];
  const values = [normalized, ...(aliases[normalized] ?? [])];
  // Individual tokens are deliberately not treated as synonyms. Searching
  // "nước Việt Nam" by the token "nước" previously promoted unrelated
  // entries such as "nước đi" above the country name. Repository search still
  // has an all-token fallback when no phrase/alias is available.
  return Array.from(new Set(values.map(normalizeSearch).filter(Boolean))).slice(0, 8);
}
