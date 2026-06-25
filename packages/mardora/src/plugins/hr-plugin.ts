import { EditorSelection, type EditorState, type Extension } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { DecorationContext, DecorationPlugin } from "../editor/plugin";
import { createTheme } from "../editor";
import { SyntaxNode } from "@lezer/common";
import type { MarkdownConfig } from "@lezer/markdown";

/**
 * Line decoration for horizontal rule lines
 */
const hrLineDecoration = Decoration.line({ class: "cm-mardora-hr-line" });
const hrSelectedLineDecoration = Decoration.line({ class: "cm-mardora-hr-line cm-mardora-hr-line-selected" });

/**
 * Mark decoration to keep raw markers (---, ***, ___) hidden in live mode.
 */
const hrMarkDecoration = Decoration.replace({});

export function getHorizontalRuleDeleteRange(state: EditorState, from: number): { from: number; to: number } {
  const line = state.doc.lineAt(from);
  return {
    from: line.from,
    to: line.to < state.doc.length ? line.to + 1 : line.to,
  };
}

function horizontalRuleRangeAt(state: EditorState, pos: number): { from: number; to: number } | null {
  const line = state.doc.lineAt(pos);
  let range: { from: number; to: number } | null = null;

  syntaxTree(state).iterate({
    from: line.from,
    to: line.to,
    enter: (node) => {
      if (node.name !== "HorizontalRule") return;
      range = { from: node.from, to: node.to };
      return false;
    },
  });

  return range;
}

function selectionOverlapsHorizontalRule(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some((range) => range.from < to && range.to > from);
}

function selectHorizontalRuleLine(event: MouseEvent, view: EditorView): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
  const target = event.target;
  if (!(target instanceof Element) || !target.closest(".cm-mardora-hr-line")) return false;

  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
  if (pos === null) return false;

  const ruleRange = horizontalRuleRangeAt(view.state, pos);
  if (!ruleRange) return false;

  event.preventDefault();
  const deleteRange = getHorizontalRuleDeleteRange(view.state, ruleRange.from);
  view.dispatch({
    selection: EditorSelection.range(deleteRange.from, deleteRange.to),
  });
  view.focus();
  return true;
}

/**
 * HRPlugin - Decorates markdown horizontal rules
 *
 * Adds visual styling to thematic breaks (---, ***, ___)
 * - Line decoration that renders a centered horizontal line
 * - Keeps raw marker characters hidden in live mode
 * - Selects the whole rule line on click so Delete/Backspace removes it
 */
export class HRPlugin extends DecorationPlugin {
  readonly name = "hr";
  readonly version = "1.0.0";
  override decorationPriority = 10;
  override readonly requiredNodes = ["HorizontalRule"] as const;

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
        mousedown: selectHorizontalRuleLine,
      }),
    ];
  }

  override getMarkdownConfig(): MarkdownConfig {
    return { remove: ["SetextHeading"] };
  }

  /**
   * Build horizontal rule decorations by iterating the syntax tree
   */
  buildDecorations(ctx: DecorationContext): void {
    const { view, decorations } = ctx;
    const tree = syntaxTree(view.state);

    tree.iterate({
      enter: (node) => {
        const { from, to, name } = node;

        if (name !== "HorizontalRule") {
          return;
        }

        const line = view.state.doc.lineAt(from);
        const cursorInNode = selectionOverlapsHorizontalRule(view.state, from, to);
        decorations.push((cursorInNode ? hrSelectedLineDecoration : hrLineDecoration).range(line.from));

        // Clamp to line end so replace decoration never spans a newline.
        const markEnd = Math.min(to, line.to);
        decorations.push(hrMarkDecoration.range(from, markEnd));
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override renderToHTML(node: SyntaxNode, _children: string): string | null {
    if (node.name !== "HorizontalRule") {
      return null;
    }

    return `<hr class="cm-mardora-hr-line" />\n`;
  }
}

const theme = createTheme({
  default: {
    // Line styling — displays a centered horizontal line
    ".cm-mardora-hr-line": {
      display: "flex",
      alignItems: "center",
      paddingTop: "0.35em",
      paddingBottom: "0.35em",
      border: "none",
      "&::after": {
        content: '""',
        flex: "1",
        height: "1px",
        background: "currentColor",
        opacity: "0.3",
      },
    },
    ".cm-mardora-hr-line-selected": {
      background: "rgba(96, 165, 250, 0.12)",
      "&::after": {
        opacity: "0.7",
      },
    },
  },
});
