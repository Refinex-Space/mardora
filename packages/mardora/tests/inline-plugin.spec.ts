import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type EditorView } from "@codemirror/view";
import { describe, expect, it } from "bun:test";
import { InlinePlugin } from "../src/plugins/inline-plugin";

function replacementRanges(doc: string): Array<[number, number]> {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
  const decorations: Range<Decoration>[] = [];

  new InlinePlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => false,
    cursorInRange: () => false,
  });

  return decorations
    .filter((decoration) => (decoration.value as { isReplace?: boolean }).isReplace)
    .map((decoration) => [decoration.from, decoration.to] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

describe("inline plugin", () => {
  it("hides only the backslash for markdown escape nodes", () => {
    expect(replacementRanges("1\\. Title")).toEqual([[1, 2]]);
  });
});
