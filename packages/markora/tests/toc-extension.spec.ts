import { describe, expect, it } from "bun:test";
import { markora } from "../src/editor";
import { tableOfContents } from "../src/editor/table-of-contents";

describe("tableOfContents extension composition", () => {
  it("returns extensions when enabled", () => {
    expect(tableOfContents({ enabled: true }).length).toBeGreaterThan(0);
  });

  it("still returns data extensions when default UI is disabled", () => {
    const calls: unknown[] = [];

    expect(tableOfContents({ enabled: false, onTocChange: (items) => calls.push(items) }).length).toBeGreaterThan(0);
  });

  it("is included by markora by default", () => {
    expect(markora().flat(Infinity).length).toBeGreaterThan(0);
  });
});
