import { buildDefaultContents, defaultContentIds, STORAGE_VERSION } from "@/data/defaultContents";
import { DEFAULT_SHELL_LOCALE, SHELL_LOCALE_STORAGE_KEY, type ShellLocale } from "@/i18n";
import type { Content, PlaygroundStateSnapshot } from "@/types";

export const STORAGE_CONTENTS_KEY = "markora-vue2-playground-contents";
export const STORAGE_CURRENT_KEY = "markora-vue2-playground-current";
export const STORAGE_VERSION_KEY = "markora-vue2-playground-version";

function readStoredLocale(): ShellLocale {
  try {
    const stored = localStorage.getItem(SHELL_LOCALE_STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return DEFAULT_SHELL_LOCALE;
}

function cloneDefaultContents(locale: ShellLocale): Content[] {
  return buildDefaultContents(locale).map((content) => ({ ...content }));
}

function persistSnapshot(contents: Content[], currentContent: number): void {
  localStorage.setItem(STORAGE_CONTENTS_KEY, JSON.stringify(contents));
  localStorage.setItem(STORAGE_CURRENT_KEY, String(currentContent));
  localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
}

function normalizeCurrentContent(currentContent: number, contents: Content[]): number {
  if (contents.length === 0) return -1;
  if (Number.isNaN(currentContent) || currentContent < 0) return 0;
  if (currentContent >= contents.length) return contents.length - 1;
  return currentContent;
}

export function loadPlaygroundSnapshot(): PlaygroundStateSnapshot {
  const locale = readStoredLocale();
  const storedContents = localStorage.getItem(STORAGE_CONTENTS_KEY);
  const storedCurrent = localStorage.getItem(STORAGE_CURRENT_KEY);
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  const versionMatches = storedVersion === String(STORAGE_VERSION);

  if (storedContents && versionMatches) {
    try {
      const contents = JSON.parse(storedContents) as Content[];
      const currentContent = normalizeCurrentContent(Number.parseInt(storedCurrent || "0", 10), contents);
      return { contents, currentContent, version: STORAGE_VERSION };
    } catch {
      const contents = cloneDefaultContents(locale);
      persistSnapshot(contents, 0);
      return { contents, currentContent: 0, version: STORAGE_VERSION };
    }
  }

  if (storedContents && !versionMatches) {
    try {
      const contents = JSON.parse(storedContents) as Content[];
      const userContents = contents.filter((content) => !defaultContentIds.has(content.id));
      const mergedContents = [...cloneDefaultContents(locale), ...userContents];
      persistSnapshot(mergedContents, 0);
      return { contents: mergedContents, currentContent: 0, version: STORAGE_VERSION };
    } catch {
      const contents = cloneDefaultContents(locale);
      persistSnapshot(contents, 0);
      return { contents, currentContent: 0, version: STORAGE_VERSION };
    }
  }

  const contents = cloneDefaultContents(locale);
  persistSnapshot(contents, 0);
  return { contents, currentContent: 0, version: STORAGE_VERSION };
}

// Re-swap the built-in sample docs to the requested locale, preserving
// user-created docs and the current selection.
export function relocalizeContents(
  contents: Content[],
  currentContent: number,
  locale: ShellLocale
): { contents: Content[]; currentContent: number } {
  if (contents.length === 0) return { contents, currentContent };
  const localizedDefaults = buildDefaultContents(locale);
  const defaultsById = new Map(localizedDefaults.map((c) => [c.id, c]));
  const targetId = currentContent >= 0 ? contents[currentContent]?.id : undefined;
  const next = contents.map((c) =>
    defaultContentIds.has(c.id) && defaultsById.has(c.id) ? { ...defaultsById.get(c.id)! } : c
  );
  let nextCurrent = currentContent;
  if (targetId) {
    const idx = next.findIndex((c) => c.id === targetId);
    if (idx !== -1) nextCurrent = idx;
  }
  persistSnapshot(next, nextCurrent);
  return { contents: next, currentContent: nextCurrent };
}

export function savePlaygroundSnapshot(contents: Content[], currentContent: number): void {
  persistSnapshot(contents, normalizeCurrentContent(currentContent, contents));
}
