import { createMardoraIcon } from "../icons";
import type { MardoraTocItem } from "./types";

export interface TocPanelRenderState {
  expanded: boolean;
  width: number;
  items: MardoraTocItem[];
}

export interface TocPanelCallbacks {
  onSelect(item: MardoraTocItem): void;
  onToggle(): void;
  onResizeStart(event: MouseEvent): void;
}

function appendIcon(parent: HTMLElement, name: string): void {
  const icon = createMardoraIcon(name);
  if (icon) parent.appendChild(icon);
}

function handleTocMouseDown(event: MouseEvent, action: () => void): void {
  event.preventDefault();
  event.stopPropagation();
  action();
}

function handleTocClick(event: MouseEvent, action: () => void): void {
  event.stopPropagation();
  if (event.detail !== 0) return;
  event.preventDefault();
  action();
}

function createCollapsed(callbacks: TocPanelCallbacks): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-mardora-toc-collapsed";
  button.setAttribute("aria-label", "Open table of contents");
  appendIcon(button, "table-of-contents");
  button.addEventListener("mousedown", (event) => handleTocMouseDown(event, callbacks.onToggle));
  button.addEventListener("click", (event) => handleTocClick(event, callbacks.onToggle));
  return button;
}

function createItem(item: MardoraTocItem, callbacks: TocPanelCallbacks): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = item.active ? "cm-mardora-toc-item cm-mardora-toc-item-active" : "cm-mardora-toc-item";
  button.dataset.mardoraTocId = item.id;
  button.dataset.mardoraTocLevel = String(item.level);
  button.title = item.text;
  button.textContent = item.text;
  button.addEventListener("mousedown", (event) => handleTocMouseDown(event, () => callbacks.onSelect(item)));
  button.addEventListener("click", (event) => handleTocClick(event, () => callbacks.onSelect(item)));
  return button;
}

export function createTocPanelElement(state: TocPanelRenderState, callbacks: TocPanelCallbacks): HTMLElement {
  const root = document.createElement("aside");
  root.className = "cm-mardora-toc";
  root.dataset.mardoraTocExpanded = String(state.expanded);
  root.style.setProperty("--mardora-toc-width", `${state.width}px`);
  root.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  root.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const resize = document.createElement("div");
  resize.className = "cm-mardora-toc-resize";
  resize.addEventListener("mousedown", callbacks.onResizeStart);
  root.appendChild(resize);

  if (!state.expanded) {
    root.appendChild(createCollapsed(callbacks));
    return root;
  }

  const list = document.createElement("nav");
  list.className = "cm-mardora-toc-list";
  if (state.items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cm-mardora-toc-empty";
    empty.textContent = "暂无目录";
    list.appendChild(empty);
  } else {
    for (const item of state.items) list.appendChild(createItem(item, callbacks));
  }
  root.appendChild(list);
  return root;
}
