import type { DraftlyIconName } from "../icons";

export type DraftlySelectionToolbarConfig = {
  enabled?: boolean;
};

export type SelectionToolbarPlacement = "top" | "bottom";

export type SelectionToolbarAnchorRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type SelectionToolbarViewport = {
  width: number;
  height: number;
};

export type SelectionToolbarFloatingSize = {
  width: number;
  height: number;
};

export type SelectionToolbarLayoutInput = {
  anchor: SelectionToolbarAnchorRect;
  viewport: SelectionToolbarViewport;
  floating: SelectionToolbarFloatingSize;
};

export type SelectionToolbarLayout = {
  placement: SelectionToolbarPlacement;
  left: number;
  top: number;
  maxHeight: number;
};

export type SelectionToolbarActionId =
  | "bold"
  | "italic"
  | "strike"
  | "underline"
  | "code"
  | "highlight"
  | "color"
  | "link"
  | "ordered-list"
  | "unordered-list"
  | "task-list";

export type SelectionToolbarButton = {
  id: SelectionToolbarActionId;
  label: string;
  icon: DraftlyIconName;
  active?: boolean;
};

export type TextChange = {
  from: number;
  to: number;
  insert: string;
};

export type TextSelection = {
  anchor: number;
  head?: number;
};

export type TextCommandResult = {
  changes: TextChange | TextChange[];
  selection?: TextSelection;
};

export type InlineFormatInput = {
  doc: string;
  from: number;
  to: number;
  marker?: string;
  htmlTag?: "u";
  spanStyle?: {
    property: "color" | "background-color";
    value: string;
  };
};

export type ParsedSelectionLink =
  | { kind: "markdown-link"; title: string; url: string }
  | { kind: "url"; title: string; url: string }
  | { kind: "text"; title: string; url: string };

export type LinkChangeInput = {
  from: number;
  to: number;
  title: string;
  url: string;
  remove?: boolean;
};

export type SelectionToolbarListKind = "ordered" | "unordered" | "task";
