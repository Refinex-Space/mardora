import { Decoration, EditorView, KeyBinding, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { DecorationContext, DecorationPlugin } from "../editor/plugin";
import { createTheme } from "../editor";
import { consumeMediaLightboxTrigger, openMediaLightbox } from "../editor/media-lightbox";
import { mediaLightboxTheme } from "../editor/media-lightbox-theme";
import { createMardoraIcon } from "../editor/icons";
import type { PreviewContext } from "../preview/types";
import { SyntaxNode } from "@lezer/common";

/**
 * Mark decorations for image syntax elements
 */
const imageMarkDecorations = {
  "image-block": Decoration.line({ class: "cm-mardora-image-block" }),
  "image-marker": Decoration.mark({ class: "cm-mardora-image-marker" }),
  "image-alt": Decoration.mark({ class: "cm-mardora-image-alt" }),
  "image-url": Decoration.mark({ class: "cm-mardora-image-url" }),
  "image-hidden": Decoration.mark({ class: "cm-mardora-image-hidden" }),
};

export interface ParsedImageMarkdown {
  readonly alt: string;
  readonly url: string;
  readonly title?: string;
  readonly width?: number;
}

export interface ImageMarkdownChange {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
}

interface ImageMarkdownRange {
  readonly from: number;
  readonly imageTo: number;
  readonly to: number;
  readonly markdown: string;
  readonly width?: number;
  readonly widthAttrFrom?: number;
  readonly widthAttrTo?: number;
}

const imageWidthAttributePattern = /^(\s*)\{width=(\d+)\}/;
const minImageWidth = 120;
const imageWidgetEditorSelectionEventTypes = new Set([
  "mousedown",
  "mouseup",
  "mousemove",
  "pointerdown",
  "pointermove",
  "pointerup",
]);
const previewImageIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"></path><path d="m21 3-7 7"></path><path d="M9 21H3v-6"></path><path d="m3 21 7-7"></path></svg>';

/**
 * Parse image markdown to extract alt text, URL, optional title, and optional pixel width.
 * Format: ![alt text](url "optional title"){width=420}
 */
export function parseImageMarkdown(content: string): ParsedImageMarkdown | null {
  const trimmed = content.trim();
  const widthMatch = trimmed.match(/\{width=(\d+)\}$/);
  const markdown = widthMatch ? trimmed.slice(0, widthMatch.index).trimEnd() : trimmed;

  // Regex to match: ![alt](url) or ![alt](url "title")
  const match = markdown.match(/^!\[([^\]]*)\]\(([^"\s)]+)(?:\s+"([^"]*)")?\s*\)$/);
  if (!match) return null;

  const result: ParsedImageMarkdown = {
    alt: match[1] || "",
    url: match[2]!,
    ...(widthMatch ? { width: Number(widthMatch[1]) } : {}),
  };

  if (match[3] !== undefined) {
    return { ...result, title: match[3] };
  }

  return result;
}

function readImageMarkdownRange(doc: string, from: number, imageTo: number): ImageMarkdownRange {
  const lineEnd = doc.indexOf("\n", imageTo);
  const scanTo = lineEnd === -1 ? doc.length : lineEnd;
  const afterImage = doc.slice(imageTo, scanTo);
  const widthMatch = afterImage.match(imageWidthAttributePattern);
  if (widthMatch) {
    const widthAttrTo = imageTo + widthMatch[0].length;
    return {
      from,
      imageTo,
      to: widthAttrTo,
      markdown: doc.slice(from, widthAttrTo),
      width: Number(widthMatch[2]),
      widthAttrFrom: imageTo,
      widthAttrTo,
    };
  }

  return {
    from,
    imageTo,
    to: imageTo,
    markdown: doc.slice(from, imageTo),
  };
}

export function resolveImageWidthChange(input: {
  readonly doc: string;
  readonly from: number;
  readonly to: number;
  readonly width: number;
}): ImageMarkdownChange {
  const range = readImageMarkdownRange(input.doc, input.from, input.to);
  const width = Math.max(1, Math.round(input.width));
  return {
    from: range.widthAttrFrom ?? input.to,
    to: range.widthAttrTo ?? input.to,
    insert: `{width=${width}}`,
  };
}

export function resolveImageResetWidthChange(input: {
  readonly doc: string;
  readonly from: number;
  readonly to: number;
}): ImageMarkdownChange | null {
  const range = readImageMarkdownRange(input.doc, input.from, input.to);
  if (range.widthAttrFrom === undefined || range.widthAttrTo === undefined) return null;
  return { from: range.widthAttrFrom, to: range.widthAttrTo, insert: "" };
}

export function resolveImageDeleteChange(input: {
  readonly doc: string;
  readonly from: number;
  readonly to: number;
}): ImageMarkdownChange {
  const range = readImageMarkdownRange(input.doc, input.from, input.to);
  return { from: input.from, to: range.to, insert: "" };
}

export function bindImagePreviewButtons(root: HTMLElement | Document): () => void {
  const onClick = (event: Event) => {
    const target =
      event.target && typeof (event.target as Element).closest === "function" ? (event.target as Element) : null;
    const previewButton = target?.closest<HTMLButtonElement>(".cm-mardora-image-preview-button[data-src]");
    if (!previewButton || !root.contains(previewButton)) return;

    consumeMediaLightboxTrigger(event);
    openMediaLightbox(previewButton.ownerDocument, {
      content: {
        kind: "image",
        src: previewButton.dataset.src ?? "",
        alt: previewButton.dataset.alt ?? "",
        ...(previewButton.dataset.title ? { title: previewButton.dataset.title } : {}),
      },
      returnFocus: previewButton,
    });
  };

  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}

/**
 * Widget to render an image with optional caption using figure/figcaption
 * Placed below the markdown syntax as a widget decoration
 */
class ImageWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly alt: string,
    readonly from: number,
    readonly imageTo: number,
    readonly to: number,
    readonly width?: number,
    readonly title?: string
  ) {
    super();
  }

  override eq(other: ImageWidget): boolean {
    return (
      other.url === this.url &&
      other.alt === this.alt &&
      other.from === this.from &&
      other.imageTo === this.imageTo &&
      other.to === this.to &&
      other.width === this.width &&
      other.title === this.title
    );
  }

  toDOM(view: EditorView) {
    // Create figure element for semantic image container
    const figure = document.createElement("figure");
    figure.className = "cm-mardora-image-figure cm-mardora-media-preview";
    figure.setAttribute("role", "figure");
    figure.style.cursor = "pointer";
    if (this.width) {
      figure.style.width = `${this.width}px`;
    }
    if (this.title) {
      figure.setAttribute("aria-label", this.title);
    }

    const activateFigure = () => figure.classList.add("cm-mardora-image-figure-active");
    const deactivateFigure = () => {
      if (!figure.matches(":focus-within")) figure.classList.remove("cm-mardora-image-figure-active");
    };
    figure.addEventListener("pointerenter", activateFigure);
    figure.addEventListener("mouseenter", activateFigure);
    figure.addEventListener("focusin", activateFigure);
    figure.addEventListener("pointerleave", deactivateFigure);
    figure.addEventListener("mouseleave", deactivateFigure);
    figure.addEventListener("focusout", deactivateFigure);

    // Click handler to select the raw markdown text
    figure.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.from, head: this.to },
        scrollIntoView: true,
      });
      view.focus();
    });

    // Create image element with accessibility attributes
    const img = document.createElement("img");
    img.className = "cm-mardora-image";
    img.src = this.url;
    img.alt = this.alt;
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    if (this.title) {
      img.title = this.title;
    }
    if (this.width) {
      img.style.width = "100%";
    }

    // Handle image loading error
    img.onerror = () => {
      img.style.display = "none";
      const errorSpan = document.createElement("span");
      errorSpan.className = "cm-mardora-image-error";
      errorSpan.setAttribute("role", "alert");
      errorSpan.textContent = `[Image not found: ${this.alt || this.url}]`;
      figure.appendChild(errorSpan);
    };

    figure.appendChild(img);
    figure.appendChild(this.createToolbar(view, figure));
    figure.appendChild(this.createResizeHandle(view, figure, "left"));
    figure.appendChild(this.createResizeHandle(view, figure, "right"));

    // Add figcaption if title exists
    if (this.title) {
      const figcaption = document.createElement("figcaption");
      figcaption.className = "cm-mardora-image-caption";
      figcaption.textContent = this.title;
      figure.appendChild(figcaption);
    }

    return figure;
  }

  override ignoreEvent(event: Event) {
    if (imageWidgetEditorSelectionEventTypes.has(event.type)) return true;
    return event.type !== "click";
  }

  private createToolbar(view: EditorView, figure: HTMLElement): HTMLElement {
    const toolbar = figure.ownerDocument.createElement("div");
    toolbar.className = "cm-mardora-image-toolbar";
    toolbar.appendChild(
      this.createToolButton(figure.ownerDocument, "还原默认大小", "rotate-ccw", () => {
        const change = resolveImageResetWidthChange({
          doc: view.state.doc.toString(),
          from: this.from,
          to: this.imageTo,
        });
        if (!change) return;
        view.dispatch({ changes: change });
        view.focus();
      })
    );
    toolbar.appendChild(
      this.createToolButton(figure.ownerDocument, "放大查看图片", "maximize-2", () => {
        openMediaLightbox(figure.ownerDocument, {
          content: {
            kind: "image",
            src: this.url,
            alt: this.alt,
            ...(this.title === undefined ? {} : { title: this.title }),
          },
          returnFocus: toolbar.querySelector(".cm-mardora-image-preview-button") as HTMLElement | null,
        });
      }, "cm-mardora-image-preview-button")
    );
    toolbar.appendChild(
      this.createToolButton(figure.ownerDocument, "删除图片", "trash-2", () => {
        view.dispatch({
          changes: resolveImageDeleteChange({
            doc: view.state.doc.toString(),
            from: this.from,
            to: this.imageTo,
          }),
        });
        view.focus();
      })
    );
    return toolbar;
  }

  private createToolButton(
    ownerDocument: Document,
    label: string,
    iconName: string,
    onActivate: () => void,
    extraClass = ""
  ): HTMLButtonElement {
    const button = ownerDocument.createElement("button");
    button.type = "button";
    button.className = `cm-mardora-image-tool-button${extraClass ? ` ${extraClass}` : ""}`;
    button.setAttribute("aria-label", label);
    button.title = label;
    const icon = createMardoraIcon(iconName);
    if (icon) button.appendChild(icon);
    button.addEventListener("click", (event) => {
      consumeMediaLightboxTrigger(event);
      onActivate();
    });
    return button;
  }

  private createResizeHandle(view: EditorView, figure: HTMLElement, side: "left" | "right"): HTMLElement {
    const handle = figure.ownerDocument.createElement("span");
    handle.className = `cm-mardora-image-resize-handle cm-mardora-image-resize-handle-${side}`;
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-label", side === "left" ? "向左拖拽调整图片宽度" : "向右拖拽调整图片宽度");
    if (figure.ownerDocument.defaultView?.PointerEvent) {
      handle.addEventListener("pointerdown", (event) => this.startResize(event, view, figure, side));
    } else {
      handle.addEventListener("mousedown", (event) => this.startResize(event, view, figure, side));
    }
    return handle;
  }

  private startResize(event: PointerEvent | MouseEvent, view: EditorView, figure: HTMLElement, side: "left" | "right") {
    consumeMediaLightboxTrigger(event);
    const ownerDocument = figure.ownerDocument;
    const startX = event.clientX;
    const startWidth = Math.max(minImageWidth, figure.getBoundingClientRect().width || this.width || minImageWidth);
    const maxWidth = resolveImageMaxWidth(view, figure);
    const direction = side === "right" ? 1 : -1;
    const image = figure.querySelector("img");
    if (image) image.style.width = "100%";
    let nextWidth = startWidth;

    const moveEvent = event.type.startsWith("pointer") ? "pointermove" : "mousemove";
    const upEvent = event.type.startsWith("pointer") ? "pointerup" : "mouseup";
    const onMove = (move: Event) => {
      const pointer = move as PointerEvent | MouseEvent;
      consumeMediaLightboxTrigger(pointer);
      nextWidth = clampImageWidth(startWidth + (pointer.clientX - startX) * direction, maxWidth);
      figure.style.width = `${nextWidth}px`;
    };
    const onUp = (up: Event) => {
      consumeMediaLightboxTrigger(up);
      ownerDocument.removeEventListener(moveEvent, onMove);
      ownerDocument.removeEventListener(upEvent, onUp);
      view.dispatch({
        changes: resolveImageWidthChange({
          doc: view.state.doc.toString(),
          from: this.from,
          to: this.imageTo,
          width: nextWidth,
        }),
      });
      view.focus();
    };

    ownerDocument.addEventListener(moveEvent, onMove);
    ownerDocument.addEventListener(upEvent, onUp);
  }
}

function clampImageWidth(width: number, maxWidth: number): number {
  return Math.max(minImageWidth, Math.min(Math.round(width), maxWidth));
}

function resolveImageMaxWidth(view: EditorView, figure: HTMLElement): number {
  const content = figure.closest(".cm-line") ?? figure.closest(".cm-content") ?? view.contentDOM ?? view.dom;
  const width = content.getBoundingClientRect().width;
  return Math.max(minImageWidth, Math.round(width || figure.getBoundingClientRect().width || 800));
}

function renderPreviewImageButton(parsed: ParsedImageMarkdown, ctx: PreviewContext): string {
  const titleDataAttr = parsed.title ? ` data-title="${ctx.sanitize(parsed.title)}"` : "";
  return `<div class="cm-mardora-image-toolbar">
    <button type="button" class="cm-mardora-image-tool-button cm-mardora-image-preview-button" aria-label="放大查看图片" title="放大查看图片" data-src="${ctx.sanitize(parsed.url)}" data-alt="${ctx.sanitize(parsed.alt)}"${titleDataAttr}>${previewImageIcon}</button>
  </div>`;
}

/**
 * ImagePlugin - Decorates and renders images in markdown
 *
 * Supports the full image syntax: ![alt text](url "optional title")
 * - Shows image widget below the node when cursor is not in range
 * - Hides the markdown syntax when cursor is not in range
 * - Shows raw markdown when cursor is in the image syntax
 * - Uses figure/figcaption for semantic HTML with accessibility attributes
 */
export class ImagePlugin extends DecorationPlugin {
  readonly name = "image";
  readonly version = "1.0.0";
  override decorationPriority = 25;
  override readonly requiredNodes = ["Image"] as const;

  constructor() {
    super();
  }

  /**
   * Plugin theme
   */
  override get theme() {
    return theme;
  }

  /**
   * Keyboard shortcuts for image formatting
   */
  override getKeymap(): KeyBinding[] {
    return [
      {
        key: "Mod-Shift-i",
        run: (view) => this.toggleImage(view),
        preventDefault: true,
      },
    ];
  }

  /**
   * URL regex pattern
   */
  private readonly urlPattern = /^(https?:\/\/|www\.)[^\s]+$/i;

  /**
   * Toggle image on selection
   * - If text selected and is a URL: ![Alt Text](url) with cursor in brackets
   * - If text selected (not URL): ![text]() with cursor in parentheses
   * - If nothing selected: ![Alt Text]() with cursor in parentheses
   * - If already an image: remove syntax, leave just the URL
   */
  private toggleImage(view: EditorView): boolean {
    const { state } = view;
    const { from, to, empty } = state.selection.main;
    const selectedText = state.sliceDoc(from, to);

    // Check if selection is already an image ![alt](url)
    const imageMatch = selectedText.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
    if (imageMatch) {
      // Already an image - extract just the URL and replace
      const imageUrl = imageMatch[2] || "";
      view.dispatch({
        changes: { from, to, insert: imageUrl },
        selection: { anchor: from, head: from + imageUrl.length },
      });
      return true;
    }

    // Check if we're inside an image by looking at surrounding context
    const lineStart = state.doc.lineAt(from).from;
    const lineEnd = state.doc.lineAt(to).to;
    const lineText = state.sliceDoc(lineStart, lineEnd);

    // Find image pattern in line that contains the selection
    const imageRegex = /!\[([^\]]*)\]\(([^)]*)\)/g;
    let match;
    while ((match = imageRegex.exec(lineText)) !== null) {
      const matchFrom = lineStart + match.index;
      const matchTo = matchFrom + match[0].length;

      // Check if selection is within this image
      if (from >= matchFrom && to <= matchTo) {
        // Remove the image syntax, leave just the URL
        const imageUrl = match[2] || "";
        view.dispatch({
          changes: { from: matchFrom, to: matchTo, insert: imageUrl },
          selection: { anchor: matchFrom, head: matchFrom + imageUrl.length },
        });
        return true;
      }
    }

    if (empty) {
      // No selection - insert ![Alt Text]() and place cursor in parentheses
      const defaultAlt = "Alt Text";
      const newText = `![${defaultAlt}]()`;
      view.dispatch({
        changes: { from, insert: newText },
        selection: { anchor: from + defaultAlt.length + 4 }, // After ![Alt Text](
      });
    } else if (this.urlPattern.test(selectedText)) {
      // Selected text is a URL - put it in parentheses with default alt text
      const defaultAlt = "Alt Text";
      const newText = `![${defaultAlt}](${selectedText})`;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 2, head: from + 2 + defaultAlt.length }, // Select "Alt Text"
      });
    } else {
      // Selected text is not a URL - use as alt text, cursor in parentheses
      const newText = `![${selectedText}]()`;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + selectedText.length + 4 }, // After ![text](
      });
    }

    return true;
  }

  buildDecorations(ctx: DecorationContext): void {
    const { view, decorations } = ctx;
    const tree = syntaxTree(view.state);

    tree.iterate({
      enter: (node) => {
        const { from, to, name } = node;

        // Handle Image nodes
        if (name === "Image") {
          const imageRange = readImageMarkdownRange(view.state.doc.toString(), from, to);
          const parsed = parseImageMarkdown(imageRange.markdown);

          if (!parsed) return;

          const cursorInRange = ctx.selectionOverlapsRange(from, imageRange.to);

          // Add line decoration for image
          decorations.push(imageMarkDecorations["image-block"].range(from));

          // Always add the image widget below the node
          decorations.push(
            Decoration.widget({
              widget: new ImageWidget(parsed.url, parsed.alt, from, to, imageRange.to, parsed.width, parsed.title),
              side: 1, // Place after the position
              block: false, // Don't create a new line
            }).range(imageRange.to)
          );

          if (cursorInRange) {
            // Cursor in range: show raw markdown with styling
            this.decorateRawImage(node.node, decorations, view);
          } else {
            // Cursor out of range: hide the raw markdown text
            decorations.push(imageMarkDecorations["image-hidden"].range(from, imageRange.to));
          }
        }
      },
    });
  }

  /**
   * Decorate raw image markdown when cursor is in range
   */
  private decorateRawImage(
    node: SyntaxNode,
    decorations: import("@codemirror/state").Range<Decoration>[],
    view: import("@codemirror/view").EditorView
  ): void {
    // Find and style child nodes
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.name === "URL") {
        decorations.push(imageMarkDecorations["image-url"].range(child.from, child.to));
      }
    }

    // Style the markers (! [ ] ( ))
    const content = view.state.sliceDoc(node.from, node.to);
    const bangBracket = node.from; // Position of !
    if (content.startsWith("![")) {
      decorations.push(imageMarkDecorations["image-marker"].range(bangBracket, bangBracket + 2));
    }

    // Find and style closing bracket and parentheses
    const altEnd = content.indexOf("](");
    if (altEnd !== -1) {
      const altStart = 2;
      // Style alt text
      if (altEnd > altStart) {
        decorations.push(imageMarkDecorations["image-alt"].range(node.from + altStart, node.from + altEnd));
      }
      // Style ]( markers
      decorations.push(imageMarkDecorations["image-marker"].range(node.from + altEnd, node.from + altEnd + 2));
      // Style closing )
      decorations.push(imageMarkDecorations["image-marker"].range(node.to - 1, node.to));
    }
  }

  /**
   * Render image to HTML for preview mode using figure/figcaption
   */
  override renderToHTML(
    node: SyntaxNode,
    _children: string,
    ctx: PreviewContext
  ): string | null {
    if (node.name !== "Image") return null;

    const range = readImageMarkdownRange(ctx.doc, node.from, node.to);
    const content = ctx.sliceDoc(node.from, range.to);
    const parsed = parseImageMarkdown(content);
    if (!parsed) return null;

    const altAttr = ctx.sanitize(parsed.alt);
    const titleAttr = parsed.title ? ` title="${ctx.sanitize(parsed.title)}"` : "";
    const ariaLabel = parsed.title ? ` aria-label="${ctx.sanitize(parsed.title)}"` : "";
    const figureWidthStyle = parsed.width ? ` style="width: ${parsed.width}px;"` : "";
    const imageWidthStyle = parsed.width ? ` style="width: 100%;"` : "";

    let html = `<figure class="cm-mardora-image-figure" role="figure"${ariaLabel}${figureWidthStyle}>`;
    html += `<img class="cm-mardora-image" src="${ctx.sanitize(parsed.url)}" alt="${altAttr}"${titleAttr}${imageWidthStyle} loading="lazy" decoding="async" />`;
    html += renderPreviewImageButton(parsed, ctx);

    if (parsed.title) {
      html += `<figcaption class="cm-mardora-image-caption">${ctx.sanitize(parsed.title)}</figcaption>`;
    }

    html += `</figure>`;
    return html;
  }

  override getPreviewConsumedTo(node: SyntaxNode, ctx: { doc: string }): number | null {
    if (node.name !== "Image") return null;
    return readImageMarkdownRange(ctx.doc, node.from, node.to).to;
  }
}

/**
 * Theme for image styling
 */
const imageTheme = createTheme({
  default: {
    ".cm-mardora-image-block br": {
      display: "none",
    },

    // Image markers (! [ ] ( ))
    ".cm-mardora-image-marker": {
      color: "#6a737d",
      fontFamily: "var(--font-jetbrains-mono, monospace)",
    },

    // Alt text
    ".cm-mardora-image-alt": {
      color: "#22863a",
      fontStyle: "italic",
    },

    // URL
    ".cm-mardora-image-url": {
      color: "#0366d6",
      textDecoration: "underline",
    },

    // Hidden markdown syntax (when cursor is not in range)
    ".cm-mardora-image-hidden": {
      display: "none",
    },

    // Figure container — fill the content width so the image aligns with
    // surrounding text lines instead of shrinking to its intrinsic size and
    // leaving a gap on the right. Inline width (from {width=} / drag-resize)
    // overrides this via the style attribute.
    ".cm-mardora-image-figure": {
      display: "flex",
      flexDirection: "column",
      alignItems: "start",
      width: "100%",
      maxWidth: "100%",
      margin: "0",
      padding: "0",
      position: "relative",
    },

    ".cm-mardora-image-toolbar": {
      position: "absolute",
      top: "0.5rem",
      right: "0.5rem",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.125rem",
      padding: "0.1875rem",
      border: "1px solid rgba(148, 163, 184, 0.4)",
      borderRadius: "0.375rem",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.14)",
      opacity: "0",
      pointerEvents: "auto",
      transition: "opacity 120ms ease, background-color 120ms ease, border-color 120ms ease",
      zIndex: "3",
    },

    ".cm-mardora-image-figure:hover .cm-mardora-image-toolbar, .cm-mardora-image-figure-active .cm-mardora-image-toolbar, .cm-mardora-image-toolbar:focus-within": {
      opacity: "1",
    },

    ".cm-mardora-image-tool-button": {
      width: "1.75rem",
      height: "1.75rem",
      border: "0",
      borderRadius: "0.25rem",
      backgroundColor: "transparent",
      color: "#334155",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0",
      cursor: "pointer",
      transition: "background-color 120ms ease, color 120ms ease",
    },

    ".cm-mardora-image-tool-button:hover, .cm-mardora-image-tool-button:focus-visible": {
      backgroundColor: "rgba(37, 99, 235, 0.1)",
      color: "#2563eb",
      outline: "none",
    },

    ".cm-mardora-image-tool-button svg": {
      width: "1rem",
      height: "1rem",
    },

    ".cm-mardora-image-resize-handle": {
      position: "absolute",
      top: "50%",
      width: "0.375rem",
      height: "2.75rem",
      borderRadius: "999px",
      backgroundColor: "#3b82f6",
      boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.9), 0 8px 20px rgba(37, 99, 235, 0.24)",
      cursor: "ew-resize",
      opacity: "0",
      transform: "translateY(-50%)",
      transition: "opacity 120ms ease, background-color 120ms ease",
      zIndex: "2",
    },

    ".cm-mardora-image-figure:hover .cm-mardora-image-resize-handle, .cm-mardora-image-figure-active .cm-mardora-image-resize-handle, .cm-mardora-image-resize-handle:focus-visible": {
      opacity: "1",
    },

    ".cm-mardora-image-resize-handle:hover, .cm-mardora-image-resize-handle:focus-visible": {
      backgroundColor: "#2563eb",
      outline: "none",
    },

    ".cm-mardora-image-resize-handle-left": {
      left: "-0.1875rem",
    },

    ".cm-mardora-image-resize-handle-right": {
      right: "-0.1875rem",
    },

    // Image element — fill the figure by default so the image stretches to
    // the content width. When an explicit width is set, img gets an inline
    // width:100% too (figure carries the pixel width), so this stays consistent.
    ".cm-mardora-image": {
      width: "100%",
      maxWidth: "100%",
      maxHeight: "800px",
      height: "auto",
      borderRadius: "4px",
    },

    // Figcaption
    ".cm-mardora-image-caption": {
      display: "block",
      width: "100%",
      fontSize: "0.875em",
      color: "#6a737d",
      marginTop: "0.5em",
      textAlign: "center",
      fontStyle: "italic",
    },

    // Error state
    ".cm-mardora-image-error": {
      display: "inline-block",
      padding: "0.5em 1em",
      backgroundColor: "rgba(255, 0, 0, 0.1)",
      color: "#d73a49",
      borderRadius: "4px",
      fontSize: "0.875em",
      fontStyle: "italic",
    },
  },

  dark: {
    ".cm-mardora-image-marker": {
      color: "#8b949e",
    },

    ".cm-mardora-image-alt": {
      color: "#7ee787",
    },

    ".cm-mardora-image-url": {
      color: "#58a6ff",
    },

    ".cm-mardora-image-caption": {
      color: "#8b949e",
    },

    ".cm-mardora-image-toolbar": {
      borderColor: "rgba(71, 85, 105, 0.72)",
      backgroundColor: "rgba(15, 23, 42, 0.88)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.32)",
    },

    ".cm-mardora-image-tool-button": {
      color: "#cbd5e1",
    },

    ".cm-mardora-image-tool-button:hover, .cm-mardora-image-tool-button:focus-visible": {
      backgroundColor: "rgba(96, 165, 250, 0.18)",
      color: "#93c5fd",
    },

    ".cm-mardora-image-error": {
      backgroundColor: "rgba(255, 0, 0, 0.15)",
      color: "#f85149",
    },
  },
});

const theme = (theme: Parameters<typeof imageTheme>[0]) => ({
  ...imageTheme(theme),
  ...mediaLightboxTheme(theme),
});
