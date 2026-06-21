import { Decoration, EditorView, KeyBinding, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { DecorationContext, DecorationPlugin } from "../editor/plugin";
import { createTheme } from "../editor";
import { SyntaxNode } from "@lezer/common";
import { createMardoraIcon } from "../editor/icons";
import {
  buildRemoveLinkPreviewChange,
  dispatchMardoraLinkEditEvent,
  findLinkPreviewForLink,
  type MardoraLinkPreviewMetadata,
} from "../editor/link-preview";

/**
 * Mark decorations for link syntax elements
 */
const linkMarkDecorations = {
  "link-text": Decoration.mark({ class: "cm-mardora-link-text" }),
  "link-marker": Decoration.mark({ class: "cm-mardora-link-marker" }),
  "link-url": Decoration.mark({ class: "cm-mardora-link-url" }),
  "link-hidden": Decoration.mark({ class: "cm-mardora-link-hidden" }),
};

const linkLineDecorations = {
  "hidden-line": Decoration.line({ class: "cm-mardora-link-preview-hidden-line" }),
};

/**
 * Parse link markdown to extract text and URL
 * Format: [text](url) or [text](url "title")
 */
function parseLinkMarkdown(content: string): { text: string; url: string; title?: string } | null {
  // Regex to match: [text](url) or [text](url "title")
  const match = content.match(/^\[([^\]]*)\]\(([^"\s)]+)(?:\s+"([^"]*)")?\s*\)$/);
  if (!match) return null;

  const result: { text: string; url: string; title?: string } = {
    text: match[1] || "",
    url: match[2]!,
  };

  if (match[3] !== undefined) {
    result.title = match[3];
  }

  return result;
}

/**
 * Widget for displaying a tooltip with the link URL on hover
 */
class LinkTooltipWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  override eq(other: LinkTooltipWidget): boolean {
    return other.url === this.url && other.from === this.from && other.to === this.to;
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement("span");
    wrapper.className = "cm-mardora-link-wrapper";
    wrapper.style.cursor = "pointer";

    // Tooltip element
    const tooltip = document.createElement("span");
    tooltip.className = "cm-mardora-link-tooltip";
    tooltip.textContent = this.url;
    wrapper.appendChild(tooltip);

    // Show/hide tooltip on hover
    wrapper.addEventListener("mouseenter", () => {
      tooltip.classList.add("cm-mardora-link-tooltip-visible");
    });

    wrapper.addEventListener("mouseleave", () => {
      tooltip.classList.remove("cm-mardora-link-tooltip-visible");
    });

    // Click handler - select the raw markdown
    wrapper.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Click: open in new tab
        e.preventDefault();
        e.stopPropagation();
        window.open(this.url, "_blank", "noopener,noreferrer");
      } else {
        // Regular click: select raw markdown
        e.preventDefault();
        e.stopPropagation();
        dispatchMardoraLinkEditEvent(
          view,
          {
            from: this.from,
            to: this.to,
            title: "",
            url: this.url,
            canEmbed: false,
            isPreview: false,
          },
          wrapper
        );
      }
    });

    return wrapper;
  }

  override ignoreEvent(event: Event): boolean {
    // Allow click and mouse events to be handled by our handlers
    return event.type !== "click" && event.type !== "mouseenter" && event.type !== "mouseleave";
  }
}

/**
 * LinkPlugin - Decorates and provides interactivity for markdown links
 *
 * Supports the full link syntax: [text](url) and [text](url "title")
 * - Click: reveals raw markdown (selects/focuses the link syntax)
 * - Ctrl+Click: opens the link URL in a new browser tab
 * - Hover: shows tooltip with the link URL
 * - Hides the markdown syntax when cursor is not in range
 * - Shows raw markdown when cursor is within the link range
 */
export class LinkPlugin extends DecorationPlugin {
  readonly name = "link";
  readonly version = "1.0.0";
  override decorationPriority = 22;
  override readonly requiredNodes = ["Link"] as const;

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
   * Keyboard shortcuts for link formatting
   */
  override getKeymap(): KeyBinding[] {
    return [
      {
        key: "Mod-k",
        run: (view) => this.toggleLink(view),
        preventDefault: true,
      },
    ];
  }

  /**
   * URL regex pattern
   */
  private readonly urlPattern = /^(https?:\/\/|www\.)[^\s]+$/i;

  /**
   * Toggle link on selection
   * - If text is selected and is a URL: [](url) with cursor in brackets
   * - If text is selected (not URL): [text]() with cursor in parentheses
   * - If nothing selected: []() with cursor in brackets
   * - If already a link: remove syntax, leave plain text
   */
  private toggleLink(view: EditorView): boolean {
    const { state } = view;
    const { from, to, empty } = state.selection.main;
    const selectedText = state.sliceDoc(from, to);

    // Check if selection is already a link [text](url)
    const linkMatch = selectedText.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
    if (linkMatch) {
      // Already a link - extract just the text and replace
      const linkText = linkMatch[1] || "";
      view.dispatch({
        changes: { from, to, insert: linkText },
        selection: { anchor: from, head: from + linkText.length },
      });
      return true;
    }

    // Check if we're inside a link by looking at surrounding context
    const lineStart = state.doc.lineAt(from).from;
    const lineEnd = state.doc.lineAt(to).to;
    const lineText = state.sliceDoc(lineStart, lineEnd);

    // Find link pattern in line that contains the selection
    const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
    let match;
    while ((match = linkRegex.exec(lineText)) !== null) {
      const matchFrom = lineStart + match.index;
      const matchTo = matchFrom + match[0].length;

      // Check if selection is within this link
      if (from >= matchFrom && to <= matchTo) {
        // Remove the link syntax, leave plain text
        const linkText = match[1] || "";
        view.dispatch({
          changes: { from: matchFrom, to: matchTo, insert: linkText },
          selection: { anchor: matchFrom, head: matchFrom + linkText.length },
        });
        return true;
      }
    }

    if (empty) {
      // No selection - insert []() and place cursor in brackets
      view.dispatch({
        changes: { from, insert: "[]()" },
        selection: { anchor: from + 1 },
      });
    } else if (this.urlPattern.test(selectedText)) {
      // Selected text is a URL - put it in parentheses, cursor in brackets
      const newText = `[](${selectedText})`;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 1 },
      });
    } else {
      // Selected text is not a URL - wrap as link text, cursor in parentheses
      const newText = `[${selectedText}]()`;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + selectedText.length + 3 },
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

        // Handle Link nodes
        if (name === "Link") {
          const content = view.state.sliceDoc(from, to);
          const parsed = parseLinkMarkdown(content);

          if (!parsed) return;

          const preview = findLinkPreviewForLink({
            doc: view.state.doc.toString(),
            linkFrom: from,
            linkTo: to,
            url: parsed.url,
          });
          if (preview) {
            const cursorInPreview = ctx.selectionOverlapsRange(from, preview.commentTo);
            if (cursorInPreview) {
              this.decorateRawLink(node.node, decorations, view);
              return;
            }

            const linkLine = view.state.doc.lineAt(from);
            const commentLine = view.state.doc.lineAt(preview.commentFrom);
            decorations.push(
              Decoration.replace({
                widget: new LinkPreviewCardWidget(parsed.text, parsed.url, from, to, preview.metadata, preview.commentFrom, preview.commentTo),
              }).range(linkLine.from, linkLine.to)
            );
            decorations.push(Decoration.replace({}).range(preview.commentFrom, preview.commentTo));
            decorations.push(linkLineDecorations["hidden-line"].range(commentLine.from));
            return;
          }

          const cursorInRange = ctx.selectionOverlapsRange(from, to);

          if (cursorInRange) {
            // Cursor in range: show raw markdown with styling
            this.decorateRawLink(node.node, decorations, view);
          } else {
            // Cursor out of range: hide raw markdown, show styled link text
            // Hide the entire markdown syntax
            decorations.push(linkMarkDecorations["link-hidden"].range(from, to));

            // Add styled link text with tooltip widget after the hidden markdown
            decorations.push(
              Decoration.widget({
                widget: new LinkTooltipWidget(parsed.url, from, to),
                side: 1,
              }).range(to)
            );

            // Add replacement decoration to show styled link text
            decorations.push(
              Decoration.replace({
                widget: new LinkTextWidget(parsed.text, parsed.url, from, to, parsed.title),
              }).range(from, to)
            );
          }
        }
      },
    });
  }

  /**
   * Decorate raw link markdown when cursor is in range
   */
  private decorateRawLink(
    node: SyntaxNode,
    decorations: import("@codemirror/state").Range<Decoration>[],
    view: import("@codemirror/view").EditorView
  ): void {
    const content = view.state.sliceDoc(node.from, node.to);

    // Style the opening bracket [
    decorations.push(linkMarkDecorations["link-marker"].range(node.from, node.from + 1));

    // Find and style the link text and closing bracket + opening paren ](
    const bracketParen = content.indexOf("](");
    if (bracketParen !== -1) {
      // Style link text
      if (bracketParen > 1) {
        decorations.push(linkMarkDecorations["link-text"].range(node.from + 1, node.from + bracketParen));
      }
      // Style ]( markers
      decorations.push(
        linkMarkDecorations["link-marker"].range(node.from + bracketParen, node.from + bracketParen + 2)
      );

      // Find and style the URL
      const urlChild = node.getChild("URL");
      if (urlChild) {
        decorations.push(linkMarkDecorations["link-url"].range(urlChild.from, urlChild.to));
      }

      // Style closing )
      decorations.push(linkMarkDecorations["link-marker"].range(node.to - 1, node.to));
    }
  }

  /**
   * Render link to HTML for preview mode
   */
  override renderToHTML(
    node: SyntaxNode,
    _children: string,
    ctx: { sliceDoc(from: number, to: number): string; sanitize(html: string): string }
  ): string | null {
    if (node.name !== "Link") return null;

    const content = ctx.sliceDoc(node.from, node.to);
    const parsed = parseLinkMarkdown(content);
    if (!parsed) return null;

    const preview = findLinkPreviewForLink({
      doc: "doc" in ctx && typeof ctx.doc === "string" ? ctx.doc : "",
      linkFrom: node.from,
      linkTo: node.to,
      url: parsed.url,
    });
    if (preview) {
      return renderLinkPreviewCardHTML(preview.metadata, parsed.text, ctx);
    }

    const textContent = ctx.sanitize(parsed.text);
    const urlAttr = ctx.sanitize(parsed.url);
    const titleAttr = parsed.title ? ` title="${ctx.sanitize(parsed.title)}"` : "";

    return `<a class="cm-mardora-link" href="${urlAttr}"${titleAttr} target="_blank" rel="noopener noreferrer">${textContent}</a>`;
  }

  override getPreviewConsumedTo(node: SyntaxNode, ctx: { doc: string; sliceDoc(from: number, to: number): string }): number | null {
    if (node.name !== "Link") return null;
    const parsed = parseLinkMarkdown(ctx.sliceDoc(node.from, node.to));
    if (!parsed) return null;
    return (
      findLinkPreviewForLink({
        doc: ctx.doc,
        linkFrom: node.from,
        linkTo: node.to,
        url: parsed.url,
      })?.commentTo ?? null
    );
  }
}

function renderLinkPreviewCardHTML(
  metadata: MardoraLinkPreviewMetadata,
  fallbackTitle: string,
  ctx: { sanitize(html: string): string }
): string {
  const title = ctx.sanitize(metadata.title || fallbackTitle || metadata.url);
  const url = ctx.sanitize(metadata.url);
  const domain = metadata.domain ? ctx.sanitize(metadata.domain) : "";
  const description = metadata.description ? ctx.sanitize(metadata.description) : "";
  const image = metadata.image ? ctx.sanitize(metadata.image) : "";

  let html = `<a class="cm-mardora-link-preview-card" href="${url}" target="_blank" rel="noopener noreferrer">`;
  html += `<span class="cm-mardora-link-preview-content">`;
  html += `<span class="cm-mardora-link-preview-title">${title}</span>`;
  if (description) html += `<span class="cm-mardora-link-preview-description">${description}</span>`;
  html += `<span class="cm-mardora-link-preview-url">${url}</span>`;
  if (domain) html += `<span class="cm-mardora-link-preview-domain">${domain}</span>`;
  html += `</span>`;
  if (image) {
    html += `<span class="cm-mardora-link-preview-image-wrap"><img class="cm-mardora-link-preview-image" src="${image}" alt="" loading="lazy" decoding="async" /></span>`;
  }
  html += `</a>`;
  return html;
}

/**
 * Widget to display the styled link text with interactivity
 */
class LinkTextWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly url: string,
    readonly from: number,
    readonly to: number,
    readonly title?: string
  ) {
    super();
  }

  override eq(other: LinkTextWidget): boolean {
    return (
      other.text === this.text &&
      other.url === this.url &&
      other.from === this.from &&
      other.to === this.to &&
      other.title === this.title
    );
  }

  toDOM(view: EditorView) {
    const span = document.createElement("span");
    span.className = "cm-mardora-link-styled";
    span.textContent = this.text;
    span.style.cursor = "pointer";

    if (this.title) {
      span.title = this.title;
    }

    // Tooltip element
    const tooltip = document.createElement("span");
    tooltip.className = "cm-mardora-link-tooltip";
    tooltip.textContent = this.url;
    span.appendChild(tooltip);

    // Show/hide tooltip on hover
    span.addEventListener("mouseenter", () => {
      tooltip.classList.add("cm-mardora-link-tooltip-visible");
    });

    span.addEventListener("mouseleave", () => {
      tooltip.classList.remove("cm-mardora-link-tooltip-visible");
    });

    // Click handler
    span.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Click: open in new tab
        e.preventDefault();
        e.stopPropagation();
        window.open(this.url, "_blank", "noopener,noreferrer");
      } else {
        // Regular click: select raw markdown
        e.preventDefault();
        e.stopPropagation();
        dispatchMardoraLinkEditEvent(
          view,
          {
            from: this.from,
            to: this.to,
            title: this.text,
            url: this.url,
            canEmbed: true,
            isPreview: false,
          },
          span
        );
      }
    });

    return span;
  }

  override ignoreEvent(event: Event): boolean {
    // Allow click and mouse events to be handled by our handlers
    return event.type !== "click" && event.type !== "mouseenter" && event.type !== "mouseleave";
  }
}

class LinkPreviewCardWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly url: string,
    readonly from: number,
    readonly to: number,
    readonly metadata: MardoraLinkPreviewMetadata,
    readonly commentFrom: number,
    readonly commentTo: number
  ) {
    super();
  }

  override eq(other: LinkPreviewCardWidget): boolean {
    return (
      other.text === this.text &&
      other.url === this.url &&
      other.from === this.from &&
      other.to === this.to &&
      other.commentFrom === this.commentFrom &&
      other.commentTo === this.commentTo &&
      JSON.stringify(other.metadata) === JSON.stringify(this.metadata)
    );
  }

  toDOM(view: EditorView) {
    const card = document.createElement("span");
    card.className = [
      "cm-mardora-link-preview-card",
      "cm-mardora-link-preview-card-editor",
      this.metadata.image ? "cm-mardora-link-preview-card-with-image" : "cm-mardora-link-preview-card-without-image",
    ].join(" ");
    card.setAttribute("role", "button");
    card.tabIndex = 0;

    const content = document.createElement("span");
    content.className = "cm-mardora-link-preview-content";

    const title = document.createElement("span");
    title.className = "cm-mardora-link-preview-title";
    title.textContent = this.metadata.title || this.text || this.url;
    content.appendChild(title);

    if (this.metadata.description) {
      const description = document.createElement("span");
      description.className = "cm-mardora-link-preview-description";
      description.textContent = this.metadata.description;
      content.appendChild(description);
    }

    const url = document.createElement("span");
    url.className = "cm-mardora-link-preview-url";
    url.textContent = this.metadata.url || this.url;
    content.appendChild(url);

    if (this.metadata.domain) {
      const domain = document.createElement("span");
      domain.className = "cm-mardora-link-preview-domain";
      domain.textContent = this.metadata.domain;
      content.appendChild(domain);
    }

    card.appendChild(content);

    if (this.metadata.image) {
      const imageWrap = document.createElement("span");
      imageWrap.className = "cm-mardora-link-preview-image-wrap";
      const image = document.createElement("img");
      image.className = "cm-mardora-link-preview-image";
      image.src = this.metadata.image;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      imageWrap.appendChild(image);
      card.appendChild(imageWrap);
    }

    card.appendChild(this.createToolbar(view, card));

    const openPanel = () => {
      dispatchMardoraLinkEditEvent(
        view,
        {
          from: this.from,
          to: this.to,
          title: this.text,
          url: this.url,
          canEmbed: true,
          isPreview: true,
          previewCommentFrom: this.commentFrom,
          previewCommentTo: this.commentTo,
        },
        card
      );
    };

    card.addEventListener("click", (event) => {
      if ((event.target as Element | null)?.closest("button")) return;
      event.preventDefault();
      event.stopPropagation();
      openPanel();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openPanel();
    });

    return card;
  }

  override ignoreEvent(event: Event): boolean {
    return event.type !== "click" && event.type !== "keydown";
  }

  private createToolbar(view: EditorView, card: HTMLElement): HTMLElement {
    const toolbar = card.ownerDocument.createElement("div");
    toolbar.className = "cm-mardora-link-preview-toolbar";
    toolbar.appendChild(this.createToolButton(card.ownerDocument, "编辑链接", "link", () => {
      dispatchMardoraLinkEditEvent(
        view,
        {
          from: this.from,
          to: this.to,
          title: this.text,
          url: this.url,
          canEmbed: true,
          isPreview: true,
          previewCommentFrom: this.commentFrom,
          previewCommentTo: this.commentTo,
        },
        card
      );
    }));
    toolbar.appendChild(this.createToolButton(card.ownerDocument, "切回链接", "type", () => {
      view.dispatch({
        changes: buildRemoveLinkPreviewChange({
          doc: view.state.doc.toString(),
          commentFrom: this.commentFrom,
          commentTo: this.commentTo,
        }),
      });
      view.focus();
    }));
    toolbar.appendChild(this.createToolButton(card.ownerDocument, "复制链接", "copy", () => {
      void card.ownerDocument.defaultView?.navigator.clipboard?.writeText(this.url);
    }));
    toolbar.appendChild(this.createToolButton(card.ownerDocument, "打开链接", "external-link", () => {
      card.ownerDocument.defaultView?.open(this.url, "_blank", "noopener,noreferrer");
    }));
    return toolbar;
  }

  private createToolButton(
    ownerDocument: Document,
    label: string,
    iconName: string,
    onActivate: () => void
  ): HTMLButtonElement {
    const button = ownerDocument.createElement("button");
    button.type = "button";
    button.className = "cm-mardora-link-preview-tool-button";
    button.setAttribute("aria-label", label);
    button.title = label;
    const icon = createMardoraIcon(iconName);
    if (icon) button.appendChild(icon);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onActivate();
    });
    return button;
  }
}

/**
 * Theme for link styling
 */
const theme = createTheme({
  default: {
    // Link text
    ".cm-mardora-link-text": {
      color: "#0366d6",
    },

    // Link markers ([ ] ( ))
    ".cm-mardora-link-marker": {
      color: "#6a737d",
      fontFamily: "var(--font-jetbrains-mono, monospace)",
    },

    // URL in raw markdown
    ".cm-mardora-link-url": {
      color: "#6a737d",
      fontStyle: "italic",
    },

    // Hidden markdown syntax
    ".cm-mardora-link-hidden": {
      display: "none",
    },

    ".cm-mardora-link-preview-hidden-line": {
      display: "none",
    },

    // Styled link when cursor is not in range
    ".cm-mardora-link-styled": {
      color: "#0366d6",
      textDecoration: "underline",
      position: "relative",
      cursor: "pointer",
    },

    ".cm-mardora-link-styled:hover": {
      color: "#0056b3",
    },

    // Preview link styling
    ".cm-mardora-link": {
      color: "#0366d6",
      textDecoration: "underline",
    },

    ".cm-mardora-link:hover": {
      color: "#0056b3",
    },

    ".cm-mardora-link-preview-card": {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: "1rem",
      width: "100%",
      margin: "0.75rem 0",
      overflow: "hidden",
      border: "1px solid #e5e7eb",
      borderRadius: "0.5rem",
      backgroundColor: "#ffffff",
      color: "#18181b",
      textDecoration: "none",
      position: "relative",
    },

    ".cm-mardora-link-preview-card-with-image": {
      gridTemplateColumns: "minmax(0, 1fr) minmax(13rem, 34%)",
      height: "clamp(8.75rem, 13vw, 12rem)",
      minHeight: "8.75rem",
    },

    ".cm-mardora-link-preview-card-without-image": {
      minHeight: "7rem",
    },

    ".cm-mardora-link-preview-card-editor": {
      display: "inline-grid",
      margin: "0",
      verticalAlign: "top",
      cursor: "pointer",
    },

    ".cm-mardora-link-preview-card:hover": {
      borderColor: "#d4d4d8",
    },

    ".cm-mardora-link-preview-content": {
      display: "flex",
      minWidth: "0",
      minHeight: "0",
      flexDirection: "column",
      justifyContent: "center",
      gap: "0.625rem",
      padding: "1rem 1.25rem",
    },

    ".cm-mardora-link-preview-title": {
      display: "block",
      overflow: "hidden",
      color: "#18181b",
      fontSize: "1rem",
      fontWeight: "600",
      lineHeight: "1.35",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },

    ".cm-mardora-link-preview-description": {
      display: "-webkit-box",
      overflow: "hidden",
      color: "#3f3f46",
      fontSize: "0.875rem",
      lineHeight: "1.55",
      WebkitBoxOrient: "vertical",
      WebkitLineClamp: "2",
    },

    ".cm-mardora-link-preview-url, .cm-mardora-link-preview-domain": {
      display: "block",
      overflow: "hidden",
      color: "#2563eb",
      fontSize: "0.875rem",
      lineHeight: "1.4",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },

    ".cm-mardora-link-preview-domain": {
      display: "none",
      color: "#71717a",
    },

    ".cm-mardora-link-preview-image-wrap": {
      display: "block",
      minHeight: "0",
      height: "100%",
      overflow: "hidden",
      backgroundColor: "#f4f4f5",
    },

    ".cm-mardora-link-preview-image": {
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },

    ".cm-mardora-link-preview-toolbar": {
      position: "absolute",
      top: "0.5rem",
      right: "0.5rem",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.125rem",
      padding: "0.1875rem",
      border: "1px solid #e5e7eb",
      borderRadius: "0.375rem",
      backgroundColor: "rgba(255, 255, 255, 0.94)",
      opacity: "0",
      pointerEvents: "none",
      transition: "opacity 120ms ease",
    },

    ".cm-mardora-link-preview-card:hover .cm-mardora-link-preview-toolbar, .cm-mardora-link-preview-card:focus-within .cm-mardora-link-preview-toolbar":
      {
        opacity: "1",
        pointerEvents: "auto",
      },

    ".cm-mardora-link-preview-tool-button": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "1.875rem",
      height: "1.875rem",
      padding: "0",
      border: "0",
      borderRadius: "0.3125rem",
      backgroundColor: "transparent",
      color: "#3f3f46",
      cursor: "pointer",
    },

    ".cm-mardora-link-preview-tool-button:hover, .cm-mardora-link-preview-tool-button:focus-visible": {
      backgroundColor: "#e4e4e7",
      color: "#18181b",
      outline: "none",
    },

    ".cm-mardora-link-preview-tool-button svg": {
      width: "1rem",
      height: "1rem",
    },

    // Tooltip styling
    ".cm-mardora-link-tooltip": {
      display: "none",
      position: "absolute",
      bottom: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "#24292e",
      color: "#ffffff",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      whiteSpace: "nowrap",
      zIndex: "1000",
      pointerEvents: "none",
      marginBottom: "4px",
      maxWidth: "300px",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },

    ".cm-mardora-link-tooltip-visible": {
      display: "block",
    },
  },

  dark: {
    ".cm-mardora-link-text": {
      color: "#58a6ff",
    },

    ".cm-mardora-link-marker": {
      color: "#8b949e",
    },

    ".cm-mardora-link-url": {
      color: "#8b949e",
    },

    ".cm-mardora-link-styled": {
      color: "#58a6ff",
    },

    ".cm-mardora-link-styled:hover": {
      color: "#79c0ff",
    },

    ".cm-mardora-link": {
      color: "#58a6ff",
    },

    ".cm-mardora-link:hover": {
      color: "#79c0ff",
    },

    ".cm-mardora-link-preview-card": {
      borderColor: "#30363d",
      backgroundColor: "#0d1117",
      color: "#c9d1d9",
    },

    ".cm-mardora-link-preview-card:hover": {
      borderColor: "#484f58",
    },

    ".cm-mardora-link-preview-title": {
      color: "#f0f6fc",
    },

    ".cm-mardora-link-preview-description": {
      color: "#c9d1d9",
    },

    ".cm-mardora-link-preview-url": {
      color: "#58a6ff",
    },

    ".cm-mardora-link-preview-domain": {
      color: "#8b949e",
    },

    ".cm-mardora-link-preview-image-wrap": {
      backgroundColor: "#161b22",
    },

    ".cm-mardora-link-preview-toolbar": {
      borderColor: "#30363d",
      backgroundColor: "rgba(22, 27, 34, 0.94)",
    },

    ".cm-mardora-link-preview-tool-button": {
      color: "#c9d1d9",
    },

    ".cm-mardora-link-preview-tool-button:hover, .cm-mardora-link-preview-tool-button:focus-visible": {
      backgroundColor: "#30363d",
      color: "#f0f6fc",
    },

    ".cm-mardora-link-tooltip": {
      backgroundColor: "#30363d",
      color: "#c9d1d9",
    },
  },
});
