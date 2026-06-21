import { describe, expect, it } from "bun:test";
import { resolvePanelStateForViewport } from "../../src/state/panels";

describe("panel state", () => {
  it("opens the sidebar but keeps the developer panel collapsed by default on desktop", () => {
    expect(resolvePanelStateForViewport(true, { isDesktop: false, sidebarOpen: false, devbarOpen: false })).toEqual({
      isDesktop: true,
      sidebarOpen: true,
      devbarOpen: false,
    });
  });

  it("preserves a manually opened developer panel on resize", () => {
    expect(resolvePanelStateForViewport(true, { isDesktop: false, sidebarOpen: false, devbarOpen: true })).toEqual({
      isDesktop: true,
      sidebarOpen: true,
      devbarOpen: true,
    });
  });
});
