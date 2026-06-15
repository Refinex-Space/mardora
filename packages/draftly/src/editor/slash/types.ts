import type { EditorView } from "@codemirror/view";

export type DraftlySlashCommandGroup = "basic" | "media";

export type DraftlySlashCommandContext = {
  view: EditorView;
  queryRange: { from: number; to: number };
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
