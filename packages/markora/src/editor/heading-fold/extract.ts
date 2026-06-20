import type { EditorState } from "@codemirror/state";
import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import type { SyntaxNodeRef } from "@lezer/common";
import { stripMarkdownHeadingText } from "../table-of-contents";
import { resolveHeadingFoldConfig } from "./config";
import type { MarkoraHeadingFoldConfig, MarkoraHeadingFoldLevel, MarkoraHeadingFoldRange } from "./types";

const headingPattern = /^ATXHeading([1-6])$/;
const headingFoldParseTimeout = 100;

interface ParsedHeading {
  level: number;
  text: string;
  from: number;
  to: number;
}

function headingLevel(node: SyntaxNodeRef): number | null {
  const match = headingPattern.exec(node.name);
  return match ? Number(match[1]) : null;
}

function canFoldLevel(level: number, minLevel: MarkoraHeadingFoldLevel, maxLevel: MarkoraHeadingFoldLevel): boolean {
  return level >= minLevel && level <= maxLevel;
}

function collectHeadings(state: EditorState): ParsedHeading[] {
  const headings: ParsedHeading[] = [];
  const tree = ensureSyntaxTree(state, state.doc.length, headingFoldParseTimeout) ?? syntaxTree(state);

  tree.iterate({
    enter: (node) => {
      const level = headingLevel(node);
      if (!level) return;
      const text = stripMarkdownHeadingText(state.sliceDoc(node.from, node.to));
      if (!text) return;
      headings.push({ level, text, from: node.from, to: node.to });
    },
  });

  return headings;
}

function findFoldEnd(state: EditorState, headings: ParsedHeading[], index: number): number {
  const heading = headings[index]!;
  const nextBoundary = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
  if (!nextBoundary) return state.doc.length;
  return state.doc.lineAt(nextBoundary.from).from;
}

function findFoldStart(state: EditorState, heading: ParsedHeading): number {
  const headingLine = state.doc.lineAt(heading.from);
  if (headingLine.number >= state.doc.lines) return headingLine.to;
  return state.doc.line(headingLine.number + 1).from;
}

export function extractHeadingFoldRangesFromState(
  state: EditorState,
  config: MarkoraHeadingFoldConfig = {}
): MarkoraHeadingFoldRange[] {
  const resolved = resolveHeadingFoldConfig(config);
  if (!resolved.enabled) return [];

  const headings = collectHeadings(state);
  const ranges: MarkoraHeadingFoldRange[] = [];

  headings.forEach((heading, index) => {
    if (!canFoldLevel(heading.level, resolved.minLevel, resolved.maxLevel)) return;

    const line = state.doc.lineAt(heading.from);
    const foldFrom = findFoldStart(state, heading);
    const foldTo = findFoldEnd(state, headings, index);
    if (foldTo <= foldFrom) return;

    ranges.push({
      level: heading.level as MarkoraHeadingFoldLevel,
      text: heading.text,
      headingFrom: heading.from,
      headingTo: heading.to,
      headingLineFrom: line.from,
      headingLineTo: line.to,
      foldFrom,
      foldTo,
    });
  });

  return ranges;
}
