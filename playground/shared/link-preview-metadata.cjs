const maxPreviewBytes = 512 * 1024;
const requestTimeoutMs = 5000;
const allowedProtocols = new Set(["http:", "https:"]);

function normalizeLinkPreviewSourceUrl(value) {
  try {
    const url = new URL(String(value || "").startsWith("www.") ? `https://${value}` : value);
    if (!allowedProtocols.has(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function compactText(value) {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseAttributes(tag) {
  const attrs = {};
  const pattern = /([^\s"'=<>`]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match;
  while ((match = pattern.exec(tag)) !== null) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function findMetaContent(html, names) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    const key = (attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    if (wanted.has(key) && attrs.content) return compactText(attrs.content);
  }
  return undefined;
}

function findTitle(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? compactText(match[1]) : undefined;
}

function fallbackMetadata(url, title) {
  return {
    kind: "link",
    url: url.href,
    title: title || url.href,
    domain: url.hostname.replace(/^www\./, ""),
  };
}

function parseLinkPreviewHtml(html, finalUrl, fallbackTitle) {
  const normalized = normalizeLinkPreviewSourceUrl(finalUrl);
  if (!normalized) return null;
  const title =
    findMetaContent(html, ["og:title", "twitter:title", "title"]) ||
    findTitle(html) ||
    fallbackTitle ||
    normalized.href;
  const description = findMetaContent(html, ["og:description", "twitter:description", "description"]);
  const imageSource = findMetaContent(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
  const image = imageSource ? new URL(imageSource, normalized.href).href : undefined;

  return {
    kind: "link",
    url: normalized.href,
    title,
    domain: normalized.hostname.replace(/^www\./, ""),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
  };
}

async function readPreviewHtml(response) {
  const reader = response.body?.getReader?.();
  if (!reader) return await response.text();

  const chunks = [];
  let total = 0;
  while (total < maxPreviewBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const output = new Uint8Array(Math.min(total, maxPreviewBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const next = chunk.slice(0, Math.max(0, output.length - offset));
    output.set(next, offset);
    offset += next.byteLength;
    if (offset >= output.length) break;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(output);
}

async function resolveLinkPreviewMetadata(input) {
  const url = normalizeLinkPreviewSourceUrl(input.url);
  if (!url) {
    const error = new Error("invalid_url");
    error.code = "invalid_url";
    throw error;
  }

  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (!fetchImpl) return fallbackMetadata(url, input.title);

  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(requestTimeoutMs),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "MardoraPlaygroundLinkPreview/1.0",
      },
    });

    const contentType = response.headers?.get?.("content-type") || "";
    if (!response.ok || !contentType.toLowerCase().includes("text/html")) {
      return fallbackMetadata(normalizeLinkPreviewSourceUrl(response.url) || url, input.title);
    }

    const html = await readPreviewHtml(response);
    return parseLinkPreviewHtml(html, response.url || url.href, input.title) || fallbackMetadata(url, input.title);
  } catch {
    return fallbackMetadata(url, input.title);
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function createLinkPreviewMiddleware() {
  return async function linkPreviewMiddleware(req, res, next) {
    if (req.method && req.method !== "GET") {
      sendJson(res, 405, { error: "method_not_allowed" });
      return;
    }
    const requestUrl = new URL(req.url || "", "http://localhost");
    const source = requestUrl.searchParams.get("url") || "";
    const url = normalizeLinkPreviewSourceUrl(source);
    if (!url) {
      sendJson(res, 400, { error: "invalid_url" });
      return;
    }
    try {
      sendJson(res, 200, await resolveLinkPreviewMetadata({ url: url.href }));
    } catch (error) {
      if (error && error.code === "invalid_url") {
        sendJson(res, 400, { error: "invalid_url" });
        return;
      }
      sendJson(res, 200, fallbackMetadata(url));
    }
    if (typeof next === "function") return;
  };
}

module.exports = {
  createLinkPreviewMiddleware,
  normalizeLinkPreviewSourceUrl,
  parseLinkPreviewHtml,
  resolveLinkPreviewMetadata,
};
