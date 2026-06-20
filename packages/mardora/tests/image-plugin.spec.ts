import { describe, expect, it } from "bun:test";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type EditorView } from "@codemirror/view";
import {
  ImagePlugin,
  parseImageMarkdown,
  resolveImageDeleteChange,
  resolveImageResetWidthChange,
  resolveImageWidthChange,
} from "../src/plugins/image-plugin";
import { generateCSS, preview } from "../src/preview";

function imageDecorationRanges(doc: string): Array<{ from: number; to: number; className?: string; isWidget: boolean }> {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
  const decorations: Range<Decoration>[] = [];

  new ImagePlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => false,
    cursorInRange: () => false,
  });

  return decorations.map((decoration) => ({
    from: decoration.from,
    to: decoration.to,
    className: (decoration.value.spec as { class?: string }).class,
    isWidget: "widget" in decoration.value.spec && !("class" in decoration.value.spec),
  }));
}

describe("image plugin", () => {
  it("parses optional pixel width attributes after image markdown", () => {
    expect(parseImageMarkdown('![Desk](https://example.com/a.png "Screenshot"){width=420}')).toEqual({
      alt: "Desk",
      url: "https://example.com/a.png",
      title: "Screenshot",
      width: 420,
    });
  });

  it("inserts, replaces, resets, and deletes image width attributes", () => {
    const doc = "![Desk](https://example.com/a.png)";
    const imageTo = doc.length;

    expect(resolveImageWidthChange({ doc, from: 0, to: imageTo, width: 420 })).toEqual({
      from: imageTo,
      to: imageTo,
      insert: "{width=420}",
    });

    const resizedDoc = `${doc}{width=420}`;
    expect(resolveImageWidthChange({ doc: resizedDoc, from: 0, to: imageTo, width: 640 })).toEqual({
      from: imageTo,
      to: imageTo + "{width=420}".length,
      insert: "{width=640}",
    });

    expect(resolveImageResetWidthChange({ doc: resizedDoc, from: 0, to: imageTo })).toEqual({
      from: imageTo,
      to: imageTo + "{width=420}".length,
      insert: "",
    });

    expect(resolveImageDeleteChange({ doc: resizedDoc, from: 0, to: imageTo })).toEqual({
      from: 0,
      to: resizedDoc.length,
      insert: "",
    });
  });

  it("renders image preview width without leaking the markdown width attribute", async () => {
    const html = await preview('![Desk](https://example.com/a.png "Screenshot"){width=420}', {
      plugins: [new ImagePlugin()],
    });

    expect(html).toContain('style="width: 420px;"');
    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).not.toContain("{width=420}");
  });

  it("places the rendered image widget after the width attribute so it is not hidden", () => {
    const doc = "![Desk](https://example.com/a.png){width=420}";
    const ranges = imageDecorationRanges(doc);

    expect(ranges.find((range) => range.isWidget)).toMatchObject({
      from: doc.length,
      to: doc.length,
    });
    expect(ranges.find((range) => range.className === "cm-mardora-image-hidden")).toMatchObject({
      from: 0,
      to: doc.length,
    });
  });

  it("generates compact image hover controls, resize handles, and lighter lightbox overlay", () => {
    const css = generateCSS({ plugins: [new ImagePlugin()] });

    expect(css).toContain(".cm-mardora-image-toolbar");
    expect(css).toContain(".cm-mardora-image-resize-handle");
    expect(css).toContain("background-color: rgba(15, 23, 42, 0.24);");
    expect(css).toContain("width: 1.75rem;");
    expect(css).toContain("height: 2.75rem;");
  });

  it("fills the content width by default so images align with surrounding text", () => {
    const css = generateCSS({ plugins: [new ImagePlugin()] });
    const figureRule = css.match(/\.cm-mardora-image-figure\s*\{[^}]*\}/s)?.[0] ?? "";
    const imageRule = css.match(/\.cm-mardora-image\s*\{[^}]*\}/s)?.[0] ?? "";

    // Figure stretches to the content width (inline width from {width=} still wins).
    expect(figureRule).toContain("width: 100%");
    // Image fills the figure by default.
    expect(imageRule).toContain("width: 100%");
  });
});
