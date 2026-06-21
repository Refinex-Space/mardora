import { createTheme } from "../editor";

/** Shared theme styles for editor + preview code blocks. */
export const codePluginTheme = createTheme({
  default: {
    // Inline code
    ".cm-mardora-code-inline": {
      fontFamily: "var(--mardora-font-code)",
      fontSize: "0.9em",
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      padding: "0.1rem 0.25rem",
      border: "1px solid var(--color-border)",
      borderRadius: "3px",
    },

    // Fenced code block lines
    ".cm-mardora-code-block-line": {
      "--radius": "0.375rem",

      fontFamily: "var(--mardora-font-code)",
      fontSize: "0.9rem",
      backgroundColor: "transparent",
      padding: "0 1rem !important",
      lineHeight: "1.5",
      minHeight: "1.5em",
      borderLeft: "1px solid var(--color-border, #d4d4d8)",
      borderRight: "1px solid var(--color-border, #d4d4d8)",
    },

    // First line of code block
    ".cm-mardora-code-block-line-start": {
      borderTopLeftRadius: "var(--radius)",
      borderTopRightRadius: "var(--radius)",
      position: "relative",
      overflow: "visible",
      borderTop: "1px solid var(--color-border, #d4d4d8)",
      paddingTop: "0.5rem !important",
    },

    ".cm-mardora-code-block-rendered.cm-mardora-code-block-line-start": {
      paddingTop: "0.5rem !important",
      paddingBottom: "0 !important",
    },

    ".cm-mardora-code-fence-line": {
      height: "0",
      minHeight: "0",
      lineHeight: "0",
      paddingTop: "0 !important",
      paddingBottom: "0 !important",
      border: "none !important",
      overflow: "visible",
    },

    // Code block hover toolbar
    ".cm-mardora-code-toolbar": {
      display: "flex",
      alignItems: "center",
      gap: "0.2rem",
      position: "absolute",
      top: "0.5rem",
      right: "0.45rem",
      zIndex: "20",
      opacity: "0",
      pointerEvents: "none",
      transition: "opacity 0.12s ease",
      color: "var(--color-text, inherit)",
      fontFamily: "var(--mardora-font-ui)",
      fontSize: "0.78rem",
      lineHeight: "1",

      "&.is-visible, &.is-menu-open": {
        opacity: "1",
        pointerEvents: "auto",
      },
    },

    ".cm-mardora-code-container:hover .cm-mardora-code-toolbar, .cm-mardora-code-container:focus-within .cm-mardora-code-toolbar":
      {
        opacity: "1",
        pointerEvents: "auto",
      },

    ".cm-mardora-code-language-control": {
      position: "relative",
    },

    ".cm-mardora-code-language-button, .cm-mardora-code-copy-btn": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: "1.55rem",
      minWidth: "1.55rem",
      gap: "0.25rem",
      padding: "0 0.35rem",
      backgroundColor: "rgba(255, 255, 255, 0.86)",
      border: "1px solid rgba(209, 213, 219, 0.9)",
      borderRadius: "0.25rem",
      color: "#3f3f46",
      cursor: "pointer",
      boxShadow: "none",
      transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease",

      "&:hover": {
        backgroundColor: "rgba(244, 244, 245, 0.96)",
        borderColor: "rgba(161, 161, 170, 0.95)",
        color: "#18181b",
      },

      "&.copied": {
        color: "#3f3f46",
      },
    },

    ".cm-mardora-code-copy-btn": {
      padding: "0",
    },

    ".cm-mardora-code-language-menu": {
      position: "absolute",
      top: "calc(100% + 0.35rem)",
      right: "0",
      width: "14rem",
      maxHeight: "18rem",
      padding: "0.45rem",
      backgroundColor: "var(--color-background, #fff)",
      border: "1px solid var(--color-border)",
      borderRadius: "0.375rem",
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
      overflow: "hidden",

      "&[hidden]": {
        display: "none",
      },
    },

    ".cm-mardora-code-language-search": {
      display: "flex",
      alignItems: "center",
      position: "relative",
      marginBottom: "0.35rem",

      "& input": {
        width: "100%",
        height: "2rem",
        padding: "0 2rem 0 0.65rem",
        border: "1px solid var(--color-border)",
        borderRadius: "0.25rem",
        backgroundColor: "transparent",
        color: "var(--color-text, inherit)",
        outline: "none",
        font: "inherit",

        "&:focus": {
          borderColor: "#94a3b8",
        },
      },
    },

    ".cm-mardora-code-language-search-icon": {
      position: "absolute",
      right: "0.55rem",
      color: "#52525b",
      pointerEvents: "none",
    },

    ".cm-mardora-code-language-list": {
      maxHeight: "14.5rem",
      overflowY: "auto",
      scrollbarColor: "rgba(113, 113, 122, 0.42) transparent",
      scrollbarWidth: "thin",
    },

    ".cm-mardora-code-language-list::-webkit-scrollbar": {
      width: "8px",
    },

    ".cm-mardora-code-language-list::-webkit-scrollbar-track": {
      background: "transparent",
    },

    ".cm-mardora-code-language-list::-webkit-scrollbar-thumb": {
      borderRadius: "999px",
      background: "rgba(113, 113, 122, 0.42)",
    },

    ".cm-mardora-code-language-item": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      height: "1.9rem",
      padding: "0 0.45rem",
      border: "none",
      borderRadius: "0.25rem",
      backgroundColor: "transparent",
      color: "var(--color-text, inherit)",
      cursor: "pointer",
      font: "inherit",
      textAlign: "left",

      "&:hover": {
        backgroundColor: "rgba(0, 0, 0, 0.07)",
      },
    },

    // Caption (below code block)
    ".cm-mardora-code-block-has-caption": {
      padding: "0 !important",
      paddingTop: "0.5rem !important",
    },

    ".cm-mardora-code-caption": {
      textAlign: "center",
      fontSize: "0.85rem",
      color: "#6a737d",
      fontStyle: "italic",
      padding: "0.25rem 1rem",
      backgroundColor: "rgba(0, 0, 0, 0.06)",
    },

    // Last line of code block
    ".cm-mardora-code-block-line-end": {
      borderBottomLeftRadius: "var(--radius)",
      borderBottomRightRadius: "var(--radius)",
      borderBottom: "1px solid var(--color-border, #d4d4d8)",
      paddingBottom: "0.5rem !important",
    },

    ".cm-mardora-code-block-rendered.cm-mardora-code-block-line-end": {
      paddingTop: "0 !important",
      paddingBottom: "0.5rem !important",
    },

    ".cm-mardora-code-block-single-line": {
      paddingTop: "0.5rem !important",
      paddingBottom: "0.5rem !important",
    },

    ".cm-mardora-code-block-rendered.cm-mardora-code-block-single-line": {
      paddingTop: "0.5rem !important",
      paddingBottom: "0.5rem !important",
    },

    // Fence markers (```)
    ".cm-mardora-code-fence": {
      color: "#6a737d",
      fontFamily: "var(--mardora-font-code)",
    },

    // Line numbers
    ".cm-mardora-code-line-numbered": {
      paddingLeft: "calc(var(--line-num-width, 2ch) + 1rem) !important",
      position: "relative",

      "&::before": {
        content: "attr(data-line-num)",
        position: "absolute",
        left: "0.5rem",
        top: "0.2rem",
        width: "var(--line-num-width, 2ch)",
        textAlign: "right",
        color: "#6a737d",
        opacity: "0.6",
        fontFamily: "var(--mardora-font-code)",
        fontSize: "0.85rem",
        userSelect: "none",
      },
    },

    ".cm-mardora-code-line-numbered-diff": {
      paddingLeft: "calc(var(--line-num-old-width, 2ch) + var(--line-num-new-width, 2ch) + 2.75rem) !important",
      position: "relative",

      "&::before": {
        content: "attr(data-line-num-old)",
        position: "absolute",
        left: "0.5rem",
        top: "0.2rem",
        width: "var(--line-num-old-width, 2ch)",
        textAlign: "right",
        color: "#6a737d",
        opacity: "0.6",
        fontFamily: "var(--mardora-font-code)",
        fontSize: "0.85rem",
        userSelect: "none",
      },

      "&::after": {
        content: 'attr(data-line-num-new) " " attr(data-diff-marker)',
        position: "absolute",
        left: "calc(0.5rem + var(--line-num-old-width, 2ch) + 0.75rem)",
        top: "0.2rem",
        width: "calc(var(--line-num-new-width, 2ch) + 2ch)",
        textAlign: "right",
        color: "#6a737d",
        opacity: "0.6",
        fontFamily: "var(--mardora-font-code)",
        fontSize: "0.85rem",
        userSelect: "none",
      },

      "&.cm-mardora-code-line-diff-gutter": {
        paddingLeft: "calc(var(--line-num-width, 2ch) + 2rem) !important",

        "&::after": {
          content: "attr(data-diff-marker)",
          position: "absolute",
          left: "calc(0.5rem + var(--line-num-width, 2ch) + 0.35rem)",
          top: "0.1rem",
          width: "1ch",
          textAlign: "right",
          fontFamily: "var(--mardora-font-code)",
          fontSize: "0.85rem",
          fontWeight: "700",
          userSelect: "none",
        },
      },
    },

    // Preview: code lines (need block display for full-width highlights)
    ".cm-mardora-code-line": {
      display: "block",
      position: "relative",
      paddingLeft: "1rem",
      paddingRight: "1rem",
      lineHeight: "1.5",
      borderLeft: "3px solid transparent",
    },

    // Line highlight
    ".cm-mardora-code-line-highlight": {
      backgroundColor: "rgba(255, 220, 100, 0.2) !important",
      borderLeft: "3px solid #f0b429 !important",
    },

    ".cm-mardora-code-line-diff-add": {
      color: "inherit",
      backgroundColor: "rgba(34, 197, 94, 0.12) !important",
      borderLeft: "3px solid #22c55e !important",

      "&.cm-mardora-code-line-diff-gutter::after": {
        color: "#16a34a",
      },
    },

    ".cm-mardora-code-line-diff-del": {
      color: "inherit",
      backgroundColor: "rgba(239, 68, 68, 0.12) !important",
      borderLeft: "3px solid #ef4444 !important",

      "&.cm-mardora-code-line-diff-gutter::after": {
        color: "#dc2626",
      },
    },

    ".cm-mardora-code-diff-sign-add": {
      color: "#16a34a",
      fontWeight: "700",
    },

    ".cm-mardora-code-diff-sign-del": {
      color: "#dc2626",
      fontWeight: "700",
    },

    ".cm-mardora-code-diff-mod-add": {
      color: "inherit",
      backgroundColor: "rgba(34, 197, 94, 0.25)",
      borderRadius: "2px",
      padding: "0.1rem 0",
    },

    ".cm-mardora-code-diff-mod-del": {
      color: "inherit",
      backgroundColor: "rgba(239, 68, 68, 0.25)",
      borderRadius: "2px",
      padding: "0.1rem 0",
    },

    // Text highlight
    ".cm-mardora-code-text-highlight": {
      color: "inherit",
      backgroundColor: "rgba(255, 220, 100, 0.4)",
      borderRadius: "2px",
      padding: "0.1rem 0",
    },

    // Preview: container wrapper
    ".cm-mardora-code-container": {
      margin: "1rem 0",
      borderRadius: "var(--radius)",
      overflow: "visible",
      border: "1px solid var(--color-border, #d4d4d8)",
      position: "relative",
      backgroundColor: "transparent",

      ".cm-mardora-code-block": {
        margin: "0",
        borderRadius: "var(--radius)",
        border: "none",
        whiteSpace: "pre-wrap",
      },

      ".cm-mardora-code-caption": {
        borderTop: "1px solid var(--color-border)",
      },
    },

    // Preview: standalone code block (not in container)
    ".cm-mardora-code-block": {
      fontFamily: "var(--mardora-font-code)",
      fontSize: "0.9rem",
      backgroundColor: "transparent",
      padding: "1rem",
      overflow: "auto",
      position: "relative",
      borderRadius: "var(--radius)",
      border: "1px solid var(--color-border, #d4d4d8)",

      "&.cm-mardora-code-block-has-caption": {
        borderBottomLeftRadius: "0",
        borderBottomRightRadius: "0",
        borderBottom: "none",
        paddingBottom: "0.5rem !important",
      },
    },
  },

  dark: {
    ".cm-mardora-code-inline": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },

    ".cm-mardora-code-block-line": {
      backgroundColor: "transparent",
      borderLeftColor: "rgba(148, 163, 184, 0.26)",
      borderRightColor: "rgba(148, 163, 184, 0.26)",
    },

    ".cm-mardora-code-block-line-start": {
      borderTopColor: "rgba(148, 163, 184, 0.26)",
    },

    ".cm-mardora-code-block-line-end": {
      borderBottomColor: "rgba(148, 163, 184, 0.26)",
    },

    ".cm-mardora-code-fence": {
      color: "#8b949e",
    },

    ".cm-mardora-code-container": {
      borderColor: "rgba(148, 163, 184, 0.26)",

      ".cm-mardora-code-caption": {
        borderTopColor: "rgba(148, 163, 184, 0.26)",
      },
    },

    ".cm-mardora-code-block": {
      backgroundColor: "transparent",
      borderColor: "rgba(148, 163, 184, 0.26)",
    },

    ".cm-mardora-code-language-button, .cm-mardora-code-copy-btn": {
      backgroundColor: "rgba(39, 39, 42, 0.72)",
      borderColor: "rgba(82, 82, 91, 0.9)",
      color: "#e4e4e7",

      "&:hover": {
        backgroundColor: "rgba(63, 63, 70, 0.92)",
        borderColor: "rgba(113, 113, 122, 0.95)",
      },

      "&.copied": {
        color: "#e4e4e7",
      },
    },

    ".cm-mardora-code-language-menu": {
      backgroundColor: "#18181b",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
    },

    ".cm-mardora-code-language-search-icon": {
      color: "#a1a1aa",
    },

    ".cm-mardora-code-caption": {
      backgroundColor: "rgba(255, 255, 255, 0.05)",
    },

    ".cm-mardora-code-line-numbered": {
      "&::before": {
        color: "#8b949e",
      },
    },

    ".cm-mardora-code-line-numbered-diff": {
      "&::before": {
        color: "#8b949e",
      },

      "&::after": {
        color: "#8b949e",
      },
    },

    ".cm-mardora-code-line-diff-gutter": {
      "&::after": {
        color: "#8b949e",
      },
    },

    ".cm-mardora-code-line-highlight": {
      backgroundColor: "rgba(255, 220, 100, 0.15) !important",
      borderLeft: "3px solid #d9a520 !important",
    },

    ".cm-mardora-code-line-diff-add": {
      backgroundColor: "rgba(34, 197, 94, 0.15) !important",
      borderLeft: "3px solid #22c55e !important",

      "&.cm-mardora-code-line-diff-gutter::after": {
        color: "#4ade80",
      },
    },

    ".cm-mardora-code-line-diff-del": {
      backgroundColor: "rgba(239, 68, 68, 0.15) !important",
      borderLeft: "3px solid #ef4444 !important",

      "&.cm-mardora-code-line-diff-gutter::after": {
        color: "#f87171",
      },
    },

    ".cm-mardora-code-diff-sign-add": {
      color: "#4ade80",
    },

    ".cm-mardora-code-diff-sign-del": {
      color: "#f87171",
    },

    ".cm-mardora-code-diff-mod-add": {
      backgroundColor: "rgba(34, 197, 94, 0.3)",
    },

    ".cm-mardora-code-diff-mod-del": {
      backgroundColor: "rgba(239, 68, 68, 0.3)",
    },

    ".cm-mardora-code-text-highlight": {
      backgroundColor: "rgba(255, 220, 100, 0.3)",
    },
  },
});
