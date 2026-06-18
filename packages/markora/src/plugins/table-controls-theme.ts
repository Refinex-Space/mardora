import { createTheme } from "../editor";

export const tableControlsTheme = createTheme({
  default: {
    ".cm-markora-table-wrapper": {
      overflow: "visible",
    },
    ".cm-markora-table-controls-overlay": {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "20",
    },
    ".cm-markora-table-handle": {
      position: "absolute",
      width: "1.75rem",
      height: "1.75rem",
      border: "1px solid var(--color-border, #d7dee7)",
      borderRadius: "0.5rem",
      backgroundColor: "var(--color-background, #ffffff)",
      color: "var(--color-muted-foreground, #64748b)",
      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.14)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.125rem",
      pointerEvents: "auto",
      opacity: "1",
      cursor: "pointer",
    },
    ".cm-markora-table-handle span": {
      width: "0.25rem",
      height: "0.25rem",
      borderRadius: "999px",
      backgroundColor: "currentColor",
      display: "block",
    },
    ".cm-markora-table-row-handle": {
      flexDirection: "column",
    },
    ".cm-markora-table-control-menu": {
      position: "absolute",
      minWidth: "12rem",
      padding: "0.25rem",
      border: "1px solid var(--color-border, #d7dee7)",
      borderRadius: "0.5rem",
      backgroundColor: "var(--color-background, #ffffff)",
      boxShadow: "0 18px 44px rgba(15, 23, 42, 0.16)",
      pointerEvents: "auto",
    },
    ".cm-markora-table-control-menu-item": {
      width: "100%",
      minHeight: "2rem",
      border: "0",
      borderRadius: "0.375rem",
      backgroundColor: "transparent",
      color: "var(--color-text, #0f172a)",
      display: "flex",
      alignItems: "center",
      padding: "0 0.625rem",
      fontSize: "0.875rem",
      textAlign: "left",
      cursor: "pointer",
    },
    ".cm-markora-table-control-menu-item:hover": {
      backgroundColor: "rgba(15, 23, 42, 0.06)",
    },
    ".cm-markora-table-control-menu-item:disabled": {
      color: "var(--color-muted-foreground, #94a3b8)",
      cursor: "not-allowed",
    },
    ".cm-markora-table-cell-row-selected, .cm-markora-table-cell-column-selected": {
      backgroundColor: "rgba(37, 99, 235, 0.12)",
      boxShadow: "inset 0 0 0 1px rgba(37, 99, 235, 0.38)",
    },
  },
  dark: {
    ".cm-markora-table-handle": {
      borderColor: "var(--color-border, #30363d)",
      backgroundColor: "var(--color-background, #161b22)",
      color: "var(--color-muted-foreground, #94a3b8)",
      boxShadow: "0 12px 28px rgba(0, 0, 0, 0.35)",
    },
    ".cm-markora-table-control-menu": {
      borderColor: "var(--color-border, #30363d)",
      backgroundColor: "var(--color-background, #161b22)",
      boxShadow: "0 18px 44px rgba(0, 0, 0, 0.42)",
    },
    ".cm-markora-table-control-menu-item": {
      color: "var(--color-text, #e6edf3)",
    },
    ".cm-markora-table-control-menu-item:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    ".cm-markora-table-cell-row-selected, .cm-markora-table-cell-column-selected": {
      backgroundColor: "rgba(96, 165, 250, 0.18)",
      boxShadow: "inset 0 0 0 1px rgba(96, 165, 250, 0.5)",
    },
  },
});
