import { describe, expect, it } from "bun:test";
import { resolveInitialDesktopPanelState } from "../playground/react-playground/app/playground/panels";

describe("react playground panel state", () => {
  it("opens the sidebar but keeps the developer panel collapsed by default on desktop", () => {
    expect(resolveInitialDesktopPanelState(true)).toEqual({
      sidebarOpen: true,
      devbarOpen: false,
    });
  });

  it("keeps both panels collapsed on mobile", () => {
    expect(resolveInitialDesktopPanelState(false)).toEqual({
      sidebarOpen: false,
      devbarOpen: false,
    });
  });
});
