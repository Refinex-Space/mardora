import { describe, expect, it } from "bun:test";
import { detectSlashQuery, filterSlashCommands } from "../src/editor/slash";
import type { MardoraSlashCommand } from "../src/editor/slash";

const commands: MardoraSlashCommand[] = [
  {
    id: "paragraph",
    group: "basic",
    title: "文本",
    aliases: ["text", "plain"],
    icon: "T",
    hint: "",
    run: () => true,
  },
  {
    id: "heading-1",
    group: "basic",
    title: "标题 1",
    aliases: ["h1", "heading"],
    icon: "H1",
    hint: "#",
    run: () => true,
  },
  {
    id: "image",
    group: "media",
    title: "图片",
    aliases: ["image", "img", "tu"],
    icon: "IMG",
    hint: "img",
    run: () => true,
  },
];

describe("detectSlashQuery", () => {
  it("detects an empty slash query at the start of an empty line", () => {
    expect(detectSlashQuery("/", 1)).toEqual({ from: 0, to: 1, query: "" });
  });

  it("detects a line-start query with Chinese text", () => {
    expect(detectSlashQuery("/图", 2)).toEqual({ from: 0, to: 2, query: "图" });
  });

  it("detects a line-start query after a previous line", () => {
    const doc = "hello\n/heading";
    expect(detectSlashQuery(doc, doc.length)).toEqual({ from: 6, to: 14, query: "heading" });
  });

  it("does not trigger for a slash in the middle of body text", () => {
    expect(detectSlashQuery("hello /img", 10)).toBeNull();
  });

  it("does not trigger when cursor is before the query end", () => {
    expect(detectSlashQuery("/image", 3)).toEqual({ from: 0, to: 3, query: "im" });
  });
});

describe("filterSlashCommands", () => {
  it("returns all commands for an empty query", () => {
    expect(filterSlashCommands(commands, "").map((command) => command.id)).toEqual(["paragraph", "heading-1", "image"]);
  });

  it("matches aliases case-insensitively", () => {
    expect(filterSlashCommands(commands, "IMG").map((command) => command.id)).toEqual(["image"]);
  });

  it("matches Chinese titles", () => {
    expect(filterSlashCommands(commands, "标题").map((command) => command.id)).toEqual(["heading-1"]);
  });
});
