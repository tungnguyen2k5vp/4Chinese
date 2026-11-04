import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Text } from "react-native";

import { LanguageProvider, useLearningLanguage } from "./LanguageProvider";
import { LanguageController } from "./controller";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { StartupLoading } from "@/components/StartupRecovery";
import {
  ENGLISH_LEARNER_DATABASE,
  initializeEnglishLearner,
} from "@/db/english/learner";
import {
  initializeLanguagePreferences,
  LANGUAGE_PREFERENCES_DATABASE,
  languagePreferenceStore,
} from "@/db/english/preferences";
import { useTheme } from "@/theme/ThemeProvider";

type Runtime = {
  controller: LanguageController;
  englishDb: SQLiteDatabase | null;
};
const EnglishDatabase = createContext<SQLiteDatabase | null>(null);
// Process-lifetime ownership: one handle shared by all English routes, never SQLite's
// global Suspense cache and never its Chinese context. Switching does not close it.
let pendingRuntime: Promise<Runtime> | undefined;
function initializeRuntime(): Promise<Runtime> {
  if (!pendingRuntime) {
    pendingRuntime = (async () => {
      const preferencesDb = await openDatabaseAsync(
        LANGUAGE_PREFERENCES_DATABASE,
      );
      await initializeLanguagePreferences(preferencesDb);
      const store = languagePreferenceStore(preferencesDb);
      const controller = new LanguageController(store, await store.read());
      // A damaged/future English database must not prevent Chinese learning.
      let englishDb: SQLiteDatabase | null = null;
      try {
        const opened = await openDatabaseAsync(ENGLISH_LEARNER_DATABASE);
        await initializeEnglishLearner(opened);
        englishDb = opened;
      } catch {
        /* No reset/overwrite. The English boundary exposes recovery. */
      }
      return { controller, englishDb };
    })().catch((error) => {
      pendingRuntime = undefined;
      throw error;
    });
  }
  return pendingRuntime;
}
export function useEnglishDatabase() {
  const db = useContext(EnglishDatabase);
  if (!db) throw new Error("ENGLISH_DATABASE_PROVIDER_MISSING");
  return db;
}
export function EnglishAvailability({ children }: { children: ReactNode }) {
  const db = useContext(EnglishDatabase);
  const { controller } = useLearningLanguage();
  const theme = useTheme();
  const [message, setMessage] = useState("");
  if (db) return children;
  return (
    <Screen title="Chưa mở được dữ liệu tiếng Anh">
      <Text accessibilityRole="alert" style={{ color: theme.textPrimary }}>
        Dữ liệu tiếng Anh có lỗi hoặc thuộc phiên bản mới hơn. Không đặt lại
        hoặc ghi đè dữ liệu. Bạn vẫn có thể học tiếng Trung; thử đóng và mở lại
        app để kiểm tra tiếng Anh.
      </Text>
      <PrimaryButton
        label="Tiếp tục học tiếng Trung, giữ dữ liệu tiếng Anh"
        onPress={() => {
          void controller
            .update({ learningLanguage: "zh" })
            .then((result) =>
              setMessage(
                result.status === "BLOCKED"
                  ? "Còn phiên học hoặc bản nháp đang được bảo vệ. Hãy hoàn tất trước."
                  : "Đã chọn tiếng Trung. Quay về các tab để tiếp tục.",
              ),
            )
            .catch(() => setMessage("Chưa lưu được lựa chọn. Hãy thử lại."));
        }}
      />
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.textPrimary }}
        >
          {message}
        </Text>
      ) : null}
    </Screen>
  );
}
export function LanguageRuntime({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void initializeRuntime()
      .then((value) => {
        if (live) setRuntime(value);
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  if (error)
    return (
      <Screen title="Chưa mở được dữ liệu ngôn ngữ">
        <Text accessibilityRole="alert" style={{ color: theme.textPrimary }}>
          Chưa đọc được cài đặt ngôn ngữ hoặc dữ liệu tiếng Anh. Không đặt lại
          dữ liệu hay chuyển về mặc định để che lỗi.
        </Text>
        <PrimaryButton
          label="Thử mở lại dữ liệu ngôn ngữ"
          onPress={() => {
            setError(false);
            setAttempt((n) => n + 1);
          }}
        />
      </Screen>
    );
  if (!runtime) return <StartupLoading />;
  return (
    <LanguageProvider controller={runtime.controller}>
      <EnglishDatabase.Provider value={runtime.englishDb}>
        {children}
      </EnglishDatabase.Provider>
    </LanguageProvider>
  );
}
