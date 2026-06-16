import { Extension, Prec } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { buildInlineFormatChange, buildLinkChange, buildListChange, parseSelectedLink } from "./commands";
import { createSelectionToolbarElement } from "./menu";
import { computeSelectionToolbarLayout } from "./position";
import { selectionToolbarTheme } from "./theme";
import type {
  DraftlySelectionToolbarConfig,
  SelectionToolbarActionId,
  SelectionToolbarButton,
  SelectionToolbarLinkState,
  SelectionToolbarMenuState,
  SelectionToolbarPaletteItem,
  SelectionToolbarPanel,
  TextCommandResult,
} from "./types";

const toolbarWidth = 392;
const toolbarHeight = 40;
const panelWidth = 336;
const panelHeight = 178;

const textColors: SelectionToolbarPaletteItem[] = [
  { id: "default", label: "默认文字颜色", value: null },
  { id: "gray", label: "灰色", value: "#71717a" },
  { id: "red", label: "红色", value: "#dc2626" },
  { id: "orange", label: "橙色", value: "#ea580c" },
  { id: "yellow", label: "黄色", value: "#ca8a04" },
  { id: "green", label: "绿色", value: "#16a34a" },
  { id: "blue", label: "蓝色", value: "#2563eb" },
  { id: "purple", label: "紫色", value: "#7c3aed" },
];

const highlightColors: SelectionToolbarPaletteItem[] = [
  { id: "default", label: "默认高亮", value: null },
  { id: "yellow", label: "黄色高亮", value: "#fef08a" },
  { id: "green", label: "绿色高亮", value: "#bbf7d0" },
  { id: "blue", label: "蓝色高亮", value: "#bfdbfe" },
  { id: "pink", label: "粉色高亮", value: "#fbcfe8" },
  { id: "purple", label: "紫色高亮", value: "#ddd6fe" },
];

function defaultButtons(): SelectionToolbarButton[] {
  return [
    { id: "bold", label: "加粗", icon: "bold" },
    { id: "italic", label: "斜体", icon: "italic" },
    { id: "strike", label: "删除线", icon: "strikethrough" },
    { id: "underline", label: "下划线", icon: "underline" },
    { id: "code", label: "行内代码", icon: "code" },
    { id: "highlight", label: "高亮", icon: "highlighter" },
    { id: "color", label: "文字颜色", icon: "baseline" },
    { id: "link", label: "链接", icon: "link" },
    { id: "ordered-list", label: "有序列表", icon: "list-ordered" },
    { id: "unordered-list", label: "无序列表", icon: "list" },
    { id: "task-list", label: "任务列表", icon: "list-todo" },
  ];
}

function isValidUrl(value: string): boolean {
  return /^(https?:\/\/|www\.)[^\s]+$/i.test(value);
}

function normalizedUrl(value: string): string {
  return value.startsWith("http") ? value : `https://${value}`;
}

class SelectionToolbarViewPlugin {
  private menu: HTMLElement | null = null;
  private panel: SelectionToolbarPanel = "toolbar";
  private savedRange: { from: number; to: number; text: string } | null = null;
  private link: SelectionToolbarLinkState = { title: "", url: "", canRemove: false };
  private renderVersion = 0;

  constructor(private readonly view: EditorView) {
    this.view.dom.ownerDocument.addEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.updateState();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged) {
      this.updateState();
    }
  }

  destroy(): void {
    this.view.dom.ownerDocument.removeEventListener("mousedown", this.handleDocumentMouseDown, true);
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

  private updateState(): void {
    const selection = this.view.state.selection.main;
    if (selection.empty || !this.view.hasFocus || this.view.dom.classList.contains("cm-draftly-slash-open")) {
      this.close();
      return;
    }

    this.savedRange = {
      from: selection.from,
      to: selection.to,
      text: this.view.state.sliceDoc(selection.from, selection.to),
    };
    this.renderMenu();
  }

  private close(): void {
    this.panel = "toolbar";
    this.savedRange = null;
    this.removeMenu();
  }

  private removeMenu(): void {
    this.renderVersion += 1;
    this.menu?.remove();
    this.menu = null;
  }

  private menuState(): SelectionToolbarMenuState {
    return {
      panel: this.panel,
      buttons: defaultButtons(),
      textColors,
      highlightColors,
      link: this.link,
    };
  }

  private renderMenu(): void {
    const range = this.savedRange;
    if (!range) return;
    const renderVersion = ++this.renderVersion;
    const floating =
      this.panel === "toolbar" ? { width: toolbarWidth, height: toolbarHeight } : { width: panelWidth, height: panelHeight };
    this.removeMenu();

    this.view.requestMeasure({
      read: (view) => {
        const from = view.coordsAtPos(range.from);
        const to = view.coordsAtPos(range.to);
        if (!from || !to) return null;
        return {
          left: Math.min(from.left, to.left),
          right: Math.max(from.right, to.right),
          top: Math.min(from.top, to.top),
          bottom: Math.max(from.bottom, to.bottom),
        };
      },
      write: (anchor) => {
        if (renderVersion !== this.renderVersion || !anchor) return;
        const win = this.view.dom.ownerDocument.defaultView ?? window;
        const layout = computeSelectionToolbarLayout({
          anchor,
          viewport: { width: win.innerWidth, height: win.innerHeight },
          floating,
        });
        this.menu = createSelectionToolbarElement(this.menuState(), {
          onAction: (id) => this.handleAction(id),
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
        this.menu.dataset.draftlySelectionPlacement = layout.placement;
        this.view.dom.appendChild(this.menu);
      },
    });
  }

  private dispatchResult(result: TextCommandResult): void {
    this.view.dispatch({
      changes: result.changes,
      selection: result.selection,
      scrollIntoView: true,
    });
    this.view.focus();
    this.close();
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

  private applyColor(value: string | null): void {
    const range = this.savedRange;
    if (!range || !value) return;
    this.dispatchResult(
      buildInlineFormatChange({
        doc: this.view.state.doc.toString(),
        from: range.from,
        to: range.to,
        spanStyle: { property: "color", value },
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
      this.link = { ...this.link, error: "请输入有效链接" };
      this.renderMenu();
      return;
    }
    const title = this.link.title || range.text || this.link.url;
    this.dispatchResult(buildLinkChange({ from: range.from, to: range.to, title, url: this.link.url }));
  }

  private removeLink(): void {
    const range = this.savedRange;
    if (!range) return;
    this.dispatchResult(buildLinkChange({ from: range.from, to: range.to, title: this.link.title || range.text, url: "", remove: true }));
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

export function selectionToolbar(config: DraftlySelectionToolbarConfig = {}): Extension[] {
  if (config.enabled === false) return [];
  const plugin = ViewPlugin.define((view) => new SelectionToolbarViewPlugin(view));
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
