import { describe, expect, it } from "bun:test";
import {
  buildInlineFormatChange,
  buildLinkChange,
  buildListChange,
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
    expect(parseSelectedLink("https://draftly.dev")).toEqual({
      kind: "url",
      title: "",
      url: "https://draftly.dev",
    });
  });

  it("parses an existing markdown link", () => {
    expect(parseSelectedLink("[Draftly](https://draftly.dev)")).toEqual({
      kind: "markdown-link",
      title: "Draftly",
      url: "https://draftly.dev",
    });
  });

  it("writes a markdown link", () => {
    expect(buildLinkChange({ from: 0, to: 7, title: "Draftly", url: "https://draftly.dev" })).toEqual({
      changes: { from: 0, to: 7, insert: "[Draftly](https://draftly.dev)" },
      selection: { anchor: 0, head: 30 },
    });
  });

  it("deletes a markdown link back to plain text", () => {
    expect(buildLinkChange({ from: 0, to: 28, title: "Draftly", url: "", remove: true })).toEqual({
      changes: { from: 0, to: 28, insert: "Draftly" },
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
