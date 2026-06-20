import { afterEach, describe, expect, it } from "bun:test";
import { createSelectionToolbarElement, getSelectionToolbarMessages } from "../src/editor/selection-toolbar";
import type { SelectionToolbarMenuCallbacks, SelectionToolbarMenuState } from "../src/editor/selection-toolbar";

class FakeElement {
  className = "";
  type = "";
  value = "";
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

  addEventListener(): void {}
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

function callbacks(): SelectionToolbarMenuCallbacks {
  return {
    onAction: () => undefined,
    onBlockType: () => undefined,
    onColor: () => undefined,
    onHighlight: () => undefined,
    onLinkInput: () => undefined,
    onLinkSubmit: () => undefined,
    onLinkCopy: () => undefined,
    onLinkOpen: () => undefined,
    onLinkRemove: () => undefined,
    onCancelPanel: () => undefined,
  };
}

describe("selection toolbar i18n", () => {
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
    expect(menu.className).not.toContain("cm-markora-selection-toolbar-panel");
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
});
