import type { DraftlyNode } from "draftly/editor";

export type PlaygroundMode = "live" | "view" | "code" | "output";
export type SaveStatus = "idle" | "saving" | "saved";
export type ThemeMode = "light" | "dark";
export type ThemePreference = "system" | ThemeMode;
export type PluginConfig = Record<string, boolean>;

export interface Content {
  id: string;
  title: string;
  content: string;
}

export interface PlaygroundConfig {
  editor: {
    baseStyles: boolean;
    defaultKeybindings: boolean;
    history: boolean;
    indentWithTab: boolean;
    highlightActiveLine: boolean;
    lineWrapping: boolean;
  };
  preview: {
    includeBase: boolean;
    sanitize: boolean;
  };
  features: {
    slashCommands: boolean;
    attachments: boolean;
    pasteDropUploads: boolean;
    tableOfContents: boolean;
  };
  plugins: PluginConfig;
}

export interface PreviewOutput {
  html: string;
  css: string;
}

export interface PlaygroundStateSnapshot {
  contents: Content[];
  currentContent: number;
  version: number;
}

export interface ContentMetrics {
  words: number;
  lines: number;
  chars: number;
}

export type NodesChangeHandler = (nodes: DraftlyNode[]) => void;
