import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createUploadMarker, detectAttachmentKind, formatAttachmentMarkdown, isAcceptedAttachment } from "./format";
import type {
  MardoraAttachmentKind,
  MardoraAttachmentsConfig,
  MardoraAttachmentUploadSource,
  MardoraAttachmentUploader,
} from "./types";

let uploadSequence = 0;

export type MardoraAttachmentEditorView = {
  state: {
    doc: {
      length: number;
      toString(): string;
      lineAt(position: number): { from: number; to: number };
    };
    selection: {
      main: { from: number; to: number };
    };
  };
  dispatch(spec: {
    changes?: { from: number; to?: number; insert?: string } | Array<{ from: number; to?: number; insert?: string }>;
    selection?: { anchor: number };
    scrollIntoView?: boolean;
  }): void;
  focus?(): void;
};

export type MardoraUploadAttachmentOptions = {
  kind?: MardoraAttachmentKind;
  source: MardoraAttachmentUploadSource;
  range?: { from: number; to: number };
  uploader: MardoraAttachmentUploader;
};

function nextUploadTaskId(): string {
  uploadSequence += 1;
  return `task-${Date.now()}-${uploadSequence}`;
}

function findMarkerRange(view: MardoraAttachmentEditorView, taskId: string): { from: number; to: number } | null {
  const doc = view.state.doc.toString();
  const marker = `mardora-upload://${taskId}`;
  const markerIndex = doc.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const line = view.state.doc.lineAt(markerIndex);
  return { from: line.from, to: line.to };
}

export async function uploadAttachmentFile(
  view: MardoraAttachmentEditorView,
  file: File,
  options: MardoraUploadAttachmentOptions
): Promise<void> {
  const kind = options.kind ?? detectAttachmentKind(file);
  const range = options.range ?? {
    from: view.state.selection.main.from,
    to: view.state.selection.main.to,
  };
  const taskId = nextUploadTaskId();
  const marker = createUploadMarker({ taskId, kind, name: file.name, state: "uploading" });

  view.dispatch({
    changes: { from: range.from, to: range.to, insert: marker },
    selection: { anchor: range.from + marker.length },
    scrollIntoView: true,
  });

  try {
    const result = await options.uploader(file, {
      kind,
      source: options.source,
      documentText: view.state.doc.toString(),
      selection: { from: range.from, to: range.from + marker.length },
    });
    const markerRange = findMarkerRange(view, taskId);

    if (!markerRange) {
      return;
    }

    const output = formatAttachmentMarkdown(kind, {
      ...result,
      name: result.name ?? file.name,
      mimeType: result.mimeType ?? file.type,
    });

    view.dispatch({
      changes: { from: markerRange.from, to: markerRange.to, insert: output },
      selection: { anchor: markerRange.from + output.length },
      scrollIntoView: true,
    });
  } catch {
    const markerRange = findMarkerRange(view, taskId);

    if (!markerRange) {
      return;
    }

    const failedMarker = createUploadMarker({ taskId, kind, name: file.name, state: "failed" });
    view.dispatch({
      changes: { from: markerRange.from, to: markerRange.to, insert: failedMarker },
      selection: { anchor: markerRange.from + failedMarker.length },
      scrollIntoView: true,
    });
  }
}

function getFilesFromEvent(event: ClipboardEvent | DragEvent): File[] {
  const files =
    event.type === "paste" ? (event as ClipboardEvent).clipboardData?.files : (event as DragEvent).dataTransfer?.files;
  return files ? Array.from(files) : [];
}

function uploadFilesFromEvent(
  view: EditorView,
  event: ClipboardEvent | DragEvent,
  source: MardoraAttachmentUploadSource,
  config: Required<Pick<MardoraAttachmentsConfig, "uploader">> & MardoraAttachmentsConfig
): boolean {
  const files = getFilesFromEvent(event);
  if (files.length === 0) {
    return false;
  }

  event.preventDefault();

  for (const file of files) {
    const kind = detectAttachmentKind(file);
    const acceptRules = config.accept?.[kind] ?? ["*/*"];

    if (!isAcceptedAttachment(file, acceptRules)) {
      continue;
    }

    void uploadAttachmentFile(view, file, {
      kind,
      source,
      uploader: config.uploader,
    });
  }

  return true;
}

export function attachments(config: MardoraAttachmentsConfig = {}): Extension[] {
  if (config.enabled === false || !config.uploader) {
    return [];
  }

  const normalizedConfig = {
    enablePaste: true,
    enableDrop: true,
    ...config,
    uploader: config.uploader,
  };

  return [
    EditorView.domEventHandlers({
      paste(event, view) {
        if (!normalizedConfig.enablePaste) {
          return false;
        }
        return uploadFilesFromEvent(view, event, "paste", normalizedConfig);
      },
      drop(event, view) {
        if (!normalizedConfig.enableDrop) {
          return false;
        }
        return uploadFilesFromEvent(view, event, "drop", normalizedConfig);
      },
    }),
  ];
}
