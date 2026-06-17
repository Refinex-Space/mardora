import { describe, expect, it } from "bun:test";
import { uploadAttachmentFile } from "../src/editor/attachments";
import type { MarkoraAttachmentEditorView } from "../src/editor/attachments";

class FakeDoc {
  constructor(private readonly text: string) {}

  get length(): number {
    return this.text.length;
  }

  toString(): string {
    return this.text;
  }

  lineAt(position: number): { from: number; to: number } {
    const safePosition = Math.max(0, Math.min(position, this.text.length));
    const from = this.text.lastIndexOf("\n", safePosition - 1) + 1;
    const nextBreak = this.text.indexOf("\n", safePosition);
    const to = nextBreak === -1 ? this.text.length : nextBreak;
    return { from, to };
  }
}

class FakeEditorView implements MarkoraAttachmentEditorView {
  text: string;
  state: MarkoraAttachmentEditorView["state"];

  constructor(text: string) {
    this.text = text;
    this.state = this.createState(text, 0);
  }

  dispatch(spec: Parameters<MarkoraAttachmentEditorView["dispatch"]>[0]): void {
    const changes = spec.changes;
    if (Array.isArray(changes)) {
      for (const change of [...changes].reverse()) {
        this.applyChange(change.from, change.to ?? change.from, change.insert ?? "");
      }
    } else if (changes) {
      this.applyChange(changes.from, changes.to ?? changes.from, changes.insert ?? "");
    }

    const anchor =
      spec.selection && "anchor" in spec.selection ? spec.selection.anchor : this.state.selection.main.from;
    this.state = this.createState(this.text, anchor);
  }

  focus(): void {}

  private applyChange(from: number, to: number, insert: string): void {
    this.text = `${this.text.slice(0, from)}${insert}${this.text.slice(to)}`;
  }

  private createState(text: string, anchor: number): MarkoraAttachmentEditorView["state"] {
    return {
      doc: new FakeDoc(text),
      selection: {
        main: {
          from: anchor,
          to: anchor,
        },
      },
    };
  }
}

function createFile(name: string, type: string): File {
  return new File(["content"], name, { type });
}

describe("uploadAttachmentFile", () => {
  it("inserts an upload marker and replaces it on success", async () => {
    const view = new FakeEditorView("/");

    await uploadAttachmentFile(view, createFile("a.png", "image/png"), {
      kind: "image",
      source: "slash",
      range: { from: 0, to: 1 },
      uploader: async () => ({ url: "https://cdn/a.png", name: "a.png" }),
    });

    expect(view.text).toBe("![a.png](https://cdn/a.png)");
  });

  it("keeps a failed marker on uploader rejection", async () => {
    const view = new FakeEditorView("/");

    await uploadAttachmentFile(view, createFile("a.pdf", "application/pdf"), {
      kind: "file",
      source: "paste",
      range: { from: 0, to: 1 },
      uploader: async () => {
        throw new Error("upload failed");
      },
    });

    expect(view.text).toContain("[Upload failed: a.pdf](markora-upload://");
  });

  it("does not resurrect a marker that the user deleted before upload completion", async () => {
    const view = new FakeEditorView("/");
    let resolveUpload: (value: { url: string; name: string }) => void = () => {};

    const uploadPromise = uploadAttachmentFile(view, createFile("a.png", "image/png"), {
      kind: "image",
      source: "drop",
      range: { from: 0, to: 1 },
      uploader: async () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    });

    view.dispatch({ changes: { from: 0, to: view.text.length, insert: "" } });
    resolveUpload({ url: "https://cdn/a.png", name: "a.png" });
    await uploadPromise;

    expect(view.text).toBe("");
  });
});
