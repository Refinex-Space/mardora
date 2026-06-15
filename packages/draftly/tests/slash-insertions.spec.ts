import { describe, expect, it } from "bun:test";
import { buildSlashReplacement, defaultSlashCommands } from "../src/editor/slash";
import { draftly } from "../src/editor";

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
});

describe("draftly extension composition", () => {
  it("returns extensions when slash commands and attachments are enabled", () => {
    const extensions = draftly({
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
    const extensions = draftly({
      slashCommands: { enabled: false },
      attachments: { enabled: false },
    });

    expect(Array.isArray(extensions)).toBe(true);
  });
});
