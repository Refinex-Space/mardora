import { describe, expect, it } from "bun:test";
import { allPlugins, QuotePlugin } from "../src/plugins";
import { preview } from "../src/preview";

const plugins = [new QuotePlugin()];

describe("callout preview", () => {
  it.each([
    ["NOTE", "note"],
    ["TIP", "tip"],
    ["IMPORTANT", "important"],
    ["WARNING", "warning"],
    ["CAUTION", "caution"],
  ])("renders %s callouts without exposing the control marker", async (label, type) => {
    const html = await preview(`> [!${label}]\n> Callout **content**.`, {
      plugins,
      sanitize: true,
    });

    expect(html).toContain(`cm-markora-callout-${type}`);
    expect(html).toContain(`<div class="cm-markora-callout-title">${label}</div>`);
    expect(html).toContain("Callout **content**.");
    expect(html).not.toContain(`[!${label}]`);
  });

  it("recognizes callout markers case-insensitively", async () => {
    const html = await preview("> [!warning]\n> Be careful.", {
      plugins,
      sanitize: true,
    });

    expect(html).toContain("cm-markora-callout-warning");
    expect(html).toContain(`<div class="cm-markora-callout-title">WARNING</div>`);
    expect(html).not.toContain("[!warning]");
  });

  it("keeps inline plugin rendering inside callout content", async () => {
    const html = await preview("> [!TIP]\n> Callout **content**.", {
      plugins: allPlugins,
      sanitize: true,
    });

    expect(html).toContain("cm-markora-callout-tip");
    expect(html).toContain('<span class="cm-markora-strong">content</span>');
    expect(html).not.toContain("[!TIP]");
  });

  it("keeps ordinary blockquotes unchanged", async () => {
    const html = await preview("> Plain quote.", {
      plugins,
      sanitize: true,
    });

    expect(html).toContain('<blockquote class="cm-markora-quote-line">');
    expect(html).toContain('<div class="cm-markora-quote-content"> Plain quote.</div>');
    expect(html).not.toContain("cm-markora-callout");
  });
});
