import { Decoration } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { DecorationContext, DecorationPlugin } from "../editor/plugin";
import { createTheme } from "../editor";
import { SyntaxNode } from "@lezer/common";
import type { PreviewContext } from "../preview/types";

/**
 * Node types for ATX headings in markdown
 */
const HEADING_TYPES = ["ATXHeading1", "ATXHeading2", "ATXHeading3", "ATXHeading4", "ATXHeading5", "ATXHeading6"];

/**
 * Mark decorations for heading content
 */
const headingMarkDecorations = {
  "heading-1": Decoration.mark({ class: "cm-mardora-h1" }),
  "heading-2": Decoration.mark({ class: "cm-mardora-h2" }),
  "heading-3": Decoration.mark({ class: "cm-mardora-h3" }),
  "heading-4": Decoration.mark({ class: "cm-mardora-h4" }),
  "heading-5": Decoration.mark({ class: "cm-mardora-h5" }),
  "heading-6": Decoration.mark({ class: "cm-mardora-h6" }),
  "header-mark-class": Decoration.mark({ class: "cm-mardora-header-mark" }),
  "heading-mark": Decoration.replace({}),
};

/**
 * Line decorations for heading lines
 */
const headingLineDecorations = {
  "heading-1": Decoration.line({ class: "cm-mardora-line-h1" }),
  "heading-2": Decoration.line({ class: "cm-mardora-line-h2" }),
  "heading-3": Decoration.line({ class: "cm-mardora-line-h3" }),
  "heading-4": Decoration.line({ class: "cm-mardora-line-h4" }),
  "heading-5": Decoration.line({ class: "cm-mardora-line-h5" }),
  "heading-6": Decoration.line({ class: "cm-mardora-line-h6" }),
};

/**
 * HeadingPlugin - Decorates markdown headings
 *
 * Adds visual styling to ATX headings (# through ######)
 * - Line decorations for the entire heading line
 * - Mark decorations for heading content
 * - Hides # markers when cursor is not in the heading
 */
export class HeadingPlugin extends DecorationPlugin {
  readonly name = "heading";
  readonly version = "1.0.0";
  override decorationPriority = 10;
  override readonly requiredNodes = [
    "ATXHeading1",
    "ATXHeading2",
    "ATXHeading3",
    "ATXHeading4",
    "ATXHeading5",
    "ATXHeading6",
    "HeaderMark",
  ] as const;

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

  /**
   * Build heading decorations by iterating the syntax tree
   */
  buildDecorations(ctx: DecorationContext): void {
    const { view, decorations } = ctx;
    const tree = syntaxTree(view.state);

    tree.iterate({
      enter: (node) => {
        const { from, to, name } = node;

        if (!HEADING_TYPES.includes(name)) {
          return;
        }

        const level = parseInt(name.slice(-1), 10);
        const headingClass = `heading-${level}` as keyof typeof headingMarkDecorations;
        const lineClass = `heading-${level}` as keyof typeof headingLineDecorations;

        // Add line decoration
        const line = view.state.doc.lineAt(from);
        decorations.push(headingLineDecorations[lineClass].range(line.from));

        // Add mark decoration for the heading content
        decorations.push(headingMarkDecorations[headingClass].range(from, to));

        // Find and hide the heading marker (#). Heading level changes are handled by the selection toolbar.
        const headingMark = node.node.getChild("HeaderMark");
        if (headingMark) {
          const markEnd = Math.min(headingMark.to + 1, line.to);
          // Clamp to line end so replace decoration never spans a newline.
          decorations.push(headingMarkDecorations["heading-mark"].range(headingMark.from, markEnd));
        }
      },
    });
  }

  override renderToHTML(node: SyntaxNode, children: string, ctx: PreviewContext): string | null {
    if (node.name === "HeaderMark") {
      return "";
    }

    if (!HEADING_TYPES.includes(node.name)) {
      return null;
    }

    const level = parseInt(node.name.slice(-1), 10);
    const lineClass = headingLineDecorations[`heading-${level}` as keyof typeof headingLineDecorations].spec.class;
    const headingClass = headingMarkDecorations[`heading-${level}` as keyof typeof headingMarkDecorations].spec.class;
    const id = level >= 2 ? ctx.headingIdForNode?.(node) : null;
    const idAttr = id ? ` id="${id}"` : "";

    return `<div class="${lineClass}">
      <h${level}${idAttr} class="${headingClass}">${children}</h${level}>
    </div>\n`;
  }
}

const theme = createTheme({
  default: {
    ".cm-mardora-h1": {
      fontSize: "2em",
      fontWeight: "bold",
      fontFamily: "sans-serif",
      textDecoration: "none",
    },

    ".cm-mardora-h2": {
      fontSize: "1.75em",
      fontWeight: "bold",
      fontFamily: "sans-serif",
      textDecoration: "none",
    },

    ".cm-mardora-h3": {
      fontSize: "1.5em",
      fontWeight: "bold",
      fontFamily: "sans-serif",
      textDecoration: "none",
    },

    ".cm-mardora-h4": {
      fontSize: "1.25em",
      fontWeight: "bold",
      fontFamily: "sans-serif",
      textDecoration: "none",
    },

    ".cm-mardora-h5": {
      fontSize: "1em",
      fontWeight: "bold",
      fontFamily: "sans-serif",
      textDecoration: "none",
    },

    ".cm-mardora-h6": {
      fontSize: "0.75em",
      fontWeight: "bold",
      fontFamily: "sans-serif",
      textDecoration: "none",
    },

    // Heading line styles
    ".cm-mardora-line-h1": {
      paddingTop: "1.5em",
      paddingBottom: "0.5em",
    },
    ".cm-mardora-line-h2": {
      paddingTop: "1.25em",
      paddingBottom: "0.5em",
    },
    ".cm-mardora-line-h3, .cm-mardora-line-h4, .cm-mardora-line-h5, .cm-mardora-line-h6": {
      paddingTop: "1em",
      paddingBottom: "0.5em",
    },
    ".cm-mardora-header-mark": {
      opacity: 0.5,
    },
  },
});
