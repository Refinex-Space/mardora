import type { ChangeSpec } from "@codemirror/state";
import type { DraftlySlashQuery } from "./types";

export type DraftlySlashReplacementTemplate = {
  marker: string;
  cursorOffset: number;
};

export type DraftlySlashReplacement = {
  changes: ChangeSpec;
  selectionAnchor: number;
};

export function buildSlashReplacement(
  template: DraftlySlashReplacementTemplate,
  query: DraftlySlashQuery
): DraftlySlashReplacement {
  return {
    changes: {
      from: query.from,
      to: query.to,
      insert: template.marker,
    },
    selectionAnchor: query.from + template.cursorOffset,
  };
}
