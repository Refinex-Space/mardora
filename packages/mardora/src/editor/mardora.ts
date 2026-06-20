import { Extension, Prec } from "@codemirror/state";
import { EditorView, highlightActiveLine, KeyBinding, keymap } from "@codemirror/view";
import { markdown, markdownKeymap, markdownLanguage } from "@codemirror/lang-markdown";
import type { MarkdownConfig } from "@lezer/markdown";
import { MardoraPlugin, PluginContext } from "./plugin";
import { createMardoraViewExtension } from "./view-plugin";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { indentOnInput } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { ThemeEnum } from "./utils";
import { markdownResetExtension } from "./theme";
import type { MardoraSlashCommandsConfig } from "./slash";
import { slashCommands } from "./slash";
import type { MardoraAttachmentsConfig } from "./attachments";
import { attachments } from "./attachments";
import type { MardoraSelectionToolbarConfig } from "./selection-toolbar";
import { selectionToolbar } from "./selection-toolbar";
import type { MardoraTocConfig } from "./table-of-contents";
import { tableOfContents } from "./table-of-contents";
import type { MardoraHeadingFoldConfig } from "./heading-fold";
import { headingFold } from "./heading-fold";
import type { MardoraI18nConfig, MardoraLocale } from "./i18n";
import { resolveMardoraLocale } from "./i18n";

/**
 * MardoraNode: represents a node in the markdown tree
 *
 * Useful for debugging and development
 */
export type MardoraNode = {
  from: number;
  to: number;
  name: string;
  children: MardoraNode[];
  isSelected: boolean;
};

/**
 * Configuration options for the mardora editor
 */
export interface MardoraConfig {
  /** Theme */
  theme?: ThemeEnum;

  /** Editor UI locale. Defaults to Simplified Chinese. */
  locale?: MardoraLocale;

  /** Internationalization configuration for editor-owned UI text */
  i18n?: MardoraI18nConfig;

  /** Weather to load base styles */
  baseStyles?: boolean;

  /** Plugins to load */
  plugins?: MardoraPlugin[];

  /** Additional markdown extensions for the parser */
  markdown?: MarkdownConfig[];

  /** Additional CodeMirror extensions */
  extensions?: Extension[];

  /** Additional keybindings */
  keymap?: KeyBinding[];

  /** Disable the built-in view plugin (for raw markdown mode) */
  disableViewPlugin?: boolean;

  /** Enable default keybindings */
  defaultKeybindings?: boolean;

  /** Enable history */
  history?: boolean;

  /** Enable indent with tab */
  indentWithTab?: boolean;

  /** Highlight active line */
  highlightActiveLine?: boolean;

  /** Line wrapping in raw markdown mode */
  lineWrapping?: boolean;

  /** Callback to receive the nodes on every update */
  onNodesChange?: (nodes: MardoraNode[]) => void;

  /** Slash command menu configuration */
  slashCommands?: MardoraSlashCommandsConfig;

  /** Browser attachment upload configuration */
  attachments?: MardoraAttachmentsConfig;

  /** Selected text floating toolbar configuration */
  selectionToolbar?: MardoraSelectionToolbarConfig;

  /** Table of contents configuration */
  toc?: MardoraTocConfig;

  /** Heading section folding configuration */
  headingFold?: MardoraHeadingFoldConfig;
}

/**
 * Creates a mardora editor extension bundle for CodeMirror 6
 *
 * @param config - Configuration options for the editor
 * @returns CodeMirror Extension that can be added to EditorState
 *
 * @example
 * ```ts
 * import { EditorView } from '@codemirror/view';
 * import { EditorState } from '@codemirror/state';
 * import { mardora } from 'mardora';
 *
 * const view = new EditorView({
 *   state: EditorState.create({
 *     doc: '# Hello mardora',
 *     extensions: [mardora()]
 *   }),
 *   parent: document.getElementById('editor')
 * });
 * ```
 */
export function mardora(config: MardoraConfig = {}): Extension[] {
  const {
    locale: configLocale,
    i18n: configI18n = {},
    theme: configTheme = ThemeEnum.AUTO,
    baseStyles = true,
    plugins = [],
    extensions = [],
    keymap: configKeymap = [],
    disableViewPlugin = false,
    defaultKeybindings = true,
    history: configHistory = true,
    indentWithTab: configIndentWithTab = true,
    highlightActiveLine: configHighlightActiveLine = true,
    lineWrapping: configLineWrapping = true,
    onNodesChange: configOnNodesChange = undefined,
    slashCommands: configSlashCommands = { enabled: true },
    attachments: configAttachments = { enabled: false },
    selectionToolbar: configSelectionToolbar = { enabled: true },
    toc: configToc = { enabled: true },
    headingFold: configHeadingFold = { enabled: true },
  } = config;
  const resolvedLocale = resolveMardoraLocale(configSlashCommands.locale ?? configI18n.locale ?? configLocale);

  const allPlugins = [...plugins];

  // Collect all extensions from plugins
  const pluginExtensions: Extension[] = [];
  const pluginKeymaps: KeyBinding[] = [];
  const markdownExtensions: MarkdownConfig[] = [];

  // Create plugin context for lifecycle methods
  const pluginContext: PluginContext = { config };

  if (!disableViewPlugin) {
    // Process each plugin
    for (const plugin of allPlugins) {
      // Call onRegister lifecycle hook
      plugin.onRegister(pluginContext);

      // Collect extensions via class method
      const exts = plugin.getExtensions();
      if (exts.length > 0) {
        pluginExtensions.push(...exts);
      }

      // Collect keymaps via class method
      const keys = plugin.getKeymap();
      if (keys.length > 0) {
        pluginKeymaps.push(...keys);
      }

      // Collect theme via class method
      const theme = plugin.theme;
      if (baseStyles && theme && typeof theme === "function") {
        pluginExtensions.push(EditorView.theme(theme(configTheme)));
      }

      // Collect markdown parser extensions via class method
      const md = plugin.getMarkdownConfig();
      if (md) {
        markdownExtensions.push(md);
      }
    }
  }

  // Add config-level markdown extensions
  if (config.markdown) {
    markdownExtensions.push(...config.markdown);
  }

  // Build the base markdown language support
  const markdownSupport = markdown({
    base: markdownLanguage,
    codeLanguages: languages,
    extensions: markdownExtensions,
    addKeymap: true,
    completeHTMLTags: true,
    pasteURLAsLink: true,
  });

  // Core CodeMirror extensions (in order)
  const baseExtensions: Extension[] = [
    ...(defaultKeybindings ? [keymap.of(defaultKeymap)] : []),
    ...(configHistory ? [history(), keymap.of(historyKeymap)] : []),
    ...(configIndentWithTab ? [indentOnInput(), keymap.of([indentWithTab])] : []),
    ...(configHighlightActiveLine && disableViewPlugin ? [highlightActiveLine()] : []),
  ];

  // mardora extensions (pass plugins for decoration support)
  const mardoraExtensions: Extension[] = [];
  if (!disableViewPlugin) {
    mardoraExtensions.push(createMardoraViewExtension(configTheme, baseStyles, allPlugins, configOnNodesChange));
    mardoraExtensions.push(Prec.highest(markdownResetExtension));
  }
  if (!disableViewPlugin || configLineWrapping) mardoraExtensions.push(EditorView.lineWrapping);

  // Compose all extensions together
  const composedExtensions: Extension[] = [
    // Core markdown support (highest priority)
    Prec.high(markdownSupport),
    Prec.high(keymap.of(markdownKeymap)),

    // mardora view plugin for rich rendering
    mardoraExtensions,

    // Core CodeMirror extensions
    baseExtensions,

    // Mardora editor commands and browser attachments
    slashCommands({
      ...configSlashCommands,
      inheritedLocale: resolvedLocale,
      attachmentUploader: configAttachments.uploader,
    }),
    attachments(configAttachments),
    selectionToolbar({
      ...configSelectionToolbar,
      inheritedLocale: resolvedLocale,
    }),
    tableOfContents(configToc),
    ...(!disableViewPlugin ? headingFold(configHeadingFold) : []),

    // Plugin extensions & keymaps
    pluginExtensions,
    pluginKeymaps.length > 0 ? keymap.of(pluginKeymaps) : [],

    // Config keymaps & extensions
    configKeymap.length > 0 ? keymap.of(configKeymap) : [],
    extensions,
  ];

  return composedExtensions;
}
