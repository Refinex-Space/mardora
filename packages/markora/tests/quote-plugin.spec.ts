import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type EditorView } from "@codemirror/view";
import { describe, expect, it } from "bun:test";
import { ThemeEnum } from "../src/editor";
import { QuotePlugin, resolveCalloutTitleInputTarget, resolveCalloutTypeChange } from "../src/plugins";

function stateFromDoc(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
}

function replacementRanges(doc: string, selectionOverlaps = false): Array<[number, number]> {
  const state = stateFromDoc(doc);
  const decorations: Range<Decoration>[] = [];

  new QuotePlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => selectionOverlaps,
    cursorInRange: () => selectionOverlaps,
  });

  return decorations
    .filter((decoration) => (decoration.value as { isReplace?: boolean }).isReplace)
    .map((decoration) => [decoration.from, decoration.to] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

describe("QuotePlugin decorations", () => {
  it("keeps ordinary quote markers hidden while editing inside the quote", () => {
    expect(replacementRanges("> First\n> Second", true)).toEqual([
      [0, 2],
      [8, 10],
    ]);
  });

  it("keeps callout control markers hidden while editing inside the callout", () => {
    expect(replacementRanges("> [!NOTE]\n> Body", true)).toEqual([
      [0, 2],
      [2, 9],
      [10, 12],
    ]);
  });

  it("keeps a writable text anchor on empty callout body lines", () => {
    expect(replacementRanges("> [!WARNING]\n> ", true)).toEqual([
      [0, 2],
      [2, 12],
      [13, 14],
    ]);
  });
});

describe("QuotePlugin callout editing", () => {
  it("keeps empty callout body lines tall enough for visible cursor placement", () => {
    const styles = new QuotePlugin().theme(ThemeEnum.LIGHT);

    expect(styles[".cm-markora-callout-line"]?.minHeight).toBe("1.6em");
  });

  it("moves title-line clicks to the callout body when the body exists", () => {
    const state = stateFromDoc("> [!WARNING]\n> Body");

    expect(resolveCalloutTitleInputTarget(state, 2)).toEqual({
      anchor: 15,
    });
  });

  it("creates a writable callout body when title-line clicks have no body line", () => {
    const state = stateFromDoc("> [!WARNING]");

    expect(resolveCalloutTitleInputTarget(state, 2)).toEqual({
      anchor: 15,
      changes: {
        from: 12,
        insert: "\n> ",
      },
    });
  });

  it("replaces the callout marker type without changing the body", () => {
    const state = stateFromDoc("> [!WARNING]\n> Body");

    expect(resolveCalloutTypeChange(state, 2, "TIP")).toEqual({
      from: 4,
      to: 11,
      insert: "TIP",
    });
  });

  it("does not create a change when switching to the current callout type", () => {
    const state = stateFromDoc("> [!WARNING]\n> Body");

    expect(resolveCalloutTypeChange(state, 2, "WARNING")).toBeNull();
  });

  it("does not create a callout type change outside a callout title line", () => {
    const state = stateFromDoc("> Body");

    expect(resolveCalloutTypeChange(state, 2, "NOTE")).toBeNull();
  });
});
