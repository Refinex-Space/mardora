import { NextRequest, NextResponse } from "next/server";
import linkPreviewMetadata from "../../../../shared/link-preview-metadata.cjs";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url") ?? "";
  const url = linkPreviewMetadata.normalizeLinkPreviewSourceUrl(source);
  if (!url) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  return NextResponse.json(await linkPreviewMetadata.resolveLinkPreviewMetadata({ url: url.href }));
}
