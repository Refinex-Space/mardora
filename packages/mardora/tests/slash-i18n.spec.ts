import { afterEach, describe, expect, it } from "bun:test";
import { defaultMardoraLocale, resolveMardoraLocale } from "../src/editor";
import {
  createSlashMenuElement,
  createSlashRuntimeConfig,
  defaultSlashCommands,
  filterSlashCommands,
  getDefaultSlashCommands,
  getSlashMessages,
} from "../src/editor/slash";
import type { MardoraSlashCommand } from "../src/editor/slash";

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

const commands: MardoraSlashCommand[] = [
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
    expect(defaultMardoraLocale).toBe("zh-CN");
    expect(resolveMardoraLocale()).toBe("zh-CN");
    expect(resolveMardoraLocale("en-US")).toBe("en-US");
    expect(resolveMardoraLocale("fr-FR" as never)).toBe("zh-CN");
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

describe("localized default slash commands", () => {
  it("keeps defaultSlashCommands Chinese for compatibility", () => {
    expect(defaultSlashCommands.find((command) => command.id === "paragraph")?.title).toBe("文本");
    expect(defaultSlashCommands.find((command) => command.id === "image")?.title).toBe("图片");
  });

  it("returns English command titles for en-US", () => {
    const commands = getDefaultSlashCommands("en-US");

    expect(commands.find((command) => command.id === "paragraph")?.title).toBe("Text");
    expect(commands.find((command) => command.id === "code-block")?.title).toBe("Code block");
    expect(commands.find((command) => command.id === "ordered-list")?.title).toBe("Numbered list");
    expect(commands.find((command) => command.id === "callout-warning")?.title).toBe("Warning callout");
    expect(commands.find((command) => command.id === "image")?.title).toBe("Image");
  });

  it("supports Chinese and English search terms in both locales", () => {
    const zhCommands = getDefaultSlashCommands("zh-CN");
    const enCommands = getDefaultSlashCommands("en-US");

    expect(filterSlashCommands(zhCommands, "图片").map((command) => command.id)).toEqual(["image"]);
    expect(filterSlashCommands(zhCommands, "image").map((command) => command.id)).toEqual(["image"]);
    expect(filterSlashCommands(enCommands, "图片").map((command) => command.id)).toEqual(["image"]);
    expect(filterSlashCommands(enCommands, "image").map((command) => command.id)).toEqual(["image"]);
    expect(filterSlashCommands(zhCommands, "告警").map((command) => command.id)).toEqual([
      "callout-note",
      "callout-tip",
      "callout-important",
      "callout-warning",
      "callout-caution",
    ]);
    expect(filterSlashCommands(enCommands, "warning").map((command) => command.id)).toEqual(["callout-warning"]);
    expect(filterSlashCommands(enCommands, "提示").map((command) => command.id)).toEqual([
      "callout-note",
      "callout-tip",
    ]);
    expect(filterSlashCommands(zhCommands, "代码").map((command) => command.id)).toEqual(["code-block"]);
    expect(filterSlashCommands(zhCommands, "code").map((command) => command.id)).toEqual(["code-block"]);
    expect(filterSlashCommands(enCommands, "代码").map((command) => command.id)).toEqual(["code-block"]);
    expect(filterSlashCommands(enCommands, "fence").map((command) => command.id)).toEqual(["code-block"]);
    expect(filterSlashCommands(zhCommands, "note").map((command) => command.id)).toEqual(["callout-note"]);
    expect(filterSlashCommands(enCommands, "标题").map((command) => command.id)).toEqual([
      "heading-1",
      "heading-2",
      "heading-3",
      "heading-4",
      "heading-5",
      "heading-6",
    ]);
  });
});

describe("slash runtime i18n config", () => {
  it("uses English default commands when slash locale is en-US", () => {
    const runtime = createSlashRuntimeConfig({ locale: "en-US" });

    expect(runtime.commands.find((command) => command.id === "paragraph")?.title).toBe("Text");
    expect(runtime.messages.close).toBe("Close menu");
  });

  it("preserves custom command titles while localizing menu chrome", () => {
    const custom: MardoraSlashCommand[] = [
      {
        id: "custom",
        group: "basic",
        title: "自定义命令",
        aliases: ["custom"],
        icon: "type",
        hint: "",
        run: () => true,
      },
    ];
    const runtime = createSlashRuntimeConfig({ locale: "en-US", commands: custom });

    expect(runtime.commands).toBe(custom);
    expect(runtime.commands[0]?.title).toBe("自定义命令");
    expect(runtime.messages.groups.basic).toBe("Basic blocks");
  });
});
