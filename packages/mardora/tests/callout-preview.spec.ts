import { describe, expect, it } from "bun:test";
import { allPlugins, QuotePlugin } from "../src/plugins";
import { generateCSS, preview } from "../src/preview";

const plugins = [new QuotePlugin()];
const calloutIconSnippets: Record<string, string> = {
  NOTE: '<circle cx="12" cy="12" r="10"></circle>',
  TIP: "M15 14c.2-1 .7-1.7 1.5-2.5",
  IMPORTANT: "M3.85 8.62a4 4 0 0 1 4.78-4.77",
  WARNING: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
  CAUTION: "M15.312 2a2 2 0 0 1 1.414.586",
};

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

    expect(html).toContain(`cm-mardora-callout-${type}`);
    expect(html).toContain(`<div class="cm-mardora-callout-title">`);
    expect(html).toContain(`class="cm-mardora-callout-title-icon"`);
    expect(html).toContain(calloutIconSnippets[label]);
    expect(html).toContain(`<span>${label}</span>`);
    expect(html).toContain("Callout **content**.");
    expect(html).not.toContain(`[!${label}]`);
  });

  it("recognizes callout markers case-insensitively", async () => {
    const html = await preview("> [!warning]\n> Be careful.", {
      plugins,
      sanitize: true,
    });

    expect(html).toContain("cm-mardora-callout-warning");
    expect(html).toContain(`<span>WARNING</span>`);
    expect(html).toContain(`class="cm-mardora-callout-title-icon"`);
    expect(html).not.toContain("[!warning]");
  });

  it("keeps inline plugin rendering inside callout content", async () => {
    const html = await preview("> [!TIP]\n> Callout **content**.", {
      plugins: allPlugins,
      sanitize: true,
    });

    expect(html).toContain("cm-mardora-callout-tip");
    expect(html).toContain('<span class="cm-mardora-strong">content</span>');
    expect(html).not.toContain("[!TIP]");
  });

  it("generates preview styles aligned with live callout blocks", () => {
    const css = generateCSS({ plugins });

    expect(css).toContain(".cm-mardora-callout-title-icon");
    expect(css).toContain("display: inline-flex;");
    expect(css).toContain("gap: 0.35em;");
    expect(css).toContain("border-radius: 0;");
    expect(css).toContain("padding: 0.25em 1em;");
  });

  it("keeps ordinary blockquotes unchanged", async () => {
    const html = await preview("> Plain quote.", {
      plugins,
      sanitize: true,
    });

    expect(html).toContain('<blockquote class="cm-mardora-quote-line">');
    expect(html).toContain('<div class="cm-mardora-quote-content"> Plain quote.</div>');
    expect(html).not.toContain("cm-mardora-callout");
  });
});
