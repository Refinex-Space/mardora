import { describe, expect, it } from "bun:test";
import linkPreviewMetadata from "./link-preview-metadata.cjs";

describe("playground link preview metadata", () => {
  it("extracts Open Graph title, description, and relative image", () => {
    const metadata = linkPreviewMetadata.parseLinkPreviewHtml(
      [
        "<html><head>",
        '<meta property="og:title" content="Example &amp; Title">',
        '<meta name="description" content="A compact description.">',
        '<meta property="og:image" content="/og.png">',
        "</head></html>",
      ].join(""),
      "https://example.com/docs/page",
      "Fallback"
    );

    expect(metadata).toEqual({
      kind: "link",
      url: "https://example.com/docs/page",
      title: "Example & Title",
      domain: "example.com",
      description: "A compact description.",
      image: "https://example.com/og.png",
    });
  });

  it("falls back to title tag and normalized domain", () => {
    const metadata = linkPreviewMetadata.parseLinkPreviewHtml(
      "<title> Plain Title </title>",
      "https://www.example.com/",
      "Fallback"
    );

    expect(metadata).toEqual({
      kind: "link",
      url: "https://www.example.com/",
      title: "Plain Title",
      domain: "example.com",
    });
  });
});
