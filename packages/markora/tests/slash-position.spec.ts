import { describe, expect, it } from "bun:test";
import { computeSlashMenuLayout } from "../src/editor/slash/position";

describe("computeSlashMenuLayout", () => {
  it("opens below the cursor when there is enough space", () => {
    expect(
      computeSlashMenuLayout({
        anchor: { left: 120, top: 100, bottom: 124 },
        viewport: { width: 900, height: 800 },
      })
    ).toMatchObject({
      placement: "bottom",
      left: 120,
      top: 130,
      bottom: null,
      maxHeight: 420,
    });
  });

  it("opens above the cursor when the bottom space is too small", () => {
    expect(
      computeSlashMenuLayout({
        anchor: { left: 120, top: 730, bottom: 754 },
        viewport: { width: 900, height: 800 },
      })
    ).toMatchObject({
      placement: "top",
      left: 120,
      top: null,
      bottom: 76,
      maxHeight: 420,
    });
  });

  it("clamps the menu horizontally inside the viewport", () => {
    expect(
      computeSlashMenuLayout({
        anchor: { left: 850, top: 100, bottom: 124 },
        viewport: { width: 900, height: 800 },
      }).left
    ).toBe(564);
  });
});
