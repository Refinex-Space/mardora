import type { MardoraAttachmentKind, MardoraAttachmentUploadResult, MardoraFileLike } from "./types";

export type MardoraUploadMarkerState = "uploading" | "failed";

export type MardoraUploadMarkerInput = {
  taskId: string;
  kind: MardoraAttachmentKind;
  name: string;
  state: MardoraUploadMarkerState;
};

export function detectAttachmentKind(file: MardoraFileLike): MardoraAttachmentKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function isAcceptedAttachment(file: MardoraFileLike, acceptRules: readonly string[]): boolean {
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

export function createUploadMarker(input: MardoraUploadMarkerInput): string {
  if (input.state === "failed") {
    return `[Upload failed: ${input.name}](mardora-upload://${input.taskId})`;
  }

  if (input.kind === "image") {
    return `![${input.name}](mardora-upload://${input.taskId})`;
  }

  return `[Uploading ${input.name}](mardora-upload://${input.taskId})`;
}

export function formatAttachmentMarkdown(kind: MardoraAttachmentKind, result: MardoraAttachmentUploadResult): string {
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
