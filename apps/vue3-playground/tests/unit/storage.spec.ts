import { beforeEach, describe, expect, it } from "bun:test";
import { defaultContents, STORAGE_VERSION } from "../../src/data/defaultContents";
import {
  loadPlaygroundSnapshot,
  STORAGE_CONTENTS_KEY,
  STORAGE_CURRENT_KEY,
  STORAGE_VERSION_KEY,
} from "../../src/state/storage";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
});

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("seeds default contents on first visit", () => {
    const snapshot = loadPlaygroundSnapshot();

    expect(snapshot.contents).toEqual(defaultContents);
    expect(snapshot.currentContent).toBe(0);
    expect(snapshot.version).toBe(STORAGE_VERSION);
    expect(localStorage.getItem(STORAGE_VERSION_KEY)).toBe(String(STORAGE_VERSION));
  });

  it("uses stored contents when versions match", () => {
    const stored = [{ id: "custom", title: "Custom", content: "# Custom" }];
    localStorage.setItem(STORAGE_CONTENTS_KEY, JSON.stringify(stored));
    localStorage.setItem(STORAGE_CURRENT_KEY, "0");
    localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));

    const snapshot = loadPlaygroundSnapshot();

    expect(snapshot.contents).toEqual(stored);
    expect(snapshot.currentContent).toBe(0);
  });

  it("refreshes default entries and preserves custom entries when version is stale", () => {
    const stored = [
      { id: "0", title: "Old Default", content: "# Old" },
      { id: "custom", title: "Custom", content: "# Custom" },
    ];
    localStorage.setItem(STORAGE_CONTENTS_KEY, JSON.stringify(stored));
    localStorage.setItem(STORAGE_CURRENT_KEY, "1");
    localStorage.setItem(STORAGE_VERSION_KEY, "0");

    const snapshot = loadPlaygroundSnapshot();

    expect(snapshot.contents[0]).toEqual(defaultContents[0]);
    expect(snapshot.contents.some((content) => content.id === "custom")).toBe(true);
    expect(snapshot.currentContent).toBe(0);
  });
});
