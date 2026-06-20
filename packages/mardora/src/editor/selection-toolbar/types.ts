import type { MardoraIconName } from "../icons";
import type { MardoraLocale } from "../i18n";
import type { SelectionToolbarMessages } from "./i18n";

export type MardoraSelectionToolbarConfig = {
  enabled?: boolean;
  locale?: MardoraLocale;
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

export type SelectionToolbarBoundary = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type SelectionToolbarLayoutInput = {
  anchor: SelectionToolbarAnchorRect;
  viewport: SelectionToolbarViewport;
  boundary?: SelectionToolbarBoundary;
  floating: SelectionToolbarFloatingSize;
};

export type SelectionToolbarLayout = {
  placement: SelectionToolbarPlacement;
  left: number;
  top: number;
  maxHeight: number;
};

export type SelectionToolbarActionId =
  | "block-type"
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
  icon: MardoraIconName;
  text?: string;
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
  clear?: boolean;
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
export type SelectionToolbarBlockType = "text" | "heading-1" | "heading-2" | "heading-3" | "heading-4" | "heading-5" | "heading-6";

export type SelectionToolbarPanel = "toolbar" | "link" | "color" | "highlight" | "block-type";

export type SelectionToolbarPaletteItem = {
  id: string;
  label: string;
  value: string | null;
};

export type SelectionToolbarLinkState = {
  title: string;
  url: string;
  canRemove: boolean;
  error?: string;
  copied?: boolean;
};

export type SelectionToolbarMenuState = {
  panel: SelectionToolbarPanel;
  buttons: SelectionToolbarButton[];
  blockType: SelectionToolbarBlockType;
  blockTypes: Array<{ type: SelectionToolbarBlockType; label: string; icon: MardoraIconName }>;
  textColors: SelectionToolbarPaletteItem[];
  highlightColors: SelectionToolbarPaletteItem[];
  link: SelectionToolbarLinkState;
  messages: SelectionToolbarMessages;
};

export type SelectionToolbarMenuCallbacks = {
  onAction: (id: SelectionToolbarActionId) => void;
  onBlockType: (type: SelectionToolbarBlockType) => void;
  onColor: (value: string | null) => void;
  onHighlight: (value: string | null) => void;
  onLinkInput: (field: "title" | "url", value: string) => void;
  onLinkSubmit: () => void;
  onLinkCopy: () => void;
  onLinkOpen: () => void;
  onLinkRemove: () => void;
  onCancelPanel: () => void;
};
