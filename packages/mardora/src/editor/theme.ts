import { EditorView } from "@codemirror/view";

/**
 * Base theme for mardora styling
 * Note: Layout styles are scoped under .cm-mardora which is added by the view plugin
 */
export const mardoraBaseTheme = EditorView.theme({
  // Container styles - only apply when view plugin is enabled
  "&.cm-mardora": {
    fontSize: "16px",
    lineHeight: "1.6",
    minHeight: "100%",
    backgroundColor: "transparent !important",
  },

  "&.cm-mardora.cm-focused": {
    outline: "none",
  },

  "&.cm-mardora .cm-scroller": {
    minHeight: "100%",
  },

  "&.cm-mardora .cm-content": {
    width: "100%",
    maxWidth: "48rem",
    padding: "0 0.5rem",
    margin: "0 auto",
    fontFamily: "var(--font-sans, sans-serif)",
    fontSize: "16px",
    lineHeight: "1.6",
  },

  "&.cm-mardora .cm-content .cm-line": {
    paddingInline: 0,
  },

  "&.cm-mardora .cm-content .cm-widgetBuffer": {
    display: "none !important",
  },
});

import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/**
 * Reset syntax highlighting for markdown elements
 * Used to disable theme colors for markdown syntax
 */
const markdownResetStyle = HighlightStyle.define([
  {
    tag: [
      t.heading,
      t.strong,
      t.emphasis,
      t.strikethrough,
      t.link,
      t.url,
      t.quote,
      t.list,
      t.meta,
      t.contentSeparator,
      t.labelName,
    ],
    color: "inherit",
    fontWeight: "inherit",
    fontStyle: "inherit",
    textDecoration: "none",
  },
]);

export const markdownResetExtension = syntaxHighlighting(markdownResetStyle, { fallback: false });
