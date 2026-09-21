export type ComposeOutcome = "SUCCESS" | "ASSISTED" | "FAIL";

function compactHanzi(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

/** Final grading intentionally ignores the pinyin query and compares Hanzi. */
export function evaluateComposeAnswer(
  expectedHanzi: string,
  selectedHanzi: string,
  usedHint: boolean,
): ComposeOutcome {
  if (compactHanzi(expectedHanzi) !== compactHanzi(selectedHanzi)) return "FAIL";
  return usedHint ? "ASSISTED" : "SUCCESS";
}

