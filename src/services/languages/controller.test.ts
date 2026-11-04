import { DatabaseSync } from "node:sqlite";

import { describe, expect, it, vi } from "vitest";

import {
  LanguageController,
  defaultLanguagePreferences,
  validateLanguagePreferences,
} from "./controller";

import {
  initializeLanguagePreferences,
  languagePreferenceStore,
} from "@/db/english/preferences";
import { expoAdapter } from "@/db/fixtures/legacy_database";

async function fixture() {
  const raw = new DatabaseSync(":memory:");
  const db = expoAdapter(raw);
  await initializeLanguagePreferences(db);
  const store = languagePreferenceStore(db);
  return {
    raw,
    db,
    store,
    controller: new LanguageController(store, await store.read()),
  };
}
describe("independent language preferences and guarded context", () => {
  it("defaults to Chinese and Vietnamese UI; persists EN/GB across controller recreation", async () => {
    const { raw, store, controller } = await fixture();
    try {
      expect(controller.getSnapshot()).toEqual(defaultLanguagePreferences);
      await controller.update({
        learningLanguage: "en",
        englishVariant: "en-GB",
      });
      const reopened = new LanguageController(store, await store.read());
      expect(reopened.sessionContext("new")).toMatchObject({
        learningLanguage: "en",
        pronunciationVariant: "en-GB",
        uiLocale: "vi",
      });
      await reopened.update({ learningLanguage: "zh" });
      expect(reopened.sessionContext("zh")).toMatchObject({
        pronunciationVariant: "zh-CN",
      });
      expect(reopened.getSnapshot().englishVariant).toBe("en-GB");
    } finally {
      raw.close();
    }
  });
  it.each(["SESSION", "DRAFT", "RECORDING"] as const)(
    "blocks %s until its owner explicitly releases it",
    async (reason) => {
      const { raw, controller } = await fixture();
      try {
        const release = controller.protect(reason);
        expect(await controller.update({ learningLanguage: "en" })).toEqual({
          status: "BLOCKED",
          reasons: [reason],
        });
        expect(controller.getSnapshot().learningLanguage).toBe("zh");
        release();
        release();
        expect(await controller.update({ learningLanguage: "en" })).toEqual({
          status: "CHANGED",
        });
      } finally {
        raw.close();
      }
    },
  );
  it("does not release another draft owned by the same kind of guard", async () => {
    const { raw, controller } = await fixture();
    try {
      const release = controller.protect("DRAFT");
      const other = controller.protect("DRAFT");
      release();
      expect((await controller.update({ learningLanguage: "en" })).status).toBe(
        "BLOCKED",
      );
      other();
      expect((await controller.update({ learningLanguage: "en" })).status).toBe(
        "CHANGED",
      );
    } finally {
      raw.close();
    }
  });
  it("captures immutable context, rather than changing an existing session", async () => {
    const { raw, controller } = await fixture();
    try {
      const session = controller.sessionContext("zh-session");
      await controller.update({ learningLanguage: "en" });
      expect(session.learningLanguage).toBe("zh");
      expect(Object.isFrozen(session)).toBe(true);
    } finally {
      raw.close();
    }
  });
  it("rolls back visible selection and notifications on storage failure", async () => {
    const store = {
      read: async () => defaultLanguagePreferences,
      write: vi.fn().mockRejectedValue(new Error("DISK_FULL")),
    };
    const controller = new LanguageController(
      store,
      defaultLanguagePreferences,
    );
    const listener = vi.fn();
    controller.subscribe(listener);
    await expect(controller.update({ learningLanguage: "en" })).rejects.toThrow(
      "DISK_FULL",
    );
    expect(controller.getSnapshot().learningLanguage).toBe("zh");
    expect(listener).not.toHaveBeenCalled();
    store.write.mockResolvedValue(undefined);
    await controller.update({ learningLanguage: "en" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("rejects overlapping writes, and skips no-op writes", async () => {
    let finish!: () => void;
    const write = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const controller = new LanguageController(
      { read: async () => defaultLanguagePreferences, write },
      defaultLanguagePreferences,
    );
    expect((await controller.update({ learningLanguage: "zh" })).status).toBe(
      "UNCHANGED",
    );
    expect(write).not.toHaveBeenCalled();
    const pending = controller.update({ learningLanguage: "en" });
    expect(() => controller.protect("SESSION")).toThrow(
      "LANGUAGE_SWITCH_IN_PROGRESS",
    );
    expect(() => controller.sessionContext("racing")).toThrow(
      "LANGUAGE_SWITCH_IN_PROGRESS",
    );
    await expect(controller.update({ learningLanguage: "zh" })).rejects.toThrow(
      "LANGUAGE_SWITCH_IN_PROGRESS",
    );
    finish();
    await pending;
  });
  it("refuses corrupted preferences rather than silently resetting them", () => {
    expect(() =>
      validateLanguagePreferences({
        ...defaultLanguagePreferences,
        learningLanguage: "fr",
      }),
    ).toThrow("INVALID_LANGUAGE");
  });
  it("never writes to a separate Chinese database during ZH → EN → ZH", async () => {
    const chinese = new DatabaseSync(":memory:");
    chinese.exec(
      "CREATE TABLE progress(id TEXT PRIMARY KEY, payload TEXT); INSERT INTO progress VALUES('hsk-1-ni','unchanged'); PRAGMA user_version=45;",
    );
    const before = JSON.stringify(
      chinese.prepare("SELECT * FROM progress").all(),
    );
    const { raw, controller } = await fixture();
    try {
      await controller.update({ learningLanguage: "en" });
      await controller.update({ learningLanguage: "zh" });
      expect(
        JSON.stringify(chinese.prepare("SELECT * FROM progress").all()),
      ).toBe(before);
      expect(chinese.prepare("PRAGMA user_version").get()).toEqual({
        user_version: 45,
      });
      expect(Object.isFrozen(controller.getSnapshot())).toBe(true);
    } finally {
      raw.close();
      chinese.close();
    }
  });
  it("initializes idempotently and refuses newer preference schema", async () => {
    const { raw, db, store } = await fixture();
    try {
      await store.write({
        ...defaultLanguagePreferences,
        learningLanguage: "en",
      });
      await initializeLanguagePreferences(db);
      expect((await store.read()).learningLanguage).toBe("en");
      raw.exec("PRAGMA user_version=2");
      await expect(initializeLanguagePreferences(db)).rejects.toThrow(
        "DOWNGRADE_REFUSED",
      );
      expect((await store.read()).learningLanguage).toBe("en");
    } finally {
      raw.close();
    }
  });
  it("refuses a foreign schema even at version zero without changing rows", async () => {
    const raw = new DatabaseSync(":memory:");
    try {
      raw.exec(
        "CREATE TABLE vocabulary(id TEXT); INSERT INTO vocabulary VALUES('zh-preserved')",
      );
      await expect(
        initializeLanguagePreferences(expoAdapter(raw)),
      ).rejects.toThrow("WRONG_LANGUAGE_PREFERENCES_DATABASE");
      expect(raw.prepare("PRAGMA user_version").get()).toEqual({
        user_version: 0,
      });
      expect(raw.prepare("SELECT * FROM vocabulary").all()).toEqual([
        { id: "zh-preserved" },
      ]);
      expect(
        raw
          .prepare(
            "SELECT COUNT(*) n FROM sqlite_master WHERE name='learning_preferences'",
          )
          .get(),
      ).toEqual({ n: 0 });
    } finally {
      raw.close();
    }
  });
});
