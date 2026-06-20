import { describe, expect, it } from "bun:test";
import {
  buildBlockTypeChange,
  buildInlineFormatChange,
  buildLinkChange,
  buildListChange,
  detectSelectionBlockType,
  parseSelectedLink,
} from "../src/editor/selection-toolbar";

describe("selection toolbar inline commands", () => {
  it("wraps selected text with markdown markers", () => {
    expect(buildInlineFormatChange({ doc: "hello world", from: 6, to: 11, marker: "**" })).toEqual({
      changes: { from: 6, to: 11, insert: "**world**" },
      selection: { anchor: 8, head: 13 },
    });
  });

  it("removes existing markdown markers around a full selection", () => {
    expect(buildInlineFormatChange({ doc: "hello **world**", from: 8, to: 13, marker: "**" })).toEqual({
      changes: [
        { from: 6, to: 8, insert: "" },
        { from: 13, to: 15, insert: "" },
      ],
      selection: { anchor: 6, head: 11 },
    });
  });

  it("wraps selected text with an html tag", () => {
    expect(buildInlineFormatChange({ doc: "hello world", from: 6, to: 11, htmlTag: "u" })).toEqual({
      changes: { from: 6, to: 11, insert: "<u>world</u>" },
      selection: { anchor: 9, head: 14 },
    });
  });

  it("wraps selected text with an html span style", () => {
    expect(
      buildInlineFormatChange({
        doc: "hello world",
        from: 6,
        to: 11,
        spanStyle: { property: "color", value: "#2563eb" },
      })
    ).toEqual({
      changes: { from: 6, to: 11, insert: '<span style="color: #2563eb">world</span>' },
      selection: { anchor: 35, head: 40 },
    });
  });
});

describe("selection toolbar link commands", () => {
  it("derives link defaults from a selected URL", () => {
    expect(parseSelectedLink("https://markora.dev")).toEqual({
      kind: "url",
      title: "",
      url: "https://markora.dev",
    });
  });

  it("parses an existing markdown link", () => {
    expect(parseSelectedLink("[Markora](https://markora.dev)")).toEqual({
      kind: "markdown-link",
      title: "Markora",
      url: "https://markora.dev",
    });
  });

  it("writes a markdown link", () => {
    expect(buildLinkChange({ from: 0, to: 7, title: "Markora", url: "https://markora.dev" })).toEqual({
      changes: { from: 0, to: 7, insert: "[Markora](https://markora.dev)" },
      selection: { anchor: 0, head: 30 },
    });
  });

  it("deletes a markdown link back to plain text", () => {
    expect(buildLinkChange({ from: 0, to: 30, title: "Markora", url: "", remove: true })).toEqual({
      changes: { from: 0, to: 30, insert: "Markora" },
      selection: { anchor: 0, head: 7 },
    });
  });

  it("does not build a link change when the url is empty", () => {
    expect(() => buildLinkChange({ from: 0, to: 4, title: "text", url: "" })).toThrow("Link URL is required");
  });
});

describe("selection toolbar clear commands", () => {
  it("clears color span wrappers", () => {
    expect(
      buildInlineFormatChange({
        doc: '<span style="color: #2563eb">blue</span>',
        from: 0,
        to: 40,
        spanStyle: { property: "color", value: "#2563eb" },
        clear: true,
      })
    ).toEqual({
      changes: { from: 0, to: 40, insert: "blue" },
      selection: { anchor: 0, head: 4 },
    });
  });
});

describe("selection toolbar list commands", () => {
  it("adds unordered markers to every selected line", () => {
    expect(buildListChange({ doc: "alpha\nbeta", from: 0, to: 10, kind: "unordered" })).toEqual({
      changes: [
        { from: 0, to: 0, insert: "- " },
        { from: 6, to: 6, insert: "- " },
      ],
    });
  });

  it("replaces unordered markers with ordered markers", () => {
    expect(buildListChange({ doc: "- alpha\n- beta", from: 0, to: 14, kind: "ordered" })).toEqual({
      changes: [
        { from: 0, to: 2, insert: "1. " },
        { from: 8, to: 10, insert: "2. " },
      ],
    });
  });

  it("removes existing task list markers", () => {
    expect(buildListChange({ doc: "- [ ] alpha\n- [x] beta", from: 0, to: 21, kind: "task" })).toEqual({
      changes: [
        { from: 0, to: 6, insert: "" },
        { from: 12, to: 18, insert: "" },
      ],
    });
  });
});

describe("selection toolbar block type commands", () => {
  it("converts plain text to a heading", () => {
    expect(buildBlockTypeChange({ doc: "Title", from: 0, to: 5, level: 2 })).toEqual({
      changes: [{ from: 0, to: 0, insert: "## " }],
      selection: { anchor: 3, head: 8 },
    });
  });

  it("converts a heading back to text", () => {
    expect(buildBlockTypeChange({ doc: "## Title", from: 3, to: 8, level: 0 })).toEqual({
      changes: [{ from: 0, to: 3, insert: "" }],
      selection: { anchor: 0, head: 5 },
    });
  });

  it("escapes text-like heading content that would otherwise become another markdown block", () => {
    expect(buildBlockTypeChange({ doc: "## 1. Title", from: 3, to: 11, level: 0 })).toEqual({
      changes: [{ from: 0, to: 11, insert: "1\\. Title" }],
      selection: { anchor: 0, head: 9 },
    });
  });

  it("changes an existing heading level", () => {
    expect(buildBlockTypeChange({ doc: "## Title", from: 3, to: 8, level: 3 })).toEqual({
      changes: [{ from: 0, to: 3, insert: "### " }],
      selection: { anchor: 4, head: 9 },
    });
  });

  it("removes plain-text block escapes when converting text back to a heading", () => {
    expect(buildBlockTypeChange({ doc: "1\\. Title", from: 0, to: 9, level: 2 })).toEqual({
      changes: [{ from: 0, to: 9, insert: "## 1. Title" }],
      selection: { anchor: 3, head: 11 },
    });
  });

  it("converts every touched line while preserving indentation", () => {
    expect(buildBlockTypeChange({ doc: "  A\n## B", from: 2, to: 8, level: 1 })).toEqual({
      changes: [
        { from: 0, to: 2, insert: "  # " },
        { from: 4, to: 7, insert: "# " },
      ],
      selection: { anchor: 4, head: 9 },
    });
  });

  it("detects the block type for heading and plain selections", () => {
    expect(detectSelectionBlockType({ doc: "## Title", from: 3, to: 8 })).toBe("heading-2");
    expect(detectSelectionBlockType({ doc: "Title", from: 0, to: 5 })).toBe("text");
  });
});
