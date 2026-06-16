declare module "draftly/editor" {
  export type DraftlyNode = {
    from: number;
    to: number;
    name: string;
    children: DraftlyNode[];
    isSelected: boolean;
  };

  export interface DraftlyPlugin {
    readonly name: string;
    readonly version: string;
  }

  export type DraftlyTocLevel = 1 | 2 | 3 | 4 | 5 | 6;

  export interface DraftlyTocItem {
    id: string;
    level: DraftlyTocLevel;
    text: string;
    active: boolean;
    from?: number;
    to?: number;
  }

  export interface DraftlyTocConfig {
    enabled?: boolean;
    minLevel?: DraftlyTocLevel;
    maxLevel?: DraftlyTocLevel;
    defaultOpen?: boolean;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    storageKey?: string;
    onTocChange?: (items: DraftlyTocItem[]) => void;
  }

  export enum ThemeEnum {
    DARK = "dark",
    LIGHT = "light",
    AUTO = "auto",
  }

  export function draftly(config?: {
    theme?: ThemeEnum;
    locale?: "zh-CN" | "en-US";
    baseStyles?: boolean;
    plugins?: DraftlyPlugin[];
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
    toc?: DraftlyTocConfig;
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
    onNodesChange?: (nodes: DraftlyNode[]) => void;
  }): any;

  export function tableOfContents(config?: DraftlyTocConfig): unknown;
}

declare module "draftly/plugins" {
  export const allPlugins: Array<{
    readonly name: string;
    readonly version: string;
  }>;
}

declare module "draftly/preview" {
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

  export function extractPreviewTocFromMarkdown(markdown: string): import("draftly/editor").DraftlyTocItem[];
}
