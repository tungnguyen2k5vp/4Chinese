import { probeExistingSqlitePool, type ExistingPoolRoot } from "./opfs-pool";
import { waitForOpfsReadiness } from "./opfs-readiness";

// Expo SDK57's persistent VFS uses this directory. Probe existing files only:
// no create, truncate, write or delete. Run in a worker as required by OPFS.
async function probeExistingPool() {
  const root = await navigator.storage.getDirectory();
  await probeExistingSqlitePool(root as unknown as ExistingPoolRoot);
}

void waitForOpfsReadiness(
  probeExistingPool,
  () => new Promise((resolve) => setTimeout(resolve, 200)),
)
  .then(() => self.postMessage("ready"))
  .catch(() => self.postMessage("failed"));
