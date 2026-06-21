export type LinkPreviewMetadata = {
  kind: "link";
  url: string;
  title: string;
  domain?: string;
  image?: string;
  description?: string;
};

export function normalizeLinkPreviewSourceUrl(value: string): URL | null;
export function parseLinkPreviewHtml(
  html: string,
  finalUrl: string,
  fallbackTitle?: string
): LinkPreviewMetadata | null;
export function resolveLinkPreviewMetadata(input: {
  url: string;
  title?: string;
  fetchImpl?: typeof fetch;
}): Promise<LinkPreviewMetadata>;
export function createLinkPreviewMiddleware(): (req: unknown, res: unknown, next?: () => void) => Promise<void>;

declare const linkPreviewMetadata: {
  createLinkPreviewMiddleware: typeof createLinkPreviewMiddleware;
  normalizeLinkPreviewSourceUrl: typeof normalizeLinkPreviewSourceUrl;
  parseLinkPreviewHtml: typeof parseLinkPreviewHtml;
  resolveLinkPreviewMetadata: typeof resolveLinkPreviewMetadata;
};

export default linkPreviewMetadata;
