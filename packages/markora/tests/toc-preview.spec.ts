import { describe, expect, it } from "bun:test";
import { HeadingPlugin } from "../src/plugins";
import { extractPreviewTocFromMarkdown, preview } from "../src/preview";

describe("preview table of contents", () => {
  it("extracts h2-h6 using the shared slug rules", () => {
    const items = extractPreviewTocFromMarkdown(["# Title", "## Intro", "### Details", "## Intro"].join("\n\n"));

    expect(items).toEqual([
      expect.objectContaining({ id: "intro", level: 2, text: "Intro", active: false }),
      expect.objectContaining({ id: "details", level: 3, text: "Details", active: false }),
      expect.objectContaining({ id: "intro-2", level: 2, text: "Intro", active: false }),
    ]);
  });

  it("adds ids to rendered heading tags for h2-h6", async () => {
    const html = await preview("## Intro\n\n### Details", {
      plugins: [new HeadingPlugin()],
      sanitize: true,
    });

    expect(html).toContain('<h2 id="intro"');
    expect(html).toContain('<h3 id="details"');
  });
});
