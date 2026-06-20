import { describe, expect, it } from "bun:test";
import { computeSelectionToolbarLayout } from "../src/editor/selection-toolbar";

describe("computeSelectionToolbarLayout", () => {
  it("places the toolbar above a selection when there is enough space", () => {
    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 300, right: 500, top: 240, bottom: 264 },
        viewport: { width: 1000, height: 800 },
        floating: { width: 360, height: 42 },
      })
    ).toEqual({
      placement: "top",
      left: 220,
      top: 190,
      maxHeight: 224,
    });
  });

  it("places the toolbar below a selection when top space is too small", () => {
    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 100, right: 220, top: 24, bottom: 48 },
        viewport: { width: 600, height: 500 },
        floating: { width: 360, height: 42 },
      })
    ).toEqual({
      placement: "bottom",
      left: 8,
      top: 56,
      maxHeight: 436,
    });
  });

  it("clamps the toolbar horizontally inside the viewport", () => {
    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 880, right: 940, top: 300, bottom: 324 },
        viewport: { width: 960, height: 800 },
        floating: { width: 360, height: 42 },
      }).left
    ).toBe(592);
  });

  it("clamps the toolbar horizontally inside the editor boundary", () => {
    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 120, right: 180, top: 300, bottom: 324 },
        viewport: { width: 1000, height: 800 },
        boundary: { left: 220, right: 780, top: 80, bottom: 720 },
        floating: { width: 448, height: 40 },
      }).left
    ).toBe(220);

    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 820, right: 880, top: 300, bottom: 324 },
        viewport: { width: 1000, height: 800 },
        boundary: { left: 220, right: 780, top: 80, bottom: 720 },
        floating: { width: 448, height: 40 },
      }).left
    ).toBe(332);
  });

  it("chooses popover direction from the editor boundary", () => {
    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 360, right: 480, top: 96, bottom: 124 },
        viewport: { width: 1000, height: 800 },
        boundary: { left: 220, right: 780, top: 80, bottom: 720 },
        floating: { width: 448, height: 40 },
      }).placement
    ).toBe("bottom");

    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 360, right: 480, top: 680, bottom: 708 },
        viewport: { width: 1000, height: 800 },
        boundary: { left: 220, right: 780, top: 80, bottom: 720 },
        floating: { width: 448, height: 40 },
      }).placement
    ).toBe("top");
  });

  it("uses child panel width when it is wider than the toolbar", () => {
    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 20, right: 80, top: 240, bottom: 264 },
        viewport: { width: 400, height: 600 },
        floating: { width: 340, height: 180 },
      })
    ).toMatchObject({
      placement: "top",
      left: 8,
    });
  });
});
