export type DraftlyAttachmentKind = "image" | "video" | "audio" | "file";

export type DraftlyAttachmentUploadSource = "slash" | "paste" | "drop" | "api";

export type DraftlyAttachmentUploadContext = {
  kind: DraftlyAttachmentKind;
  source: DraftlyAttachmentUploadSource;
  documentText: string;
  selection: { from: number; to: number };
};

export type DraftlyAttachmentUploadResult = {
  url: string;
  name?: string;
  title?: string;
  mimeType?: string;
};

export type DraftlyAttachmentUploader = (
  file: File,
  context: DraftlyAttachmentUploadContext
) => Promise<DraftlyAttachmentUploadResult>;

export type DraftlyAttachmentAccept = Partial<Record<DraftlyAttachmentKind, string[]>>;

export type DraftlyAttachmentsConfig = {
  enabled?: boolean;
  uploader?: DraftlyAttachmentUploader;
  accept?: DraftlyAttachmentAccept;
  enablePaste?: boolean;
  enableDrop?: boolean;
};

export type DraftlyFileLike = {
  name: string;
  type: string;
};
