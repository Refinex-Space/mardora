export type MardoraAttachmentKind = "image" | "video" | "audio" | "file";

export type MardoraAttachmentUploadSource = "slash" | "paste" | "drop" | "api";

export type MardoraAttachmentUploadContext = {
  kind: MardoraAttachmentKind;
  source: MardoraAttachmentUploadSource;
  documentText: string;
  selection: { from: number; to: number };
};

export type MardoraAttachmentUploadResult = {
  url: string;
  name?: string;
  title?: string;
  mimeType?: string;
};

export type MardoraAttachmentUploader = (
  file: File,
  context: MardoraAttachmentUploadContext
) => Promise<MardoraAttachmentUploadResult>;

export type MardoraAttachmentAccept = Partial<Record<MardoraAttachmentKind, string[]>>;

export type MardoraAttachmentsConfig = {
  enabled?: boolean;
  uploader?: MardoraAttachmentUploader;
  accept?: MardoraAttachmentAccept;
  enablePaste?: boolean;
  enableDrop?: boolean;
};

export type MardoraFileLike = {
  name: string;
  type: string;
};
