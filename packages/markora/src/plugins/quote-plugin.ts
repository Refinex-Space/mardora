import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { EditorState, Extension, TransactionSpec } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { DecorationContext, DecorationPlugin } from "../editor/plugin";
import { createTheme } from "../editor";
import { SyntaxNode } from "@lezer/common";
import { createMarkoraIcon, type MarkoraIconName } from "../editor/icons";

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
const calloutIconMap: Record<CalloutLabel, MarkoraIconName> = {
  NOTE: "info",
  TIP: "lightbulb",
  IMPORTANT: "badge-alert",
  WARNING: "triangle-alert",
  CAUTION: "octagon-alert",
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
    button.className = "cm-markora-callout-title-button";
    button.dataset.calloutLabel = this.info.label;
    button.dataset.calloutPos = String(this.pos);
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-label", `Switch ${this.info.label} callout type`);

    const icon = createMarkoraIcon(calloutIconMap[this.info.label]);
    if (icon) {
      icon.classList.add("cm-markora-callout-title-icon");
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
  "quote-content": Decoration.mark({ class: "cm-markora-quote-content" }),
  /** Decoration for callout content */
  "callout-content": Decoration.mark({ class: "cm-markora-callout-content" }),
};

function calloutMarkerDecoration(info: CalloutInfo, pos: number): Decoration {
  return Decoration.replace({ widget: new CalloutTitleWidget(info, pos) });
}

/**
 * Line decorations for blockquote lines
 */
const quoteLineDecorations = {
  /** Decoration for blockquote lines */
  "quote-line": Decoration.line({ class: "cm-markora-quote-line" }),
};

function calloutLineDecoration(info: CalloutInfo, first: boolean): Decoration {
  const spec: { class: string; attributes?: { [key: string]: string } } = {
    class: ["cm-markora-callout-line", `cm-markora-callout-${info.type}`, first ? "cm-markora-callout-title-line" : ""]
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

    const titleButton = target.closest(".cm-markora-callout-title-button");
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

    const lineElement = target.closest(".cm-markora-callout-title-line");
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
    menu.className = "cm-markora-callout-type-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Switch callout type");

    for (const label of calloutLabels) {
      const item = doc.createElement("button");
      item.type = "button";
      item.className = [
        "cm-markora-callout-type-menu-item",
        `cm-markora-callout-type-menu-item-${label.toLowerCase()}`,
        label === current.label ? "cm-markora-callout-type-menu-item-active" : "",
      ]
        .filter(Boolean)
        .join(" ");
      item.setAttribute("role", "menuitem");
      item.dataset.calloutLabel = label;
      if (label === current.label) {
        item.setAttribute("aria-current", "true");
      }

      const icon = createMarkoraIcon(calloutIconMap[label]);
      if (icon) {
        icon.classList.add("cm-markora-callout-type-menu-icon");
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
      (target.closest(".cm-markora-callout-type-menu") || target.closest(".cm-markora-callout-title-button"))
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
      return `<blockquote class="cm-markora-callout cm-markora-callout-${callout.type}"><div class="cm-markora-callout-title">${callout.label}</div><div class="cm-markora-callout-content">${content}</div></blockquote>\n`;
    }

    return `<blockquote class="cm-markora-quote-line"><div class="cm-markora-quote-content">${children}</div></blockquote>\n`;
  }
}

const theme = createTheme({
  default: {
    // Line styling with left border
    ".cm-markora-quote-line": {
      borderLeft: "3px solid currentColor",
      paddingLeft: "1em !important",
      paddingTop: "0.25em !important",
      paddingBottom: "0.25em !important",
      marginLeft: "0.25em",
      opacity: "0.85",
    },

    // Quote content styling
    ".cm-markora-quote-content": {
      fontStyle: "italic",
    },

    ".cm-markora-callout-line": {
      borderLeft: "4px solid var(--markora-callout-color)",
      paddingLeft: "1em !important",
      paddingTop: "0.25em !important",
      paddingBottom: "0.25em !important",
      marginLeft: "0.25em",
      minHeight: "1.6em",
      backgroundColor: "var(--markora-callout-bg)",
    },

    ".cm-markora-callout-title-button": {
      appearance: "none",
      border: "0",
      backgroundColor: "transparent",
      borderRadius: "4px",
      color: "var(--markora-callout-color)",
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

    ".cm-markora-callout-title-button:hover": {
      backgroundColor: "color-mix(in srgb, var(--markora-callout-color) 10%, transparent)",
    },

    ".cm-markora-callout-title-button:focus-visible": {
      outline: "2px solid var(--markora-callout-color)",
      outlineOffset: "2px",
    },

    ".cm-markora-callout-title-icon": {
      width: "0.9em",
      height: "0.9em",
      flex: "0 0 auto",
    },

    ".cm-markora-callout-type-menu": {
      position: "fixed",
      zIndex: "2000",
      minWidth: "176px",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      padding: "6px",
      border: "1px solid var(--markora-border-color, #d8dee8)",
      borderRadius: "8px",
      backgroundColor: "var(--markora-bg-primary, #ffffff)",
      boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
    },

    ".cm-markora-callout-type-menu-item": {
      appearance: "none",
      border: "0",
      backgroundColor: "transparent",
      borderRadius: "6px",
      color: "var(--markora-text-primary, #24292f)",
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

    ".cm-markora-callout-type-menu-item:hover": {
      backgroundColor: "var(--markora-bg-secondary, #f6f8fa)",
    },

    ".cm-markora-callout-type-menu-item-active": {
      backgroundColor: "var(--markora-bg-secondary, #f6f8fa)",
      color: "var(--markora-callout-option-color)",
    },

    ".cm-markora-callout-type-menu-icon": {
      width: "1em",
      height: "1em",
      flex: "0 0 auto",
      color: "var(--markora-callout-option-color)",
    },

    ".cm-markora-callout-type-menu-item-note": {
      "--markora-callout-option-color": "#0969da",
    },

    ".cm-markora-callout-type-menu-item-tip": {
      "--markora-callout-option-color": "#1a7f37",
    },

    ".cm-markora-callout-type-menu-item-important": {
      "--markora-callout-option-color": "#8250df",
    },

    ".cm-markora-callout-type-menu-item-warning": {
      "--markora-callout-option-color": "#9a6700",
    },

    ".cm-markora-callout-type-menu-item-caution": {
      "--markora-callout-option-color": "#cf222e",
    },

    ".cm-markora-callout": {
      borderLeft: "4px solid var(--markora-callout-color)",
      borderRadius: "6px",
      padding: "0.75em 1em",
      margin: "1em 0",
      backgroundColor: "var(--markora-callout-bg)",
    },

    ".cm-markora-callout-title": {
      color: "var(--markora-callout-color)",
      fontWeight: "700",
      fontStyle: "normal",
      marginBottom: "0.25em",
    },

    ".cm-markora-callout-content": {
      fontStyle: "normal",
    },

    ".cm-markora-callout-content p": {
      marginTop: "0",
      marginBottom: "0",
    },

    ".cm-markora-callout-note": {
      "--markora-callout-color": "#0969da",
      "--markora-callout-bg": "rgba(9, 105, 218, 0.08)",
    },

    ".cm-markora-callout-tip": {
      "--markora-callout-color": "#1a7f37",
      "--markora-callout-bg": "rgba(26, 127, 55, 0.08)",
    },

    ".cm-markora-callout-important": {
      "--markora-callout-color": "#8250df",
      "--markora-callout-bg": "rgba(130, 80, 223, 0.08)",
    },

    ".cm-markora-callout-warning": {
      "--markora-callout-color": "#9a6700",
      "--markora-callout-bg": "rgba(154, 103, 0, 0.1)",
    },

    ".cm-markora-callout-caution": {
      "--markora-callout-color": "#cf222e",
      "--markora-callout-bg": "rgba(207, 34, 46, 0.08)",
    },
  },
});
