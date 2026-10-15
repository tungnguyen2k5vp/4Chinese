import type { SQLiteDatabase } from "expo-sqlite";

const key = "profile-preferences:v1";
export const englishGoals = ["conversation", "work", "study", "exam", "reading"] as const;
export const englishSelfLevels = ["beginner", "basic", "intermediate", "upper-intermediate", "advanced"] as const;
export const englishTopics = ["technology", "travel", "education", "business", "lifestyle", "sports", "science"] as const;
export const englishDailyMinutes = [5, 10, 15, 20] as const;

export type EnglishGoal = (typeof englishGoals)[number];
export type EnglishSelfLevel = (typeof englishSelfLevels)[number];
export type EnglishTopic = (typeof englishTopics)[number];
export interface EnglishProfilePreferences {
  goal: EnglishGoal | null;
  level: EnglishSelfLevel | null;
  topics: EnglishTopic[];
  dailyMinutes: (typeof englishDailyMinutes)[number];
}

export const defaultEnglishProfilePreferences: EnglishProfilePreferences = {
  goal: null,
  level: null,
  topics: [],
  dailyMinutes: 10,
};

function validate(value: unknown): EnglishProfilePreferences {
  if (!value || typeof value !== "object") return { ...defaultEnglishProfilePreferences };
  const row = value as Record<string, unknown>;
  return {
    goal: englishGoals.includes(row.goal as EnglishGoal) ? row.goal as EnglishGoal : null,
    level: englishSelfLevels.includes(row.level as EnglishSelfLevel) ? row.level as EnglishSelfLevel : null,
    topics: Array.isArray(row.topics)
      ? [...new Set(row.topics.filter((topic): topic is EnglishTopic => englishTopics.includes(topic as EnglishTopic)))].slice(0, englishTopics.length)
      : [],
    dailyMinutes: englishDailyMinutes.includes(row.dailyMinutes as EnglishProfilePreferences["dailyMinutes"])
      ? row.dailyMinutes as EnglishProfilePreferences["dailyMinutes"]
      : 10,
  };
}

/** Persists English-only onboarding choices in the existing learner draft store. */
export async function readEnglishProfilePreferences(db: Pick<SQLiteDatabase, "getFirstAsync">): Promise<EnglishProfilePreferences> {
  const row = await db.getFirstAsync<{ payload_json: string }>("SELECT payload_json FROM en_drafts WHERE id=?", key);
  if (!row) return { ...defaultEnglishProfilePreferences };
  try { return validate(JSON.parse(row.payload_json)); }
  catch { return { ...defaultEnglishProfilePreferences }; }
}

export async function saveEnglishProfilePreferences(db: Pick<SQLiteDatabase, "runAsync">, value: EnglishProfilePreferences): Promise<EnglishProfilePreferences> {
  const safe = validate(value);
  await db.runAsync(
    "INSERT INTO en_drafts(id,payload_json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json",
    key,
    JSON.stringify(safe),
  );
  return safe;
}
