import { Decoration, EditorView, KeyBinding, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { DecorationContext, DecorationPlugin } from "../editor/plugin";
import { createTheme } from "../editor";
import { Range } from "@codemirror/state";
import { SyntaxNode } from "@lezer/common";

// ============================================================================
// CSS Classes
// ============================================================================

const classes = {
  // Unordered list classes
  lineUL: "cm-mardora-list-line-ul",
  markUL: "cm-mardora-list-mark-ul",

  // Ordered list classes
  lineOL: "cm-mardora-list-line-ol",
  markOL: "cm-mardora-list-mark-ol",

  // Task list classes
  taskLine: "cm-mardora-task-line",
  taskMarker: "cm-mardora-task-marker",

  // Common classes
  content: "cm-mardora-list-content",
  indent: "cm-mardora-list-indent",
  active: " cm-mardora-active",
  preview: "cm-mardora-preview",
};

// ============================================================================
// Checkbox Widget
// ============================================================================

/**
 * Interactive checkbox widget for task list items.
 * Replaces `[ ]` or `[x]` markers with a clickable checkbox.
 */
export class TaskCheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }

  override eq(other: TaskCheckboxWidget): boolean {
    return other.checked === this.checked;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = `cm-mardora-task-checkbox ${this.checked ? "checked" : ""}`;
    wrap.setAttribute("aria-hidden", "true");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.checked;
    checkbox.tabIndex = -1;

    checkbox.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.toggleCheckbox(view, wrap);
    });

    wrap.appendChild(checkbox);
    return wrap;
  }

  override ignoreEvent(): boolean {
    return false;
  }

  /** Toggle the checkbox state in the document */
  private toggleCheckbox(view: EditorView, wrap: HTMLElement): void {
    const pos = view.posAtDOM(wrap);
    const line = view.state.doc.lineAt(pos);
    const match = line.text.match(/^(\s*(?:[-*+]|\d+\.)\s*)\[([ xX])\]/);

    if (match) {
      const markerStart = line.from + match[1]!.length + 1;
      const newChar = this.checked ? " " : "x";
      view.dispatch({
        changes: { from: markerStart, to: markerStart + 1, insert: newChar },
      });
    }
  }
}

class BulletListMarkerWidget extends WidgetType {
  override eq(other: BulletListMarkerWidget): boolean {
    return other instanceof BulletListMarkerWidget;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = classes.markUL;
    wrap.setAttribute("aria-hidden", "true");
    return wrap;
  }
}

// ============================================================================
// List Plugin
// ============================================================================

/**
 * Decorates markdown lists with custom styling.
 *
 * Supports:
 * - **Unordered lists** — Replaces `*`, `-`, `+` markers with styled bullets
 * - **Ordered lists** — Styles numbered markers (`1.`, `2.`, etc.)
 * - **Task lists** — Renders `[ ]`/`[x]` as interactive checkboxes
 */
export class ListPlugin extends DecorationPlugin {
  readonly name = "list";
  readonly version = "1.0.0";
  override decorationPriority = 20;
  override readonly requiredNodes = [
    "BulletList",
    "OrderedList",
    "ListItem",
    "ListMark",
    "Task",
    "TaskMarker",
  ] as const;

  override get theme() {
    return theme;
  }

  /**
   * Keyboard shortcuts for list formatting
   */
  override getKeymap(): KeyBinding[] {
    return [
      {
        key: "Mod-Shift-8",
        run: (view) => this.toggleListOnLines(view, "- "),
        preventDefault: true,
      },
      {
        key: "Mod-Shift-7",
        run: (view) => this.toggleListOnLines(view, "1. "),
        preventDefault: true,
      },
      {
        key: "Mod-Shift-9",
        run: (view) => this.toggleListOnLines(view, "- [ ] "),
        preventDefault: true,
      },
    ];
  }

  /**
   * Toggle list marker on current line or selected lines
   */
  private toggleListOnLines(view: EditorView, marker: string): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    // Get all lines in selection
    const startLine = state.doc.lineAt(from);
    const endLine = state.doc.lineAt(to);

    const changes: { from: number; to: number; insert: string }[] = [];

    // Regex to match existing list markers
    const listMarkerRegex = /^(\s*)([-*+]|\d+\.)\s(\[[ xX]\]\s)?/;

    const isOrderedMarker = marker === "1. ";
    let orderNum = 1;

    for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
      const line = state.doc.line(lineNum);
      const match = line.text.match(listMarkerRegex);

      // Get the actual marker to insert (incremental for ordered lists)
      const actualMarker = isOrderedMarker ? `${orderNum}. ` : marker;

      if (match) {
        // Line already has a list marker - check if same type
        const existingMarker = match[0];
        const indent = match[1] || "";

        // Check if this is the same marker type (toggle off)
        const isUnordered = /^[-*+]$/.test(match[2]!);
        const isOrdered = /^\d+\.$/.test(match[2]!);
        const hasTask = !!match[3];

        const wantUnordered = marker === "- ";
        const wantOrdered = isOrderedMarker;
        const wantTask = marker === "- [ ] ";

        if (
          (wantUnordered && isUnordered && !hasTask) ||
          (wantOrdered && isOrdered && !hasTask) ||
          (wantTask && hasTask)
        ) {
          // Same type - remove the marker
          changes.push({
            from: line.from,
            to: line.from + existingMarker.length,
            insert: indent,
          });
        } else {
          // Different type - replace the marker
          changes.push({
            from: line.from,
            to: line.from + existingMarker.length,
            insert: indent + actualMarker,
          });
          orderNum++;
        }
      } else {
        // No list marker - add one at start of line (after any indent)
        const indentMatch = line.text.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1]! : "";
        changes.push({
          from: line.from + indent.length,
          to: line.from + indent.length,
          insert: actualMarker,
        });
        orderNum++;
      }
    }

    if (changes.length > 0) {
      view.dispatch({ changes });
    }

    return true;
  }

  buildDecorations(ctx: DecorationContext): void {
    const { view, decorations } = ctx;
    const tree = syntaxTree(view.state);

    tree.iterate({
      enter: (node) => {
        const { from, to, name } = node;
        const line = view.state.doc.lineAt(from);
        const cursorInLine = ctx.cursorInRange(line.from, line.to);

        switch (name) {
          case "ListItem":
            this.decorateListItem(node, line, decorations);
            break;

          case "ListMark":
            this.decorateListMark(node, line, decorations, cursorInLine);
            break;

          case "TaskMarker":
            this.decorateTaskMarker(from, to, view, decorations);
            break;
        }
      },
    });
  }

  /** Add line decoration for list items with nesting depth */
  private decorateListItem(
    node: Parameters<NonNullable<Parameters<ReturnType<typeof syntaxTree>["iterate"]>[0]["enter"]>>[0],
    line: { from: number },
    decorations: Range<Decoration>[]
  ): void {
    const parent = node.node.parent;
    const listType = parent?.name;

    // Calculate nesting depth
    let depth = 0;
    let ancestor = node.node.parent;
    while (ancestor) {
      if (ancestor.name === "ListItem") depth++;
      ancestor = ancestor.parent;
    }

    // Check for task marker child
    const hasTask = this.hasTaskChild(node);

    // Determine line class based on list type
    let lineClass: string;
    if (hasTask) lineClass = classes.taskLine;
    else if (listType === "OrderedList") lineClass = classes.lineOL;
    else lineClass = classes.lineUL;

    decorations.push(
      Decoration.line({
        class: lineClass,
        attributes: { style: `--depth: ${depth}` },
      }).range(line.from)
    );
  }

  /** Check if a ListItem node has a Task child */
  private hasTaskChild(
    node: Parameters<NonNullable<Parameters<ReturnType<typeof syntaxTree>["iterate"]>[0]["enter"]>>[0]
  ): boolean {
    const cursor = node.node.cursor();
    if (cursor.firstChild()) {
      do {
        if (cursor.name === "Task") return true;
      } while (cursor.nextSibling());
    }
    return false;
  }

  /** Decorate list markers (bullets for UL, numbers for OL) */
  private decorateListMark(
    node: Parameters<NonNullable<Parameters<ReturnType<typeof syntaxTree>["iterate"]>[0]["enter"]>>[0],
    line: { from: number; to: number },
    decorations: Range<Decoration>[],
    cursorInLine: boolean
  ): void {
    const { from, to } = node;
    const parent = node.node.parent;
    const grandparent = parent?.parent;
    const listType = grandparent?.name;
    const isOrderedList = listType === "OrderedList";
    const activeClass = cursorInLine && isOrderedList ? classes.active : "";

    // Add indent decoration for nested items
    if (from > line.from) {
      decorations.push(Decoration.mark({ class: classes.indent + activeClass }).range(line.from, from));
    }

    // Replace unordered source markers so the cursor cannot land before the visual bullet.
    if (isOrderedList) {
      decorations.push(Decoration.mark({ class: classes.markOL + activeClass }).range(from, to + 1));
    } else {
      decorations.push(
        Decoration.replace({
          widget: new BulletListMarkerWidget(),
        }).range(from, to + 1)
      );
    }

    // Wrap remaining line content
    const contentStart = to + 1;
    if (contentStart < line.to) {
      decorations.push(Decoration.mark({ class: classes.content }).range(contentStart, line.to));
    }
  }

  /** Decorate task markers as checkbox widgets */
  private decorateTaskMarker(
    from: number,
    to: number,
    view: EditorView,
    decorations: Range<Decoration>[]
  ): void {
    const text = view.state.sliceDoc(from, to);
    const isChecked = text.includes("x") || text.includes("X");

    decorations.push(
      Decoration.replace({
        widget: new TaskCheckboxWidget(isChecked),
      }).range(from, to)
    );
  }

  /** Render list nodes to HTML */
  override renderToHTML(
    node: SyntaxNode,
    children: string,
    ctx: { sliceDoc(from: number, to: number): string; sanitize(html: string): string }
  ): string | null {
    switch (node.name) {
      case "BulletList":
        return `<ul class="${classes.lineUL} ${classes.preview}">${children}</ul>\n`;

      case "OrderedList":
        return `<ol class="${classes.lineOL} ${classes.preview}">${children}</ol>\n`;

      case "ListItem":
        return `<li>${children}</li>\n`;

      case "Task":
        return children;

      case "TaskMarker": {
        const text = ctx.sliceDoc(node.from, node.to);
        const isChecked = text.includes("x") || text.includes("X");
        return `<input type="checkbox" class="cm-mardora-task-checkbox" disabled ${isChecked ? "checked" : ""} />`;
      }

      case "ListMark":
        return "";

      default:
        return null;
    }
  }
}

// ============================================================================
// Theme
// ============================================================================

const theme = createTheme({
  default: {
    // Indentation marker positioning
    ".cm-mardora-list-indent": {
      overflow: "hidden",
      display: "inline-block",
      position: "absolute",
      left: "calc(1rem * (var(--depth, 0) + 1))",
      transform: "translateX(-100%)",
    },

    // List line layout (flexbox for marker alignment)
    ".cm-mardora-list-line-ul, .cm-mardora-list-line-ol": {
      position: "relative",
      paddingLeft: "calc(1rem * (var(--depth, 0) + 1)) !important",
      display: "flex",
      alignItems: "start",
    },
    ".cm-mardora-list-line-ul > :first-child, .cm-mardora-list-line-ol > :first-child": {
      flexShrink: 0,
    },

    // List marker sizing
    ".cm-mardora-list-line-ul .cm-mardora-list-mark-ul, .cm-mardora-list-line-ol .cm-mardora-list-mark-ol": {
      whiteSpace: "pre",
      position: "relative",
      width: "1rem",
      flexShrink: 0,
    },

    // Hide raw marker text when not active
    ".cm-mardora-list-mark-ul:not(.cm-mardora-active) > span, .cm-mardora-task-line .cm-mardora-list-mark-ol:not(.cm-mardora-active) > span":
      {
        visibility: "hidden",
        display: "none",
      },

    // Styled bullet for unordered lists
    ".cm-mardora-list-line-ul .cm-mardora-list-mark-ul:not(.cm-mardora-active)::after": {
      content: '"•"',
      color: "var(--color-link)",
      fontWeight: "bold",
      pointerEvents: "none",
    },

    // Task marker styling (kept for compatibility with existing generated CSS)
    ".cm-mardora-task-marker": {
      color: "var(--mardora-highlight, #a4a4a4)",
      fontFamily: "monospace",
    },

    // Task checkbox container
    ".cm-mardora-task-checkbox": {
      display: "inline-flex",
      verticalAlign: "middle",
      marginRight: "0.3em",
      cursor: "pointer",
      userSelect: "none",
      alignItems: "center",
      height: "1.2em",
    },

    // Task checkbox input styling
    ".cm-mardora-task-checkbox input": {
      cursor: "pointer",
      margin: 0,
      width: "1.1em",
      height: "1.1em",
      appearance: "none",
      border: "1px solid",
      borderRadius: "0.25em",
      backgroundColor: "transparent",
      position: "relative",
    },

    // Checkmark for completed tasks
    ".cm-mardora-task-checkbox.checked input::after": {
      content: '"✓"',
      position: "absolute",
      left: "1px",
      top: "-3px",
    },

    // Preview styles (override editor-specific layout)
    ".cm-mardora-preview": {
      display: "block",
      paddingLeft: "1.5rem",
      margin: "0.5rem 0",
    },
    ".cm-mardora-preview li": {
      display: "list-item",
      marginBottom: "0.25rem",
    },
    "ul.cm-mardora-preview": {
      listStyleType: "disc",
    },
    "ol.cm-mardora-preview": {
      listStyleType: "decimal",
    },
    // Hide list marker for task items
    ".cm-mardora-preview li:has(.cm-mardora-task-checkbox)": {
      listStyleType: "none",
    },
    ".cm-mardora-preview li .cm-mardora-paragraph": {
      padding: "0",
    },
  },
});
