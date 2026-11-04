import type { ComponentProps } from "react";

import { Screen } from "./Screen";

/** Opt-in Chinese subpage density; shared/English defaults remain unchanged. */
export function ChineseScreen(props: ComponentProps<typeof Screen>) {
  return <Screen compact safeAreaEdges={["bottom"]} {...props} />;
}
