declare module "@refinex/markora/editor" {
  export type MarkoraNode = {
    from: number;
    to: number;
    name: string;
    children: MarkoraNode[];
    isSelected: boolean;
  };

  export interface MarkoraPlugin {
    readonly name: string;
    readonly version: string;
  }

  export type MarkoraTocLevel = 1 | 2 | 3 | 4 | 5 | 6;

  export interface MarkoraTocItem {
    id: string;
    level: MarkoraTocLevel;
    text: string;
    active: boolean;
    from?: number;
    to?: number;
  }

  export interface MarkoraTocConfig {
    enabled?: boolean;
    minLevel?: MarkoraTocLevel;
    maxLevel?: MarkoraTocLevel;
    defaultOpen?: boolean;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    storageKey?: string;
    onTocChange?: (items: MarkoraTocItem[]) => void;
  }

  export enum ThemeEnum {
    DARK = "dark",
    LIGHT = "light",
    AUTO = "auto",
  }

  export function markora(config?: {
    theme?: ThemeEnum;
    locale?: "zh-CN" | "en-US";
    baseStyles?: boolean;
    plugins?: MarkoraPlugin[];
    markdown?: unknown[];
    extensions?: unknown[];
    keymap?: unknown[];
    disableViewPlugin?: boolean;
    defaultKeybindings?: boolean;
    history?: boolean;
    indentWithTab?: boolean;
    highlightActiveLine?: boolean;
    lineWrapping?: boolean;
    slashCommands?: {
      enabled?: boolean;
    };
    selectionToolbar?: {
      enabled?: boolean;
    };
    toc?: MarkoraTocConfig;
    attachments?: {
      enabled?: boolean;
      uploader?: (file: File) => Promise<{
        url: string;
        name?: string;
        mimeType?: string;
      }>;
      enablePaste?: boolean;
      enableDrop?: boolean;
      accept?: {
        image?: string[];
        video?: string[];
        audio?: string[];
        file?: string[];
      };
    };
    onNodesChange?: (nodes: MarkoraNode[]) => void;
  }): any;

  export function tableOfContents(config?: MarkoraTocConfig): unknown;
}

declare module "@refinex/markora/plugins" {
  export const allPlugins: Array<{
    readonly name: string;
    readonly version: string;
  }>;
}

declare module "@refinex/markora/preview" {
  export function preview(
    markdown: string,
    config?: {
      plugins?: Array<{
        readonly name: string;
        readonly version: string;
      }>;
      wrapperClass?: string;
      wrapperTag?: "article" | "div" | "section";
      sanitize?: boolean;
      theme?: "dark" | "light" | "auto";
      markdown?: unknown[];
      syntaxTheme?: unknown;
    }
  ): Promise<string>;

  export function generateCSS(config?: {
    plugins?: Array<{
      readonly name: string;
      readonly version: string;
    }>;
    theme?: "dark" | "light" | "auto";
    wrapperClass?: string;
    includeBase?: boolean;
    syntaxTheme?: unknown;
  }): string;

  export function extractPreviewTocFromMarkdown(markdown: string): import("@refinex/markora/editor").MarkoraTocItem[];
}
