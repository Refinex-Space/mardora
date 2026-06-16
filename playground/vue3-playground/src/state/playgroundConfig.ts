import { allPlugins } from "markora/plugins";
import type { MarkoraPlugin } from "markora/editor";
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
      attachments: true,
      pasteDropUploads: true,
      tableOfContents: true,
    },
    plugins: createDefaultPluginConfig(),
  };
}

export function getActivePlugins(pluginConfig: PluginConfig): MarkoraPlugin[] {
  return allPlugins.filter((plugin) => pluginConfig[plugin.name.toLowerCase()] !== false);
}
