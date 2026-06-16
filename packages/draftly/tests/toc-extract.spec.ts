import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "bun:test";
import { extractTocItemsFromState } from "../src/editor/table-of-contents";

function stateFromDoc(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
}

describe("extractTocItemsFromState", () => {
  it("extracts only h2-h6 by default", () => {
    const state = stateFromDoc(["# Title", "## Intro", "### Details", "###### Deep", "####### Not a heading"].join("\n\n"));

    expect(extractTocItemsFromState(state)).toEqual([
      expect.objectContaining({ id: "intro", level: 2, text: "Intro", active: false }),
      expect.objectContaining({ id: "details", level: 3, text: "Details", active: false }),
      expect.objectContaining({ id: "deep", level: 6, text: "Deep", active: false }),
    ]);
  });

  it("respects configured heading levels", () => {
    const state = stateFromDoc(["## Intro", "### Details", "#### Deep"].join("\n\n"));

    expect(extractTocItemsFromState(state, { minLevel: 3, maxLevel: 4 }).map((item) => item.text)).toEqual([
      "Details",
      "Deep",
    ]);
  });

  it("strips markdown markers and skips empty headings", () => {
    const state = stateFromDoc(["## **Bold** Heading", "##", "## `Code` Heading", "## **Bold** Heading"].join("\n\n"));

    expect(extractTocItemsFromState(state).map((item) => ({ id: item.id, text: item.text }))).toEqual([
      { id: "bold-heading", text: "Bold Heading" },
      { id: "code-heading", text: "Code Heading" },
      { id: "bold-heading-2", text: "Bold Heading" },
    ]);
  });

  it("returns source positions for clicking and active calculations", () => {
    const state = stateFromDoc("paragraph\n\n## Intro\n\nbody");
    const [item] = extractTocItemsFromState(state);

    expect(item.from).toBeGreaterThan(0);
    expect(item.to).toBeGreaterThan(item.from!);
    expect(state.sliceDoc(item.from!, item.to!)).toContain("Intro");
    expect(syntaxTree(state).length).toBeGreaterThan(0);
  });
});
