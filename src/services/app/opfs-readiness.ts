/** Retry only an observed OPFS lock, not arbitrary application failures. */
export async function waitForOpfsReadiness(
  probe: () => Promise<void>,
  wait: () => Promise<void>,
  attempts = 20,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await probe();
      return;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.name !== "NoModificationAllowedError" ||
        attempt === attempts - 1
      )
        throw error;
      await wait();
    }
  }
  throw new Error("OPFS_READINESS_EXHAUSTED");
}
