import { Extension, Prec } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import {
  buildBlockTypeChange,
  buildInlineFormatChange,
  buildLinkChange,
  buildListChange,
  detectSelectionBlockType,
  parseSelectedLink,
} from "./commands";
import { createSelectionToolbarElement } from "./menu";
import { computeSelectionToolbarLayout } from "./position";
import { selectionToolbarTheme } from "./theme";
import { resolveMardoraLocale } from "../i18n";
import { getSelectionToolbarMessages } from "./i18n";
import {
  canActivateFromNativeSelection,
  hasSelectionToolbarExcludedAncestor,
  selectionOverlapsExcludedSyntaxNode,
} from "./activation";
import type { MardoraLocale } from "../i18n";
import type {
  MardoraSelectionToolbarConfig,
  SelectionToolbarAnchorRect,
  SelectionToolbarBoundary,
  SelectionToolbarActionId,
  SelectionToolbarBlockType,
  SelectionToolbarButton,
  SelectionToolbarLinkState,
  SelectionToolbarMenuState,
  SelectionToolbarPaletteItem,
  SelectionToolbarPanel,
  TextCommandResult,
} from "./types";

type MardoraSelectionToolbarRuntimeConfig = MardoraSelectionToolbarConfig & {
  inheritedLocale?: MardoraLocale;
};

const toolbarWidth = 448;
const toolbarHeight = 40;
const panelWidth = 336;
const blockTypePanelHeight = 300;
const linkPanelHeight = 138;
const palettePanelHeight = 72;
const popoverGap = 6;

function textColors(messages: ReturnType<typeof getSelectionToolbarMessages>): SelectionToolbarPaletteItem[] {
  return [
    { id: "default", label: messages.colors.defaultText, value: null },
    { id: "gray", label: messages.colors.gray, value: "#71717a" },
    { id: "red", label: messages.colors.red, value: "#dc2626" },
    { id: "orange", label: messages.colors.orange, value: "#ea580c" },
    { id: "yellow", label: messages.colors.yellow, value: "#ca8a04" },
    { id: "green", label: messages.colors.green, value: "#16a34a" },
    { id: "blue", label: messages.colors.blue, value: "#2563eb" },
    { id: "purple", label: messages.colors.purple, value: "#7c3aed" },
  ];
}

function highlightColors(messages: ReturnType<typeof getSelectionToolbarMessages>): SelectionToolbarPaletteItem[] {
  return [
    { id: "default", label: messages.colors.defaultHighlight, value: null },
    { id: "yellow", label: messages.colors.yellowHighlight, value: "#fef08a" },
    { id: "green", label: messages.colors.greenHighlight, value: "#bbf7d0" },
    { id: "blue", label: messages.colors.blueHighlight, value: "#bfdbfe" },
    { id: "pink", label: messages.colors.pinkHighlight, value: "#fbcfe8" },
    { id: "purple", label: messages.colors.purpleHighlight, value: "#ddd6fe" },
  ];
}

function blockTypeOptions(messages: ReturnType<typeof getSelectionToolbarMessages>): SelectionToolbarMenuState["blockTypes"] {
  return [
    { type: "text", label: messages.blockTypes.text, icon: "text-align-start" },
    { type: "heading-1", label: messages.blockTypes["heading-1"], icon: "heading-1" },
    { type: "heading-2", label: messages.blockTypes["heading-2"], icon: "heading-2" },
    { type: "heading-3", label: messages.blockTypes["heading-3"], icon: "heading-3" },
    { type: "heading-4", label: messages.blockTypes["heading-4"], icon: "heading-4" },
    { type: "heading-5", label: messages.blockTypes["heading-5"], icon: "heading-5" },
    { type: "heading-6", label: messages.blockTypes["heading-6"], icon: "heading-6" },
  ];
}

function blockButton(blockType: SelectionToolbarBlockType, messages: ReturnType<typeof getSelectionToolbarMessages>): SelectionToolbarButton {
  return blockType === "text"
    ? { id: "block-type", label: messages.buttons.blockType, icon: "text-align-start" }
    : {
        id: "block-type",
        label: messages.buttons.blockType,
        icon: blockType,
        text: `H${blockType.slice("heading-".length)}`,
      };
}

function defaultButtons(
  messages: ReturnType<typeof getSelectionToolbarMessages>,
  blockType: SelectionToolbarBlockType
): SelectionToolbarButton[] {
  return [
    blockButton(blockType, messages),
    { id: "bold", label: messages.buttons.bold, icon: "bold" },
    { id: "italic", label: messages.buttons.italic, icon: "italic" },
    { id: "strike", label: messages.buttons.strike, icon: "strikethrough" },
    { id: "underline", label: messages.buttons.underline, icon: "underline" },
    { id: "code", label: messages.buttons.code, icon: "code" },
    { id: "highlight", label: messages.buttons.highlight, icon: "highlighter" },
    { id: "color", label: messages.buttons.color, icon: "baseline" },
    { id: "link", label: messages.buttons.link, icon: "link" },
    { id: "ordered-list", label: messages.buttons.orderedList, icon: "list-ordered" },
    { id: "unordered-list", label: messages.buttons.unorderedList, icon: "list" },
    { id: "task-list", label: messages.buttons.taskList, icon: "list-todo" },
  ];
}

function isValidUrl(value: string): boolean {
  return /^(https?:\/\/|www\.)[^\s]+$/i.test(value);
}

function normalizedUrl(value: string): string {
  return value.startsWith("http") ? value : `https://${value}`;
}

function floatingSizeForPanel(panel: SelectionToolbarPanel): { width: number; height: number } {
  if (panel === "toolbar" || panel === "block-type") return { width: toolbarWidth, height: toolbarHeight };
  if (panel === "link") return { width: panelWidth, height: linkPanelHeight };
  return { width: panelWidth, height: palettePanelHeight };
}

function boundaryFromRect(rect: DOMRect): SelectionToolbarBoundary {
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
  };
}

class SelectionToolbarViewPlugin {
  private menu: HTMLElement | null = null;
  private panel: SelectionToolbarPanel = "toolbar";
  private savedRange: { from: number; to: number; text: string } | null = null;
  private selectionAnchor: SelectionToolbarAnchorRect | null = null;
  private link: SelectionToolbarLinkState = { title: "", url: "", canRemove: false };
  private renderVersion = 0;

  private readonly messages;

  constructor(
    private readonly view: EditorView,
    private readonly config: MardoraSelectionToolbarRuntimeConfig
  ) {
    const locale = resolveMardoraLocale(config.locale ?? config.inheritedLocale);
    this.messages = getSelectionToolbarMessages(locale);
    this.view.dom.ownerDocument.addEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.view.dom.ownerDocument.addEventListener("selectionchange", this.handleDocumentSelectionChange);
    this.updateState();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged) {
      this.updateState();
    }
  }

  destroy(): void {
    this.view.dom.ownerDocument.removeEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.view.dom.ownerDocument.removeEventListener("selectionchange", this.handleDocumentSelectionChange);
    this.removeMenu();
  }

  closeFromKeyboard(): boolean {
    if (!this.menu) return false;
    if (this.panel !== "toolbar") {
      this.panel = "toolbar";
      this.renderMenu();
      return true;
    }
    this.close();
    return true;
  }

  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    if (!this.menu) return;
    const target = event.target;
    if (target instanceof Node && (this.menu.contains(target) || this.view.dom.contains(target))) return;
    this.close();
  };

  private readonly handleDocumentSelectionChange = (): void => {
    const doc = this.view.dom.ownerDocument;
    const activeElement = doc.activeElement;
    if (this.menu && activeElement instanceof Node && this.menu.contains(activeElement)) return;
    if (!this.view.hasFocus || this.view.dom.classList.contains("cm-mardora-slash-open")) return;

    const selection = doc.getSelection();
    if (!selection || !selection.anchorNode || !selection.focusNode) return;
    if (
      !canActivateFromNativeSelection({
        editorSelectionEmpty: this.view.state.selection.main.empty,
        nativeSelectionCollapsed: selection.isCollapsed,
        anchorInEditor: this.view.contentDOM.contains(selection.anchorNode),
        focusInEditor: this.view.contentDOM.contains(selection.focusNode),
        rangeCount: selection.rangeCount,
        anchorExcluded: hasSelectionToolbarExcludedAncestor(selection.anchorNode, this.view.contentDOM),
        focusExcluded: hasSelectionToolbarExcludedAncestor(selection.focusNode, this.view.contentDOM),
      })
    ) {
      return;
    }

    let anchor: number;
    let head: number;
    try {
      anchor = this.view.posAtDOM(selection.anchorNode, selection.anchorOffset);
      head = this.view.posAtDOM(selection.focusNode, selection.focusOffset);
    } catch {
      return;
    }
    const from = Math.min(anchor, head);
    const to = Math.max(anchor, head);
    if (from === to) return;
    if (this.selectionTouchesExcludedSyntax(from, to)) return;

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    this.savedRange = {
      from,
      to,
      text: this.view.state.sliceDoc(from, to),
    };
    this.selectionAnchor = {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    };
    this.renderMenu();
  };

  private updateState(): void {
    const selection = this.view.state.selection.main;
    if (this.view.dom.classList.contains("cm-mardora-slash-open")) {
      this.close();
      return;
    }
    if (!this.view.hasFocus) {
      if (this.isMenuActive() && this.savedRange) return;
      this.close();
      return;
    }
    if (selection.empty) {
      this.close();
      return;
    }
    if (this.selectionTouchesExcludedSyntax(selection.from, selection.to)) {
      this.close();
      return;
    }

    this.savedRange = {
      from: selection.from,
      to: selection.to,
      text: this.view.state.sliceDoc(selection.from, selection.to),
    };
    this.selectionAnchor = null;
    this.renderMenu();
  }

  private isMenuActive(): boolean {
    const activeElement = this.view.dom.ownerDocument.activeElement;
    return !!this.menu && activeElement instanceof Node && this.menu.contains(activeElement);
  }

  private selectionTouchesExcludedSyntax(from: number, to: number): boolean {
    let excluded = false;
    syntaxTree(this.view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (
          selectionOverlapsExcludedSyntaxNode({
            selectionFrom: from,
            selectionTo: to,
            nodeFrom: node.from,
            nodeTo: node.to,
            nodeName: node.name,
          })
        ) {
          excluded = true;
          return false;
        }
        return undefined;
      },
    });
    return excluded;
  }

  private close(): void {
    this.panel = "toolbar";
    this.savedRange = null;
    this.selectionAnchor = null;
    this.removeMenu();
  }

  private removeMenu(): void {
    this.renderVersion += 1;
    this.detachMenu();
  }

  private detachMenu(): void {
    this.menu?.remove();
    this.menu = null;
  }

  private menuState(): SelectionToolbarMenuState {
    const range = this.savedRange;
    const blockType = range
      ? detectSelectionBlockType({ doc: this.view.state.doc.toString(), from: range.from, to: range.to })
      : "text";
    return {
      panel: this.panel,
      buttons: defaultButtons(this.messages, blockType),
      blockType,
      blockTypes: blockTypeOptions(this.messages),
      textColors: textColors(this.messages),
      highlightColors: highlightColors(this.messages),
      link: this.link,
      messages: this.messages,
    };
  }

  private renderMenu(): void {
    const range = this.savedRange;
    if (!range) return;
    const renderVersion = ++this.renderVersion;
    const floating = floatingSizeForPanel(this.panel);
    this.detachMenu();
    const anchorFromSelection = this.selectionAnchor;

    this.view.requestMeasure({
      read: (view) => {
        const boundary = boundaryFromRect(view.dom.getBoundingClientRect());
        if (anchorFromSelection) return { anchor: anchorFromSelection, boundary };
        const from = view.coordsAtPos(range.from);
        const to = view.coordsAtPos(range.to);
        if (!from || !to) return null;
        const anchor = {
          left: Math.min(from.left, to.left),
          right: Math.max(from.right, to.right),
          top: Math.min(from.top, to.top),
          bottom: Math.max(from.bottom, to.bottom),
        };
        return { anchor, boundary };
      },
      write: (measure) => {
        if (renderVersion !== this.renderVersion || !measure) return;
        const win = this.view.dom.ownerDocument.defaultView ?? window;
        const layout = computeSelectionToolbarLayout({
          anchor: measure.anchor,
          viewport: { width: win.innerWidth, height: win.innerHeight },
          boundary: measure.boundary,
          floating,
        });
        this.menu = createSelectionToolbarElement(this.menuState(), {
          onAction: (id) => this.handleAction(id),
          onBlockType: (type) => this.applyBlockType(type),
          onColor: (value) => this.applyColor(value),
          onHighlight: (value) => this.applyHighlight(value),
          onLinkInput: (field, value) => {
            const next = { ...this.link, [field]: value };
            delete next.error;
            this.link = next;
          },
          onLinkSubmit: () => this.submitLink(),
          onLinkCopy: () => void this.copyLink(),
          onLinkOpen: () => this.openLink(),
          onLinkRemove: () => this.removeLink(),
          onCancelPanel: () => {
            this.panel = "toolbar";
            this.renderMenu();
          },
        });
        this.menu.style.left = `${layout.left}px`;
        this.menu.style.top = `${layout.top}px`;
        this.menu.style.maxHeight = `${layout.maxHeight}px`;
        this.menu.dataset.mardoraSelectionPlacement = layout.placement;
        if (this.panel === "block-type") {
          const opensDown = layout.placement === "bottom";
          const available = opensDown
            ? measure.boundary.bottom - (layout.top + toolbarHeight) - popoverGap
            : layout.top - measure.boundary.top - popoverGap;
          this.menu.style.setProperty(
            "--mardora-selection-toolbar-popover-max-height",
            `${Math.max(96, Math.min(blockTypePanelHeight, Math.floor(available)))}px`
          );
        }
        this.view.dom.appendChild(this.menu);
      },
    });
  }

  private dispatchResult(result: TextCommandResult): void {
    if (!this.isSavedRangeCurrent()) {
      this.close();
      return;
    }

    this.view.dispatch({
      changes: result.changes,
      selection: result.selection,
      scrollIntoView: true,
    });
    this.view.focus();
    this.close();
  }

  private isSavedRangeCurrent(): boolean {
    if (!this.savedRange) return false;
    return this.view.state.sliceDoc(this.savedRange.from, this.savedRange.to) === this.savedRange.text;
  }

  private handleAction(id: SelectionToolbarActionId): void {
    const range = this.savedRange;
    if (!range) return;
    const doc = this.view.state.doc.toString();

    if (id === "link") {
      const parsed = parseSelectedLink(range.text);
      this.link = { title: parsed.title || range.text, url: parsed.url, canRemove: parsed.kind === "markdown-link" };
      this.panel = "link";
      this.renderMenu();
      return;
    }

    if (id === "block-type") {
      this.panel = "block-type";
      this.renderMenu();
      return;
    }

    if (id === "color") {
      this.panel = "color";
      this.renderMenu();
      return;
    }

    if (id === "highlight") {
      this.panel = "highlight";
      this.renderMenu();
      return;
    }

    if (id === "ordered-list" || id === "unordered-list" || id === "task-list") {
      const kind = id === "ordered-list" ? "ordered" : id === "task-list" ? "task" : "unordered";
      this.dispatchResult(buildListChange({ doc, from: range.from, to: range.to, kind }));
      return;
    }

    if (id === "underline") {
      this.dispatchResult(buildInlineFormatChange({ doc, from: range.from, to: range.to, htmlTag: "u" }));
      return;
    }

    const marker = id === "bold" ? "**" : id === "italic" ? "*" : id === "strike" ? "~~" : id === "code" ? "`" : null;
    if (!marker) return;
    const result = buildInlineFormatChange({ doc, from: range.from, to: range.to, marker });
    this.dispatchResult(result);
  }

  private applyBlockType(type: SelectionToolbarBlockType): void {
    const range = this.savedRange;
    if (!range) return;
    const level = type === "text" ? 0 : Number(type.slice("heading-".length));
    if (level < 0 || level > 6) return;
    this.dispatchResult(
      buildBlockTypeChange({
        doc: this.view.state.doc.toString(),
        from: range.from,
        to: range.to,
        level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      })
    );
  }

  private applyColor(value: string | null): void {
    const range = this.savedRange;
    if (!range) return;
    this.dispatchResult(
      buildInlineFormatChange({
        doc: this.view.state.doc.toString(),
        from: range.from,
        to: range.to,
        spanStyle: { property: "color", value: value ?? "" },
        clear: value === null,
      })
    );
  }

  private applyHighlight(value: string | null): void {
    const range = this.savedRange;
    if (!range) return;
    const result = value
      ? buildInlineFormatChange({
          doc: this.view.state.doc.toString(),
          from: range.from,
          to: range.to,
          spanStyle: { property: "background-color", value },
        })
      : buildInlineFormatChange({ doc: this.view.state.doc.toString(), from: range.from, to: range.to, marker: "==" });
    this.dispatchResult(result);
  }

  private submitLink(): void {
    const range = this.savedRange;
    if (!range) return;
    if (!this.link.url || !isValidUrl(this.link.url)) {
      this.link = { ...this.link, error: this.messages.link.invalid };
      this.renderMenu();
      return;
    }
    const title = this.link.title || range.text || this.link.url;
    this.dispatchResult(buildLinkChange({ from: range.from, to: range.to, title, url: this.link.url }));
  }

  private removeLink(): void {
    const range = this.savedRange;
    if (!range) return;
    this.dispatchResult(
      buildLinkChange({ from: range.from, to: range.to, title: this.link.title || range.text, url: "", remove: true })
    );
  }

  private async copyLink(): Promise<void> {
    if (!this.link.url) return;
    await this.view.dom.ownerDocument.defaultView?.navigator.clipboard?.writeText(this.link.url);
    this.link = { ...this.link, copied: true };
    this.renderMenu();
  }

  private openLink(): void {
    if (!this.link.url || !isValidUrl(this.link.url)) return;
    this.view.dom.ownerDocument.defaultView?.open(normalizedUrl(this.link.url), "_blank", "noopener,noreferrer");
  }
}

export function selectionToolbar(config: MardoraSelectionToolbarRuntimeConfig = {}): Extension[] {
  if (config.enabled === false) return [];
  const plugin = ViewPlugin.define((view) => new SelectionToolbarViewPlugin(view, config));
  return [
    selectionToolbarTheme,
    plugin,
    Prec.highest(
      EditorView.domEventHandlers({
        keydown(event, view) {
          const value = view.plugin(plugin);
          if (!value || event.key !== "Escape") return false;
          const handled = value.closeFromKeyboard();
          if (handled) event.preventDefault();
          return handled;
        },
      })
    ),
  ];
}
