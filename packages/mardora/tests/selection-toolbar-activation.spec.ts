import { describe, expect, it } from "bun:test";
import {
  canActivateFromNativeSelection,
  hasSelectionToolbarExcludedAncestor,
  selectionOverlapsExcludedSyntaxNode,
} from "../src/editor/selection-toolbar/activation";

function target(className: string, parentElement: unknown = null): {
  className: string;
  parentElement: unknown;
} {
  return { className, parentElement };
}

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

  it("ignores native selections that start or end in excluded rendered content", () => {
    expect(
      canActivateFromNativeSelection({
        editorSelectionEmpty: true,
        nativeSelectionCollapsed: false,
        anchorInEditor: true,
        focusInEditor: true,
        rangeCount: 1,
        anchorExcluded: true,
      })
    ).toBe(false);

    expect(
      canActivateFromNativeSelection({
        editorSelectionEmpty: true,
        nativeSelectionCollapsed: false,
        anchorInEditor: true,
        focusInEditor: true,
        rangeCount: 1,
        focusExcluded: true,
      })
    ).toBe(false);
  });
});

describe("selection toolbar excluded content", () => {
  it("detects excluded rendered content by Mardora class prefixes", () => {
    const root = target("cm-content");
    const math = target("cm-mardora-math-rendered cm-mardora-math-rendered-inline", root);
    const mermaidChild = target("child", target("cm-mardora-mermaid-rendered", root));
    const text = target("cm-line", root);

    expect(hasSelectionToolbarExcludedAncestor(math, root)).toBe(true);
    expect(hasSelectionToolbarExcludedAncestor(mermaidChild, root)).toBe(true);
    expect(hasSelectionToolbarExcludedAncestor(text, root)).toBe(false);
  });

  it("detects selections overlapping excluded syntax nodes", () => {
    expect(
      selectionOverlapsExcludedSyntaxNode({
        selectionFrom: 8,
        selectionTo: 16,
        nodeFrom: 0,
        nodeTo: 20,
        nodeName: "FencedCode",
      })
    ).toBe(true);

    expect(
      selectionOverlapsExcludedSyntaxNode({
        selectionFrom: 8,
        selectionTo: 16,
        nodeFrom: 0,
        nodeTo: 20,
        nodeName: "MermaidBlock",
      })
    ).toBe(true);

    expect(
      selectionOverlapsExcludedSyntaxNode({
        selectionFrom: 8,
        selectionTo: 16,
        nodeFrom: 20,
        nodeTo: 30,
        nodeName: "Image",
      })
    ).toBe(false);

    expect(
      selectionOverlapsExcludedSyntaxNode({
        selectionFrom: 8,
        selectionTo: 16,
        nodeFrom: 0,
        nodeTo: 20,
        nodeName: "Emphasis",
      })
    ).toBe(false);
  });
});
