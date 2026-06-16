import { afterEach, describe, expect, it } from "bun:test";
import { defaultDraftlyLocale, resolveDraftlyLocale } from "../src/editor";
import { createSlashMenuElement, getSlashMessages } from "../src/editor/slash";
import type { DraftlySlashCommand } from "../src/editor/slash";

class FakeElement {
  className = "";
  type = "";
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  private readonly attrs = new Map<string, string>();
  private readonly listeners = new Map<string, Array<(event: Event) => void>>();
  private ownTextContent = "";

  constructor(readonly tagName: string) {}

  get textContent(): string {
    return `${this.ownTextContent}${this.children.map((child) => child.textContent).join("")}`;
  }

  set textContent(value: string) {
    this.ownTextContent = value;
  }

  set innerHTML(value: string) {
    this.ownTextContent = value.replace(/<[^>]+>/g, "");
  }

  append(...children: FakeElement[]): void {
    for (const child of children) this.appendChild(child);
  }

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const results: FakeElement[] = [];
    const visit = (node: FakeElement) => {
      if (selector.startsWith(".") && node.className.split(/\s+/).includes(selector.slice(1))) {
        results.push(node);
      }
      for (const child of node.children) visit(child);
    };
    visit(this);
    return results;
  }
}

function installFakeDom(): void {
  globalThis.document = {
    createElement: (tagName: string) => new FakeElement(tagName),
    createElementNS: (_namespace: string, tagName: string) => new FakeElement(tagName),
  } as unknown as Document;
}

afterEach(() => {
  delete (globalThis as typeof globalThis & { document?: Document }).document;
});

const commands: DraftlySlashCommand[] = [
  {
    id: "paragraph",
    group: "basic",
    title: "Text",
    aliases: ["文本", "text"],
    icon: "type",
    hint: "",
    run: () => true,
  },
  {
    id: "image",
    group: "media",
    title: "Image",
    aliases: ["图片", "image"],
    icon: "image",
    hint: "img",
    run: () => true,
  },
];

describe("slash i18n", () => {
  it("defaults to Chinese locale", () => {
    expect(defaultDraftlyLocale).toBe("zh-CN");
    expect(resolveDraftlyLocale()).toBe("zh-CN");
    expect(resolveDraftlyLocale("en-US")).toBe("en-US");
    expect(resolveDraftlyLocale("fr-FR" as never)).toBe("zh-CN");
  });

  it("renders Chinese slash menu chrome by default", () => {
    installFakeDom();
    const menu = createSlashMenuElement(
      { commands, activeIndex: 0, messages: getSlashMessages("zh-CN") },
      { onHover: () => undefined, onSelect: () => undefined }
    );

    expect(menu.textContent).toContain("基本区块");
    expect(menu.textContent).toContain("媒体");
    expect(menu.textContent).toContain("关闭菜单");
  });

  it("renders English slash menu chrome", () => {
    installFakeDom();
    const menu = createSlashMenuElement(
      { commands: [], activeIndex: 0, messages: getSlashMessages("en-US") },
      { onHover: () => undefined, onSelect: () => undefined }
    );

    expect(menu.textContent).toContain("No matching commands");
  });
});
