import { describe, expect, it } from "bun:test";
import { canActivateFromNativeSelection } from "../src/editor/selection-toolbar/activation";

describe("selection toolbar activation", () => {
  it("accepts native DOM selections inside the editor even when CodeMirror only has a cursor", () => {
    expect(
      canActivateFromNativeSelection({
        editorSelectionEmpty: true,
        nativeSelectionCollapsed: false,
        anchorInEditor: true,
        focusInEditor: true,
        rangeCount: 1,
      })
    ).toBe(true);
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

  it("ignores collapsed native selections from plain cursor placement", () => {
    expect(
      canActivateFromNativeSelection({
        editorSelectionEmpty: true,
        nativeSelectionCollapsed: true,
        anchorInEditor: true,
        focusInEditor: true,
        rangeCount: 1,
      })
    ).toBe(false);
  });
});
