import type { ContentMetrics } from "@/types";

export function getContentMetrics(content: string): ContentMetrics {
  if (!content) {
    return { words: 0, lines: 0, chars: 0 };
  }

  return {
    words: content.trim().split(/\s+/).filter(Boolean).length,
    lines: content.split("\n").length,
    chars: content.length,
  };
}

export function createContentId(): string {
  return `content-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
