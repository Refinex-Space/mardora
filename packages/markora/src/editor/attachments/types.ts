export type MarkoraAttachmentKind = "image" | "video" | "audio" | "file";

export type MarkoraAttachmentUploadSource = "slash" | "paste" | "drop" | "api";

export type MarkoraAttachmentUploadContext = {
  kind: MarkoraAttachmentKind;
  source: MarkoraAttachmentUploadSource;
  documentText: string;
  selection: { from: number; to: number };
};

export type MarkoraAttachmentUploadResult = {
  url: string;
  name?: string;
  title?: string;
  mimeType?: string;
};

export type MarkoraAttachmentUploader = (
  file: File,
  context: MarkoraAttachmentUploadContext
) => Promise<MarkoraAttachmentUploadResult>;

export type MarkoraAttachmentAccept = Partial<Record<MarkoraAttachmentKind, string[]>>;

export type MarkoraAttachmentsConfig = {
  enabled?: boolean;
  uploader?: MarkoraAttachmentUploader;
  accept?: MarkoraAttachmentAccept;
  enablePaste?: boolean;
  enableDrop?: boolean;
};

export type MarkoraFileLike = {
  name: string;
  type: string;
};
