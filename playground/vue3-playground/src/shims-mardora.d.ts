declare module "mardora/editor" {
  export type MardoraNode = {
    from: number;
    to: number;
    name: string;
    children: MardoraNode[];
    isSelected: boolean;
  };

  export interface MardoraPlugin {
    readonly name: string;
    readonly version: string;
  }

  export type MardoraTocLevel = 1 | 2 | 3 | 4 | 5 | 6;

  export interface MardoraTocItem {
    id: string;
    level: MardoraTocLevel;
    text: string;
    active: boolean;
    from?: number;
    to?: number;
  }

  export interface MardoraTocConfig {
    enabled?: boolean;
    minLevel?: MardoraTocLevel;
    maxLevel?: MardoraTocLevel;
    defaultOpen?: boolean;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    storageKey?: string;
    onTocChange?: (items: MardoraTocItem[]) => void;
  }

  export enum ThemeEnum {
    DARK = "dark",
    LIGHT = "light",
    AUTO = "auto",
  }

  export type MardoraContentWidth =
    | "default"
    | "full"
    | {
        maxWidth: string;
        margin?: string;
      };

  export function mardora(config?: {
    theme?: ThemeEnum;
    locale?: "zh-CN" | "en-US";
    baseStyles?: boolean;
    contentWidth?: MardoraContentWidth;
    plugins?: MardoraPlugin[];
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
    toc?: MardoraTocConfig;
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
    linkPreview?: {
      enabled?: boolean;
      resolve?: (input: { url: string; title: string }) => Promise<{
        kind: "link";
        url: string;
        title: string;
        domain?: string;
        image?: string;
        description?: string;
      }>;
    };
    onNodesChange?: (nodes: MardoraNode[]) => void;
  }): any;

  export function tableOfContents(config?: MardoraTocConfig): unknown;
}

declare module "mardora/plugins" {
  export const allPlugins: Array<{
    readonly name: string;
    readonly version: string;
  }>;
  export function bindCodeCopyButtons(root: HTMLElement | Document): () => void;
}

declare module "mardora/preview" {
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

  export function extractPreviewTocFromMarkdown(markdown: string): import("mardora/editor").MardoraTocItem[];
}
