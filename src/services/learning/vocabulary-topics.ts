import { normalizeSearch } from "@/services/search/normalize";
import type { Vocabulary } from "@/types/models";

export type VocabularyTopicId =
  | "people"
  | "food"
  | "school-work"
  | "places-travel"
  | "time-numbers"
  | "health-body"
  | "nature"
  | "actions"
  | "communication";

export type VocabularyTopic = {
  id: VocabularyTopicId;
  title: string;
  description: string;
};

export const vocabularyTopics: readonly VocabularyTopic[] = [
  { id: "people", title: "Con người & quan hệ", description: "Gia đình, nghề nghiệp và các mối quan hệ" },
  { id: "food", title: "Ăn uống", description: "Món ăn, đồ uống và nhà hàng" },
  { id: "school-work", title: "Học tập & công việc", description: "Trường lớp, văn phòng và nghề nghiệp" },
  { id: "places-travel", title: "Địa điểm & đi lại", description: "Nơi chốn, phương tiện và du lịch" },
  { id: "time-numbers", title: "Thời gian & số đếm", description: "Ngày giờ, số lượng và tiền bạc" },
  { id: "health-body", title: "Cơ thể & sức khỏe", description: "Cơ thể, bệnh tật và chăm sóc sức khỏe" },
  { id: "nature", title: "Thiên nhiên & đời sống", description: "Thời tiết, động vật và môi trường" },
  { id: "actions", title: "Hành động & miêu tả", description: "Động từ, tính chất và trạng thái" },
  { id: "communication", title: "Giao tiếp thông dụng", description: "Câu hỏi, đại từ và từ nối thường gặp" },
] as const;

const rules: readonly [VocabularyTopicId, RegExp][] = [
  ["food", /\b(an|uong|com|gao|mi|banh|thit|ca|rau|qua|trai cay|tra|ca phe|sua|nuoc|ruou|mon|bua|nha hang|quan an|nau|ngon|doi|khat)\b/],
  ["health-body", /\b(co the|dau|mat|mui|mieng|rang|tai|tay|chan|tim|mau|benh|bac si|benh vien|thuoc|suc khoe|khoe|om|dau|chet|song)\b/],
  ["school-work", /\b(hoc|truong|lop|giao vien|hoc sinh|sinh vien|dai hoc|sach|vo|but|bai|thi|cong viec|lam viec|van phong|cong ty|nhan vien|giam doc|nghe nghiep)\b/],
  ["places-travel", /\b(noi|cho|nha|phong|cua hang|sieu thi|cho|duong|pho|thanh pho|nong thon|san bay|ga|xe|tau|may bay|di lai|du lich|khach san|bac kinh|trung quoc|nuoc ngoai)\b/],
  ["time-numbers", /\b(ngay|thang|nam|tuan|gio|phut|giay|hom nay|hom qua|ngay mai|sang|trua|chieu|toi|thoi gian|lan|so|dem|bao nhieu|tien|gia|dong tien)\b/],
  ["people", /\b(nguoi|gia dinh|bo|me|cha|ong|ba|anh|chi|em|con|vo|chong|ban be|ban|dong nghiep|khach|dan ong|phu nu|tre em|ten|ho)\b/],
  ["nature", /\b(thien nhien|troi|mua|nang|gio|tuyet|may|khi hau|thoi tiet|song|bien|nui|cay|hoa|co|dong vat|cho|meo|chim|ca|moi truong)\b/],
];

export function vocabularyTopicId(word: Vocabulary): VocabularyTopicId {
  const haystack = normalizeSearch([
    word.primaryMeaningVi,
    ...word.meaningsVi,
    ...word.meaningsEn,
    ...word.pos,
  ].join(" "));
  for (const [id, pattern] of rules) {
    if (pattern.test(haystack)) return id;
  }
  if (/dong tu|tinh tu|pho tu/.test(haystack)) return "actions";
  return "communication";
}

export function groupVocabularyByTopic(words: Vocabulary[]): Map<VocabularyTopicId, Vocabulary[]> {
  const groups = new Map<VocabularyTopicId, Vocabulary[]>();
  for (const word of words) {
    const id = vocabularyTopicId(word);
    const group = groups.get(id);
    if (group) group.push(word);
    else groups.set(id, [word]);
  }
  return groups;
}
