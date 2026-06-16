import type { MarkoraAttachmentKind, MarkoraAttachmentUploadResult, MarkoraFileLike } from "./types";

export type MarkoraUploadMarkerState = "uploading" | "failed";

export type MarkoraUploadMarkerInput = {
  taskId: string;
  kind: MarkoraAttachmentKind;
  name: string;
  state: MarkoraUploadMarkerState;
};

export function detectAttachmentKind(file: MarkoraFileLike): MarkoraAttachmentKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function isAcceptedAttachment(file: MarkoraFileLike, acceptRules: readonly string[]): boolean {
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

export function createUploadMarker(input: MarkoraUploadMarkerInput): string {
  if (input.state === "failed") {
    return `[Upload failed: ${input.name}](markora-upload://${input.taskId})`;
  }

  if (input.kind === "image") {
    return `![${input.name}](markora-upload://${input.taskId})`;
  }

  return `[Uploading ${input.name}](markora-upload://${input.taskId})`;
}

export function formatAttachmentMarkdown(kind: MarkoraAttachmentKind, result: MarkoraAttachmentUploadResult): string {
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
