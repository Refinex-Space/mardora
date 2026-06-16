import { createMarkoraIcon } from "../icons";
import type {
  SelectionToolbarButton,
  SelectionToolbarMenuCallbacks,
  SelectionToolbarMenuState,
  SelectionToolbarPaletteItem,
} from "./types";

function iconButton(button: SelectionToolbarButton, callbacks: SelectionToolbarMenuCallbacks): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = button.active
    ? "cm-markora-selection-toolbar-button cm-markora-selection-toolbar-button-active"
    : "cm-markora-selection-toolbar-button";
  element.setAttribute("aria-label", button.label);
  element.setAttribute("aria-pressed", String(!!button.active));
  element.dataset.markoraSelectionAction = button.id;
  element.addEventListener("mousedown", (event) => {
    event.preventDefault();
    callbacks.onAction(button.id);
  });

  const icon = createMarkoraIcon(button.icon);
  if (icon) {
    element.appendChild(icon);
  } else {
    element.textContent = button.label;
  }
  return element;
}

function divider(): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = "cm-markora-selection-toolbar-divider";
  element.setAttribute("aria-hidden", "true");
  return element;
}

function appendToolbarButtons(
  root: HTMLElement,
  buttons: SelectionToolbarButton[],
  callbacks: SelectionToolbarMenuCallbacks
): void {
  const groups: SelectionToolbarButton[][] = [buttons.slice(0, 7), buttons.slice(7, 8), buttons.slice(8)];

  groups.forEach((group, index) => {
    if (group.length === 0) return;
    if (index > 0) root.appendChild(divider());
    for (const button of group) root.appendChild(iconButton(button, callbacks));
  });
}

function paletteButton(
  item: SelectionToolbarPaletteItem,
  className: string,
  callback: (value: string | null) => void
): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.setAttribute("aria-label", item.label);
  element.title = item.label;
  element.dataset.markoraSwatch = item.id;
  if (item.value) element.style.setProperty("--markora-swatch-color", item.value);
  element.addEventListener("mousedown", (event) => {
    event.preventDefault();
    callback(item.value);
  });
  return element;
}

function appendPalette(
  root: HTMLElement,
  title: string,
  items: SelectionToolbarPaletteItem[],
  callback: (value: string | null) => void
): void {
  const group = document.createElement("div");
  group.className = "cm-markora-selection-toolbar-palette-group";

  const label = document.createElement("div");
  label.className = "cm-markora-selection-toolbar-palette-label";
  label.textContent = title;
  group.appendChild(label);

  const grid = document.createElement("div");
  grid.className = "cm-markora-selection-toolbar-swatch-grid";
  for (const item of items) {
    grid.appendChild(paletteButton(item, "cm-markora-selection-toolbar-swatch", callback));
  }
  group.appendChild(grid);
  root.appendChild(group);
}

function appendLinkAction(
  actions: HTMLElement,
  label: string,
  iconName: string,
  callback: () => void,
  danger = false
): void {
  const button = document.createElement("button");
  button.type = "button";
  button.className = danger
    ? "cm-markora-selection-toolbar-link-button cm-markora-selection-toolbar-link-button-danger"
    : "cm-markora-selection-toolbar-link-button";
  button.setAttribute("aria-label", label);
  const svg = createMarkoraIcon(iconName);
  if (svg) button.appendChild(svg);
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    callback();
  });
  actions.appendChild(button);
}

function appendLinkPanel(
  root: HTMLElement,
  state: SelectionToolbarMenuState,
  callbacks: SelectionToolbarMenuCallbacks
): void {
  const title = document.createElement("input");
  title.className = "cm-markora-selection-toolbar-link-input";
  title.setAttribute("aria-label", "Link title");
  title.value = state.link.title;
  title.addEventListener("input", () => callbacks.onLinkInput("title", title.value));
  title.addEventListener("keydown", (event) => {
    if (event.key === "Enter") callbacks.onLinkSubmit();
    if (event.key === "Escape") callbacks.onCancelPanel();
  });

  const url = document.createElement("input");
  url.className = "cm-markora-selection-toolbar-link-input";
  url.setAttribute("aria-label", "Link URL");
  url.value = state.link.url;
  url.addEventListener("input", () => callbacks.onLinkInput("url", url.value));
  url.addEventListener("keydown", (event) => {
    if (event.key === "Enter") callbacks.onLinkSubmit();
    if (event.key === "Escape") callbacks.onCancelPanel();
  });

  const actions = document.createElement("div");
  actions.className = "cm-markora-selection-toolbar-link-actions";

  appendLinkAction(actions, state.link.copied ? "Copied" : "Copy link", "copy", callbacks.onLinkCopy);
  appendLinkAction(actions, "Open link", "external-link", callbacks.onLinkOpen);
  if (state.link.canRemove) appendLinkAction(actions, "Remove link", "trash-2", callbacks.onLinkRemove, true);

  root.append(title, url);
  if (state.link.error) {
    const error = document.createElement("div");
    error.className = "cm-markora-selection-toolbar-error";
    error.textContent = state.link.error;
    root.appendChild(error);
  }
  root.appendChild(actions);
  queueMicrotask(() => {
    title.focus();
    title.select();
  });
}

export function createSelectionToolbarElement(
  state: SelectionToolbarMenuState,
  callbacks: SelectionToolbarMenuCallbacks
): HTMLElement {
  const root = document.createElement("div");
  root.className =
    state.panel === "toolbar"
      ? "cm-markora-selection-toolbar"
      : "cm-markora-selection-toolbar cm-markora-selection-toolbar-panel";
  root.setAttribute("role", "toolbar");
  root.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(".cm-markora-selection-toolbar-link-input")) return;
    event.preventDefault();
  });

  if (state.panel === "toolbar") {
    appendToolbarButtons(root, state.buttons, callbacks);
  } else if (state.panel === "link") {
    appendLinkPanel(root, state, callbacks);
  } else if (state.panel === "color") {
    appendPalette(root, "文字颜色", state.textColors, callbacks.onColor);
  } else {
    appendPalette(root, "高亮颜色", state.highlightColors, callbacks.onHighlight);
  }

  return root;
}
