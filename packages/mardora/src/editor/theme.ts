import { EditorView } from "@codemirror/view";

export type MardoraContentWidth =
  | "default"
  | "full"
  | {
      maxWidth: string;
      margin?: string;
    };

export interface MardoraFontConfig {
  /** Article and heading font family. Accepts a CSS font-family value. */
  document?: string;

  /** Code block, inline code, and markdown syntax font family. Accepts a CSS font-family value. */
  code?: string;

  /** Editor-owned UI controls such as slash menu, toolbar, TOC, and code block controls. */
  ui?: string;
}

export interface ResolvedMardoraFontConfig {
  document: string;
  code: string;
  ui: string;
}

const defaultContentWidth = {
  margin: "0 auto",
  maxWidth: "48rem",
};

export const defaultMardoraFonts: ResolvedMardoraFontConfig = {
  code: "var(--font-jetbrains-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace)",
  document: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)",
  ui: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)",
};

function resolveContentWidth(contentWidth: MardoraContentWidth = "default") {
  if (contentWidth === "full") {
    return {
      margin: "0",
      maxWidth: "none",
    };
  }

  if (contentWidth === "default") {
    return defaultContentWidth;
  }

  return {
    margin: contentWidth.margin ?? defaultContentWidth.margin,
    maxWidth: contentWidth.maxWidth,
  };
}

export function resolveMardoraFonts(fonts: MardoraFontConfig = {}): ResolvedMardoraFontConfig {
  return {
    code: normalizeFontFamily(fonts.code, defaultMardoraFonts.code),
    document: normalizeFontFamily(fonts.document, defaultMardoraFonts.document),
    ui: normalizeFontFamily(fonts.ui, defaultMardoraFonts.ui),
  };
}

export function createMardoraFontVariables(fonts: MardoraFontConfig = {}) {
  const resolvedFonts = resolveMardoraFonts(fonts);

  return {
    "--mardora-font-code": resolvedFonts.code,
    "--mardora-font-document": resolvedFonts.document,
    "--mardora-font-ui": resolvedFonts.ui,
  };
}

function normalizeFontFamily(fontFamily: string | undefined, fallback: string) {
  const normalized = fontFamily?.trim();

  if (!normalized || /[;{}]/.test(normalized)) {
    return fallback;
  }

  return normalized;
}

/**
 * Base theme for mardora styling
 * Note: Layout styles are scoped under .cm-mardora which is added by the view plugin
 */
export function createMardoraBaseTheme(contentWidth: MardoraContentWidth = "default", fonts: MardoraFontConfig = {}) {
  const resolvedContentWidth = resolveContentWidth(contentWidth);

  return EditorView.baseTheme({
    // Container styles - only apply when view plugin is enabled
    "&.cm-mardora": {
      ...createMardoraFontVariables(fonts),
      fontSize: "16px",
      lineHeight: "1.6",
      minHeight: "100%",
      backgroundColor: "transparent !important",
      fontFamily: "var(--mardora-font-document)",
    },

    "&.cm-mardora.cm-focused": {
      outline: "none",
    },

    "&.cm-mardora .cm-scroller": {
      minHeight: "100%",
    },

    "&.cm-mardora .cm-content": {
      width: "100%",
      maxWidth: resolvedContentWidth.maxWidth,
      padding: "0 0.5rem",
      margin: resolvedContentWidth.margin,
      fontFamily: "var(--mardora-font-document)",
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
}

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
