import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState, type Range } from "@codemirror/state";
import { Decoration, type EditorView } from "@codemirror/view";
import { describe, expect, it } from "bun:test";
import { getHorizontalRuleDeleteRange, HRPlugin } from "../src/plugins/hr-plugin";

function stateFromDoc(doc: string, selection?: EditorSelection): EditorState {
  const plugin = new HRPlugin();
  return EditorState.create({
    doc,
    selection,
    extensions: [markdown({ base: markdownLanguage, extensions: [plugin.getMarkdownConfig()] })],
  });
}

function buildHrDecorations(state: EditorState, selectionOverlaps = false): Range<Decoration>[] {
  const decorations: Range<Decoration>[] = [];

  new HRPlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => selectionOverlaps,
    cursorInRange: () => selectionOverlaps,
  });

  return decorations;
}

function replacementRangesFromState(state: EditorState, selectionOverlaps = false): Array<[number, number]> {
  const decorations = buildHrDecorations(state, selectionOverlaps);

  return decorations
    .filter((decoration) => (decoration.value as { isReplace?: boolean }).isReplace)
    .map((decoration) => [decoration.from, decoration.to] as [number, number]);
}

function lineDecorationClassesFromState(state: EditorState): string[] {
  return buildHrDecorations(state)
    .filter((decoration) => !(decoration.value as { isReplace?: boolean }).isReplace)
    .map((decoration) => (decoration.value as { spec?: { class?: string } }).spec?.class ?? "");
}

function replacementRanges(doc: string, selectionOverlaps = false): Array<[number, number]> {
  return replacementRangesFromState(stateFromDoc(doc), selectionOverlaps);
}

function nodeRanges(doc: string, nodeName: string): Array<[number, number]> {
  const state = stateFromDoc(doc);
  const ranges: Array<[number, number]> = [];

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === nodeName) {
        ranges.push([node.from, node.to]);
      }
    },
  });

  return ranges;
}

describe("HRPlugin decorations", () => {
  it("keeps horizontal rule markers hidden while the line is selected", () => {
    expect(replacementRanges("---", true)).toEqual([[0, 3]]);
  });

  it("parses standalone dashes after a paragraph as a horizontal rule", () => {
    expect(nodeRanges("before\n---\nafter", "HorizontalRule")).toEqual([[7, 10]]);
    expect(nodeRanges("before\n---\nafter", "SetextHeading2")).toEqual([]);
    expect(replacementRanges("before\n---\nafter")).toEqual([[7, 10]]);
  });

  it("keeps horizontal rule marker replacements within their source lines", () => {
    const state = stateFromDoc("before\n---\nafter\n\n***\nend");
    const ranges = replacementRangesFromState(state);

    expect(ranges).toEqual([
      [7, 10],
      [18, 21],
    ]);

    for (const [from, to] of ranges) {
      const line = state.doc.lineAt(from);
      expect(to).toBeLessThanOrEqual(line.to);
    }
  });

  it("selects only one adjacent horizontal rule line", () => {
    const state = stateFromDoc("---\n---", EditorSelection.range(0, 4));
    expect(lineDecorationClassesFromState(state)).toEqual([
      "cm-mardora-hr-line cm-mardora-hr-line-selected",
      "cm-mardora-hr-line",
    ]);
  });

  it("selects the whole horizontal rule line including the trailing line break", () => {
    const state = stateFromDoc("before\n---\nafter");
    expect(getHorizontalRuleDeleteRange(state, 7)).toEqual({ from: 7, to: 11 });
  });

  it("selects the final horizontal rule line without extending past the document", () => {
    const state = stateFromDoc("before\n---");
    expect(getHorizontalRuleDeleteRange(state, 7)).toEqual({ from: 7, to: 10 });
  });
});
