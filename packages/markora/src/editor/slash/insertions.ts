import type { ChangeSpec } from "@codemirror/state";
import type { MarkoraSlashQuery } from "./types";

export type MarkoraSlashReplacementTemplate = {
  marker: string;
  cursorOffset: number;
};

export type MarkoraSlashReplacement = {
  changes: ChangeSpec;
  selectionAnchor: number;
};

export function buildSlashReplacement(
  template: MarkoraSlashReplacementTemplate,
  query: MarkoraSlashQuery
): MarkoraSlashReplacement {
  return {
    changes: {
      from: query.from,
      to: query.to,
      insert: template.marker,
    },
    selectionAnchor: query.from + template.cursorOffset,
  };
}
