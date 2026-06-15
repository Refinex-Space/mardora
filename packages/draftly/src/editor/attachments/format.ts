import type { DraftlyAttachmentKind, DraftlyAttachmentUploadResult, DraftlyFileLike } from "./types";

export type DraftlyUploadMarkerState = "uploading" | "failed";

export type DraftlyUploadMarkerInput = {
  taskId: string;
  kind: DraftlyAttachmentKind;
  name: string;
  state: DraftlyUploadMarkerState;
};

export function detectAttachmentKind(file: DraftlyFileLike): DraftlyAttachmentKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function isAcceptedAttachment(file: DraftlyFileLike, acceptRules: readonly string[]): boolean {
  if (acceptRules.includes("*/*")) return true;

  return acceptRules.some((rule) => {
    if (rule.endsWith("/*")) {
      return file.type.startsWith(rule.slice(0, -1));
    }

    if (rule.startsWith(".")) {
      return file.name.toLocaleLowerCase().endsWith(rule.toLocaleLowerCase());
    }

    return file.type === rule;
  });
}

export function createUploadMarker(input: DraftlyUploadMarkerInput): string {
  if (input.state === "failed") {
    return `[Upload failed: ${input.name}](draftly-upload://${input.taskId})`;
  }

  if (input.kind === "image") {
    return `![${input.name}](draftly-upload://${input.taskId})`;
  }

  return `[Uploading ${input.name}](draftly-upload://${input.taskId})`;
}

export function formatAttachmentMarkdown(kind: DraftlyAttachmentKind, result: DraftlyAttachmentUploadResult): string {
  const name = result.name || "attachment";

  if (kind === "image") {
    return result.title ? `![${name}](${result.url} "${result.title}")` : `![${name}](${result.url})`;
  }

  if (kind === "video") {
    return `<video src="${result.url}" controls></video>`;
  }

  if (kind === "audio") {
    return `<audio src="${result.url}" controls></audio>`;
  }

  return `[${name}](${result.url})`;
}
