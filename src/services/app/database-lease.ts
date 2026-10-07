export type DatabaseLeaseState = "ready" | "busy" | "unsupported" | "failed";

export interface DocumentLockManager {
  request(
    name: string,
    options: { ifAvailable: true },
    callback: (lock: unknown | null) => Promise<void> | void,
  ): Promise<unknown>;
}

/** OPFS pool belongs to the SQLite worker for the entire document lifetime.
 * Do not release on React unmount/pagehide: that worker may still own handles.
 * The browser releases this lock when the document is destroyed.
 */
export function acquireDocumentDatabaseLease(
  locks?: DocumentLockManager,
): Promise<DatabaseLeaseState> {
  if (!locks) return Promise.resolve("unsupported");
  return new Promise((resolve) => {
    try {
      void locks
        .request(
          "4chinese-sqlite-document-v1",
          { ifAvailable: true },
          (lock) => {
            if (!lock) {
              resolve("busy");
              return;
            }
            resolve("ready");
            return new Promise<void>(() => {
              /* Hold while the document's SQLite worker exists. */
            });
          },
        )
        .catch(() => resolve("failed"));
    } catch {
      resolve("failed");
    }
  });
}
