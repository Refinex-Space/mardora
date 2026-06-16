import { describe, expect, it } from "bun:test";
import { createDefaultConfig, getActivePlugins } from "../../src/state/playgroundConfig";

describe("playgroundConfig", () => {
  it("enables Draftly plugins by default", () => {
    const config = createDefaultConfig();
    const activePlugins = getActivePlugins(config.plugins);

    expect(activePlugins.length).toBeGreaterThan(0);
    for (const plugin of activePlugins) {
      expect(config.plugins[plugin.name.toLowerCase()]).toBe(true);
    }
  });

  it("defaults to Chinese locale", () => {
    const config = createDefaultConfig();

    expect(config.locale).toBe("zh-CN");
  });

  it("enables slash commands, attachment uploads, and table of contents by default", () => {
    const config = createDefaultConfig();

    expect(config.features).toEqual({
      slashCommands: true,
      attachments: true,
      pasteDropUploads: true,
      tableOfContents: true,
    });
  });

  it("filters inactive plugins", () => {
    const config = createDefaultConfig();
    const firstPlugin = getActivePlugins(config.plugins)[0];
    config.plugins[firstPlugin.name.toLowerCase()] = false;

    const activePlugins = getActivePlugins(config.plugins);

    expect(activePlugins.some((plugin) => plugin.name === firstPlugin.name)).toBe(false);
  });
});
