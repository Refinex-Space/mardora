import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type EditorView } from "@codemirror/view";
import { describe, expect, it } from "bun:test";
import { ListPlugin } from "../src/plugins";

function stateFromDoc(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
}

function replacementRanges(doc: string, cursorInLine = false): Array<[number, number]> {
  const state = stateFromDoc(doc);
  const decorations: Range<Decoration>[] = [];

  new ListPlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => cursorInLine,
    cursorInRange: () => cursorInLine,
  });

  return decorations
    .filter((decoration) => (decoration.value as { isReplace?: boolean }).isReplace)
    .map((decoration) => [decoration.from, decoration.to] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function markClasses(doc: string, cursorInLine = false): string[] {
  const state = stateFromDoc(doc);
  const decorations: Range<Decoration>[] = [];

  new ListPlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => cursorInLine,
    cursorInRange: () => cursorInLine,
  });

  return decorations
    .map((decoration) => (decoration.value as { spec?: { class?: string } }).spec?.class)
    .filter((className): className is string => Boolean(className));
}

function widgetRanges(doc: string, cursorInLine = false): Array<[number, number]> {
  const state = stateFromDoc(doc);
  const decorations: Range<Decoration>[] = [];

  new ListPlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => cursorInLine,
    cursorInRange: () => cursorInLine,
  });

  return decorations
    .filter((decoration) => Boolean((decoration.value as { widget?: unknown }).widget))
    .map((decoration) => [decoration.from, decoration.to] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function widgetSummaries(
  doc: string,
  cursorInLine = false
): Array<{ from: number; to: number; isReplace: boolean; widgetName: string }> {
  const state = stateFromDoc(doc);
  const decorations: Range<Decoration>[] = [];

  new ListPlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => cursorInLine,
    cursorInRange: () => cursorInLine,
  });

  return decorations
    .filter((decoration) => Boolean((decoration.value as { widget?: unknown }).widget))
    .map((decoration) => {
      const value = decoration.value as {
        isReplace?: boolean;
        widget?: { constructor?: { name?: string } };
      };

      return {
        from: decoration.from,
        to: decoration.to,
        isReplace: Boolean(value.isReplace),
        widgetName: value.widget?.constructor?.name ?? "",
      };
    })
    .sort((a, b) => a.from - b.from || a.to - b.to || Number(b.isReplace) - Number(a.isReplace));
}

describe("ListPlugin task list editing", () => {
  it("keeps task markers rendered as checkboxes while editing inside the task line", () => {
    expect(replacementRanges("- [ ] OK?", true)).toEqual([
      [0, 2],
      [2, 5],
    ]);
  });

  it("keeps checked task markers rendered as checkboxes while editing inside the task line", () => {
    expect(replacementRanges("- [x] Done", true)).toEqual([
      [0, 2],
      [2, 5],
    ]);
  });
});

describe("ListPlugin unordered list editing", () => {
  it("replaces unordered list markers without keeping inline marker widgets in the cursor flow", () => {
    expect(replacementRanges("- item", true)).toEqual([[0, 2]]);
    expect(markClasses("- item", true)).not.toContain("cm-mardora-list-mark-ul");
    expect(widgetSummaries("- item", true)).toEqual([]);
  });

  it("keeps ordered list markers editable while editing inside the list line", () => {
    expect(markClasses("1. item", true)).toContain("cm-mardora-list-mark-ol cm-mardora-active");
  });

  it("replaces empty unordered list markers instead of relying on a hidden source marker", () => {
    expect(replacementRanges("- ", true)).toEqual([[0, 2]]);
    expect(widgetRanges("- ", true)).toEqual([[2, 2]]);
  });

  it("adds a writable content anchor after an empty unordered list marker", () => {
    expect(widgetSummaries("- ", true)).toEqual([
      {
        from: 2,
        to: 2,
        isReplace: false,
        widgetName: "EmptyListContentAnchorWidget",
      },
    ]);
  });
});
