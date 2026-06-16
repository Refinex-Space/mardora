import { describe, expect, it } from "bun:test";
import { canActivateFromNativeSelection } from "../src/editor/selection-toolbar/activation";

describe("selection toolbar activation", () => {
  it("ignores native DOM selections when CodeMirror only has a cursor", () => {
    expect(
      canActivateFromNativeSelection({
        editorSelectionEmpty: true,
        nativeSelectionCollapsed: false,
        anchorInEditor: true,
        focusInEditor: true,
        rangeCount: 1,
      })
    ).toBe(false);
  });

  it("accepts native DOM selections backed by a CodeMirror range", () => {
    expect(
      canActivateFromNativeSelection({
        editorSelectionEmpty: false,
        nativeSelectionCollapsed: false,
        anchorInEditor: true,
        focusInEditor: true,
        rangeCount: 1,
      })
    ).toBe(true);
  });
});
