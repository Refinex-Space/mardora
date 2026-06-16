import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import type { MarkdownConfig } from "@lezer/markdown";
import type { DraftlyTocConfig, DraftlyTocItem } from "../editor/table-of-contents";
import { extractTocItemsFromState } from "../editor/table-of-contents";

export function extractPreviewTocFromMarkdown(
  doc: string,
  config: DraftlyTocConfig = {},
  markdownConfig: MarkdownConfig[] = []
): DraftlyTocItem[] {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage, extensions: markdownConfig })],
  });

  return extractTocItemsFromState(state, config).map((item) => ({
    id: item.id,
    level: item.level,
    text: item.text,
    active: item.active,
  }));
}
