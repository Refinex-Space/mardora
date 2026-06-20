import { allPlugins } from "mardora/plugins";
import type { MardoraPlugin } from "mardora/editor";
import type { PlaygroundConfig, PluginConfig } from "@/types";

export function createDefaultPluginConfig(): PluginConfig {
  return Object.fromEntries(allPlugins.map((plugin) => [plugin.name.toLowerCase(), true]));
}

export function createDefaultConfig(): PlaygroundConfig {
  return {
    locale: "zh-CN",
    editor: {
      baseStyles: true,
      defaultKeybindings: true,
      history: true,
      indentWithTab: true,
      highlightActiveLine: true,
      lineWrapping: true,
    },
    preview: {
      includeBase: true,
      sanitize: true,
      contentWidth: "regular",
    },
    features: {
      slashCommands: true,
      selectionToolbar: true,
      attachments: true,
      pasteDropUploads: true,
      tableOfContents: true,
    },
    plugins: createDefaultPluginConfig(),
  };
}

export function getActivePlugins(pluginConfig: PluginConfig): MardoraPlugin[] {
  return allPlugins.filter((plugin) => pluginConfig[plugin.name.toLowerCase()] !== false);
}
