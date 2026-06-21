import { EditorView } from "@codemirror/view";

export const headingFoldTheme = EditorView.baseTheme({
  ".cm-mardora-heading-fold-line": {
    position: "relative",
  },

  ".cm-mardora-heading-fold-toggle": {
    alignItems: "center",
    background: "transparent",
    border: "0",
    borderRadius: "4px",
    color: "var(--mardora-heading-fold-muted, #a1a1aa)",
    cursor: "pointer",
    display: "inline-flex",
    font: "600 0.7rem/1 var(--mardora-font-ui)",
    height: "1rem",
    justifyContent: "center",
    marginLeft: "-2.55rem",
    marginRight: "0.45rem",
    padding: "0",
    transform: "translateY(-0.52em)",
    verticalAlign: "middle",
    width: "2rem",
  },

  ".cm-mardora-heading-fold-toggle:hover, .cm-mardora-heading-fold-toggle:focus-visible": {
    color: "var(--mardora-heading-fold-active, #52525b)",
  },

  ".cm-mardora-heading-fold-toggle:focus-visible": {
    outline: "2px solid var(--mardora-heading-fold-focus, #a1a1aa)",
    outlineOffset: "2px",
  },

  ".cm-mardora-heading-fold-level": {
    display: "inline-flex",
  },

  ".cm-mardora-heading-fold-arrow": {
    display: "none",
    height: "0.55rem",
    position: "relative",
    width: "0.55rem",
  },

  ".cm-mardora-heading-fold-arrow::before": {
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

  ".cm-mardora-heading-fold-toggle[data-mardora-heading-fold-folded='true'] .cm-mardora-heading-fold-arrow::before": {
    left: "0.03rem",
    top: "0.11rem",
    transform: "rotate(-45deg)",
  },

  ".cm-mardora-heading-fold-line:hover .cm-mardora-heading-fold-level, .cm-mardora-heading-fold-line-active .cm-mardora-heading-fold-level, .cm-mardora-heading-fold-toggle:hover .cm-mardora-heading-fold-level, .cm-mardora-heading-fold-toggle:focus-visible .cm-mardora-heading-fold-level, .cm-mardora-heading-fold-toggle[data-mardora-heading-fold-folded='true'] .cm-mardora-heading-fold-level": {
    display: "none",
  },

  ".cm-mardora-heading-fold-line:hover .cm-mardora-heading-fold-arrow, .cm-mardora-heading-fold-line-active .cm-mardora-heading-fold-arrow, .cm-mardora-heading-fold-toggle:hover .cm-mardora-heading-fold-arrow, .cm-mardora-heading-fold-toggle:focus-visible .cm-mardora-heading-fold-arrow, .cm-mardora-heading-fold-toggle[data-mardora-heading-fold-folded='true'] .cm-mardora-heading-fold-arrow": {
    display: "inline-block",
  },

  ".cm-mardora-heading-fold-placeholder": {
    color: "var(--mardora-heading-fold-muted, #a1a1aa)",
    font: "600 0.9rem/1.4 var(--mardora-font-ui)",
    padding: "0.1rem 0 0.35rem 0.25rem",
  },

  "&dark .cm-mardora-heading-fold-toggle, &dark .cm-mardora-heading-fold-placeholder": {
    "--mardora-heading-fold-muted": "#71717a",
    "--mardora-heading-fold-active": "#d4d4d8",
    "--mardora-heading-fold-focus": "#71717a",
  },
});
