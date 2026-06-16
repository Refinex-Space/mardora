import type { EditorView } from "@codemirror/view";
import type { MarkoraAttachmentKind } from "../attachments";
import type { MarkoraLocale } from "../i18n";

export type MarkoraSlashCommandGroup = "basic" | "media";

export type MarkoraSlashMessages = {
  groups: Record<MarkoraSlashCommandGroup, string>;
  empty: string;
  close: string;
  closeHint: string;
};

export type MarkoraSlashCommandContext = {
  view: EditorView;
  queryRange: { from: number; to: number };
  requestAttachment?: (kind: MarkoraAttachmentKind, context: MarkoraSlashCommandContext) => boolean;
};

export type MarkoraSlashCommand = {
  id: string;
  group: MarkoraSlashCommandGroup;
  title: string;
  aliases: string[];
  icon: string;
  hint: string;
  run: (context: MarkoraSlashCommandContext) => boolean;
};

export type MarkoraSlashQuery = {
  from: number;
  to: number;
  query: string;
};

export type MarkoraSlashCommandsConfig = {
  enabled?: boolean;
  locale?: MarkoraLocale;
  commands?: MarkoraSlashCommand[];
};
