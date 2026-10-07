export interface ExistingPoolFile {
  kind: string;
  createSyncAccessHandle(): Promise<{ close(): void }>;
}
export interface ExistingPoolRoot {
  getDirectoryHandle(
    name: string,
  ): Promise<{ values(): AsyncIterable<ExistingPoolFile> }>;
}

/** SDK57 integration: inspect only the existing expo-sqlite pool. No writes. */
export async function probeExistingSqlitePool(root: ExistingPoolRoot) {
  let directory: Awaited<ReturnType<ExistingPoolRoot["getDirectoryHandle"]>>;
  try {
    directory = await root.getDirectoryHandle("expo-sqlite");
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") return;
    throw error;
  }
  const handles: { close(): void }[] = [];
  try {
    for await (const entry of directory.values()) {
      if (entry.kind === "file")
        handles.push(await entry.createSyncAccessHandle());
    }
  } finally {
    for (const handle of handles) handle.close();
  }
}
