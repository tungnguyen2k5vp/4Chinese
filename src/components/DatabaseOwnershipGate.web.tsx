import { useEffect, useState, type PropsWithChildren } from "react";
import { Text } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { Screen } from "./Screen";
import { StartupLoading } from "./StartupRecovery";

import {
  acquireDocumentDatabaseLease,
  type DatabaseLeaseState,
} from "@/services/app/database-lease";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";

let documentLease: Promise<DatabaseLeaseState> | undefined;

function waitForOldWorkerHandles(): Promise<DatabaseLeaseState> {
  return new Promise((resolve) => {
    const worker = new Worker(
      new URL("../services/app/opfs-probe", window.location.href),
    );
    const timeout = setTimeout(() => finish("failed"), 8000);
    function finish(state: DatabaseLeaseState) {
      clearTimeout(timeout);
      worker.terminate();
      resolve(state);
    }
    worker.onmessage = (event) =>
      finish(event.data === "ready" ? "ready" : "failed");
    worker.onerror = () => finish("failed");
  });
}

function OwnershipNotice({ state }: { state: DatabaseLeaseState }) {
  const theme = useTheme();
  const busy = state === "busy";
  return (
    <Screen
      title={busy ? "Dữ liệu đang mở ở tab khác" : "Chưa mở được dữ liệu học"}
    >
      <Text
        accessibilityRole="alert"
        style={{ color: theme.textPrimary, fontSize: 17, lineHeight: 26 }}
      >
        {busy
          ? "Chỉ mở một tab 4Chinese cùng lúc. Đóng tab đang học, rồi tải lại tab này. Tiến độ đã lưu vẫn giữ nguyên."
          : state === "unsupported"
            ? "Trình duyệt này chưa hỗ trợ khóa dữ liệu cần thiết. Hãy dùng Edge hoặc Chrome mới trên localhost/HTTPS, hoặc học trên app điện thoại."
            : "Trình duyệt chưa cho phép mở dữ liệu. Đóng các tab 4Chinese khác rồi tải lại; không xóa dữ liệu trình duyệt."}
      </Text>
      <PrimaryButton
        label="Tải lại trang, giữ dữ liệu"
        onPress={() => window.location.reload()}
      />
    </Screen>
  );
}

export function DatabaseOwnershipGate({ children }: PropsWithChildren) {
  const [state, setState] = useState<DatabaseLeaseState | "loading">("loading");
  useEffect(() => {
    let live = true;
    documentLease ??= acquireDocumentDatabaseLease(navigator.locks)
      .then((next) => (next === "ready" ? waitForOldWorkerHandles() : next))
      .catch(() => "failed");
    void documentLease.then((next) => {
      if (live) setState(next);
    });
    return () => {
      live = false;
    };
  }, []);
  if (state === "ready") return children;
  if (state === "loading") return <StartupLoading />;
  return (
    <ThemeProvider>
      <OwnershipNotice state={state} />
    </ThemeProvider>
  );
}
