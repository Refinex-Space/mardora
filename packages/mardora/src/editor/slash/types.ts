import type { EditorView } from "@codemirror/view";
import type { MardoraAttachmentKind } from "../attachments";
import type { MardoraLocale } from "../i18n";

export type MardoraSlashCommandGroup = "basic" | "media";

export type MardoraSlashMessages = {
  groups: Record<MardoraSlashCommandGroup, string>;
  empty: string;
  close: string;
  closeHint: string;
};

export type MardoraSlashCommandContext = {
  view: EditorView;
  queryRange: { from: number; to: number };
  requestAttachment?: (kind: MardoraAttachmentKind, context: MardoraSlashCommandContext) => boolean;
};

export type MardoraSlashCommand = {
  id: string;
  group: MardoraSlashCommandGroup;
  title: string;
  aliases: string[];
  icon: string;
  hint: string;
  run: (context: MardoraSlashCommandContext) => boolean;
};

export type MardoraSlashQuery = {
  from: number;
  to: number;
  query: string;
};

export type MardoraSlashCommandsConfig = {
  enabled?: boolean;
  locale?: MardoraLocale;
  commands?: MardoraSlashCommand[];
};
