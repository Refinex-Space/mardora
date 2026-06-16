import { describe, expect, it } from "bun:test";
import {
  createUploadMarker,
  detectAttachmentKind,
  formatAttachmentMarkdown,
  isAcceptedAttachment,
} from "../src/editor/attachments";

describe("detectAttachmentKind", () => {
  it("detects image, video, audio, and file kinds from mime type", () => {
    expect(detectAttachmentKind({ name: "a.png", type: "image/png" })).toBe("image");
    expect(detectAttachmentKind({ name: "a.mp4", type: "video/mp4" })).toBe("video");
    expect(detectAttachmentKind({ name: "a.mp3", type: "audio/mpeg" })).toBe("audio");
    expect(detectAttachmentKind({ name: "a.pdf", type: "application/pdf" })).toBe("file");
  });
});

describe("formatAttachmentMarkdown", () => {
  it("formats image markdown with and without title", () => {
    expect(formatAttachmentMarkdown("image", { url: "https://cdn/a.png", name: "a.png" })).toBe(
      "![a.png](https://cdn/a.png)"
    );
    expect(formatAttachmentMarkdown("image", { url: "https://cdn/a.png", name: "a.png", title: "A" })).toBe(
      '![a.png](https://cdn/a.png "A")'
    );
  });

  it("formats video, audio, and file outputs", () => {
    expect(formatAttachmentMarkdown("video", { url: "https://cdn/a.mp4", name: "a.mp4" })).toBe(
      '<video src="https://cdn/a.mp4" controls></video>'
    );
    expect(formatAttachmentMarkdown("audio", { url: "https://cdn/a.mp3", name: "a.mp3" })).toBe(
      '<audio src="https://cdn/a.mp3" controls></audio>'
    );
    expect(formatAttachmentMarkdown("file", { url: "https://cdn/a.pdf", name: "a.pdf" })).toBe(
      "[a.pdf](https://cdn/a.pdf)"
    );
  });
});

describe("createUploadMarker", () => {
  it("creates stable visible upload markers", () => {
    expect(createUploadMarker({ taskId: "task-1", kind: "image", name: "a.png", state: "uploading" })).toBe(
      "![a.png](markora-upload://task-1)"
    );
    expect(createUploadMarker({ taskId: "task-1", kind: "file", name: "a.pdf", state: "failed" })).toBe(
      "[Upload failed: a.pdf](markora-upload://task-1)"
    );
  });
});

describe("isAcceptedAttachment", () => {
  it("matches wildcard accept rules", () => {
    expect(isAcceptedAttachment({ name: "a.png", type: "image/png" }, ["image/*"])).toBe(true);
    expect(isAcceptedAttachment({ name: "a.mp4", type: "video/mp4" }, ["image/*"])).toBe(false);
    expect(isAcceptedAttachment({ name: "a.pdf", type: "application/pdf" }, ["*/*"])).toBe(true);
  });
});
