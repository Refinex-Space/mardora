import { EditorView } from "@codemirror/view";

export const headingFoldTheme = EditorView.baseTheme({
  ".cm-markora-heading-fold-line": {
    position: "relative",
  },

  ".cm-markora-heading-fold-toggle": {
    alignItems: "center",
    background: "transparent",
    border: "0",
    borderRadius: "4px",
    color: "var(--markora-heading-fold-muted, #a1a1aa)",
    cursor: "pointer",
    display: "inline-flex",
    font: "600 0.7rem/1 var(--font-sans, sans-serif)",
    height: "1rem",
    justifyContent: "center",
    marginLeft: "-2.55rem",
    marginRight: "0.45rem",
    padding: "0",
    transform: "translateY(-0.52em)",
    verticalAlign: "middle",
    width: "2rem",
  },

  ".cm-markora-heading-fold-toggle:hover, .cm-markora-heading-fold-toggle:focus-visible": {
    color: "var(--markora-heading-fold-active, #52525b)",
  },

  ".cm-markora-heading-fold-toggle:focus-visible": {
    outline: "2px solid var(--markora-heading-fold-focus, #a1a1aa)",
    outlineOffset: "2px",
  },

  ".cm-markora-heading-fold-level": {
    display: "inline-flex",
  },

  ".cm-markora-heading-fold-arrow": {
    display: "none",
    height: "0.55rem",
    position: "relative",
    width: "0.55rem",
  },

  ".cm-markora-heading-fold-arrow::before": {
    borderBottom: "1.5px solid currentColor",
    borderRight: "1.5px solid currentColor",
    content: '""',
    display: "block",
    height: "0.28rem",
    left: "0.08rem",
    position: "absolute",
    top: "0.03rem",
    transform: "rotate(45deg)",
    width: "0.28rem",
  },

  ".cm-markora-heading-fold-toggle[data-markora-heading-fold-folded='true'] .cm-markora-heading-fold-arrow::before": {
    left: "0.03rem",
    top: "0.11rem",
    transform: "rotate(-45deg)",
  },

  ".cm-markora-heading-fold-line:hover .cm-markora-heading-fold-level, .cm-markora-heading-fold-line-active .cm-markora-heading-fold-level, .cm-markora-heading-fold-toggle:hover .cm-markora-heading-fold-level, .cm-markora-heading-fold-toggle:focus-visible .cm-markora-heading-fold-level, .cm-markora-heading-fold-toggle[data-markora-heading-fold-folded='true'] .cm-markora-heading-fold-level": {
    display: "none",
  },

  ".cm-markora-heading-fold-line:hover .cm-markora-heading-fold-arrow, .cm-markora-heading-fold-line-active .cm-markora-heading-fold-arrow, .cm-markora-heading-fold-toggle:hover .cm-markora-heading-fold-arrow, .cm-markora-heading-fold-toggle:focus-visible .cm-markora-heading-fold-arrow, .cm-markora-heading-fold-toggle[data-markora-heading-fold-folded='true'] .cm-markora-heading-fold-arrow": {
    display: "inline-block",
  },

  ".cm-markora-heading-fold-placeholder": {
    color: "var(--markora-heading-fold-muted, #a1a1aa)",
    font: "600 0.9rem/1.4 var(--font-sans, sans-serif)",
    padding: "0.1rem 0 0.35rem 0.25rem",
  },

  "&dark .cm-markora-heading-fold-toggle, &dark .cm-markora-heading-fold-placeholder": {
    "--markora-heading-fold-muted": "#71717a",
    "--markora-heading-fold-active": "#d4d4d8",
    "--markora-heading-fold-focus": "#71717a",
  },
});
