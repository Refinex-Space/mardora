import type {
  InlineFormatInput,
  LinkChangeInput,
  ParsedSelectionLink,
  SelectionToolbarListKind,
  TextChange,
  TextCommandResult,
} from "./types";

const markdownLinkPattern = /^\[([^\]]*)\]\(([^)]*)\)$/;
const urlPattern = /^(https?:\/\/|www\.)[^\s]+$/i;
const listMarkerPattern = /^(\s*)([-*+]|\d+\.)\s(\[[ xX]\]\s)?/;

function selectedText(input: Pick<InlineFormatInput, "doc" | "from" | "to">): string {
  return input.doc.slice(input.from, input.to);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHtmlWrapper(input: InlineFormatInput): { open: string; close: string } {
  if (input.htmlTag) {
    return { open: `<${input.htmlTag}>`, close: `</${input.htmlTag}>` };
  }
  if (input.spanStyle) {
    return { open: `<span style="${input.spanStyle.property}: ${input.spanStyle.value}">`, close: "</span>" };
  }
  const marker = input.marker ?? "";
  return { open: marker, close: marker };
}

export function buildInlineFormatChange(input: InlineFormatInput): TextCommandResult {
  const text = selectedText(input);
  const { open, close } = buildHtmlWrapper(input);

  if (input.clear) {
    const tagPattern = input.spanStyle
      ? new RegExp(
          `^<span style="${escapeRegExp(input.spanStyle.property)}: ${
            input.spanStyle.value ? escapeRegExp(input.spanStyle.value) : "#[0-9a-fA-F]{6}"
          }">([\\s\\S]*)<\\/span>$`
        )
      : input.htmlTag
        ? new RegExp(`^<${input.htmlTag}>([\\s\\S]*)<\\/${input.htmlTag}>$`)
        : null;
    const match = tagPattern ? text.match(tagPattern) : null;
    const insert = match?.[1] ?? text;
    return {
      changes: { from: input.from, to: input.to, insert },
      selection: { anchor: input.from, head: input.from + insert.length },
    };
  }

  const beforeFrom = Math.max(0, input.from - open.length);
  const afterTo = Math.min(input.doc.length, input.to + close.length);
  const before = input.doc.slice(beforeFrom, input.from);
  const after = input.doc.slice(input.to, afterTo);

  if (before === open && after === close) {
    return {
      changes: [
        { from: beforeFrom, to: input.from, insert: "" },
        { from: input.to, to: afterTo, insert: "" },
      ],
      selection: { anchor: beforeFrom, head: beforeFrom + text.length },
    };
  }

  const insert = `${open}${text}${close}`;
  return {
    changes: { from: input.from, to: input.to, insert },
    selection: { anchor: input.from + open.length, head: input.from + open.length + text.length },
  };
}

export function parseSelectedLink(text: string): ParsedSelectionLink {
  const linkMatch = text.match(markdownLinkPattern);
  if (linkMatch) {
    return { kind: "markdown-link", title: linkMatch[1] ?? "", url: linkMatch[2] ?? "" };
  }
  if (urlPattern.test(text)) {
    return { kind: "url", title: "", url: text };
  }
  return { kind: "text", title: text, url: "" };
}

export function buildLinkChange(input: LinkChangeInput): TextCommandResult {
  if (input.remove) {
    return {
      changes: { from: input.from, to: input.to, insert: input.title },
      selection: { anchor: input.from, head: input.from + input.title.length },
    };
  }

  if (!input.url.trim()) {
    throw new Error("Link URL is required");
  }

  const insert = `[${input.title}](${input.url})`;
  return {
    changes: { from: input.from, to: input.to, insert },
    selection: { anchor: input.from, head: input.from + insert.length },
  };
}

function lineRanges(doc: string, from: number, to: number): Array<{ from: number; text: string }> {
  const ranges: Array<{ from: number; text: string }> = [];
  let position = 0;

  for (const text of doc.split("\n")) {
    const lineFrom = position;
    const lineTo = position + text.length;
    if (lineTo >= from && lineFrom <= to) {
      ranges.push({ from: lineFrom, text });
    }
    position = lineTo + 1;
  }

  return ranges;
}

function markerFor(kind: SelectionToolbarListKind, order: number): string {
  if (kind === "ordered") return `${order}. `;
  if (kind === "task") return "- [ ] ";
  return "- ";
}

export function buildListChange(input: {
  doc: string;
  from: number;
  to: number;
  kind: SelectionToolbarListKind;
}): { changes: TextChange[] } {
  const changes: TextChange[] = [];
  let order = 1;

  for (const line of lineRanges(input.doc, input.from, input.to)) {
    const match = line.text.match(listMarkerPattern);
    const actualMarker = markerFor(input.kind, order);

    if (match) {
      const indent = match[1] ?? "";
      const isOrdered = /^\d+\.$/.test(match[2] ?? "");
      const isUnordered = /^[-*+]$/.test(match[2] ?? "");
      const hasTask = !!match[3];
      const same =
        (input.kind === "ordered" && isOrdered && !hasTask) ||
        (input.kind === "unordered" && isUnordered && !hasTask) ||
        (input.kind === "task" && hasTask);

      changes.push({
        from: line.from,
        to: line.from + match[0].length,
        insert: same ? indent : indent + actualMarker,
      });
    } else {
      const indentLength = line.text.match(/^(\s*)/)?.[1]?.length ?? 0;
      changes.push({ from: line.from + indentLength, to: line.from + indentLength, insert: actualMarker });
    }

    if (input.kind === "ordered") order += 1;
  }

  return { changes };
}
