import { describe, expect, it } from "bun:test";
import { buildSlashReplacement, defaultSlashCommands } from "../src/editor/slash";
import { markora } from "../src/editor";
import { hasMarkoraIcon } from "../src/editor/icons";
import type { MarkoraSlashCommandContext } from "../src/editor/slash";

describe("buildSlashReplacement", () => {
  it("replaces the slash query with heading markdown", () => {
    expect(buildSlashReplacement({ marker: "# ", cursorOffset: 2 }, { from: 0, to: 3, query: "h1" })).toEqual({
      changes: { from: 0, to: 3, insert: "# " },
      selectionAnchor: 2,
    });
  });

  it("places the cursor inside a link template", () => {
    expect(buildSlashReplacement({ marker: "[]()", cursorOffset: 1 }, { from: 4, to: 9, query: "link" })).toEqual({
      changes: { from: 4, to: 9, insert: "[]()" },
      selectionAnchor: 5,
    });
  });

  it("moves the cursor after a divider block", () => {
    expect(buildSlashReplacement({ marker: "---\n", cursorOffset: 4 }, { from: 0, to: 1, query: "" })).toEqual({
      changes: { from: 0, to: 1, insert: "---\n" },
      selectionAnchor: 4,
    });
  });
});

describe("defaultSlashCommands", () => {
  it("contains the required basic block commands", () => {
    expect(defaultSlashCommands.filter((command) => command.group === "basic").map((command) => command.id)).toEqual([
      "paragraph",
      "heading-1",
      "heading-2",
      "heading-3",
      "heading-4",
      "heading-5",
      "heading-6",
      "quote",
      "callout-note",
      "callout-tip",
      "callout-important",
      "callout-warning",
      "callout-caution",
      "code-block",
      "ordered-list",
      "unordered-list",
      "task-list",
      "table",
      "divider",
      "link",
    ]);
  });

  it("contains the required media commands", () => {
    expect(defaultSlashCommands.filter((command) => command.group === "media").map((command) => command.id)).toEqual([
      "file",
      "image",
      "video",
      "audio",
    ]);
  });

  it("uses built-in icon identifiers for the default commands", () => {
    expect(Object.fromEntries(defaultSlashCommands.map((command) => [command.id, command.icon]))).toMatchObject({
      paragraph: "type",
      "heading-1": "heading-1",
      "heading-2": "heading-2",
      "heading-3": "heading-3",
      "heading-4": "heading-4",
      "heading-5": "heading-5",
      "heading-6": "heading-6",
      quote: "text-quote",
      "callout-note": "info",
      "callout-tip": "lightbulb",
      "callout-important": "badge-alert",
      "callout-warning": "triangle-alert",
      "callout-caution": "octagon-alert",
      "code-block": "code-xml",
      "ordered-list": "list-ordered",
      "unordered-list": "list",
      "task-list": "list-todo",
      table: "table",
      divider: "minus",
      link: "link",
      file: "file",
      image: "image",
      video: "play",
      audio: "music-2",
    });
    expect(defaultSlashCommands.every((command) => hasMarkoraIcon(command.icon))).toBe(true);
  });

  it("contains built-in icons required by the selection toolbar", () => {
    expect(
      [
        "bold",
        "italic",
        "strikethrough",
        "underline",
        "code",
        "highlighter",
        "baseline",
        "link",
        "list-ordered",
        "list",
        "list-todo",
        "copy",
        "external-link",
        "trash-2",
      ].every((icon) => hasMarkoraIcon(icon))
    ).toBe(true);
  });

  it("inserts callout templates with the cursor on the content line", () => {
    const calls: unknown[] = [];
    const view = {
      dispatch: (spec: unknown) => calls.push(spec),
      focus: () => calls.push("focus"),
    };
    const context = {
      view,
      queryRange: { from: 3, to: 12 },
    } as unknown as MarkoraSlashCommandContext;

    const command = defaultSlashCommands.find((item) => item.id === "callout-warning");
    expect(command?.run(context)).toBe(true);

    expect(calls[0]).toEqual({
      changes: { from: 3, to: 12, insert: "> [!WARNING]\n> " },
      selection: { anchor: 18 },
      scrollIntoView: true,
    });
    expect(calls[1]).toBe("focus");
  });

  it("inserts fenced code block templates with the cursor inside the block", () => {
    const calls: unknown[] = [];
    const view = {
      dispatch: (spec: unknown) => calls.push(spec),
      focus: () => calls.push("focus"),
    };
    const context = {
      view,
      queryRange: { from: 2, to: 7 },
    } as unknown as MarkoraSlashCommandContext;

    const command = defaultSlashCommands.find((item) => item.id === "code-block");
    expect(command?.run(context)).toBe(true);

    expect(calls[0]).toEqual({
      changes: { from: 2, to: 7, insert: "```\n\n```" },
      selection: { anchor: 6 },
      scrollIntoView: true,
    });
    expect(calls[1]).toBe("focus");
  });
});

describe("markora extension composition", () => {
  it("returns extensions when slash commands and attachments are enabled", () => {
    const extensions = markora({
      slashCommands: { enabled: true },
      attachments: {
        enabled: true,
        uploader: async () => ({ url: "https://cdn/file.png" }),
      },
    });

    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
  });

  it("allows slash commands and attachments to be disabled", () => {
    const extensions = markora({
      slashCommands: { enabled: false },
      attachments: { enabled: false },
    });

    expect(Array.isArray(extensions)).toBe(true);
  });
});
