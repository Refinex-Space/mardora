import { createDraftlyIcon } from "../icons";
import type { DraftlyTocItem } from "./types";

export interface TocPanelRenderState {
  expanded: boolean;
  width: number;
  items: DraftlyTocItem[];
}

export interface TocPanelCallbacks {
  onSelect(item: DraftlyTocItem): void;
  onToggle(): void;
  onResizeStart(event: MouseEvent): void;
}

function appendIcon(parent: HTMLElement, name: string): void {
  const icon = createDraftlyIcon(name);
  if (icon) parent.appendChild(icon);
}

function createHeader(callbacks: TocPanelCallbacks): HTMLElement {
  const header = document.createElement("div");
  header.className = "cm-draftly-toc-header";

  const title = document.createElement("div");
  title.className = "cm-draftly-toc-title";
  appendIcon(title, "table-of-contents");
  const text = document.createElement("span");
  text.textContent = "目录";
  title.appendChild(text);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "cm-draftly-toc-toggle";
  toggle.setAttribute("aria-label", "Toggle table of contents");
  toggle.textContent = "‹";
  toggle.addEventListener("click", callbacks.onToggle);

  header.append(title, toggle);
  return header;
}

function createCollapsed(callbacks: TocPanelCallbacks): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-draftly-toc-collapsed";
  button.setAttribute("aria-label", "Open table of contents");
  appendIcon(button, "table-of-contents");
  const label = document.createElement("span");
  label.textContent = "目录";
  button.appendChild(label);
  button.addEventListener("click", callbacks.onToggle);
  return button;
}

function createItem(item: DraftlyTocItem, callbacks: TocPanelCallbacks): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = item.active ? "cm-draftly-toc-item cm-draftly-toc-item-active" : "cm-draftly-toc-item";
  button.dataset.draftlyTocId = item.id;
  button.dataset.draftlyTocLevel = String(item.level);
  button.title = item.text;
  button.textContent = item.text;
  button.addEventListener("click", () => callbacks.onSelect(item));
  return button;
}

export function createTocPanelElement(state: TocPanelRenderState, callbacks: TocPanelCallbacks): HTMLElement {
  const root = document.createElement("aside");
  root.className = "cm-draftly-toc";
  root.dataset.draftlyTocExpanded = String(state.expanded);
  root.style.setProperty("--draftly-toc-width", `${state.width}px`);

  const resize = document.createElement("div");
  resize.className = "cm-draftly-toc-resize";
  resize.addEventListener("mousedown", callbacks.onResizeStart);
  root.appendChild(resize);

  if (!state.expanded) {
    root.appendChild(createCollapsed(callbacks));
    return root;
  }

  root.appendChild(createHeader(callbacks));

  const list = document.createElement("nav");
  list.className = "cm-draftly-toc-list";
  if (state.items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cm-draftly-toc-empty";
    empty.textContent = "暂无目录";
    list.appendChild(empty);
  } else {
    for (const item of state.items) list.appendChild(createItem(item, callbacks));
  }
  root.appendChild(list);
  return root;
}
