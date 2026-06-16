import { defaultContentIds, defaultContents, STORAGE_VERSION } from "@/data/defaultContents";
import type { Content, PlaygroundStateSnapshot } from "@/types";

export const STORAGE_CONTENTS_KEY = "markora-vue3-playground-contents";
export const STORAGE_CURRENT_KEY = "markora-vue3-playground-current";
export const STORAGE_VERSION_KEY = "markora-vue3-playground-version";

function cloneDefaultContents(): Content[] {
  return defaultContents.map((content) => ({ ...content }));
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
      const contents = cloneDefaultContents();
      persistSnapshot(contents, 0);
      return { contents, currentContent: 0, version: STORAGE_VERSION };
    }
  }

  if (storedContents && !versionMatches) {
    try {
      const contents = JSON.parse(storedContents) as Content[];
      const userContents = contents.filter((content) => !defaultContentIds.has(content.id));
      const mergedContents = [...cloneDefaultContents(), ...userContents];
      persistSnapshot(mergedContents, 0);
      return { contents: mergedContents, currentContent: 0, version: STORAGE_VERSION };
    } catch {
      const contents = cloneDefaultContents();
      persistSnapshot(contents, 0);
      return { contents, currentContent: 0, version: STORAGE_VERSION };
    }
  }

  const contents = cloneDefaultContents();
  persistSnapshot(contents, 0);
  return { contents, currentContent: 0, version: STORAGE_VERSION };
}

export function savePlaygroundSnapshot(contents: Content[], currentContent: number): void {
  persistSnapshot(contents, normalizeCurrentContent(currentContent, contents));
}
