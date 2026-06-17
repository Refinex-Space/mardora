import type { MarkoraNode } from "@refinex/markora/editor";

export type PlaygroundMode = "live" | "view" | "code" | "output";
export type SaveStatus = "idle" | "saving" | "saved";
export type ThemeMode = "light" | "dark";
export type ThemePreference = "system" | ThemeMode;
export type PreviewContentWidth = "regular" | "wide";
export type PlaygroundLocale = "zh-CN" | "en-US";
export type PluginConfig = Record<string, boolean>;

export interface Content {
  id: string;
  title: string;
  content: string;
}

export interface PlaygroundConfig {
  locale: PlaygroundLocale;
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
    contentWidth: PreviewContentWidth;
  };
  features: {
    slashCommands: boolean;
    selectionToolbar: boolean;
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

export type NodesChangeHandler = (nodes: MarkoraNode[]) => void;
