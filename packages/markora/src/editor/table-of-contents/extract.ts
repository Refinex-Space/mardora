import type { EditorState } from "@codemirror/state";
import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import type { SyntaxNodeRef } from "@lezer/common";
import type { MarkoraTocConfig, MarkoraTocItem, MarkoraTocLevel } from "./types";
import { createTocSlugger, resolveTocConfig } from "./slug";

const headingPattern = /^ATXHeading([1-6])$/;
const tocParseTimeout = 100;

function headingLevel(node: SyntaxNodeRef): MarkoraTocLevel | null {
  const match = headingPattern.exec(node.name);
  if (!match) return null;
  const level = Number(match[1]);
  return level >= 2 && level <= 6 ? (level as MarkoraTocLevel) : null;
}

export function stripMarkdownHeadingText(text: string): string {
  return text
    .replace(/^#{1,6}\s*/, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function extractTocItemsFromState(state: EditorState, config: MarkoraTocConfig = {}): MarkoraTocItem[] {
  const resolved = resolveTocConfig(config);
  const slug = createTocSlugger();
  const items: MarkoraTocItem[] = [];
  const tree = ensureSyntaxTree(state, state.doc.length, tocParseTimeout) ?? syntaxTree(state);

  tree.iterate({
    enter: (node) => {
      const level = headingLevel(node);
      if (!level || level < resolved.minLevel || level > resolved.maxLevel) return;
      const text = stripMarkdownHeadingText(state.sliceDoc(node.from, node.to));
      if (!text) return;
      items.push({
        id: slug(text),
        level,
        text,
        from: node.from,
        to: node.to,
        active: false,
      });
    },
  });

  return items;
}
