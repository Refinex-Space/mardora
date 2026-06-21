import { afterEach, describe, expect, it } from "bun:test";
import {
  createSelectionToolbarElement,
  formatSelectionToolbarShortcut,
  getSelectionToolbarMessages,
} from "../src/editor/selection-toolbar";
import type { SelectionToolbarMenuCallbacks, SelectionToolbarMenuState } from "../src/editor/selection-toolbar";

class FakeElement {
  className = "";
  type = "";
  value = "";
  disabled = false;
  readonly style = { setProperty: () => undefined };
  readonly dataset: Record<string, string> = {};
  readonly children: FakeElement[] = [];
  private ownTextContent = "";
  private readonly attrs = new Map<string, string>();

  readonly classList = {
    add: (...classes: string[]) => {
      const current = new Set(this.className.split(/\s+/).filter(Boolean));
      for (const className of classes) current.add(className);
      this.className = Array.from(current).join(" ");
    },
  };

  constructor(readonly tagName: string) {}

  get textContent(): string {
    return `${this.ownTextContent}${this.children.map((child) => child.textContent).join("")}`;
  }

  set textContent(value: string) {
    this.ownTextContent = value;
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

  getAttribute(name: string): string | undefined {
    return this.attrs.get(name);
  }

  addEventListener(): void {}

  focus(): void {}

  select(): void {}
}

function installFakeDom(): void {
  globalThis.document = {
    createElement: (tagName: string) => new FakeElement(tagName),
    createElementNS: (_namespace: string, tagName: string) => new FakeElement(tagName),
  } as unknown as Document;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { platform: "Win32" },
  });
}

afterEach(() => {
  delete (globalThis as typeof globalThis & { document?: Document }).document;
  delete (globalThis as typeof globalThis & { navigator?: Navigator }).navigator;
});

function callbacks(): SelectionToolbarMenuCallbacks {
  return {
    onAction: () => undefined,
    onBlockType: () => undefined,
    onColor: () => undefined,
    onHighlight: () => undefined,
    onLinkInput: () => undefined,
    onLinkSubmit: () => undefined,
    onLinkCopy: () => undefined,
    onLinkEmbed: () => undefined,
    onLinkUnembed: () => undefined,
    onLinkOpen: () => undefined,
    onLinkRemove: () => undefined,
    onCancelPanel: () => undefined,
  };
}

describe("selection toolbar i18n", () => {
  it("formats toolbar shortcuts for macOS and non-mac platforms", () => {
    expect(formatSelectionToolbarShortcut("Mod-Shift-b", "MacIntel")).toEqual(["⌘", "⇧", "B"]);
    expect(formatSelectionToolbarShortcut("Mod-Shift-b", "Win32")).toEqual(["Ctrl", "Shift", "B"]);
  });

  it("renders localized button tooltips with shortcuts", () => {
    installFakeDom();
    const messages = getSelectionToolbarMessages("en-US");
    const state: SelectionToolbarMenuState = {
      panel: "toolbar",
      buttons: [{ id: "bold", label: messages.buttons.bold, icon: "bold", shortcut: "Mod-b" }],
      blockType: "text",
      blockTypes: [],
      textColors: [],
      highlightColors: [],
      link: { title: "", url: "", canRemove: false },
      messages,
    };

    const menu = createSelectionToolbarElement(state, callbacks());

    expect(menu.textContent).toContain("Bold");
    expect(menu.textContent).toContain("Ctrl");
    expect(menu.textContent).toContain("B");
  });

  it("renders Chinese tooltip labels from localized toolbar messages", () => {
    installFakeDom();
    const messages = getSelectionToolbarMessages("zh-CN");
    const state: SelectionToolbarMenuState = {
      panel: "toolbar",
      buttons: [{ id: "bold", label: messages.buttons.bold, icon: "bold", shortcut: "Mod-b" }],
      blockType: "text",
      blockTypes: [],
      textColors: [],
      highlightColors: [],
      link: { title: "", url: "", canRemove: false },
      messages,
    };

    const menu = createSelectionToolbarElement(state, callbacks());

    expect(menu.textContent).toContain("加粗");
  });

  it("keeps toolbar buttons visible while rendering the block type menu", () => {
    installFakeDom();
    const messages = getSelectionToolbarMessages("zh-CN");
    const state: SelectionToolbarMenuState = {
      panel: "block-type",
      buttons: [
        { id: "block-type", label: messages.buttons.blockType, icon: "heading-2", text: "H2" },
        { id: "bold", label: messages.buttons.bold, icon: "bold" },
      ],
      blockType: "heading-2",
      blockTypes: [
        { type: "text", label: messages.blockTypes.text, icon: "text-align-start" },
        { type: "heading-2", label: messages.blockTypes["heading-2"], icon: "heading-2" },
      ],
      textColors: [],
      highlightColors: [],
      link: { title: "", url: "", canRemove: false },
      messages,
    };

    const menu = createSelectionToolbarElement(state, callbacks());

    expect(menu.textContent).toContain("H2");
    expect(menu.textContent).toContain("文本");
    expect(menu.textContent).toContain("标题 2");
    expect(menu.className).not.toContain("cm-mardora-selection-toolbar-panel");
  });

  it("renders localized block type menu labels", () => {
    installFakeDom();
    const messages = getSelectionToolbarMessages("en-US");
    const state: SelectionToolbarMenuState = {
      panel: "block-type",
      buttons: [],
      blockType: "text",
      blockTypes: [
        { type: "text", label: messages.blockTypes.text, icon: "text-align-start" },
        { type: "heading-1", label: messages.blockTypes["heading-1"], icon: "heading-1" },
        { type: "heading-2", label: messages.blockTypes["heading-2"], icon: "heading-2" },
      ],
      textColors: [],
      highlightColors: [],
      link: { title: "", url: "", canRemove: false },
      messages,
    };

    const menu = createSelectionToolbarElement(state, callbacks());

    expect(menu.textContent).toContain("Text");
    expect(menu.textContent).toContain("Heading 1");
    expect(menu.textContent).toContain("Heading 2");
  });

  it("renders link embed actions and disables embed for inline links", () => {
    installFakeDom();
    const messages = getSelectionToolbarMessages("en-US");
    const state: SelectionToolbarMenuState = {
      panel: "link",
      buttons: [],
      blockType: "text",
      blockTypes: [],
      textColors: [],
      highlightColors: [],
      link: {
        title: "Octarine",
        url: "https://github.com/Refinex-Space/mardora",
        canRemove: true,
        canEmbed: false,
        isPreview: false,
      },
      messages,
    };

    const menu = createSelectionToolbarElement(state, callbacks()) as unknown as FakeElement;
    const buttons = menu.children.flatMap((child) => child.children).filter((child) => child.tagName === "button");
    const embed = buttons.find((button) => button.getAttribute("aria-label") === messages.link.embed);

    expect(messages.link.embed).toBe("Embed link");
    expect(embed?.disabled).toBe(true);
  });
});
