import { describe, expect, it } from "vitest";

import { libraryGroups, practiceGroups } from "./tool-hubs";

describe("tool hubs", () => {
  it("uses stable internal destinations and keeps the existing tools reachable", () => {
    for (const groups of [practiceGroups, libraryGroups]) {
      const tools = groups.flatMap((group) => group.tools);
      expect(new Set(tools.map((tool) => tool.id)).size).toBe(tools.length);
      for (const tool of tools) {
        expect(tool.href).toMatch(/^\/[a-z(/]/u);
        expect(tool.description.length).toBeGreaterThan(10);
      }
    }
    const destinations = new Set(
      [...practiceGroups, ...libraryGroups].flatMap((group) =>
        group.tools.map((tool) => tool.href),
      ),
    );
    for (const href of [
      "/review",
      "/review/weak",
      "/review/upcoming",
      "/decks",
      "/writing",
      "/decks/listening",
      "/speaking",
      "/speaking/recordings",
      "/reader",
      "/stories",
      "/grammar",
      "/mistakes",
      "/(tabs)/hsk",
    ])
      expect(destinations.has(href)).toBe(true);
  });
});
