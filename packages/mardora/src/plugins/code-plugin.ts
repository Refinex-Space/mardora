import { Decoration, EditorView, KeyBinding, WidgetType } from "@codemirror/view";
import { EditorState, Extension, Transaction, TransactionSpec } from "@codemirror/state";
import { LanguageDescription, syntaxTree } from "@codemirror/language";
import { DecorationContext, DecorationPlugin } from "../editor/plugin";
import { toggleMarkdownStyle } from "../editor";
import { Parser, SyntaxNode } from "@lezer/common";
import { Highlighter, highlightCode } from "@lezer/highlight";
import { languages } from "@codemirror/language-data";
import { createWrapSelectionInputHandler } from "../lib";
import { codePluginTheme as theme } from "./code-plugin.theme";

// ============================================================================
// Constants
// ============================================================================

/** Copy icon SVG (clipboard) */
const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

/** Checkmark icon SVG (success state) */
export const CODE_COPY_SUCCESS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"></path></svg>`;

/** Chevron icon SVG */
const CHEVRON_DOWN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`;

/** Search icon SVG */
const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>`;

/** Language selected icon SVG */
const LANGUAGE_SELECTED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`;

/** Delay before resetting copy button state (ms) */
const COPY_RESET_DELAY = 2000;

/** Code fence marker in markdown blocks */
const CODE_FENCE = "```";

/** Regex for quoted code info values like title="file.ts" */
const QUOTED_INFO_PATTERN = /(\w+)="([^"]*)"/g;

/** Regex for /pattern/ with optional instance selectors (/pattern/1-3,5) */
const TEXT_HIGHLIGHT_PATTERN = /\/([^/]+)\/(?:(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*))?/g;

const codeLanguageOptions = [
  ["Plain text", ""],
  ["Bash", "bash"],
  ["C", "c"],
  ["C++", "cpp"],
  ["C#", "csharp"],
  ["CSS", "css"],
  ["Go", "go"],
  ["HTML", "html"],
  ["Java", "java"],
  ["JavaScript", "javascript"],
  ["JSON", "json"],
  ["Markdown", "markdown"],
  ["Mermaid", "mermaid"],
  ["Python", "python"],
  ["Ruby", "ruby"],
  ["Rust", "rust"],
  ["Shell", "shell"],
  ["SQL", "sql"],
  ["Swift", "swift"],
  ["TypeScript", "typescript"],
  ["TSX", "tsx"],
  ["Vue", "vue"],
  ["YAML", "yaml"],
] as const;

const codeLanguageAliases: Record<string, string> = {
  bash: "Bash",
  c: "C",
  cpp: "C++",
  "c++": "C++",
  csharp: "C#",
  "c#": "C#",
  css: "CSS",
  go: "Go",
  html: "HTML",
  java: "Java",
  javascript: "JavaScript",
  js: "JavaScript",
  json: "JSON",
  markdown: "Markdown",
  mermaid: "Mermaid",
  md: "Markdown",
  python: "Python",
  py: "Python",
  ruby: "Ruby",
  rust: "Rust",
  sql: "SQL",
  swift: "Swift",
  typescript: "TypeScript",
  ts: "TypeScript",
  tsx: "TSX",
  vue: "Vue",
  yaml: "YAML",
  yml: "YAML",
};

function isCodeInfoDirective(token: string): boolean {
  const normalizedToken = token.toLowerCase();
  return (
    /^(?:line-numbers|linenumbers|showlinenumbers)(?:\{\d+\})?$/.test(normalizedToken) ||
    normalizedToken === "copy" ||
    normalizedToken === "diff" ||
    normalizedToken.startsWith("{") ||
    normalizedToken.startsWith("/") ||
    normalizedToken.startsWith("title=") ||
    normalizedToken.startsWith("caption=")
  );
}

export function replaceCodeInfoLanguage(codeInfo: string, nextLanguage: string): string {
  const trimmedInfo = codeInfo.trim();
  const normalizedLanguage = nextLanguage.trim();
  const tokens = trimmedInfo ? trimmedInfo.split(/\s+/) : [];

  if (tokens.length > 0 && tokens[0] && !isCodeInfoDirective(tokens[0])) {
    tokens.shift();
  }

  return [normalizedLanguage, ...tokens].filter(Boolean).join(" ");
}

export function getCodeInfoLanguageTokenLength(codeInfo: string): number {
  const match = codeInfo.match(/^(\S+)(\s*)/);
  const token = match?.[1];
  if (!token || isCodeInfoDirective(token)) return 0;
  return token.length + (match[2]?.length ?? 0);
}

export function encodeCodeCopyPayload(code: string): string {
  if (typeof btoa !== "undefined") {
    return btoa(encodeURIComponent(code));
  }

  return Buffer.from(encodeURIComponent(code), "utf8").toString("base64");
}

export function decodeCodeCopyPayload(payload: string): string {
  const decoded = typeof atob !== "undefined" ? atob(payload) : Buffer.from(payload, "base64").toString("utf8");
  return decodeURIComponent(decoded);
}

function getClipboardApi(documentRef: Document): Clipboard | undefined {
  return documentRef.defaultView?.navigator.clipboard ?? (typeof navigator !== "undefined" ? navigator.clipboard : undefined);
}

function copyTextWithTextAreaFallback(text: string, documentRef: Document): boolean {
  const textArea = documentRef.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  documentRef.body.appendChild(textArea);
  textArea.select();
  textArea.setSelectionRange(0, text.length);

  try {
    return documentRef.execCommand("copy");
  } finally {
    textArea.remove();
  }
}

export async function copyCodeTextToClipboard(
  text: string,
  documentRef: Document | undefined = typeof document !== "undefined" ? document : undefined
): Promise<void> {
  if (!documentRef) {
    throw new Error("A browser document is required to copy code text");
  }

  const clipboard = getClipboardApi(documentRef);
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return;
    } catch {
      // Fall back to a selected textarea to force a text/plain clipboard payload.
    }
  }

  if (copyTextWithTextAreaFallback(text, documentRef)) {
    return;
  }

  throw new Error("Unable to copy code text");
}

function markCodeCopyButtonCopied(copyBtn: HTMLButtonElement): void {
  copyBtn.classList.add("copied");
  copyBtn.innerHTML = CODE_COPY_SUCCESS_ICON;
  setTimeout(() => {
    copyBtn.classList.remove("copied");
    copyBtn.innerHTML = COPY_ICON;
  }, COPY_RESET_DELAY);
}

export function bindCodeCopyButtons(root: HTMLElement | Document): () => void {
  const onClick = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    const copyBtn = target?.closest<HTMLButtonElement>(".cm-mardora-code-copy-btn[data-code]");
    if (!copyBtn || !root.contains(copyBtn)) return;

    const codePayload = copyBtn.dataset.code ?? "";
    const code = copyBtn.dataset.encoded === "true" ? decodeCodeCopyPayload(codePayload) : codePayload;

    event.preventDefault();
    event.stopPropagation();
    void copyCodeTextToClipboard(code, copyBtn.ownerDocument).then(() => {
      markCodeCopyButtonCopied(copyBtn);
    });
  };

  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}

export interface CodeFenceAutoCloseInput {
  text: string;
  from: number;
  to: number;
  lineFrom: number;
  lineTo: number;
  lineText: string;
  selectionEmpty: boolean;
}

export interface CodeFenceAutoCloseResult {
  changes: { from: number; to: number; insert: string };
  selection: { anchor: number };
}

export function resolveCodeFenceAutoClose(input: CodeFenceAutoCloseInput): CodeFenceAutoCloseResult | null {
  if (input.from !== input.to || !input.selectionEmpty) {
    return null;
  }

  const cursorOffset = input.from - input.lineFrom;
  const beforeCursor = input.lineText.slice(0, cursorOffset);
  const afterCursor = input.lineText.slice(cursorOffset);
  const openingMatch =
    input.text === "`" ? beforeCursor.match(/^(\s*)``$/) : input.text === CODE_FENCE ? beforeCursor.match(/^(\s*)$/) : null;

  if (!openingMatch || afterCursor.trim() !== "") {
    return null;
  }

  const indent = openingMatch[1] ?? "";
  const insert = `${indent}${CODE_FENCE}\n${indent}\n${indent}${CODE_FENCE}`;
  const anchor = input.lineFrom + indent.length + CODE_FENCE.length + 1 + indent.length;

  return {
    changes: { from: input.lineFrom, to: input.lineTo, insert },
    selection: { anchor },
  };
}

function isInsideFencedCode(state: EditorState, pos: number, lineFrom: number): boolean {
  const inspectPos = pos > lineFrom ? pos - 1 : pos;
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(inspectPos, -1);

  while (node) {
    if (node.name === "FencedCode") return true;
    node = node.parent;
  }

  return false;
}

export function resolveCodeFenceAutoCloseTransaction(transaction: Transaction): TransactionSpec | null {
  if (!transaction.docChanged || !transaction.startState.selection.main.empty || transaction.startState.selection.ranges.length !== 1) {
    return null;
  }

  let autoClose: TransactionSpec | null = null;

  transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    if (autoClose) return;

    const line = transaction.startState.doc.lineAt(fromA);
    if (isInsideFencedCode(transaction.startState, fromA, line.from)) return;

    const result = resolveCodeFenceAutoClose({
      text: inserted.toString(),
      from: fromA,
      to: toA,
      lineFrom: line.from,
      lineTo: line.to,
      lineText: line.text,
      selectionEmpty: true,
    });

    if (!result) return;

    const userEvent = transaction.annotation(Transaction.userEvent);
    autoClose = {
      changes: result.changes,
      selection: result.selection,
      scrollIntoView: true,
      filter: false,
      ...(userEvent ? { userEvent } : {}),
    };
  });

  return autoClose;
}

function createCodeFenceAutoCloseTransactionFilter(): Extension {
  return EditorState.transactionFilter.of((transaction) => resolveCodeFenceAutoCloseTransaction(transaction) ?? transaction);
}

function createCodeFenceAutoCloseInputHandler(): Extension {
  return EditorView.inputHandler.of((view, from, to, text) => {
    const selectionEmpty = view.state.selection.ranges.length === 1 && view.state.selection.main.empty;
    const line = view.state.doc.lineAt(from);
    const result = resolveCodeFenceAutoClose({
      text,
      from,
      to,
      lineFrom: line.from,
      lineTo: line.to,
      lineText: line.text,
      selectionEmpty,
    });

    if (!result) {
      return false;
    }

    view.dispatch({
      changes: result.changes,
      selection: result.selection,
      scrollIntoView: true,
    });

    return true;
  });
}

function createCodeFenceAutoCloseBeforeInputHandler(): Extension {
  return EditorView.domEventHandlers({
    beforeinput(event, view) {
      const inputEvent = event as InputEvent;
      if (inputEvent.inputType !== "insertText") {
        return false;
      }

      const text = inputEvent.data ?? "";
      const { from, to } = view.state.selection.main;
      const selectionEmpty = view.state.selection.ranges.length === 1 && view.state.selection.main.empty;
      const line = view.state.doc.lineAt(from);
      const result = resolveCodeFenceAutoClose({
        text,
        from,
        to,
        lineFrom: line.from,
        lineTo: line.to,
        lineText: line.text,
        selectionEmpty,
      });

      if (!result) {
        return false;
      }

      event.preventDefault();
      view.dispatch({
        changes: result.changes,
        selection: result.selection,
        scrollIntoView: true,
      });

      return true;
    },
  });
}

function formatLanguageLabel(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (!normalized) return "Text";
  return codeLanguageAliases[normalized] ?? language;
}

interface ToolbarElement extends HTMLElement {
  __mardoraDestroyToolbar?: () => void;
}

interface PreviewRenderContext {
  sliceDoc(from: number, to: number): string;
  sanitize(html: string): string;
  syntaxHighlighters?: readonly Highlighter[];
}

// ============================================================================
// Decorations
// ============================================================================

/** Mark and line decorations for code elements */
const codeMarkDecorations = {
  // Inline code
  "inline-code": Decoration.mark({ class: "cm-mardora-code-inline" }),
  "inline-mark": Decoration.replace({}),

  // Fenced code block
  "code-block-line": Decoration.line({ class: "cm-mardora-code-block-line" }),
  "code-block-line-start": Decoration.line({ class: "cm-mardora-code-block-line-start" }),
  "code-block-line-end": Decoration.line({ class: "cm-mardora-code-block-line-end" }),
  "code-block-single-line": Decoration.line({ class: "cm-mardora-code-block-single-line" }),
  "code-block-rendered": Decoration.line({ class: "cm-mardora-code-block-rendered" }),
  "code-fence-line": Decoration.line({ class: "cm-mardora-code-fence-line" }),
  "code-fence": Decoration.mark({ class: "cm-mardora-code-fence" }),
  "code-hidden": Decoration.replace({}),

  // Highlights
  "code-line-highlight": Decoration.line({ class: "cm-mardora-code-line-highlight" }),
  "code-text-highlight": Decoration.mark({ class: "cm-mardora-code-text-highlight" }),

  // Diff preview
  "diff-line-add": Decoration.line({ class: "cm-mardora-code-line-diff-add" }),
  "diff-line-del": Decoration.line({ class: "cm-mardora-code-line-diff-del" }),
  "diff-sign-add": Decoration.mark({ class: "cm-mardora-code-diff-sign-add" }),
  "diff-sign-del": Decoration.mark({ class: "cm-mardora-code-diff-sign-del" }),
  "diff-mod-add": Decoration.mark({ class: "cm-mardora-code-diff-mod-add" }),
  "diff-mod-del": Decoration.mark({ class: "cm-mardora-code-diff-mod-del" }),
  "diff-escape-hidden": Decoration.replace({}),
};

/**
 * Text highlight definition
 * Matches text or regex patterns with optional instance selection
 */
export interface TextHighlight {
  /** The pattern to match (regex without slashes) */
  pattern: string;
  /** Specific instances to highlight (e.g., [3,5] or range [3,4,5]) */
  instances?: number[];
}

/**
 * Properties extracted from CodeInfo string
 *
 * Example: ```tsx line-numbers{5} title="hello.tsx" caption="Example" copy {2-4,5} /Hello/3-5
 */
export interface CodeBlockProperties {
  /** Language identifier (first token) */
  language: string;
  /** Show line numbers, optionally starting from a specific number */
  showLineNumbers?: number | boolean;
  /** Title to display */
  title?: string;
  /** Caption to display */
  caption?: string;
  /** Show copy button */
  copy?: boolean;
  /** Enable diff preview mode */
  diff?: boolean;
  /** Lines to highlight (e.g., [2,3,4,5,9]) */
  highlightLines?: number[];
  /** Text patterns to highlight with optional instance selection */
  highlightText?: TextHighlight[];
}

type DiffLineKind = "normal" | "addition" | "deletion";

interface DiffLineState {
  kind: DiffLineKind;
  content: string;
  contentOffset: number;
  escapedMarker: boolean;
  modificationRanges?: Array<[number, number]>;
}

interface DiffDisplayLineNumbers {
  oldLine: number | null;
  newLine: number | null;
}

// ============================================================================
// Widgets
// ============================================================================

/**
 * Widget for the compact code block hover toolbar.
 */
class CodeBlockToolbarWidget extends WidgetType {
  constructor(
    private props: CodeBlockProperties,
    private codeContent: string,
    private codeInfo: string,
    private openingLineFrom: number,
    private openingLineTo: number,
    private openingFence: string,
    private forceVisible: boolean
  ) {
    super();
  }

  /** Creates the toolbar DOM element with language switcher and copy button. */
  toDOM(view: EditorView): HTMLElement {
    const toolbar = document.createElement("div") as ToolbarElement;
    toolbar.className = "cm-mardora-code-toolbar";
    if (this.forceVisible) {
      toolbar.classList.add("is-visible");
    }
    toolbar.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    toolbar.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    const languageControl = this.createLanguageControl(view, toolbar);
    toolbar.appendChild(languageControl);

    if (this.props.copy !== false) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "cm-mardora-code-copy-btn";
      copyBtn.type = "button";
      copyBtn.title = "Copy code";
      copyBtn.setAttribute("aria-label", "Copy code");
      copyBtn.innerHTML = COPY_ICON;

      copyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        void copyCodeTextToClipboard(this.codeContent, copyBtn.ownerDocument).then(() => {
          markCodeCopyButtonCopied(copyBtn);
        });
      });

      toolbar.appendChild(copyBtn);
    }

    requestAnimationFrame(() => this.bindHoverLines(toolbar));
    return toolbar;
  }

  /** Checks equality for widget reuse optimization. */
  override eq(other: CodeBlockToolbarWidget): boolean {
    return (
      this.props.title === other.props.title &&
      this.props.language === other.props.language &&
      this.props.copy === other.props.copy &&
      this.codeContent === other.codeContent &&
      this.codeInfo === other.codeInfo &&
      this.openingLineFrom === other.openingLineFrom &&
      this.openingLineTo === other.openingLineTo &&
      this.openingFence === other.openingFence &&
      this.forceVisible === other.forceVisible
    );
  }

  override destroy(dom: HTMLElement): void {
    const toolbar = dom as ToolbarElement;
    toolbar.__mardoraDestroyToolbar?.();
  }

  /** Allow click events to propagate for toolbar interaction. */
  override ignoreEvent(): boolean {
    return false;
  }

  private createLanguageControl(view: EditorView, toolbar: ToolbarElement): HTMLElement {
    const control = document.createElement("div");
    control.className = "cm-mardora-code-language-control";

    const button = document.createElement("button");
    button.className = "cm-mardora-code-language-button";
    button.type = "button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = `<span>${this.escapeHtml(formatLanguageLabel(this.props.language))}</span>${CHEVRON_DOWN_ICON}`;

    const menu = document.createElement("div");
    menu.className = "cm-mardora-code-language-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    const searchWrap = document.createElement("label");
    searchWrap.className = "cm-mardora-code-language-search";
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Search...";
    searchInput.autocomplete = "off";
    searchInput.spellcheck = false;
    const searchIcon = document.createElement("span");
    searchIcon.className = "cm-mardora-code-language-search-icon";
    searchIcon.innerHTML = SEARCH_ICON;
    searchWrap.append(searchInput, searchIcon);

    const list = document.createElement("div");
    list.className = "cm-mardora-code-language-list";
    menu.append(searchWrap, list);
    control.append(button, menu);

    const closeMenu = () => {
      menu.hidden = true;
      toolbar.classList.remove("is-menu-open");
      button.setAttribute("aria-expanded", "false");
      toolbar.ownerDocument.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    };

    const renderList = () => {
      const query = searchInput.value.trim().toLowerCase();
      list.textContent = "";

      for (const [label, value] of codeLanguageOptions) {
        const searchable = `${label} ${value}`.toLowerCase();
        if (query && !searchable.includes(query)) continue;

        const item = document.createElement("button");
        item.className = "cm-mardora-code-language-item";
        item.type = "button";
        item.setAttribute("role", "option");
        item.setAttribute("data-language", value);
        const selected = this.props.language.trim().toLowerCase() === value.toLowerCase();
        item.setAttribute("aria-selected", String(selected));
        item.innerHTML = `<span>${this.escapeHtml(label)}</span>${selected ? LANGUAGE_SELECTED_ICON : ""}`;
        item.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const nextInfo = replaceCodeInfoLanguage(this.codeInfo, value);
          view.dispatch({
            changes: {
              from: this.openingLineFrom,
              to: this.openingLineTo,
              insert: `${this.openingFence}${nextInfo ? nextInfo : ""}`,
            },
            selection: view.state.selection,
            scrollIntoView: false,
          });
          closeMenu();
          view.focus();
        });
        list.appendChild(item);
      }
    };

    const openMenu = () => {
      renderList();
      menu.hidden = false;
      toolbar.classList.add("is-menu-open");
      button.setAttribute("aria-expanded", "true");
      toolbar.ownerDocument.addEventListener("pointerdown", handleOutsidePointerDown, true);
      searchInput.focus();
    };

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (toolbar.contains(event.target as Node | null)) return;
      closeMenu();
    };

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menu.hidden) {
        openMenu();
      } else {
        closeMenu();
      }
    });

    searchInput.addEventListener("input", renderList);
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        view.focus();
      }
    });

    toolbar.__mardoraDestroyToolbar = () => closeMenu();
    return control;
  }

  private bindHoverLines(toolbar: HTMLElement): void {
    const firstLine = toolbar.closest(".cm-line");
    if (!(firstLine instanceof HTMLElement)) return;
    const editorRoot = firstLine.closest(".cm-editor");
    if (!(editorRoot instanceof HTMLElement)) return;

    const codeLines: HTMLElement[] = [];
    let current: Element | null = firstLine;

    while (current instanceof HTMLElement && current.classList.contains("cm-mardora-code-block-line")) {
      codeLines.push(current);
      if (current.classList.contains("cm-mardora-code-block-line-end")) break;
      current = current.nextElementSibling;
    }

    const rectContains = (rect: DOMRect, event: MouseEvent) =>
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    const updateVisibility = (event: MouseEvent) => {
      const overCodeBlock = codeLines.some((line) => rectContains(line.getBoundingClientRect(), event));
      const overToolbar = rectContains(toolbar.getBoundingClientRect(), event);
      if (this.forceVisible || overCodeBlock || overToolbar || toolbar.classList.contains("is-menu-open")) {
        toolbar.classList.add("is-visible");
      } else {
        toolbar.classList.remove("is-visible");
      }
    };
    const hide = () => {
      if (this.forceVisible) {
        toolbar.classList.add("is-visible");
        return;
      }
      if (!toolbar.classList.contains("is-menu-open")) toolbar.classList.remove("is-visible");
    };

    editorRoot.addEventListener("mousemove", updateVisibility);
    editorRoot.addEventListener("mouseleave", hide);

    const existingDestroy = (toolbar as ToolbarElement).__mardoraDestroyToolbar;
    (toolbar as ToolbarElement).__mardoraDestroyToolbar = () => {
      existingDestroy?.();
      editorRoot.removeEventListener("mousemove", updateVisibility);
      editorRoot.removeEventListener("mouseleave", hide);
    };
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

/**
 * Widget for code block caption.
 * Displays descriptive text below the code block.
 */
class CodeBlockCaptionWidget extends WidgetType {
  constructor(private caption: string) {
    super();
  }

  /** Creates the caption DOM element. */
  toDOM(): HTMLElement {
    const captionEl = document.createElement("div");
    captionEl.className = "cm-mardora-code-caption";
    captionEl.textContent = this.caption;
    return captionEl;
  }

  /** Checks equality for widget reuse optimization. */
  override eq(other: CodeBlockCaptionWidget): boolean {
    return this.caption === other.caption;
  }

  /** Allow click events to propagate for caption interaction. */
  override ignoreEvent(): boolean {
    return false;
  }
}

// ============================================================================
// Plugin
// ============================================================================

/**
 * CodePlugin - Handles inline code and fenced code blocks.
 *
 * **Inline code:** `code`
 * Hides backticks when cursor is not in range.
 *
 * **Fenced code blocks:**
 * Supports syntax highlighting, line numbers, line/text highlighting,
 * title, caption, and copy button via CodeInfo properties.
 *
 * @example
 * ```tsx line-numbers{5} title="example.tsx" {2-4} /pattern/
 * const x = 1;
 * ```
 */
export class CodePlugin extends DecorationPlugin {
  readonly name = "code";
  readonly version = "1.0.0";
  override decorationPriority = 25;
  override readonly requiredNodes = ["InlineCode", "FencedCode", "CodeMark", "CodeInfo", "CodeText"] as const;
  private readonly parserCache = new Map<string, Promise<Parser | null>>();

  /**
   * Plugin theme
   */
  override get theme() {
    return theme;
  }

  /**
   * Keyboard shortcuts for code formatting
   */
  override getKeymap(): KeyBinding[] {
    return [
      {
        key: "Mod-e",
        run: toggleMarkdownStyle("`"),
        preventDefault: true,
      },
      {
        key: "Mod-Shift-e",
        run: (view) => this.toggleCodeBlock(view),
        preventDefault: true,
      },
    ];
  }

  /**
   * Intercepts backtick typing to wrap selected text as inline code.
   *
   * If user types '`' while text is selected, wraps each selected range
   * with backticks (selected -> `selected`).
   */
  override getExtensions(): Extension[] {
    return [
      createCodeFenceAutoCloseTransactionFilter(),
      createCodeFenceAutoCloseBeforeInputHandler(),
      createCodeFenceAutoCloseInputHandler(),
      createWrapSelectionInputHandler({ "`": "`" }),
    ];
  }

  /**
   * Toggle code block on current line or selected lines
   */
  private toggleCodeBlock(view: EditorView): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    // Get all lines in selection
    const startLine = state.doc.lineAt(from);
    const endLine = state.doc.lineAt(to);

    // Check if lines are already in a code block
    const prevLineNum = startLine.number > 1 ? startLine.number - 1 : startLine.number;
    const nextLineNum = endLine.number < state.doc.lines ? endLine.number + 1 : endLine.number;

    const prevLine = state.doc.line(prevLineNum);
    const nextLine = state.doc.line(nextLineNum);

    const isWrapped =
      prevLine.text.trim().startsWith(CODE_FENCE) &&
      nextLine.text.trim() === CODE_FENCE &&
      prevLineNum !== startLine.number &&
      nextLineNum !== endLine.number;

    if (isWrapped) {
      // Remove the fence lines
      view.dispatch({
        changes: [
          { from: prevLine.from, to: prevLine.to + 1, insert: "" }, // Remove opening fence + newline
          { from: nextLine.from - 1, to: nextLine.to, insert: "" }, // Remove newline + closing fence
        ],
      });
    } else {
      // Wrap with code fence
      const openFence = `${CODE_FENCE}\n`;
      const closeFence = `\n${CODE_FENCE}`;

      view.dispatch({
        changes: [
          { from: startLine.from, insert: openFence },
          { from: endLine.to, insert: closeFence },
        ],
        selection: { anchor: startLine.from + openFence.length, head: endLine.to + openFence.length },
      });
    }

    return true;
  }

  /**
   * Parse CodeInfo string into structured properties
   *
   * @param codeInfo - The raw CodeInfo string (e.g., "tsx line-numbers{5} title=\"hello.tsx\" copy {2-4,5} /Hello/3-5")
   * @returns Parsed CodeBlockProperties object
   *
   * @example
   * ```typescript
   * parseCodeInfo("tsx line-numbers{5} title=\"hello.tsx\" copy {2-4,5} /Hello/3-5")
   * ```
   *
   * Returns:
   * ```json
   * {
   *   language: "tsx",
   *   lineNumbers: 5,
   *   title: "hello.tsx",
   *   copy: true,
   *   diff: false,
   *   highlightLines: [2,3,4,5],
   *   highlightText: [{ pattern: "Hello", instances: [3,4,5] }]
   * }
   * ```
   */
  parseCodeInfo(codeInfo: string): CodeBlockProperties {
    const props: CodeBlockProperties = { language: "" };

    if (!codeInfo || !codeInfo.trim()) {
      return props;
    }

    let remaining = codeInfo.trim();

    // Extract language (first token), but only when it isn't a known directive.
    const firstTokenMatch = remaining.match(/^([^\s]+)/);
    if (firstTokenMatch && firstTokenMatch[1]) {
      const firstToken = firstTokenMatch[1];
      if (!isCodeInfoDirective(firstToken)) {
        props.language = firstToken;
        remaining = remaining.slice(firstToken.length).trim();
      }
    }

    // Extract quoted values (title="..." caption="...")
    let quotedMatch;
    while ((quotedMatch = QUOTED_INFO_PATTERN.exec(remaining)) !== null) {
      const key = quotedMatch[1]?.toLowerCase();
      const value = quotedMatch[2];

      if (key === "title" && value !== undefined) {
        props.title = value;
      } else if (key === "caption" && value !== undefined) {
        props.caption = value;
      }
    }
    // Remove matched quoted values
    remaining = remaining.replace(QUOTED_INFO_PATTERN, "").trim();

    // Check for line numbers with optional start value.
    // Supports both `line-numbers` and legacy `showLineNumbers` tokens.
    const lineNumbersMatch = remaining.match(/\b(?:line-numbers|lineNumbers|showLineNumbers)(?:\{(\d+)\})?/i);
    if (lineNumbersMatch) {
      if (lineNumbersMatch[1]) {
        props.showLineNumbers = parseInt(lineNumbersMatch[1], 10);
      } else {
        props.showLineNumbers = true;
      }
      remaining = remaining.replace(lineNumbersMatch[0], "").trim();
    }

    // Check for copy flag
    if (/\bcopy\b/.test(remaining)) {
      props.copy = true;
      remaining = remaining.replace(/\bcopy\b/, "").trim();
    }

    // Check for diff flag
    if (/\bdiff\b/.test(remaining)) {
      props.diff = true;
      remaining = remaining.replace(/\bdiff\b/, "").trim();
    }

    // Extract line highlights {2-4,5,9}
    const lineHighlightMatch = remaining.match(/\{([^}]+)\}/);
    if (lineHighlightMatch && lineHighlightMatch[1]) {
      const highlightLines = this.parseNumberList(lineHighlightMatch[1]);

      if (highlightLines.length > 0) {
        props.highlightLines = highlightLines;
      }
      remaining = remaining.replace(lineHighlightMatch[0], "").trim();
    }

    // Extract text/regex highlights /pattern/ or /pattern/3-5 or /pattern/3,5
    let textMatch;
    const highlightText: TextHighlight[] = [];

    while ((textMatch = TEXT_HIGHLIGHT_PATTERN.exec(remaining)) !== null) {
      if (!textMatch[1]) continue;
      const highlight: TextHighlight = {
        pattern: textMatch[1],
      };

      // Parse instance selection if present
      if (textMatch[2]) {
        const instances = this.parseNumberList(textMatch[2]);

        if (instances.length > 0) {
          highlight.instances = instances;
        }
      }

      highlightText.push(highlight);
    }

    if (highlightText.length > 0) {
      props.highlightText = highlightText;
    }

    return props;
  }

  /**
   * Build decorations for inline code and fenced code blocks.
   * Handles line numbers, highlights, header/caption widgets, and fence visibility.
   */
  buildDecorations(ctx: DecorationContext): void {
    const tree = syntaxTree(ctx.view.state);

    tree.iterate({
      enter: (node) => {
        if (node.name === "InlineCode") {
          this.decorateInlineCode(node, ctx);
          return;
        }

        if (node.name === "FencedCode") {
          this.decorateFencedCode(node, ctx);
        }
      },
    });
  }

  private decorateInlineCode(node: { from: number; to: number; node: SyntaxNode }, ctx: DecorationContext): void {
    const { from, to } = node;
    ctx.decorations.push(codeMarkDecorations["inline-code"].range(from, to));

    if (ctx.selectionOverlapsRange(from, to)) {
      return;
    }

    for (let child = node.node.firstChild; child; child = child.nextSibling) {
      if (child.name === "CodeMark") {
        ctx.decorations.push(codeMarkDecorations["inline-mark"].range(child.from, child.to));
      }
    }
  }

  private decorateFencedCode(node: { from: number; to: number; node: SyntaxNode }, ctx: DecorationContext): void {
    const { view, decorations } = ctx;
    const nodeLineStart = view.state.doc.lineAt(node.from);
    const nodeLineEnd = view.state.doc.lineAt(node.to);
    const cursorInRange = ctx.selectionOverlapsRange(nodeLineStart.from, nodeLineEnd.to);

    let infoProps: CodeBlockProperties = { language: "" };
    let codeContent = "";
    let codeInfo = "";

    for (let child = node.node.firstChild; child; child = child.nextSibling) {
      if (child.name === "CodeInfo") {
        codeInfo = view.state.sliceDoc(child.from, child.to).trim();
        infoProps = this.parseCodeInfo(codeInfo);
      }
      if (child.name === "CodeText") {
        codeContent = view.state.sliceDoc(child.from, child.to);
      }
    }

    const openingLineText = view.state.sliceDoc(nodeLineStart.from, nodeLineStart.to);
    const openingFenceMatch = openingLineText.match(/^(\s*)(```+|~~~+)/);
    const openingFence = openingFenceMatch ? `${openingFenceMatch[1] ?? ""}${openingFenceMatch[2] ?? CODE_FENCE}` : CODE_FENCE;

    const codeLines: string[] = [];
    for (let i = nodeLineStart.number + 1; i <= nodeLineEnd.number - 1; i++) {
      const codeLine = view.state.doc.line(i);
      codeLines.push(view.state.sliceDoc(codeLine.from, codeLine.to));
    }

    const totalCodeLines = nodeLineEnd.number - nodeLineStart.number - 1;
    const startLineNum = typeof infoProps.showLineNumbers === "number" ? infoProps.showLineNumbers : 1;
    const maxLineNum = startLineNum + totalCodeLines - 1;
    const lineNumWidth = Math.max(String(maxLineNum).length, String(startLineNum).length);
    const highlightInstanceCounters = new Array(infoProps.highlightText?.length ?? 0).fill(0);

    const diffStates = infoProps.diff ? this.analyzeDiffLines(codeLines) : [];
    const diffDisplayLineNumbers = infoProps.diff ? this.computeDiffDisplayLineNumbers(diffStates, startLineNum) : [];
    const displayLineNumbers = infoProps.diff
      ? diffDisplayLineNumbers.map((numbers, index) => numbers.newLine ?? numbers.oldLine ?? startLineNum + index)
      : codeLines.map((_, index) => startLineNum + index);
    const diffHighlightLineNumbers = infoProps.diff
      ? this.computeDiffDisplayLineNumbers(diffStates, startLineNum).map(
          (numbers, index) => numbers.newLine ?? numbers.oldLine ?? startLineNum + index
        )
      : [];
    const maxOldDiffLineNum = diffDisplayLineNumbers.reduce((max, numbers) => {
      const oldLine = numbers.oldLine ?? 0;
      return oldLine > max ? oldLine : max;
    }, startLineNum);
    const maxNewDiffLineNum = diffDisplayLineNumbers.reduce((max, numbers) => {
      const newLine = numbers.newLine ?? 0;
      return newLine > max ? newLine : max;
    }, startLineNum);
    const diffOldLineNumWidth = Math.max(String(startLineNum).length, String(maxOldDiffLineNum).length);
    const diffNewLineNumWidth = Math.max(String(startLineNum).length, String(maxNewDiffLineNum).length);

    const shouldShowCaption = !cursorInRange && !!infoProps.caption;

    const firstContentLineNumber = nodeLineStart.number + 1;
    const lastContentLineNumber = nodeLineEnd.number - 1;
    const toolbarLineNumber =
      firstContentLineNumber <= lastContentLineNumber ? firstContentLineNumber : nodeLineStart.number;
    const toolbarLine = view.state.doc.line(toolbarLineNumber);

    decorations.push(
      Decoration.widget({
        widget: new CodeBlockToolbarWidget(
          infoProps,
          codeContent,
          codeInfo,
          nodeLineStart.from,
          nodeLineStart.to,
          openingFence,
          cursorInRange
        ),
        block: false,
        side: -1,
      }).range(toolbarLine.from)
    );

    let codeLineIndex = 0;
    for (let lineNumber = nodeLineStart.number; lineNumber <= nodeLineEnd.number; lineNumber++) {
      const line = view.state.doc.line(lineNumber);
      const isFenceLine = lineNumber === nodeLineStart.number || lineNumber === nodeLineEnd.number;
      const relativeLineNum = displayLineNumbers[codeLineIndex] ?? startLineNum + codeLineIndex;

      if (isFenceLine) {
        decorations.push(codeMarkDecorations["code-fence-line"].range(line.from));
        continue;
      }

      decorations.push(codeMarkDecorations["code-block-line"].range(line.from));
      if (!cursorInRange) {
        decorations.push(codeMarkDecorations["code-block-rendered"].range(line.from));
      }

      if (lineNumber === firstContentLineNumber) {
        decorations.push(codeMarkDecorations["code-block-line-start"].range(line.from));
      }

      if (lineNumber === lastContentLineNumber) {
        decorations.push(codeMarkDecorations["code-block-line-end"].range(line.from));
        if (shouldShowCaption) {
          decorations.push(Decoration.line({ class: "cm-mardora-code-block-has-caption" }).range(line.from));
        }
      }

      if (firstContentLineNumber === lastContentLineNumber) {
        decorations.push(codeMarkDecorations["code-block-single-line"].range(line.from));
      }

      if (!isFenceLine && infoProps.showLineNumbers && !infoProps.diff) {
        decorations.push(
          Decoration.line({
            class: "cm-mardora-code-line-numbered",
            attributes: {
              "data-line-num": String(relativeLineNum),
              style: `--line-num-width: ${lineNumWidth}ch`,
            },
          }).range(line.from)
        );
      }

      if (!isFenceLine && infoProps.showLineNumbers && infoProps.diff) {
        const diffLineNumbers = diffDisplayLineNumbers[codeLineIndex];
        const diffState = diffStates[codeLineIndex];
        const diffMarker = diffState?.kind === "addition" ? "+" : diffState?.kind === "deletion" ? "-" : " ";
        decorations.push(
          Decoration.line({
            class: "cm-mardora-code-line-numbered-diff",
            attributes: {
              "data-line-num-old": diffLineNumbers?.oldLine != null ? String(diffLineNumbers.oldLine) : "",
              "data-line-num-new": diffLineNumbers?.newLine != null ? String(diffLineNumbers.newLine) : "",
              "data-diff-marker": diffMarker,
              style: `--line-num-old-width: ${diffOldLineNumWidth}ch; --line-num-new-width: ${diffNewLineNumWidth}ch`,
            },
          }).range(line.from)
        );
      }

      if (!isFenceLine && infoProps.diff) {
        this.decorateDiffLine(line, codeLineIndex, diffStates, cursorInRange, !infoProps.showLineNumbers, decorations);
      }

      if (!isFenceLine && infoProps.highlightLines) {
        const highlightLineNumber = infoProps.diff
          ? (diffHighlightLineNumbers[codeLineIndex] ?? codeLineIndex + 1)
          : startLineNum + codeLineIndex;
        if (infoProps.highlightLines.includes(highlightLineNumber)) {
          decorations.push(codeMarkDecorations["code-line-highlight"].range(line.from));
        }
      }

      if (!isFenceLine && infoProps.highlightText?.length) {
        this.decorateTextHighlights(
          line.from,
          view.state.sliceDoc(line.from, line.to),
          infoProps.highlightText,
          highlightInstanceCounters,
          decorations
        );
      }

      if (!isFenceLine) {
        codeLineIndex++;
      }
    }

    this.decorateFenceMarkers(node.node, decorations);

    if (!cursorInRange && infoProps.caption) {
      decorations.push(
        Decoration.widget({
          widget: new CodeBlockCaptionWidget(infoProps.caption),
          block: false,
          side: 1,
        }).range(nodeLineEnd.to)
      );
    }
  }

  private decorateFenceMarkers(
    node: SyntaxNode,
    decorations: DecorationContext["decorations"]
  ): void {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.name === "CodeMark") {
        decorations.push(codeMarkDecorations["code-hidden"].range(child.from, child.to));
        continue;
      }

      if (child.name === "CodeInfo") {
        decorations.push(codeMarkDecorations["code-hidden"].range(child.from, child.to));
      }
    }
  }

  private decorateDiffLine(
    line: { from: number; to: number },
    codeLineIndex: number,
    diffStates: DiffLineState[],
    cursorInRange: boolean,
    showDiffMarkerGutter: boolean,
    decorations: DecorationContext["decorations"]
  ): void {
    const diffState = diffStates[codeLineIndex];
    const diffMarker = diffState?.kind === "addition" ? "+" : diffState?.kind === "deletion" ? "-" : " ";

    if (showDiffMarkerGutter) {
      decorations.push(
        Decoration.line({
          class: "cm-mardora-code-line-diff-gutter",
          attributes: {
            "data-diff-marker": diffMarker,
          },
        }).range(line.from)
      );
    }

    if (diffState?.kind === "addition") {
      decorations.push(codeMarkDecorations["diff-line-add"].range(line.from));
      if (cursorInRange && line.to > line.from) {
        decorations.push(codeMarkDecorations["diff-sign-add"].range(line.from, line.from + 1));
      }
    }

    if (diffState?.kind === "deletion") {
      decorations.push(codeMarkDecorations["diff-line-del"].range(line.from));
      if (cursorInRange && line.to > line.from) {
        decorations.push(codeMarkDecorations["diff-sign-del"].range(line.from, line.from + 1));
      }
    }

    if (
      !cursorInRange &&
      line.to > line.from &&
      (diffState?.escapedMarker || diffState?.kind === "addition" || diffState?.kind === "deletion")
    ) {
      decorations.push(codeMarkDecorations["diff-escape-hidden"].range(line.from, line.from + 1));
    }

    if (diffState?.modificationRanges?.length) {
      for (const [start, end] of diffState.modificationRanges) {
        const rangeFrom = line.from + diffState.contentOffset + start;
        const rangeTo = line.from + diffState.contentOffset + end;
        if (rangeTo > rangeFrom) {
          decorations.push(
            (diffState.kind === "addition"
              ? codeMarkDecorations["diff-mod-add"]
              : codeMarkDecorations["diff-mod-del"]
            ).range(rangeFrom, rangeTo)
          );
        }
      }
    }
  }

  private decorateTextHighlights(
    lineFrom: number,
    lineText: string,
    highlights: TextHighlight[],
    instanceCounters: number[],
    decorations: DecorationContext["decorations"]
  ): void {
    for (const [highlightIndex, textHighlight] of highlights.entries()) {
      try {
        const regex = new RegExp(textHighlight.pattern, "g");
        let match: RegExpExecArray | null;

        while ((match = regex.exec(lineText)) !== null) {
          instanceCounters[highlightIndex] = (instanceCounters[highlightIndex] ?? 0) + 1;
          const globalMatchIndex = instanceCounters[highlightIndex];
          const shouldHighlight = !textHighlight.instances || textHighlight.instances.includes(globalMatchIndex);

          if (shouldHighlight) {
            const matchFrom = lineFrom + match.index;
            const matchTo = matchFrom + match[0].length;
            decorations.push(codeMarkDecorations["code-text-highlight"].range(matchFrom, matchTo));
          }
        }
      } catch {
        // Invalid regex; ignore this highlight pattern.
      }
    }
  }

  /**
   * Render code elements to HTML for static preview.
   * Applies syntax highlighting using @lezer/highlight.
   */
  override async renderToHTML(node: SyntaxNode, _children: string, ctx: PreviewRenderContext): Promise<string | null> {
    // Hide CodeMark (backticks)
    if (node.name === "CodeMark") {
      return "";
    }

    // Inline code
    if (node.name === "InlineCode") {
      // Extract content without backticks
      let content = ctx.sliceDoc(node.from, node.to);
      // Remove leading and trailing backticks
      const match = content.match(/^`+(.+?)`+$/s);
      if (match && match[1]) {
        content = match[1];
      }
      return `<code class="cm-mardora-code-inline" style="padding: 0.1rem 0.25rem">${this.escapeHtml(content)}</code>`;
    }

    // Fenced code block
    if (node.name === "FencedCode") {
      const content = ctx.sliceDoc(node.from, node.to);
      const lines = content.split("\n");

      // Extract info string from first line (everything after ```)
      const firstLine = lines[0] || "";
      const infoMatch = firstLine.match(/^```(.*)$/);
      const infoString = infoMatch?.[1]?.trim() || "";

      // Parse properties from info string
      const props = this.parseCodeInfo(infoString);

      // Get code content (without fence lines)
      const codeLines = lines.slice(1, -1);
      const code = codeLines.join("\n");

      // Build HTML parts
      let html = "";

      // Wrapper container
      html += `<div class="cm-mardora-code-container">`;

      html += `<div class="cm-mardora-code-toolbar">`;
      html += `<button class="cm-mardora-code-language-button" type="button"${props.language ? ` data-lang="${this.escapeAttribute(props.language)}"` : ""}>`;
      html += `<span>${this.escapeHtml(formatLanguageLabel(props.language))}</span>${CHEVRON_DOWN_ICON}`;
      html += `</button>`;
      if (props.copy !== false) {
        // Encode code as base64 to safely store in data attribute (preserves newlines and special chars)
        const encodedCode = encodeCodeCopyPayload(code);
        html += `<button class="cm-mardora-code-copy-btn" type="button" title="Copy code" data-code="${encodedCode}" data-encoded="true">`;
        html += COPY_ICON;
        html += `</button>`;
      }
      html += `</div>`;

      // Calculate line number info
      const startLineNum = typeof props.showLineNumbers === "number" ? props.showLineNumbers : 1;
      const previewHighlightCounters = new Array(props.highlightText?.length ?? 0).fill(0);
      const diffStates = props.diff ? this.analyzeDiffLines(codeLines) : [];
      const previewDiffLineNumbers = props.diff ? this.computeDiffDisplayLineNumbers(diffStates, startLineNum) : [];
      const previewLineNumbers = props.diff
        ? previewDiffLineNumbers.map((numbers, index) => numbers.newLine ?? numbers.oldLine ?? startLineNum + index)
        : codeLines.map((_, index) => startLineNum + index);
      const previewHighlightLineNumbers = props.diff
        ? this.computeDiffDisplayLineNumbers(diffStates, startLineNum).map(
            (numbers, index) => numbers.newLine ?? numbers.oldLine ?? startLineNum + index
          )
        : [];
      const lineNumWidth = String(Math.max(...previewLineNumbers, startLineNum)).length;
      const previewOldLineNumWidth = String(
        Math.max(...previewDiffLineNumbers.map((numbers) => numbers.oldLine ?? 0), startLineNum)
      ).length;
      const previewNewLineNumWidth = String(
        Math.max(...previewDiffLineNumbers.map((numbers) => numbers.newLine ?? 0), startLineNum)
      ).length;
      const previewContentLines = props.diff ? diffStates.map((state) => state.content) : codeLines;
      const highlightedLines = await this.highlightCodeLines(
        previewContentLines.join("\n"),
        props.language || "",
        ctx.syntaxHighlighters
      );

      // Code block with line processing
      const hasCaption = props.caption ? " cm-mardora-code-block-has-caption" : "";
      html += `<pre class="cm-mardora-code-block${hasCaption}"${props.language ? ` data-lang="${this.escapeAttribute(props.language)}"` : ""}>`;
      html += `<code>`;

      // Process each line
      codeLines.forEach((line, index) => {
        const lineNum = previewLineNumbers[index] ?? startLineNum + index;
        const highlightLineNumber = props.diff
          ? (previewHighlightLineNumbers[index] ?? startLineNum + index)
          : startLineNum + index;
        const isHighlighted = props.highlightLines?.includes(highlightLineNumber);
        const diffState = props.diff ? diffStates[index] : undefined;
        const diffLineNumbers = props.diff ? previewDiffLineNumbers[index] : undefined;

        // Line classes
        const lineClasses: string[] = ["cm-mardora-code-line"];
        if (isHighlighted) lineClasses.push("cm-mardora-code-line-highlight");
        if (props.showLineNumbers) {
          lineClasses.push(props.diff ? "cm-mardora-code-line-numbered-diff" : "cm-mardora-code-line-numbered");
        }
        if (diffState?.kind === "addition") lineClasses.push("cm-mardora-code-line-diff-add");
        if (diffState?.kind === "deletion") lineClasses.push("cm-mardora-code-line-diff-del");

        // Line attributes
        const lineAttrs: string[] = [`class="${lineClasses.join(" ")}"`];
        if (props.showLineNumbers && !props.diff) {
          lineAttrs.push(`data-line-num="${lineNum}"`);
          lineAttrs.push(`style="--line-num-width: ${lineNumWidth}ch"`);
        }
        if (props.diff) {
          const diffMarker = diffState?.kind === "addition" ? "+" : diffState?.kind === "deletion" ? "-" : " ";
          if (props.showLineNumbers) {
            lineAttrs.push(`data-line-num-old="${diffLineNumbers?.oldLine != null ? diffLineNumbers.oldLine : ""}"`);
            lineAttrs.push(`data-line-num-new="${diffLineNumbers?.newLine != null ? diffLineNumbers.newLine : ""}"`);
            lineAttrs.push(`data-diff-marker="${diffMarker}"`);
            lineAttrs.push(
              `style="--line-num-old-width: ${previewOldLineNumWidth}ch; --line-num-new-width: ${previewNewLineNumWidth}ch"`
            );
          } else {
            lineAttrs.push(`data-diff-marker="${diffMarker}"`);
            lineClasses.push("cm-mardora-code-line-diff-gutter");
            lineAttrs[0] = `class="${lineClasses.join(" ")}"`;
          }
        }

        // Highlight text content
        const highlightedLine = highlightedLines[index] ?? this.escapeHtml(previewContentLines[index] ?? line);
        let lineContent = highlightedLine;

        if (diffState) {
          lineContent = this.renderDiffPreviewLine(diffState, highlightedLine);
        }

        // Apply text highlights
        if (props.highlightText && props.highlightText.length > 0) {
          lineContent = this.applyTextHighlights(lineContent, props.highlightText, previewHighlightCounters);
        }

        html += `<span ${lineAttrs.join(" ")}>${lineContent || " "}</span>`;
      });

      html += `</code></pre>`;

      // Caption
      if (props.caption) {
        html += `<div class="cm-mardora-code-caption">${this.escapeHtml(props.caption)}</div>`;
      }

      // Close wrapper container
      html += `</div>`;

      return html;
    }

    // Hide CodeInfo and CodeText - they're handled by FencedCode
    if (node.name === "CodeInfo" || node.name === "CodeText") {
      return "";
    }

    return null;
  }

  /** Parse comma-separated numbers and ranges (e.g. "1,3-5") into [1,3,4,5]. */
  private parseNumberList(value: string): number[] {
    const result: number[] = [];

    for (const part of value.split(",")) {
      const trimmed = part.trim();
      const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);

      if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        for (let i = start; i <= end; i++) {
          result.push(i);
        }
        continue;
      }

      if (/^\d+$/.test(trimmed)) {
        result.push(parseInt(trimmed, 10));
      }
    }

    return result;
  }

  /**
   * Highlight a single line of code using the language's Lezer parser.
   * Falls back to sanitized plain text if the language is not supported.
   */
  private async highlightCodeLines(
    code: string,
    lang: string,
    syntaxHighlighters?: readonly Highlighter[]
  ): Promise<string[]> {
    const rawLines = code.split("\n");
    if (!lang || !code) {
      return rawLines.map((line) => this.escapeHtml(line));
    }

    const parser = await this.resolveLanguageParser(lang);
    if (!parser) {
      return rawLines.map((line) => this.escapeHtml(line));
    }

    try {
      const tree = parser.parse(code);
      const highlightedLines: string[] = [""];

      highlightCode(
        code,
        tree,
        syntaxHighlighters && syntaxHighlighters.length > 0 ? syntaxHighlighters : [],
        (text, classes) => {
          const chunk = classes
            ? `<span class="${this.escapeAttribute(classes)}">${this.escapeHtml(text)}</span>`
            : this.escapeHtml(text);
          highlightedLines[highlightedLines.length - 1] += chunk;
        },
        () => {
          highlightedLines.push("");
        }
      );

      return rawLines.map((line, index) => highlightedLines[index] || this.escapeHtml(line));
    } catch {
      return rawLines.map((line) => this.escapeHtml(line));
    }
  }

  private async resolveLanguageParser(lang: string): Promise<Parser | null> {
    const normalizedLang = this.normalizeLanguage(lang);
    if (!normalizedLang) return null;

    const cached = this.parserCache.get(normalizedLang);
    if (cached) return cached;

    const parserPromise = (async () => {
      const langDesc = LanguageDescription.matchLanguageName(languages, normalizedLang, true);

      if (!langDesc) return null;

      if (langDesc.support) {
        return langDesc.support.language.parser;
      }

      if (typeof langDesc.load === "function") {
        try {
          const support = await langDesc.load();
          return support.language.parser;
        } catch {
          return null;
        }
      }

      return null;
    })();

    this.parserCache.set(normalizedLang, parserPromise);
    return parserPromise;
  }

  private normalizeLanguage(lang: string): string {
    const normalized = lang.trim().toLowerCase();
    if (!normalized) return "";

    const normalizedMap: Record<string, string> = {
      "c++": "cpp",
      "c#": "csharp",
      "f#": "fsharp",
      py: "python",
      js: "javascript",
      ts: "typescript",
      sh: "shell",
    };

    return normalizedMap[normalized] ?? normalized;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value).replace(/`/g, "&#96;");
  }

  private analyzeDiffLines(lines: string[]): DiffLineState[] {
    const states = lines.map((line) => this.parseDiffLineState(line));

    let index = 0;
    while (index < states.length) {
      if (states[index]?.kind !== "deletion") {
        index++;
        continue;
      }

      const deletionStart = index;
      while (index < states.length && states[index]?.kind === "deletion") {
        index++;
      }
      const deletionEnd = index;

      const additionStart = index;
      while (index < states.length && states[index]?.kind === "addition") {
        index++;
      }
      const additionEnd = index;

      if (additionStart === additionEnd) {
        continue;
      }

      const pairCount = Math.min(deletionEnd - deletionStart, additionEnd - additionStart);
      for (let pairIndex = 0; pairIndex < pairCount; pairIndex++) {
        const deletionState = states[deletionStart + pairIndex];
        const additionState = states[additionStart + pairIndex];

        if (!deletionState || !additionState) {
          continue;
        }

        const ranges = this.computeChangedRanges(deletionState.content, additionState.content);
        if (ranges.oldRanges.length > 0) {
          deletionState.modificationRanges = ranges.oldRanges;
        }
        if (ranges.newRanges.length > 0) {
          additionState.modificationRanges = ranges.newRanges;
        }
      }
    }

    return states;
  }

  private computeDiffDisplayLineNumbers(states: DiffLineState[], startLineNum: number): DiffDisplayLineNumbers[] {
    const numbers: DiffDisplayLineNumbers[] = [];
    let oldLineNumber = startLineNum;
    let newLineNumber = startLineNum;

    for (const state of states) {
      if (state.kind === "deletion") {
        numbers.push({ oldLine: oldLineNumber, newLine: null });
        oldLineNumber++;
        continue;
      }

      if (state.kind === "addition") {
        numbers.push({ oldLine: null, newLine: newLineNumber });
        newLineNumber++;
        continue;
      }

      numbers.push({ oldLine: oldLineNumber, newLine: newLineNumber });
      oldLineNumber++;
      newLineNumber++;
    }

    return numbers;
  }

  private parseDiffLineState(line: string): DiffLineState {
    const escapedMarker = line.startsWith("\\+") || line.startsWith("\\-");

    if (escapedMarker) {
      return {
        kind: "normal",
        content: line.slice(1),
        contentOffset: 1,
        escapedMarker: true,
      };
    }

    if (line.startsWith("+")) {
      return {
        kind: "addition",
        content: line.slice(1),
        contentOffset: 1,
        escapedMarker: false,
      };
    }

    if (line.startsWith("-")) {
      return {
        kind: "deletion",
        content: line.slice(1),
        contentOffset: 1,
        escapedMarker: false,
      };
    }

    return {
      kind: "normal",
      content: line,
      contentOffset: 0,
      escapedMarker: false,
    };
  }

  private computeChangedRanges(
    oldText: string,
    newText: string
  ): { oldRanges: Array<[number, number]>; newRanges: Array<[number, number]> } {
    let prefix = 0;
    while (prefix < oldText.length && prefix < newText.length && oldText[prefix] === newText[prefix]) {
      prefix++;
    }

    let oldSuffix = oldText.length;
    let newSuffix = newText.length;
    while (oldSuffix > prefix && newSuffix > prefix && oldText[oldSuffix - 1] === newText[newSuffix - 1]) {
      oldSuffix--;
      newSuffix--;
    }

    const oldRanges: Array<[number, number]> = [];
    const newRanges: Array<[number, number]> = [];

    if (oldSuffix > prefix) {
      oldRanges.push([prefix, oldSuffix]);
    }
    if (newSuffix > prefix) {
      newRanges.push([prefix, newSuffix]);
    }

    return { oldRanges, newRanges };
  }

  private renderDiffPreviewLine(diffState: DiffLineState, highlightedContent: string): string {
    const modClass =
      diffState.kind === "addition"
        ? "cm-mardora-code-diff-mod-add"
        : diffState.kind === "deletion"
          ? "cm-mardora-code-diff-mod-del"
          : "";

    const baseHighlightedContent = highlightedContent || this.escapeHtml(diffState.content);

    const contentHtml =
      diffState.modificationRanges && modClass
        ? this.applyRangesToHighlightedHTML(baseHighlightedContent, diffState.modificationRanges, modClass)
        : baseHighlightedContent;

    return contentHtml || " ";
  }

  private applyRangesToHighlightedHTML(
    htmlContent: string,
    ranges: Array<[number, number]>,
    className: string
  ): string {
    const normalizedRanges = ranges
      .map(([start, end]) => [Math.max(0, start), Math.max(0, end)] as [number, number])
      .filter(([start, end]) => end > start)
      .sort((a, b) => a[0] - b[0]);

    if (normalizedRanges.length === 0 || !htmlContent) {
      return htmlContent;
    }

    const isInsideRange = (position: number) => {
      for (const [start, end] of normalizedRanges) {
        if (position >= start && position < end) return true;
        if (position < start) return false;
      }
      return false;
    };

    let result = "";
    let htmlIndex = 0;
    let textPosition = 0;
    let markOpen = false;

    while (htmlIndex < htmlContent.length) {
      const char = htmlContent[htmlIndex];

      if (char === "<") {
        const tagEnd = htmlContent.indexOf(">", htmlIndex);
        if (tagEnd === -1) {
          result += htmlContent.slice(htmlIndex);
          break;
        }
        result += htmlContent.slice(htmlIndex, tagEnd + 1);
        htmlIndex = tagEnd + 1;
        continue;
      }

      let token = char;
      if (char === "&") {
        const entityEnd = htmlContent.indexOf(";", htmlIndex);
        if (entityEnd !== -1) {
          token = htmlContent.slice(htmlIndex, entityEnd + 1);
          htmlIndex = entityEnd + 1;
        } else {
          htmlIndex += 1;
        }
      } else {
        htmlIndex += 1;
      }

      const shouldMark = isInsideRange(textPosition);

      if (shouldMark && !markOpen) {
        result += `<mark class="${className}">`;
        markOpen = true;
      }
      if (!shouldMark && markOpen) {
        result += "</mark>";
        markOpen = false;
      }

      result += token;
      textPosition += 1;
    }

    if (markOpen) {
      result += "</mark>";
    }

    return result;
  }

  /**
   * Apply text highlights (regex patterns) to already syntax-highlighted HTML.
   * Wraps matched patterns in `<mark>` elements.
   */
  private applyTextHighlights(htmlContent: string, highlights: TextHighlight[], instanceCounters?: number[]): string {
    let result = htmlContent;

    for (const [highlightIndex, highlight] of highlights.entries()) {
      try {
        // Create regex from pattern
        const regex = new RegExp(`(${highlight.pattern})`, "g");
        let matchCount = instanceCounters?.[highlightIndex] ?? 0;

        result = result.replace(regex, (match) => {
          matchCount++;
          // Check if this instance should be highlighted
          const shouldHighlight = !highlight.instances || highlight.instances.includes(matchCount);
          if (shouldHighlight) {
            return `<mark class="cm-mardora-code-text-highlight">${match}</mark>`;
          }
          return match;
        });

        if (instanceCounters) {
          instanceCounters[highlightIndex] = matchCount;
        }
      } catch {
        // Invalid regex, skip
      }
    }

    return result;
  }
}
