import { describe, expect, it } from "bun:test";
import { resolvePanelStateForViewport } from "../../src/state/panels";

describe("panel state", () => {
  it("keeps the developer panel collapsed by default on desktop", () => {
    expect(resolvePanelStateForViewport(true, { isDesktop: false, devbarOpen: false })).toEqual({
      isDesktop: true,
      devbarOpen: false,
    });
  });

  it("preserves a manually opened developer panel on resize", () => {
    expect(resolvePanelStateForViewport(true, { isDesktop: false, devbarOpen: true })).toEqual({
      isDesktop: true,
      devbarOpen: true,
    });
  });
});
