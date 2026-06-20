import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { EditorState, Extension, TransactionSpec } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { DecorationContext, DecorationPlugin } from "../editor/plugin";
import { createTheme } from "../editor";
import { SyntaxNode } from "@lezer/common";
import { createMardoraIcon, type MardoraIconName } from "../editor/icons";

export type CalloutLabel = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

type CalloutInfo = {
  label: CalloutLabel;
  type: Lowercase<CalloutLabel>;
};

export type CalloutTitleInputTarget = {
  anchor: number;
  changes?: {
    from: number;
    insert: string;
  };
};

export type CalloutTypeChange = {
  from: number;
  to: number;
  insert: CalloutLabel;
};

const calloutLabels: readonly CalloutLabel[] = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];
const calloutIconMap: Record<CalloutLabel, MardoraIconName> = {
  NOTE: "info",
  TIP: "lightbulb",
  IMPORTANT: "badge-alert",
  WARNING: "triangle-alert",
  CAUTION: "octagon-alert",
};
const calloutIconMarkupMap: Record<CalloutLabel, string> = {
  NOTE: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>',
  TIP: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path>',
  IMPORTANT:
    '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line>',
  WARNING:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
  CAUTION:
    '<path d="M12 16h.01"></path><path d="M12 8v4"></path><path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"></path>',
};
const calloutMarkerPattern = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i;
const calloutMarkerSearchPattern = /\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i;
const quotePrefixPattern = /^ {0,3}>\s?/;

function stripQuoteMarker(line: string): string {
  return line.replace(quotePrefixPattern, "");
}

export function parseCalloutInfo(markdown: string): CalloutInfo | null {
  const firstLine = markdown.split(/\r?\n/, 1)[0] ?? "";
  const match = stripQuoteMarker(firstLine).trim().match(calloutMarkerPattern);

  if (!match?.[1]) {
    return null;
  }

  const label = match[1].toUpperCase() as CalloutLabel;
  return { label, type: label.toLowerCase() as Lowercase<CalloutLabel> };
}

function removeRenderedCalloutMarker(children: string, label: CalloutLabel): string {
  const markerPattern = new RegExp(`^(\\s*(?:<p\\b[^>]*>)?\\s*)\\[!${label}\\]\\s*(?:\\r?\\n)?\\s*`, "i");
  return children.replace(markerPattern, "$1");
}

function renderCalloutIconHTML(label: CalloutLabel): string {
  return `<svg class="cm-mardora-callout-title-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${calloutIconMarkupMap[label]}</svg>`;
}

function getQuotePrefixLength(line: string): number | null {
  const match = line.match(quotePrefixPattern);
  return match ? match[0].length : null;
}

export function resolveCalloutTitleInputTarget(state: EditorState, pos: number): CalloutTitleInputTarget | null {
  const titleLine = state.doc.lineAt(pos);

  if (!parseCalloutInfo(titleLine.text)) {
    return null;
  }

  const bodyLineNumber = titleLine.number + 1;
  if (bodyLineNumber <= state.doc.lines) {
    const bodyLine = state.doc.line(bodyLineNumber);
    const quotePrefixLength = getQuotePrefixLength(bodyLine.text);

    if (quotePrefixLength !== null) {
      return {
        anchor: bodyLine.from + quotePrefixLength,
      };
    }
  }

  const insert = "\n> ";
  return {
    anchor: titleLine.to + insert.length,
    changes: {
      from: titleLine.to,
      insert,
    },
  };
}

export function resolveCalloutTypeChange(
  state: EditorState,
  pos: number,
  nextLabel: CalloutLabel
): CalloutTypeChange | null {
  const titleLine = state.doc.lineAt(pos);
  const callout = parseCalloutInfo(titleLine.text);
  if (!callout || callout.label === nextLabel) {
    return null;
  }

  const markerMatch = titleLine.text.match(calloutMarkerSearchPattern);
  if (!markerMatch?.[1] || markerMatch.index === undefined) {
    return null;
  }

  const typeFrom = titleLine.from + markerMatch.index + 2;
  return {
    from: typeFrom,
    to: typeFrom + markerMatch[1].length,
    insert: nextLabel,
  };
}

class CalloutTitleWidget extends WidgetType {
  constructor(
    readonly info: CalloutInfo,
    readonly pos: number
  ) {
    super();
  }

  override eq(other: CalloutTitleWidget): boolean {
    return other.info.label === this.info.label && other.pos === this.pos;
  }

  toDOM(): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cm-mardora-callout-title-button";
    button.dataset.calloutLabel = this.info.label;
    button.dataset.calloutPos = String(this.pos);
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-label", `Switch ${this.info.label} callout type`);

    const icon = createMardoraIcon(calloutIconMap[this.info.label]);
    if (icon) {
      icon.classList.add("cm-mardora-callout-title-icon");
      button.appendChild(icon);
    }

    const label = document.createElement("span");
    label.textContent = this.info.label;
    button.appendChild(label);

    return button;
  }

  override ignoreEvent(event: Event): boolean {
    return event.type !== "mousedown" && event.type !== "click";
  }
}

/**
 * Mark decorations for blockquote elements
 */
const quoteMarkDecorations = {
  /** Decoration for the > marker */
  "quote-mark": Decoration.replace({}),
  /** Decoration for the quote content */
  "quote-content": Decoration.mark({ class: "cm-mardora-quote-content" }),
  /** Decoration for callout content */
  "callout-content": Decoration.mark({ class: "cm-mardora-callout-content" }),
};

function calloutMarkerDecoration(info: CalloutInfo, pos: number): Decoration {
  return Decoration.replace({ widget: new CalloutTitleWidget(info, pos) });
}

/**
 * Line decorations for blockquote lines
 */
const quoteLineDecorations = {
  /** Decoration for blockquote lines */
  "quote-line": Decoration.line({ class: "cm-mardora-quote-line" }),
};

function calloutLineDecoration(info: CalloutInfo, first: boolean): Decoration {
  const spec: { class: string; attributes?: { [key: string]: string } } = {
    class: ["cm-mardora-callout-line", `cm-mardora-callout-${info.type}`, first ? "cm-mardora-callout-title-line" : ""]
      .filter(Boolean)
      .join(" "),
  };

  return Decoration.line(spec);
}

function getQuoteMarkReplacementEnd(lineText: string, nodeTo: number, lineFrom: number): number {
  const restOfLine = lineText.slice(nodeTo - lineFrom);
  if (restOfLine.trim().length === 0) {
    return nodeTo;
  }

  return Math.min(nodeTo + 1, lineFrom + lineText.length);
}

/**
 * QuotePlugin - Decorates markdown blockquotes
 *
 * Adds visual styling to blockquotes (> prefixed lines)
 * - Line decorations for indicating quote blocks with a left border
 * - Mark decorations for quote content
 * - Hides > markers when cursor is not in the blockquote
 */
export class QuotePlugin extends DecorationPlugin {
  readonly name = "quote";
  readonly version = "1.0.0";
  override decorationPriority = 10;
  override readonly requiredNodes = ["Blockquote", "QuoteMark"] as const;
  private calloutTypeMenu: HTMLElement | null = null;
  private calloutTypeMenuDocument: Document | null = null;

  /**
   * Constructor - calls super constructor
   */
  constructor() {
    super();
  }

  /**
   * Plugin theme
   */
  override get theme() {
    return theme;
  }

  override getExtensions(): Extension[] {
    return [
      EditorView.domEventHandlers({
        keydown: (event) => this.handleKeyDown(event),
        mousedown: (event, view) => this.handleCalloutTitleMouseDown(event, view),
      }),
    ];
  }

  override onViewUpdate(update: import("@codemirror/view").ViewUpdate): void {
    if (update.docChanged) {
      this.closeCalloutTypeMenu();
    }
  }

  override onUnregister(): void {
    this.closeCalloutTypeMenu();
    super.onUnregister();
  }

  private handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key !== "Escape" || !this.calloutTypeMenu) {
      return false;
    }

    this.closeCalloutTypeMenu();
    event.preventDefault();
    return true;
  }

  private handleCalloutTitleMouseDown(event: MouseEvent, view: EditorView): boolean {
    if (event.button !== 0) {
      return false;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return false;
    }

    const titleButton = target.closest(".cm-mardora-callout-title-button");
    if (titleButton instanceof HTMLElement && view.dom.contains(titleButton)) {
      const pos = Number(titleButton.dataset.calloutPos);
      if (!Number.isFinite(pos)) {
        return false;
      }

      event.preventDefault();
      event.stopPropagation();
      this.openCalloutTypeMenu(view, titleButton, pos);
      return true;
    }

    const lineElement = target.closest(".cm-mardora-callout-title-line");
    if (!lineElement || !view.dom.contains(lineElement)) {
      return false;
    }

    let pos: number | null = null;
    try {
      pos = view.posAtDOM(lineElement, 0);
    } catch {
      pos = null;
    }

    pos ??= view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) {
      return false;
    }

    const inputTarget = resolveCalloutTitleInputTarget(view.state, pos);
    if (!inputTarget) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    const transaction: TransactionSpec = {
      selection: { anchor: inputTarget.anchor },
      scrollIntoView: true,
    };

    if (inputTarget.changes) {
      transaction.changes = inputTarget.changes;
    }

    view.dispatch(transaction);
    view.focus();
    return true;
  }

  private openCalloutTypeMenu(view: EditorView, button: HTMLElement, pos: number): void {
    this.closeCalloutTypeMenu();

    const current = parseCalloutInfo(view.state.doc.lineAt(pos).text);
    if (!current) {
      return;
    }

    const doc = view.dom.ownerDocument;
    const menu = doc.createElement("div");
    menu.className = "cm-mardora-callout-type-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Switch callout type");

    for (const label of calloutLabels) {
      const item = doc.createElement("button");
      item.type = "button";
      item.className = [
        "cm-mardora-callout-type-menu-item",
        `cm-mardora-callout-type-menu-item-${label.toLowerCase()}`,
        label === current.label ? "cm-mardora-callout-type-menu-item-active" : "",
      ]
        .filter(Boolean)
        .join(" ");
      item.setAttribute("role", "menuitem");
      item.dataset.calloutLabel = label;
      if (label === current.label) {
        item.setAttribute("aria-current", "true");
      }

      const icon = createMardoraIcon(calloutIconMap[label]);
      if (icon) {
        icon.classList.add("cm-mardora-callout-type-menu-icon");
        item.appendChild(icon);
      }

      const text = doc.createElement("span");
      text.textContent = label;
      item.appendChild(text);

      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const change = resolveCalloutTypeChange(view.state, pos, label);
        if (change) {
          view.dispatch({
            changes: change,
            selection: { anchor: change.from + change.insert.length },
            scrollIntoView: true,
          });
        }
        this.closeCalloutTypeMenu();
        view.focus();
      });

      menu.appendChild(item);
    }

    view.dom.appendChild(menu);
    this.calloutTypeMenu = menu;
    this.calloutTypeMenuDocument = doc;
    doc.addEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.positionCalloutTypeMenu(button, menu);
  }

  private positionCalloutTypeMenu(button: HTMLElement, menu: HTMLElement): void {
    const rect = button.getBoundingClientRect();
    const win = button.ownerDocument.defaultView;
    const menuWidth = 176;
    const viewportWidth = win?.innerWidth ?? rect.left + menuWidth;
    const left = Math.max(8, Math.min(rect.left, viewportWidth - menuWidth - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${rect.bottom + 6}px`;
  }

  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    const target = event.target;
    if (
      target instanceof Element &&
      (target.closest(".cm-mardora-callout-type-menu") || target.closest(".cm-mardora-callout-title-button"))
    ) {
      return;
    }

    this.closeCalloutTypeMenu();
  };

  private closeCalloutTypeMenu(): void {
    if (this.calloutTypeMenuDocument) {
      this.calloutTypeMenuDocument.removeEventListener("mousedown", this.handleDocumentMouseDown, true);
      this.calloutTypeMenuDocument = null;
    }
    this.calloutTypeMenu?.remove();
    this.calloutTypeMenu = null;
  }

  /**
   * Build blockquote decorations by iterating the syntax tree
   */
  buildDecorations(ctx: DecorationContext): void {
    const { view, decorations } = ctx;
    const tree = syntaxTree(view.state);

    tree.iterate({
      enter: (node) => {
        const { from, to, name } = node;

        if (name !== "Blockquote") {
          return;
        }

        const raw = view.state.sliceDoc(from, to);
        const callout = parseCalloutInfo(raw);

        // Process each line within the blockquote
        const startLine = view.state.doc.lineAt(from);
        const endLine = view.state.doc.lineAt(to);

        for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
          const line = view.state.doc.line(lineNum);

          // Add line decoration for the blockquote border
          decorations.push(
            callout
              ? calloutLineDecoration(callout, lineNum === startLine.number).range(line.from)
              : quoteLineDecorations["quote-line"].range(line.from)
          );
        }

        // Add mark decoration for the entire blockquote content
        decorations.push(
          (callout ? quoteMarkDecorations["callout-content"] : quoteMarkDecorations["quote-content"]).range(from, to)
        );

        // Find all QuoteMark children (> symbols)
        this.hideQuoteMarks(from, to, decorations, view);
        if (callout) {
          this.hideCalloutMarker(startLine.from, startLine.to, callout, decorations, view);
        }
      },
    });
  }

  private hideCalloutMarker(
    from: number,
    to: number,
    info: CalloutInfo,
    decorations: import("@codemirror/state").Range<Decoration>[],
    view: import("@codemirror/view").EditorView
  ): void {
    const lineText = view.state.sliceDoc(from, to);
    const markerMatch = lineText.match(calloutMarkerSearchPattern);

    if (markerMatch?.index === undefined || !markerMatch[0]) {
      return;
    }

    const markerFrom = from + markerMatch.index;
    decorations.push(calloutMarkerDecoration(info, markerFrom).range(markerFrom, markerFrom + markerMatch[0].length));
  }

  /**
   * Find and hide quote marks in every quoted line.
   */
  private hideQuoteMarks(
    from: number,
    to: number,
    decorations: import("@codemirror/state").Range<Decoration>[],
    view: import("@codemirror/view").EditorView
  ): void {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name !== "QuoteMark") {
          return;
        }

        // Clamp to line end so replace decoration never spans a newline.
        const line = view.state.doc.lineAt(node.from);
        const markEnd = getQuoteMarkReplacementEnd(line.text, node.to, line.from);
        decorations.push(quoteMarkDecorations["quote-mark"].range(node.from, markEnd));
      },
    });
  }

  override renderToHTML(
    node: SyntaxNode,
    children: string,
    ctx: { sliceDoc(from: number, to: number): string }
  ): string | null {
    if (node.name === "QuoteMark") {
      return "";
    }

    if (node.name !== "Blockquote") {
      return null;
    }

    const callout = parseCalloutInfo(ctx.sliceDoc(node.from, node.to));
    if (callout) {
      const content = removeRenderedCalloutMarker(children, callout.label);
      return `<blockquote class="cm-mardora-callout cm-mardora-callout-${callout.type}"><div class="cm-mardora-callout-title">${renderCalloutIconHTML(callout.label)}<span>${callout.label}</span></div><div class="cm-mardora-callout-content">${content}</div></blockquote>\n`;
    }

    return `<blockquote class="cm-mardora-quote-line"><div class="cm-mardora-quote-content">${children}</div></blockquote>\n`;
  }
}

const theme = createTheme({
  default: {
    // Line styling with left border
    ".cm-mardora-quote-line": {
      borderLeft: "3px solid currentColor",
      paddingLeft: "1em !important",
      paddingTop: "0.25em !important",
      paddingBottom: "0.25em !important",
      marginLeft: "0.25em",
      minHeight: "1.6em",
      boxSizing: "content-box",
      opacity: "0.85",
    },

    // Quote content styling
    ".cm-mardora-quote-content": {
      fontStyle: "italic",
    },

    ".cm-mardora-callout-line": {
      borderLeft: "4px solid var(--mardora-callout-color)",
      paddingLeft: "1em !important",
      paddingTop: "0.25em !important",
      paddingBottom: "0.25em !important",
      marginLeft: "0.25em",
      minHeight: "1.6em",
      backgroundColor: "var(--mardora-callout-bg)",
    },

    ".cm-mardora-callout-title-button": {
      appearance: "none",
      border: "0",
      backgroundColor: "transparent",
      borderRadius: "4px",
      color: "var(--mardora-callout-color)",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35em",
      font: "inherit",
      fontWeight: "700",
      fontStyle: "normal",
      lineHeight: "1.2",
      padding: "0.05em 0.2em",
    },

    ".cm-mardora-callout-title-button:hover": {
      backgroundColor: "color-mix(in srgb, var(--mardora-callout-color) 10%, transparent)",
    },

    ".cm-mardora-callout-title-button:focus-visible": {
      outline: "2px solid var(--mardora-callout-color)",
      outlineOffset: "2px",
    },

    ".cm-mardora-callout-title-icon": {
      width: "0.9em",
      height: "0.9em",
      flex: "0 0 auto",
    },

    ".cm-mardora-callout-type-menu": {
      position: "fixed",
      zIndex: "2000",
      minWidth: "176px",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      padding: "6px",
      border: "1px solid var(--mardora-border-color, #d8dee8)",
      borderRadius: "8px",
      backgroundColor: "var(--mardora-bg-primary, #ffffff)",
      boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
    },

    ".cm-mardora-callout-type-menu-item": {
      appearance: "none",
      border: "0",
      backgroundColor: "transparent",
      borderRadius: "6px",
      color: "var(--mardora-text-primary, #24292f)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "0.5em",
      font: "inherit",
      fontSize: "0.875em",
      fontWeight: "600",
      lineHeight: "1.4",
      padding: "0.45em 0.55em",
      textAlign: "left",
      width: "100%",
    },

    ".cm-mardora-callout-type-menu-item:hover": {
      backgroundColor: "var(--mardora-bg-secondary, #f6f8fa)",
    },

    ".cm-mardora-callout-type-menu-item-active": {
      backgroundColor: "var(--mardora-bg-secondary, #f6f8fa)",
      color: "var(--mardora-callout-option-color)",
    },

    ".cm-mardora-callout-type-menu-icon": {
      width: "1em",
      height: "1em",
      flex: "0 0 auto",
      color: "var(--mardora-callout-option-color)",
    },

    ".cm-mardora-callout-type-menu-item-note": {
      "--mardora-callout-option-color": "#0969da",
    },

    ".cm-mardora-callout-type-menu-item-tip": {
      "--mardora-callout-option-color": "#1a7f37",
    },

    ".cm-mardora-callout-type-menu-item-important": {
      "--mardora-callout-option-color": "#8250df",
    },

    ".cm-mardora-callout-type-menu-item-warning": {
      "--mardora-callout-option-color": "#9a6700",
    },

    ".cm-mardora-callout-type-menu-item-caution": {
      "--mardora-callout-option-color": "#cf222e",
    },

    ".cm-mardora-callout": {
      borderLeft: "4px solid var(--mardora-callout-color)",
      borderRadius: "0",
      padding: "0.25em 1em",
      margin: "1em 0",
      backgroundColor: "var(--mardora-callout-bg)",
    },

    ".cm-mardora-callout-title": {
      color: "var(--mardora-callout-color)",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35em",
      fontWeight: "700",
      fontStyle: "normal",
      lineHeight: "1.2",
      marginBottom: "0.75em",
      padding: "0.05em 0.2em",
    },

    ".cm-mardora-callout-content": {
      fontStyle: "normal",
    },

    ".cm-mardora-callout-content p": {
      marginTop: "0",
      marginBottom: "0",
    },

    ".cm-mardora-callout-note": {
      "--mardora-callout-color": "#0969da",
      "--mardora-callout-bg": "rgba(9, 105, 218, 0.08)",
    },

    ".cm-mardora-callout-tip": {
      "--mardora-callout-color": "#1a7f37",
      "--mardora-callout-bg": "rgba(26, 127, 55, 0.08)",
    },

    ".cm-mardora-callout-important": {
      "--mardora-callout-color": "#8250df",
      "--mardora-callout-bg": "rgba(130, 80, 223, 0.08)",
    },

    ".cm-mardora-callout-warning": {
      "--mardora-callout-color": "#9a6700",
      "--mardora-callout-bg": "rgba(154, 103, 0, 0.1)",
    },

    ".cm-mardora-callout-caution": {
      "--mardora-callout-color": "#cf222e",
      "--mardora-callout-bg": "rgba(207, 34, 46, 0.08)",
    },
  },
});
