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
