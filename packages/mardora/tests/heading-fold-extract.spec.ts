import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "bun:test";
import { extractHeadingFoldRangesFromState } from "../src/editor/heading-fold";

function stateFromDoc(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
}

describe("extractHeadingFoldRangesFromState", () => {
  it("creates fold ranges for h2 through h5 by default", () => {
    const state = stateFromDoc(["# Title", "## H2", "body", "### H3", "#### H4", "##### H5", "###### H6"].join("\n"));

    expect(extractHeadingFoldRangesFromState(state).map((range) => ({ level: range.level, text: range.text }))).toEqual(
      [
        { level: 2, text: "H2" },
        { level: 3, text: "H3" },
        { level: 4, text: "H4" },
        { level: 5, text: "H5" },
      ]
    );
  });

  it("folds a heading until the next heading at the same or higher level", () => {
    const doc = ["## A", "a body", "### A.1", "child body", "## B", "b body"].join("\n");
    const state = stateFromDoc(doc);
    const [a] = extractHeadingFoldRangesFromState(state);

    expect(a).toEqual(
      expect.objectContaining({
        level: 2,
        text: "A",
        headingFrom: doc.indexOf("## A"),
        foldFrom: doc.indexOf("a body"),
        foldTo: doc.indexOf("## B"),
      })
    );
  });

  it("keeps the folded heading line break outside the folded content range", () => {
    const doc = ["## A", "body", "## B"].join("\n");
    const state = stateFromDoc(doc);
    const [a] = extractHeadingFoldRangesFromState(state);

    expect(a).toEqual(
      expect.objectContaining({
        foldFrom: doc.indexOf("body"),
        foldTo: doc.indexOf("## B"),
      })
    );
  });

  it("lets deeper headings fold inside their parent range", () => {
    const doc = ["## A", "intro", "### A.1", "child body", "#### A.1.a", "deep body", "### A.2"].join("\n");
    const state = stateFromDoc(doc);
    const ranges = extractHeadingFoldRangesFromState(state);
    const h3 = ranges.find((range) => range.text === "A.1");

    expect(h3).toEqual(
      expect.objectContaining({
        level: 3,
        foldFrom: doc.indexOf("child body"),
        foldTo: doc.indexOf("### A.2"),
      })
    );
  });

  it("respects configured min and max heading levels", () => {
    const state = stateFromDoc(["## H2", "### H3", "#### H4", "##### H5"].join("\n"));

    expect(extractHeadingFoldRangesFromState(state, { minLevel: 3, maxLevel: 4 }).map((range) => range.level)).toEqual([
      3, 4,
    ]);
  });
});
