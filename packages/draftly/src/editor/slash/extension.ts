import { Extension, Prec } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { DraftlyAttachmentKind, DraftlyAttachmentUploader } from "../attachments";
import { uploadAttachmentFile } from "../attachments";
import { defaultSlashCommands } from "./default-commands";
import { createSlashMenuElement } from "./menu";
import { detectSlashQuery, filterSlashCommands } from "./query";
import { slashMenuTheme } from "./theme";
import type { DraftlySlashCommand, DraftlySlashCommandsConfig, DraftlySlashQuery } from "./types";

export type DraftlySlashRuntimeConfig = DraftlySlashCommandsConfig & {
  attachmentUploader?: DraftlyAttachmentUploader | undefined;
};

function requestFile(kind: DraftlyAttachmentKind): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = kind === "image" ? "image/*" : kind === "video" ? "video/*" : kind === "audio" ? "audio/*" : "*/*";
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.click();
  });
}

class SlashCommandViewPlugin {
  private query: DraftlySlashQuery | null = null;
  private commands: DraftlySlashCommand[] = [];
  private activeIndex = 0;
  private menu: HTMLElement | null = null;
  private renderVersion = 0;
  private previousCaretColor: string | null = null;

  constructor(
    private readonly view: EditorView,
    private readonly config: Required<Pick<DraftlySlashRuntimeConfig, "commands">> & DraftlySlashRuntimeConfig
  ) {
    this.updateState();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet || update.viewportChanged) {
      this.updateState();
    }
  }

  destroy(): void {
    this.renderVersion += 1;
    this.removeMenu();
  }

  move(delta: number): boolean {
    if (!this.query || this.commands.length === 0) return false;
    this.activeIndex = (this.activeIndex + delta + this.commands.length) % this.commands.length;
    this.renderMenu();
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

  private requestAttachment(kind: DraftlyAttachmentKind, queryRange: { from: number; to: number }): boolean {
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
          { commands: this.commands, activeIndex: this.activeIndex },
          {
            onHover: (index) => {
              this.activeIndex = index;
              this.renderMenu();
            },
            onSelect: (index) => {
              this.select(index);
            },
          }
        );

        this.menu.style.left = `${coords.left}px`;
        this.menu.style.top = `${coords.bottom + 6}px`;
        this.view.dom.classList.add("cm-draftly-slash-open");
        this.hideEditorCaret();
        this.view.dom.appendChild(this.menu);
      },
    });
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
    this.view.dom.classList.remove("cm-draftly-slash-open");
    this.restoreEditorCaret();
  }
}

export function slashCommands(config: DraftlySlashRuntimeConfig = {}): Extension[] {
  if (config.enabled === false) {
    return [];
  }

  const normalizedConfig = {
    commands: config.commands ?? defaultSlashCommands,
    attachmentUploader: config.attachmentUploader,
  };

  const plugin = ViewPlugin.define((view) => new SlashCommandViewPlugin(view, normalizedConfig));

  return [
    slashMenuTheme,
    plugin,
    Prec.highest(
      EditorView.domEventHandlers({
        keydown(event, view) {
          const value = view.plugin(plugin);
          if (!value) return false;

          if (event.key === "ArrowDown") {
            const handled = value.move(1);
            if (handled) event.preventDefault();
            return handled;
          }

          if (event.key === "ArrowUp") {
            const handled = value.move(-1);
            if (handled) event.preventDefault();
            return handled;
          }

          if (event.key === "Enter") {
            const handled = value.selectActive();
            if (handled) event.preventDefault();
            return handled;
          }

          if (event.key === "Escape") {
            const handled = value.close();
            if (handled) event.preventDefault();
            return handled;
          }

          return false;
        },
      })
    ),
  ];
}
