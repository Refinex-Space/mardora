import { Extension, Prec } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { MarkoraAttachmentKind, MarkoraAttachmentUploader } from "../attachments";
import { uploadAttachmentFile } from "../attachments";
import type { MarkoraLocale } from "../i18n";
import { resolveMarkoraLocale } from "../i18n";
import { getDefaultSlashCommands } from "./default-commands";
import { createSlashMenuElement, getSlashMessages } from "./menu";
import { computeSlashMenuLayout } from "./position";
import { detectSlashQuery, filterSlashCommands } from "./query";
import { slashMenuTheme } from "./theme";
import type { MarkoraSlashCommand, MarkoraSlashCommandsConfig, MarkoraSlashMessages, MarkoraSlashQuery } from "./types";

export type MarkoraSlashRuntimeConfig = MarkoraSlashCommandsConfig & {
  attachmentUploader?: MarkoraAttachmentUploader | undefined;
  inheritedLocale?: MarkoraLocale | undefined;
};

export type ResolvedMarkoraSlashRuntimeConfig = Required<Pick<MarkoraSlashRuntimeConfig, "commands">> &
  MarkoraSlashRuntimeConfig & {
    locale: MarkoraLocale;
    messages: MarkoraSlashMessages;
  };

export function createSlashRuntimeConfig(config: MarkoraSlashRuntimeConfig = {}): ResolvedMarkoraSlashRuntimeConfig {
  const locale = resolveMarkoraLocale(config.locale ?? config.inheritedLocale);
  return {
    ...config,
    locale,
    commands: config.commands ?? getDefaultSlashCommands(locale),
    messages: getSlashMessages(locale),
  };
}

function requestFile(kind: MarkoraAttachmentKind): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = kind === "image" ? "image/*" : kind === "video" ? "video/*" : kind === "audio" ? "audio/*" : "*/*";
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.click();
  });
}

class SlashCommandViewPlugin {
  private query: MarkoraSlashQuery | null = null;
  private commands: MarkoraSlashCommand[] = [];
  private activeIndex = 0;
  private menu: HTMLElement | null = null;
  private renderVersion = 0;
  private previousCaretColor: string | null = null;

  constructor(
    private readonly view: EditorView,
    private readonly config: ResolvedMarkoraSlashRuntimeConfig
  ) {
    this.view.dom.ownerDocument.addEventListener("keydown", this.handleDocumentKeydown, true);
    this.updateState();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet || update.viewportChanged) {
      this.updateState();
    }
  }

  destroy(): void {
    this.view.dom.ownerDocument.removeEventListener("keydown", this.handleDocumentKeydown, true);
    this.renderVersion += 1;
    this.removeMenu();
  }

  move(delta: number): boolean {
    if (!this.query || this.commands.length === 0) return false;
    this.activeIndex = (this.activeIndex + delta + this.commands.length) % this.commands.length;
    this.syncActiveItem("center");
    return true;
  }

  close(): boolean {
    if (!this.query) return false;
    this.query = null;
    this.commands = [];
    this.renderVersion += 1;
    this.removeMenu();
    return true;
  }

  selectActive(): boolean {
    if (!this.query || this.commands.length === 0) return false;
    return this.select(this.activeIndex);
  }

  handleKeydown(event: KeyboardEvent): boolean {
    if (event.key === "ArrowDown") {
      return this.move(1);
    }

    if (event.key === "ArrowUp") {
      return this.move(-1);
    }

    if (event.key === "Enter") {
      return this.selectActive();
    }

    if (event.key === "Escape") {
      return this.close();
    }

    return false;
  }

  private select(index: number): boolean {
    const command = this.commands[index];
    if (!this.query || !command) return false;

    const queryRange = { from: this.query.from, to: this.query.to };
    this.close();

    return command.run({
      view: this.view,
      queryRange,
      requestAttachment: (kind, context) => this.requestAttachment(kind, context.queryRange),
    });
  }

  private requestAttachment(kind: MarkoraAttachmentKind, queryRange: { from: number; to: number }): boolean {
    if (!this.config.attachmentUploader) {
      return false;
    }

    void requestFile(kind).then((file) => {
      if (!file || !this.config.attachmentUploader) return;
      void uploadAttachmentFile(this.view, file, {
        kind,
        source: "slash",
        range: queryRange,
        uploader: this.config.attachmentUploader,
      });
    });

    return true;
  }

  private readonly handleDocumentKeydown = (event: KeyboardEvent): void => {
    if (!this.query || event.defaultPrevented) return;

    const handled = this.handleKeydown(event);
    if (!handled) return;

    event.preventDefault();
    event.stopPropagation();
  };

  private updateState(): void {
    const cursor = this.view.state.selection.main.head;
    const query = detectSlashQuery(this.view.state.doc.toString(), cursor);

    if (!query) {
      this.query = null;
      this.commands = [];
      this.renderVersion += 1;
      this.removeMenu();
      return;
    }

    if (!this.query || this.query.query !== query.query || this.query.from !== query.from) {
      this.activeIndex = 0;
    }

    this.query = query;
    this.commands = filterSlashCommands(this.config.commands, query.query);
    this.activeIndex = Math.min(this.activeIndex, Math.max(0, this.commands.length - 1));
    this.renderMenu();
  }

  private renderMenu(): void {
    if (!this.query) return;
    const renderVersion = ++this.renderVersion;
    const queryFrom = this.query.from;
    this.removeMenu();

    this.view.requestMeasure({
      read: (view) => view.coordsAtPos(queryFrom),
      write: (coords) => {
        if (renderVersion !== this.renderVersion || !this.query || !coords) return;

        this.removeMenu();
        this.menu = createSlashMenuElement(
          { commands: this.commands, activeIndex: this.activeIndex, messages: this.config.messages },
          {
            onHover: (index) => {
              this.activeIndex = index;
              this.syncActiveItem("nearest");
            },
            onSelect: (index) => {
              this.select(index);
            },
          }
        );

        const layout = computeSlashMenuLayout({
          anchor: { left: coords.left, top: coords.top, bottom: coords.bottom },
          viewport: {
            width: this.view.dom.ownerDocument.defaultView?.innerWidth ?? window.innerWidth,
            height: this.view.dom.ownerDocument.defaultView?.innerHeight ?? window.innerHeight,
          },
        });
        this.menu.dataset.markoraSlashPlacement = layout.placement;
        this.menu.style.left = `${layout.left}px`;
        this.menu.style.maxHeight = `${layout.maxHeight}px`;
        this.menu.style.top = layout.top === null ? "" : `${layout.top}px`;
        this.menu.style.bottom = layout.bottom === null ? "" : `${layout.bottom}px`;
        this.view.dom.classList.add("cm-markora-slash-open");
        this.hideEditorCaret();
        this.view.dom.appendChild(this.menu);
        this.syncActiveItem("nearest");
      },
    });
  }

  private syncActiveItem(scrollMode: "center" | "nearest"): void {
    if (!this.menu) return;

    const items = this.menu.querySelectorAll<HTMLElement>(".cm-markora-slash-item");
    let activeItem: HTMLElement | null = null;

    items.forEach((item) => {
      const itemIndex = Number(item.dataset.markoraSlashIndex);
      const isActive = itemIndex === this.activeIndex;
      item.classList.toggle("cm-markora-slash-item-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
      if (isActive) {
        activeItem = item;
      }
    });

    if (activeItem) {
      this.scrollActiveItemIntoView(activeItem, scrollMode);
    }
  }

  private scrollActiveItemIntoView(activeItem: HTMLElement, mode: "center" | "nearest"): void {
    const list = this.menu?.querySelector<HTMLElement>(".cm-markora-slash-list");
    if (!list) return;

    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;
    const visibleTop = list.scrollTop;
    const visibleBottom = visibleTop + list.clientHeight;

    if (mode === "center") {
      list.scrollTop = itemTop - (list.clientHeight - activeItem.offsetHeight) / 2;
      return;
    }

    if (itemTop < visibleTop) {
      list.scrollTop = itemTop;
      return;
    }

    if (itemBottom > visibleBottom) {
      list.scrollTop = itemBottom - list.clientHeight;
    }
  }

  private hideEditorCaret(): void {
    if (this.previousCaretColor === null) {
      this.previousCaretColor = this.view.contentDOM.style.caretColor;
    }
    this.view.contentDOM.style.caretColor = "transparent";
  }

  private restoreEditorCaret(): void {
    if (this.previousCaretColor === null) return;
    this.view.contentDOM.style.caretColor = this.previousCaretColor;
    this.previousCaretColor = null;
  }

  private removeMenu(): void {
    this.menu?.remove();
    this.menu = null;
    this.view.dom.classList.remove("cm-markora-slash-open");
    this.restoreEditorCaret();
  }
}

export function slashCommands(config: MarkoraSlashRuntimeConfig = {}): Extension[] {
  if (config.enabled === false) {
    return [];
  }

  const normalizedConfig = createSlashRuntimeConfig(config);

  const plugin = ViewPlugin.define((view) => new SlashCommandViewPlugin(view, normalizedConfig));

  return [
    slashMenuTheme,
    plugin,
    Prec.highest(
      EditorView.domEventHandlers({
        keydown(event, view) {
          const value = view.plugin(plugin);
          if (!value) return false;

          const handled = value.handleKeydown(event);
          if (handled) event.preventDefault();
          return handled;
        },
      })
    ),
  ];
}
