import { describe, expect, it } from "bun:test";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type EditorView } from "@codemirror/view";
import {
  bindImagePreviewButtons,
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

function imageWidgetFor(doc: string): { ignoreEvent(event: Event): boolean } {
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

  const widget = decorations.find((decoration) => "widget" in decoration.value.spec)?.value.spec.widget;
  if (!widget || typeof widget.ignoreEvent !== "function") {
    throw new Error("Image widget decoration was not created");
  }

  return widget;
}

function fakeTarget(className: string, parent?: ReturnType<typeof fakeTarget>) {
  return {
    className,
    closest(selector: string) {
      const selectors = selector.split(",").map((part) => part.trim());
      if (selectors.some((part) => part.startsWith(".") && className.split(/\s+/).includes(part.slice(1)))) {
        return this;
      }
      return parent?.closest(selector) ?? null;
    },
  };
}

function fakeEvent(type: string, target: ReturnType<typeof fakeTarget>): Event {
  return { type, target } as unknown as Event;
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

    expect(html).toContain('<figure class="cm-mardora-image-figure" role="figure" aria-label="Screenshot" style="width: 420px;">');
    expect(html).toContain('<img class="cm-mardora-image" src="https://example.com/a.png" alt="Desk" title="Screenshot" style="width: 100%;"');
    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).not.toContain("{width=420}");
  });

  it("renders a preview lightbox button for images in view mode", async () => {
    const html = await preview('![Desk](https://example.com/a.png "Screenshot")', {
      plugins: [new ImagePlugin()],
    });

    expect(html).toContain("cm-mardora-image-toolbar");
    expect(html).toContain("cm-mardora-image-preview-button");
    expect(html).toContain('data-src="https://example.com/a.png"');
    expect(html).toContain('data-alt="Desk"');
    expect(html).toContain('data-title="Screenshot"');
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

  it("keeps image widget pointer starts out of CodeMirror mouse selection", () => {
    const widget = imageWidgetFor("![Desk](https://example.com/a.png)");
    const figure = fakeTarget("cm-mardora-image-figure cm-mardora-media-preview");
    const resizeHandle = fakeTarget("cm-mardora-image-resize-handle cm-mardora-image-resize-handle-right", figure);
    const toolButton = fakeTarget("cm-mardora-image-tool-button cm-mardora-image-preview-button", figure);

    expect(widget.ignoreEvent(fakeEvent("mousedown", figure))).toBe(true);
    expect(widget.ignoreEvent(fakeEvent("pointerdown", figure))).toBe(true);
    expect(widget.ignoreEvent(fakeEvent("mousedown", resizeHandle))).toBe(true);
    expect(widget.ignoreEvent(fakeEvent("pointerdown", resizeHandle))).toBe(true);
    expect(widget.ignoreEvent(fakeEvent("mousedown", toolButton))).toBe(true);
    expect(widget.ignoreEvent(fakeEvent("pointerdown", toolButton))).toBe(true);
    expect(widget.ignoreEvent(fakeEvent("click", figure))).toBe(false);
  });

  it("generates compact image hover controls, resize handles, and lighter lightbox overlay", () => {
    const css = generateCSS({ plugins: [new ImagePlugin()] });

    expect(css).toContain(".cm-mardora-image-toolbar");
    expect(css).toContain(".cm-mardora-image-resize-handle");
    expect(css).toContain("background-color: rgba(15, 23, 42, 0.24);");
    expect(css).toContain("width: 1.75rem;");
    expect(css).toContain("height: 2.75rem;");
    expect(css).toContain("margin: 0;");
    expect(css).toContain("position: relative;");
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

  it("binds preview image buttons to the shared media lightbox", () => {
    const button = {
      className: "cm-mardora-image-preview-button",
      dataset: { src: "https://example.com/a.png", alt: "Desk", title: "Screenshot" },
      closest: (selector: string) => (selector === ".cm-mardora-image-preview-button[data-src]" ? button : null),
      ownerDocument: {
        querySelector: () => null,
        createElement: (tagName: string) => ({
          tagName,
          className: "",
          children: [] as unknown[],
          setAttribute() {},
          appendChild(child: unknown) {
            this.children.push(child);
            return child;
          },
          addEventListener() {},
          focus() {},
        }),
        createElementNS: (_namespace: string, tagName: string) => ({
          tagName,
          className: "",
          setAttribute() {},
          appendChild() {},
        }),
        body: {
          children: [] as unknown[],
          appendChild(child: unknown) {
            this.children.push(child);
            return child;
          },
        },
        addEventListener() {},
        removeEventListener() {},
      },
    };
    const root = {
      listeners: new Map<string, (event: Event) => void>(),
      addEventListener(type: string, listener: (event: Event) => void) {
        this.listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        this.listeners.delete(type);
      },
      contains: () => true,
    };
    const cleanup = bindImagePreviewButtons(root as unknown as HTMLElement);
    const event = {
      type: "click",
      target: button,
      preventDefault() {},
      stopPropagation() {},
    } as unknown as Event;

    globalThis.document = button.ownerDocument as unknown as Document;
    root.listeners.get("click")?.(event);

    expect(button.ownerDocument.body.children).toHaveLength(1);
    cleanup();
    delete (globalThis as typeof globalThis & { document?: Document }).document;
    expect(root.listeners.has("click")).toBe(false);
  });
});
