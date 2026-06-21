import { describe, expect, it } from "bun:test";
import { mardora } from "../src/editor";
import { resolveTocScrollTop, tableOfContents } from "../src/editor/table-of-contents";

describe("tableOfContents extension composition", () => {
  it("returns extensions when enabled", () => {
    expect(tableOfContents({ enabled: true }).length).toBeGreaterThan(0);
  });

  it("still returns data extensions when default UI is disabled", () => {
    const calls: unknown[] = [];

    expect(tableOfContents({ enabled: false, onTocChange: (items) => calls.push(items) }).length).toBeGreaterThan(0);
  });

  it("is included by mardora by default", () => {
    expect(mardora().flat(Infinity).length).toBeGreaterThan(0);
  });

  it("resolves heading jump positions from CodeMirror line blocks", () => {
    expect(resolveTocScrollTop({ lineBlockAt: () => ({ top: 512 }) }, 42)).toBe(504);
    expect(resolveTocScrollTop({ lineBlockAt: () => ({ top: 4 }) }, 42)).toBe(0);
  });
});
