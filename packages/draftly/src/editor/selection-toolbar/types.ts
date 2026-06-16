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
