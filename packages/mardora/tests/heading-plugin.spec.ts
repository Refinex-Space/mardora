import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type EditorView } from "@codemirror/view";
import { describe, expect, it } from "bun:test";
import { HeadingPlugin } from "../src/plugins";

function stateFromDoc(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
}

function replacementRanges(doc: string, selectionOverlaps = false): Array<[number, number]> {
  const state = stateFromDoc(doc);
  const decorations: Range<Decoration>[] = [];

  new HeadingPlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => selectionOverlaps,
    cursorInRange: () => selectionOverlaps,
  });

  return decorations
    .filter((decoration) => (decoration.value as { isReplace?: boolean }).isReplace)
    .map((decoration) => [decoration.from, decoration.to] as [number, number]);
}

describe("HeadingPlugin decorations", () => {
  it("keeps heading markers hidden while the heading is selected", () => {
    expect(replacementRanges("## Title", true)).toEqual([[0, 3]]);
  });
});
