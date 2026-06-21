import { describe, expect, it } from "bun:test";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type EditorView } from "@codemirror/view";
import { preview } from "../src/preview";
import { LinkPlugin, HTMLPlugin } from "../src/plugins";
import {
  buildEmbedLinkPreviewChange,
  buildRemoveLinkPreviewChange,
  findLinkPreviewForLink,
  isStandaloneLinkRange,
  parseLinkPreviewComment,
  serializeLinkPreviewComment,
} from "../src/editor/link-preview";

function linkDecorationSummaries(doc: string): Array<{ from: number; to: number; isReplace: boolean; widgetName: string; className?: string }> {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
  const decorations: Range<Decoration>[] = [];

  new LinkPlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => false,
    cursorInRange: () => false,
  });

  return decorations
    .map((decoration) => {
      const value = decoration.value as {
        isReplace?: boolean;
        widget?: { constructor?: { name?: string } };
        spec?: { class?: string };
      };
      return {
        from: decoration.from,
        to: decoration.to,
        isReplace: Boolean(value.isReplace),
        widgetName: value.widget?.constructor?.name ?? "",
        className: value.spec?.class,
      };
    })
    .sort((a, b) => a.from - b.from || a.to - b.to || a.widgetName.localeCompare(b.widgetName));
}

const metadata = {
  kind: "link" as const,
  url: "https://octarine.app/",
  title: "Octarine - Take back control of your writing",
  domain: "octarine.app",
  image: "https://octarine.app/img/og/base.png",
  description:
    "Private, markdown-based note-taking app with a focus on speed, simplicity and data ownership. Write faster, think clearer.",
};

describe("link preview metadata protocol", () => {
  it("serializes and parses the versioned hidden comment", () => {
    const comment = serializeLinkPreviewComment(metadata);

    expect(comment).toStartWith("<!--mardora-link-preview:v1 ");
    expect(parseLinkPreviewComment(comment)).toEqual(metadata);
  });

  it("finds a preview comment immediately after a matching standalone link", () => {
    const link = "[Octarine - Take back control of your writing](https://octarine.app/)";
    const doc = `${link}\n${serializeLinkPreviewComment(metadata)}\n\nnext`;

    expect(findLinkPreviewForLink({ doc, linkFrom: 0, linkTo: link.length, url: metadata.url })).toEqual({
      metadata,
      commentFrom: link.length + 1,
      commentTo: link.length + 1 + serializeLinkPreviewComment(metadata).length,
      lineFrom: link.length + 1,
      lineTo: link.length + 1 + serializeLinkPreviewComment(metadata).length,
    });
  });

  it("rejects preview metadata whose URL does not match the link", () => {
    const link = "[Octarine](https://octarine.app/)";
    const doc = `${link}\n${serializeLinkPreviewComment({ ...metadata, url: "https://example.com/" })}`;

    expect(findLinkPreviewForLink({ doc, linkFrom: 0, linkTo: link.length, url: metadata.url })).toBeNull();
  });

  it("detects standalone links and rejects inline links", () => {
    const standalone = "[Octarine](https://octarine.app/)";
    const inline = `Read ${standalone} today`;

    expect(isStandaloneLinkRange({ doc: standalone, from: 0, to: standalone.length })).toBe(true);
    expect(isStandaloneLinkRange({ doc: inline, from: 5, to: 5 + standalone.length })).toBe(false);
  });

  it("builds embed and remove changes for link preview comments", () => {
    const link = "[Octarine](https://octarine.app/)";
    const comment = serializeLinkPreviewComment(metadata);
    const doc = `${link}\n${comment}\n`;

    expect(buildEmbedLinkPreviewChange({ doc: link, linkTo: link.length, metadata })).toEqual({
      from: link.length,
      to: link.length,
      insert: `\n${comment}`,
    });
    expect(buildRemoveLinkPreviewChange({ doc, commentFrom: link.length + 1, commentTo: link.length + 1 + comment.length })).toEqual({
      from: link.length,
      to: link.length + 1 + comment.length,
      insert: "",
    });
  });
});

describe("link preview rendering", () => {
  it("replaces the standalone link and hides the metadata comment in live decorations", () => {
    const link = "[Octarine - Take back control of your writing](https://octarine.app/)";
    const comment = serializeLinkPreviewComment(metadata);
    const summaries = linkDecorationSummaries(`${link}\n${comment}`);

    expect(summaries).toContainEqual({
      from: 0,
      to: link.length,
      isReplace: true,
      widgetName: "LinkPreviewCardWidget",
      className: undefined,
    });
    expect(summaries).toContainEqual({
      from: link.length + 1,
      to: link.length + 1 + comment.length,
      isReplace: true,
      widgetName: "",
      className: undefined,
    });
    expect(summaries.map((summary) => summary.className)).toContain("cm-mardora-link-preview-hidden-line");
  });

  it("renders a standalone link and matching hidden metadata as one link preview card", async () => {
    const link = "[Octarine - Take back control of your writing](https://octarine.app/)";
    const html = await preview(`${link}\n${serializeLinkPreviewComment(metadata)}`, {
      plugins: [new LinkPlugin(), new HTMLPlugin()],
    });

    expect(html).toContain('class="cm-mardora-link-preview-card"');
    expect(html).toContain("Octarine - Take back control of your writing");
    expect(html).toContain("Private, markdown-based note-taking app");
    expect(html).toContain("https://octarine.app/");
    expect(html).not.toContain("<!--mardora-link-preview");
  });
});
