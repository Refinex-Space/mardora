import { ThemeEnum } from "../editor/utils";
import { createMardoraFontVariables } from "../editor/theme";
import type { MardoraFontConfig } from "../editor/theme";
import { GenerateCSSConfig } from "./types";
import { generateSyntaxThemeCSS } from "./syntax-theme";

/**
 * Base CSS styles for preview rendering
 */
function createBaseStyles(wrapperClass: string, fonts: MardoraFontConfig = {}) {
  return `.${wrapperClass} {
${formatCssVariables(createMardoraFontVariables(fonts))}
  padding: 0 0.5rem;
  font-family: var(--mardora-font-document);
}`;
}

/**
 * Generate CSS for preview rendering
 *
 * @param config - CSS generation configuration
 * @returns CSS string
 *
 * @example
 * ```ts
 * import { generateCSS } from 'mardora/preview';
 * import { HeadingPlugin, ListPlugin } from 'mardora/plugins';
 *
 * const css = generateCSS({
 *   plugins: [new HeadingPlugin(), new ListPlugin()],
 *   theme: ThemeEnum.AUTO,
 *   includeBase: true,
 * });
 * ```
 */
export function generateCSS(config: GenerateCSSConfig = {}): string {
  const {
    plugins = [],
    fonts = {},
    theme = ThemeEnum.AUTO,
    wrapperClass = "mardora-preview",
    includeBase = true,
    syntaxTheme,
  } = config;

  const cssChunks: string[] = [];

  // Include base styles
  if (includeBase) {
    cssChunks.push(createBaseStyles(wrapperClass, fonts));
  }

  // Collect syntax highlight styles (`tok-*` classes) from CodeMirror theme/extensions
  const syntaxCSS = generateSyntaxThemeCSS(syntaxTheme, wrapperClass);
  if (syntaxCSS) {
    cssChunks.push("/* syntax-theme */\n" + syntaxCSS);
  }

  // Collect styles from plugins
  for (const plugin of plugins) {
    const pluginCSS = plugin.getPreviewStyles(theme, wrapperClass);
    if (pluginCSS) cssChunks.push(`/* ${plugin.name} - ${plugin.version} */\n` + pluginCSS);
  }

  return cssChunks.join("\n\n");
}

function formatCssVariables(variables: Record<string, string>) {
  return Object.entries(variables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}
