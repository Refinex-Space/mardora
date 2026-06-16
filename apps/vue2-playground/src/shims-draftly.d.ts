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

  export enum ThemeEnum {
    DARK = "dark",
    LIGHT = "light",
    AUTO = "auto",
  }

  export function draftly(config?: {
    theme?: ThemeEnum;
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
}
