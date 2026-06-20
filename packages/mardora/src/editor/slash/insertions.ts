import type { ChangeSpec } from "@codemirror/state";
import type { MardoraSlashQuery } from "./types";

export type MardoraSlashReplacementTemplate = {
  marker: string;
  cursorOffset: number;
};

export type MardoraSlashReplacement = {
  changes: ChangeSpec;
  selectionAnchor: number;
};

export function buildSlashReplacement(
  template: MardoraSlashReplacementTemplate,
  query: MardoraSlashQuery
): MardoraSlashReplacement {
  return {
    changes: {
      from: query.from,
      to: query.to,
      insert: template.marker,
    },
    selectionAnchor: query.from + template.cursorOffset,
  };
}
