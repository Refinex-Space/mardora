import { ThemeEnum } from "../editor/utils";
import { PreviewRenderer } from "./renderer";
import { PreviewConfig } from "./types";

/**
 * Render markdown to semantic HTML
 *
 * @param markdown - Markdown string to render
 * @param config - Preview configuration
 * @returns HTML string
 *
 * @example
 * ```ts
 * import { preview } from 'markora/preview';
 * import { HeadingPlugin, ListPlugin } from 'markora/plugins';
 *
 * const html = preview('# Hello World', {
 *   plugins: [new HeadingPlugin(), new ListPlugin()],
 *   wrapperClass: 'markora-preview',
 * });
 * ```
 */
export async function preview(markdown: string, config: PreviewConfig = {}): Promise<string> {
  const {
    plugins = [],
    markdown: markdownConfig = [],
    wrapperClass = "markora-preview",
    wrapperTag = "article",
    sanitize = true,
    theme = ThemeEnum.AUTO,
    syntaxTheme,
  } = config;

  // Create renderer and generate HTML
  const renderer = new PreviewRenderer(markdown, plugins, markdownConfig, theme, sanitize, syntaxTheme);
  const content = await renderer.render();

  // Wrap in container
  const classAttr = wrapperClass ? ` class="${wrapperClass}"` : "";
  return `<${wrapperTag}${classAttr}>\n${content}</${wrapperTag}>`;
}
