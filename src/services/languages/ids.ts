let counter = 0;
/** Learner-owned identifiers, not security tokens or bundled dictionary identifiers. */
export function englishLocalId(
  kind: "card" | "deck" | "session" | "operation",
): string {
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${++counter}-${Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 0x100000000)
        .toString(16)
        .padStart(8, "0"),
    ).join("")}`;
  return `en:${kind}:${suffix}`;
}
