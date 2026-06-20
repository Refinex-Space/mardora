import { describe, expect, it } from "bun:test";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { mardora } from "../src/editor";
import { __buildHeadingFoldDecorations, headingFold } from "../src/editor/heading-fold/extension";

function stateFromDoc(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
}

describe("headingFold extension composition", () => {
  it("returns no extensions when disabled", () => {
    expect(headingFold({ enabled: false })).toEqual([]);
  });

  it("returns extensions when enabled", () => {
    expect(headingFold({ enabled: true }).length).toBeGreaterThan(0);
  });

  it("is included by mardora by default", () => {
    expect(mardora({ headingFold: { enabled: true } }).flat(Infinity).length).toBeGreaterThan(0);
  });

  it("places the folded placeholder at the heading line end while hiding body content", () => {
    const doc = ["## A", "body", "## B"].join("\n");
    const state = stateFromDoc(doc);
    const decorations = __buildHeadingFoldDecorations(state, {}, [doc.indexOf("## A")]);
    const entries: Array<{ from: number; to: number; role: unknown; hasWidget: boolean }> = [];

    decorations.between(0, state.doc.length, (from, to, value) => {
      entries.push({
        from,
        to,
        role: value.spec.mardoraHeadingFoldRole,
        hasWidget: Boolean(value.spec.widget),
      });
    });

    expect(entries).toContainEqual({
      from: doc.indexOf("\nbody"),
      to: doc.indexOf("\nbody"),
      role: "placeholder",
      hasWidget: true,
    });
    expect(entries).toContainEqual({
      from: doc.indexOf("body"),
      to: doc.indexOf("## B"),
      role: "hidden-content",
      hasWidget: false,
    });
  });
});
