import { afterEach, describe, expect, it } from "bun:test";
import { createTocPanelElement } from "../src/editor/table-of-contents";

class FakeStyle {
  private values = new Map<string, string>();

  setProperty(name: string, value: string): void {
    this.values.set(name, value);
  }
}

class FakeElement {
  className = "";
  title = "";
  type = "";
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly style = new FakeStyle();
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
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      return this.dataset[key] ?? null;
    }
    return this.attrs.get(name) ?? null;
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type) ?? [];
    for (const listener of listeners) listener(event);
    return true;
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const results: FakeElement[] = [];
    const visit = (node: FakeElement) => {
      if (matchesSelector(node, selector)) results.push(node);
      for (const child of node.children) visit(child);
    };
    visit(this);
    return results;
  }
}

function matchesSelector(node: FakeElement, selector: string): boolean {
  if (selector.startsWith(".")) {
    const className = selector.slice(1);
    return node.className.split(/\s+/).includes(className);
  }
  const dataMatch = /^\[data-([^=]+)="([^"]+)"\]$/.exec(selector);
  if (dataMatch) {
    const key = dataMatch[1]!.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return node.dataset[key] === dataMatch[2];
  }
  return false;
}

function installFakeDom(): void {
  const fakeDocument = {
    createElement: (tagName: string) => new FakeElement(tagName),
    createElementNS: (_namespace: string, tagName: string) => new FakeElement(tagName),
  };
  globalThis.document = fakeDocument as unknown as Document;
  globalThis.MouseEvent = class FakeMouseEvent extends Event {
    readonly detail: number;

    constructor(type: string, init?: EventInit) {
      super(type, init);
      this.detail = (init as MouseEventInit | undefined)?.detail ?? 0;
    }
  } as unknown as typeof MouseEvent;
}

afterEach(() => {
  delete (globalThis as typeof globalThis & { document?: Document }).document;
  delete (globalThis as typeof globalThis & { MouseEvent?: typeof MouseEvent }).MouseEvent;
});

describe("createTocPanelElement", () => {
  it("renders full panel items with active and nested states", () => {
    installFakeDom();
    const calls: string[] = [];
    const panel = createTocPanelElement(
      {
        expanded: true,
        width: 240,
        items: [
          { id: "intro", level: 2, text: "Intro", from: 0, to: 8, active: true },
          { id: "details", level: 3, text: "Details", from: 10, to: 22, active: false },
        ],
      },
      {
        onSelect: (item) => calls.push(item.id),
        onToggle: () => calls.push("toggle"),
        onResizeStart: () => calls.push("resize"),
      }
    );

    expect(panel.className).toContain("cm-mardora-toc");
    expect(panel.getAttribute("data-mardora-toc-expanded")).toBe("true");
    expect(panel.querySelector(".cm-mardora-toc-toggle")).toBeNull();
    expect(panel.querySelectorAll(".cm-mardora-toc-item").length).toBe(2);
    expect(panel.querySelector(".cm-mardora-toc-item-active")?.textContent).toContain("Intro");
    expect(panel.querySelector('[data-mardora-toc-level="3"]')?.textContent).toContain("Details");

    panel
      .querySelector<HTMLButtonElement>(".cm-mardora-toc-item")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(calls).toEqual(["intro"]);
  });

  it("selects table of contents items on mouse down before the editor can handle the press", () => {
    installFakeDom();
    const calls: string[] = [];
    const panel = createTocPanelElement(
      {
        expanded: true,
        width: 240,
        items: [{ id: "intro", level: 2, text: "Intro", from: 0, to: 8, active: true }],
      },
      {
        onSelect: (item) => calls.push(item.id),
        onToggle: () => undefined,
        onResizeStart: () => undefined,
      }
    );
    const event = new MouseEvent("mousedown", { cancelable: true, bubbles: true });

    panel.querySelector<HTMLButtonElement>(".cm-mardora-toc-item")?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(calls).toEqual(["intro"]);
  });

  it("keeps table of contents mouse presses out of the editor surface", () => {
    installFakeDom();
    const panel = createTocPanelElement(
      {
        expanded: true,
        width: 240,
        items: [{ id: "intro", level: 2, text: "Intro", from: 0, to: 8, active: true }],
      },
      {
        onSelect: () => undefined,
        onToggle: () => undefined,
        onResizeStart: () => undefined,
      }
    );
    const event = new MouseEvent("mousedown", { cancelable: true, bubbles: true });

    panel.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("renders collapsed rail and empty state", () => {
    installFakeDom();
    const panel = createTocPanelElement(
      { expanded: false, width: 240, items: [] },
      { onSelect: () => undefined, onToggle: () => undefined, onResizeStart: () => undefined }
    );

    expect(panel.getAttribute("data-mardora-toc-expanded")).toBe("false");
    expect(panel.querySelector(".cm-mardora-toc-collapsed")).not.toBeNull();
  });
});
