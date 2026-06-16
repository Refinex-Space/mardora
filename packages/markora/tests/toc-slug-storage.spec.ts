import { describe, expect, it } from "bun:test";
import {
  clampTocWidth,
  createTocSlugger,
  readTocPanelState,
  resolveTocConfig,
  writeTocPanelState,
} from "../src/editor/table-of-contents";

describe("table of contents slugging", () => {
  it("creates readable ids and suffixes duplicate headings", () => {
    const slugger = createTocSlugger();

    expect(slugger("Getting Started")).toBe("getting-started");
    expect(slugger("Getting Started")).toBe("getting-started-2");
    expect(slugger("标题 与 API")).toBe("标题-与-api");
    expect(slugger("!!!")).toBe("heading");
    expect(slugger("!!!")).toBe("heading-2");
  });
});

describe("resolveTocConfig", () => {
  it("defaults to enabled h2-h6 panel settings", () => {
    expect(resolveTocConfig()).toMatchObject({
      enabled: true,
      minLevel: 2,
      maxLevel: 6,
      defaultExpanded: true,
      defaultWidth: 240,
      minWidth: 180,
      maxWidth: 360,
    });
  });

  it("clamps invalid width boundaries into a usable range", () => {
    const config = resolveTocConfig({ defaultWidth: 999, minWidth: 220, maxWidth: 300 });

    expect(config.defaultWidth).toBe(300);
    expect(clampTocWidth(100, config)).toBe(220);
    expect(clampTocWidth(999, config)).toBe(300);
  });
});

describe("toc panel storage", () => {
  it("does not read or write without a storage key", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };

    writeTocPanelState(undefined, { expanded: false, width: 300 }, adapter);

    expect(storage.size).toBe(0);
    expect(readTocPanelState(undefined, adapter)).toBeNull();
  });

  it("round-trips expanded and width when a storage key is configured", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };

    writeTocPanelState("markora:toc", { expanded: false, width: 320 }, adapter);

    expect(readTocPanelState("markora:toc", adapter)).toEqual({ expanded: false, width: 320 });
  });
});
