import type { EditorView } from "@codemirror/view";
import type { DraftlyAttachmentKind } from "../attachments";

export type DraftlySlashCommandGroup = "basic" | "media";

export type DraftlySlashCommandContext = {
  view: EditorView;
  queryRange: { from: number; to: number };
  requestAttachment?: (kind: DraftlyAttachmentKind, context: DraftlySlashCommandContext) => boolean;
};

export type DraftlySlashCommand = {
  id: string;
  group: DraftlySlashCommandGroup;
  title: string;
  aliases: string[];
  icon: string;
  hint: string;
  run: (context: DraftlySlashCommandContext) => boolean;
};

export type DraftlySlashQuery = {
  from: number;
  to: number;
  query: string;
};

export type DraftlySlashCommandsConfig = {
  enabled?: boolean;
  commands?: DraftlySlashCommand[];
};
