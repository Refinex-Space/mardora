import type { EditorView } from "@codemirror/view";

export type MardoraLinkPreviewMetadata = {
  kind: "link";
  url: string;
  title: string;
  domain?: string;
  image?: string;
  description?: string;
};

export type MardoraLinkPreviewResolverInput = {
  url: string;
  title: string;
};

export type MardoraLinkPreviewResolver = (
  input: MardoraLinkPreviewResolverInput
) => Promise<MardoraLinkPreviewMetadata> | MardoraLinkPreviewMetadata;

export type MardoraLinkPreviewConfig = {
  enabled?: boolean;
  resolve?: MardoraLinkPreviewResolver;
};

export type LinkPreviewCommentRange = {
  metadata: MardoraLinkPreviewMetadata;
  commentFrom: number;
  commentTo: number;
  lineFrom: number;
  lineTo: number;
};

export type MardoraLinkEditAnchorRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type MardoraLinkEditDetail = {
  from: number;
  to: number;
  title: string;
  url: string;
  canEmbed: boolean;
  isPreview: boolean;
  anchor?: MardoraLinkEditAnchorRect;
  previewCommentFrom?: number;
  previewCommentTo?: number;
};

export const mardoraLinkEditEvent = "mardora-link-edit";

const linkPreviewCommentPrefix = "<!--mardora-link-preview:v1 ";
const linkPreviewCommentSuffix = "-->";

function normalizedUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed).href;
  } catch {
    return null;
  }
}

export function normalizeLinkPreviewUrl(value: string): string | null {
  return normalizedUrl(value);
}

function sanitizeMetadata(input: unknown): MardoraLinkPreviewMetadata | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  if (data.kind !== "link") return null;
  if (typeof data.url !== "string" || typeof data.title !== "string") return null;

  const metadata: MardoraLinkPreviewMetadata = {
    kind: "link",
    url: data.url,
    title: data.title,
  };

  if (typeof data.domain === "string" && data.domain.trim()) metadata.domain = data.domain;
  if (typeof data.image === "string" && data.image.trim()) metadata.image = data.image;
  if (typeof data.description === "string" && data.description.trim()) metadata.description = data.description;

  return metadata;
}

export function serializeLinkPreviewComment(metadata: MardoraLinkPreviewMetadata): string {
  return `${linkPreviewCommentPrefix}${JSON.stringify(metadata)}${linkPreviewCommentSuffix}`;
}

export function parseLinkPreviewComment(lineText: string): MardoraLinkPreviewMetadata | null {
  const trimmed = lineText.trim();
  if (!trimmed.startsWith(linkPreviewCommentPrefix) || !trimmed.endsWith(linkPreviewCommentSuffix)) {
    return null;
  }

  const payload = trimmed.slice(linkPreviewCommentPrefix.length, -linkPreviewCommentSuffix.length).trim();
  try {
    return sanitizeMetadata(JSON.parse(payload));
  } catch {
    return null;
  }
}

function lineAt(doc: string, position: number): { from: number; to: number; text: string } {
  const safePosition = Math.min(Math.max(position, 0), doc.length);
  const previousBreak = doc.lastIndexOf("\n", Math.max(0, safePosition - 1));
  const nextBreak = doc.indexOf("\n", safePosition);
  const from = previousBreak === -1 ? 0 : previousBreak + 1;
  const to = nextBreak === -1 ? doc.length : nextBreak;
  return { from, to, text: doc.slice(from, to) };
}

export function isStandaloneLinkRange(input: { doc: string; from: number; to: number }): boolean {
  const line = lineAt(input.doc, input.from);
  const before = input.doc.slice(line.from, input.from);
  const after = input.doc.slice(input.to, line.to);
  return before.trim().length === 0 && after.trim().length === 0;
}

export function findLinkPreviewForLink(input: {
  doc: string;
  linkFrom: number;
  linkTo: number;
  url: string;
}): LinkPreviewCommentRange | null {
  if (!isStandaloneLinkRange({ doc: input.doc, from: input.linkFrom, to: input.linkTo })) return null;

  const linkLine = lineAt(input.doc, input.linkFrom);
  if (linkLine.to >= input.doc.length || input.doc[linkLine.to] !== "\n") return null;

  const commentLine = lineAt(input.doc, linkLine.to + 1);
  const metadata = parseLinkPreviewComment(commentLine.text);
  if (!metadata) return null;

  const linkUrl = normalizedUrl(input.url);
  const metadataUrl = normalizedUrl(metadata.url);
  if (!linkUrl || !metadataUrl || linkUrl !== metadataUrl) return null;

  return {
    metadata,
    commentFrom: commentLine.from,
    commentTo: commentLine.to,
    lineFrom: commentLine.from,
    lineTo: commentLine.to,
  };
}

export function buildEmbedLinkPreviewChange(input: {
  doc: string;
  linkTo: number;
  metadata: MardoraLinkPreviewMetadata;
}): { from: number; to: number; insert: string } {
  return {
    from: input.linkTo,
    to: input.linkTo,
    insert: `\n${serializeLinkPreviewComment(input.metadata)}`,
  };
}

export function buildRemoveLinkPreviewChange(input: {
  doc: string;
  commentFrom: number;
  commentTo: number;
}): { from: number; to: number; insert: string } {
  const from = input.commentFrom > 0 && input.doc[input.commentFrom - 1] === "\n" ? input.commentFrom - 1 : input.commentFrom;
  return {
    from,
    to: input.commentTo,
    insert: "",
  };
}

export function createFallbackLinkPreviewMetadata(input: MardoraLinkPreviewResolverInput): MardoraLinkPreviewMetadata {
  const normalized = normalizedUrl(input.url) ?? input.url;
  let domain: string | undefined;
  try {
    domain = new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    domain = undefined;
  }

  return {
    kind: "link",
    url: normalized,
    title: input.title || normalized,
    ...(domain ? { domain } : {}),
  };
}

export function dispatchMardoraLinkEditEvent(
  view: EditorView,
  detail: Omit<MardoraLinkEditDetail, "anchor">,
  target?: HTMLElement
): void {
  const rect = target?.getBoundingClientRect();
  const anchor = rect
    ? {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      }
    : undefined;
  const eventDetail: MardoraLinkEditDetail = {
    ...detail,
    ...(anchor ? { anchor } : {}),
  };
  const win = view.dom.ownerDocument.defaultView ?? window;
  view.dom.dispatchEvent(new win.CustomEvent(mardoraLinkEditEvent, { bubbles: true, detail: eventDetail }));
}
