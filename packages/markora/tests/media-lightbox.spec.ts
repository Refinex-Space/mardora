import { afterEach, describe, expect, it } from "bun:test";
import { consumeMediaLightboxTrigger, openMediaLightbox } from "../src/editor/media-lightbox";

class FakeElement {
  className = "";
  innerHTML = "";
  textContent = "";
  type = "";
  title = "";
  src = "";
  alt = "";
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, string> = {};
  ownerDocument: FakeDocument | null = null;
  parentElement: FakeElement | null = null;
  private readonly attrs = new Map<string, string>();
  private readonly listeners = new Map<string, Array<(event: Event) => void>>();

  constructor(readonly tagName: string) {}

  appendChild(child: FakeElement): FakeElement {
    child.parentElement = this;
    child.ownerDocument = this.ownerDocument;
    this.children.push(child);
    return child;
  }

  remove(): void {
    if (!this.parentElement) return;
    this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
    this.parentElement = null;
  }

  focus(): void {
    this.ownerDocument?.setActiveElement(this);
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

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event);
    }
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

  closest(selector: string): FakeElement | null {
    let current: FakeElement | null = this;
    while (current) {
      if (matchesSelector(current, selector)) return current;
      current = current.parentElement;
    }
    return null;
  }
}

class FakeDocument {
  readonly body = this.createElement("body");
  activeElement: FakeElement | null = null;
  private readonly listeners = new Map<string, Array<(event: Event) => void>>();

  createElement(tagName: string): FakeElement {
    const element = new FakeElement(tagName);
    element.ownerDocument = this;
    return element;
  }

  createElementNS(_namespace: string, tagName: string): FakeElement {
    return this.createElement(tagName);
  }

  querySelector(selector: string): FakeElement | null {
    return this.body.querySelector(selector);
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      listeners.filter((item) => item !== listener)
    );
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event);
    }
    return true;
  }

  setActiveElement(element: FakeElement): void {
    this.activeElement = element;
  }
}

function matchesSelector(node: FakeElement, selector: string): boolean {
  if (selector.startsWith(".")) {
    return node.className.split(/\s+/).includes(selector.slice(1));
  }
  return node.tagName === selector.toLowerCase();
}

function installFakeDom(): FakeDocument {
  const fakeDocument = new FakeDocument();
  globalThis.document = fakeDocument as unknown as Document;
  globalThis.KeyboardEvent = class FakeKeyboardEvent extends Event {
    readonly key: string;

    constructor(type: string, init?: { key?: string }) {
      super(type);
      this.key = init?.key ?? "";
    }
  } as unknown as typeof KeyboardEvent;
  return fakeDocument;
}

afterEach(() => {
  delete (globalThis as typeof globalThis & { document?: Document }).document;
  delete (globalThis as typeof globalThis & { KeyboardEvent?: typeof KeyboardEvent }).KeyboardEvent;
});

describe("consumeMediaLightboxTrigger", () => {
  it("prevents the preview button from activating the underlying widget", () => {
    const calls: string[] = [];

    consumeMediaLightboxTrigger({
      preventDefault: () => calls.push("preventDefault"),
      stopPropagation: () => calls.push("stopPropagation"),
    });

    expect(calls).toEqual(["preventDefault", "stopPropagation"]);
  });
});

describe("openMediaLightbox", () => {
  it("renders image content in a dismissible dialog", () => {
    const fakeDocument = installFakeDom();
    const returnFocus = fakeDocument.createElement("button");
    fakeDocument.body.appendChild(returnFocus);

    const lightbox = openMediaLightbox(fakeDocument as unknown as Document, {
      content: { kind: "image", src: "https://example.com/a.png", alt: "Diagram", title: "Architecture" },
      returnFocus: returnFocus as unknown as HTMLElement,
    });

    expect(fakeDocument.body.querySelector(".cm-markora-media-lightbox")).not.toBeNull();
    expect(fakeDocument.body.querySelector("img")?.src).toBe("https://example.com/a.png");
    expect(fakeDocument.body.querySelector("img")?.alt).toBe("Diagram");

    lightbox.close();

    expect(fakeDocument.body.querySelector(".cm-markora-media-lightbox")).toBeNull();
    expect(fakeDocument.activeElement).toBe(returnFocus);
  });

  it("mounts inside the owning CodeMirror editor so scoped theme styles apply", () => {
    const fakeDocument = installFakeDom();
    const editor = fakeDocument.createElement("div");
    editor.className = "cm-editor";
    const returnFocus = fakeDocument.createElement("button");
    editor.appendChild(returnFocus);
    fakeDocument.body.appendChild(editor);

    openMediaLightbox(fakeDocument as unknown as Document, {
      content: { kind: "image", src: "https://example.com/a.png", alt: "Diagram" },
      returnFocus: returnFocus as unknown as HTMLElement,
    });

    expect(editor.querySelector(".cm-markora-media-lightbox")).not.toBeNull();
    expect(fakeDocument.body.children.some((child) => child.className === "cm-markora-media-lightbox")).toBe(false);
  });

  it("closes from Escape", () => {
    const fakeDocument = installFakeDom();

    openMediaLightbox(fakeDocument as unknown as Document, {
      content: { kind: "html", html: "<svg></svg>", title: "Mermaid" },
    });

    fakeDocument.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(fakeDocument.body.querySelector(".cm-markora-media-lightbox")).toBeNull();
  });
});
