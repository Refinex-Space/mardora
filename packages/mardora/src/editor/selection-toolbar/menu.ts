import { createMardoraIcon } from "../icons";
import type {
  SelectionToolbarBlockType,
  SelectionToolbarButton,
  SelectionToolbarMenuCallbacks,
  SelectionToolbarMenuState,
  SelectionToolbarPaletteItem,
} from "./types";

function iconButton(button: SelectionToolbarButton, callbacks: SelectionToolbarMenuCallbacks): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = button.active
    ? "cm-mardora-selection-toolbar-button cm-mardora-selection-toolbar-button-active"
    : "cm-mardora-selection-toolbar-button";
  element.setAttribute("aria-label", button.label);
  element.setAttribute("aria-pressed", String(!!button.active));
  element.dataset.mardoraSelectionAction = button.id;
  element.addEventListener("mousedown", (event) => {
    event.preventDefault();
    callbacks.onAction(button.id);
  });

  if (button.text) {
    element.classList.add("cm-mardora-selection-toolbar-block-button");
    const label = document.createElement("span");
    label.className = "cm-mardora-selection-toolbar-button-text";
    label.textContent = button.text;
    element.appendChild(label);
  } else if (button.id === "block-type") {
    element.classList.add("cm-mardora-selection-toolbar-block-button");
    const icon = createMardoraIcon(button.icon);
    if (icon) element.appendChild(icon);
  } else {
    const icon = createMardoraIcon(button.icon);
    if (icon) {
      element.appendChild(icon);
    } else {
      element.textContent = button.label;
    }
  }
  return element;
}

function blockTypeIcon(type: SelectionToolbarBlockType): HTMLElement {
  const icon = document.createElement("span");
  icon.className = "cm-mardora-selection-toolbar-block-menu-icon";
  if (type === "text") {
    const svg = createMardoraIcon("text-align-start");
    if (svg) icon.appendChild(svg);
  } else {
    icon.textContent = `H${type.slice("heading-".length)}`;
  }
  return icon;
}

function appendBlockTypePanel(
  root: HTMLElement,
  state: SelectionToolbarMenuState,
  callbacks: SelectionToolbarMenuCallbacks
): void {
  const list = document.createElement("div");
  list.className = "cm-mardora-selection-toolbar-block-menu";
  list.setAttribute("role", "menu");

  for (const item of state.blockTypes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      item.type === state.blockType
        ? "cm-mardora-selection-toolbar-block-item cm-mardora-selection-toolbar-block-item-active"
        : "cm-mardora-selection-toolbar-block-item";
    button.setAttribute("aria-label", item.label);
    button.setAttribute("aria-pressed", String(item.type === state.blockType));
    button.setAttribute("role", "menuitemradio");
    button.dataset.mardoraBlockType = item.type;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      callbacks.onBlockType(item.type);
    });

    const label = document.createElement("span");
    label.className = "cm-mardora-selection-toolbar-block-menu-label";
    label.textContent = item.label;

    button.append(blockTypeIcon(item.type), label);
    list.appendChild(button);
  }

  root.appendChild(list);
}

function divider(): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = "cm-mardora-selection-toolbar-divider";
  element.setAttribute("aria-hidden", "true");
  return element;
}

function appendToolbarButtons(
  root: HTMLElement,
  buttons: SelectionToolbarButton[],
  callbacks: SelectionToolbarMenuCallbacks
): void {
  const groups: SelectionToolbarButton[][] = [buttons.slice(0, 1), buttons.slice(1, 8), buttons.slice(8, 9), buttons.slice(9)];

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
  element.dataset.mardoraSwatch = item.id;
  if (item.value) element.style.setProperty("--mardora-swatch-color", item.value);
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
  group.className = "cm-mardora-selection-toolbar-palette-group";

  const label = document.createElement("div");
  label.className = "cm-mardora-selection-toolbar-palette-label";
  label.textContent = title;
  group.appendChild(label);

  const grid = document.createElement("div");
  grid.className = "cm-mardora-selection-toolbar-swatch-grid";
  for (const item of items) {
    grid.appendChild(paletteButton(item, "cm-mardora-selection-toolbar-swatch", callback));
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
    ? "cm-mardora-selection-toolbar-link-button cm-mardora-selection-toolbar-link-button-danger"
    : "cm-mardora-selection-toolbar-link-button";
  button.setAttribute("aria-label", label);
  const svg = createMardoraIcon(iconName);
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
  title.className = "cm-mardora-selection-toolbar-link-input";
  title.setAttribute("aria-label", state.messages.link.title);
  title.value = state.link.title;
  title.addEventListener("input", () => callbacks.onLinkInput("title", title.value));
  title.addEventListener("keydown", (event) => {
    if (event.key === "Enter") callbacks.onLinkSubmit();
    if (event.key === "Escape") callbacks.onCancelPanel();
  });

  const url = document.createElement("input");
  url.className = "cm-mardora-selection-toolbar-link-input";
  url.setAttribute("aria-label", state.messages.link.url);
  url.value = state.link.url;
  url.addEventListener("input", () => callbacks.onLinkInput("url", url.value));
  url.addEventListener("keydown", (event) => {
    if (event.key === "Enter") callbacks.onLinkSubmit();
    if (event.key === "Escape") callbacks.onCancelPanel();
  });

  const actions = document.createElement("div");
  actions.className = "cm-mardora-selection-toolbar-link-actions";

  appendLinkAction(actions, state.link.copied ? state.messages.link.copied : state.messages.link.copy, "copy", callbacks.onLinkCopy);
  appendLinkAction(actions, state.messages.link.open, "external-link", callbacks.onLinkOpen);
  if (state.link.canRemove) appendLinkAction(actions, state.messages.link.remove, "trash-2", callbacks.onLinkRemove, true);

  root.append(title, url);
  if (state.link.error) {
    const error = document.createElement("div");
    error.className = "cm-mardora-selection-toolbar-error";
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
    state.panel === "toolbar" || state.panel === "block-type"
      ? "cm-mardora-selection-toolbar"
      : "cm-mardora-selection-toolbar cm-mardora-selection-toolbar-panel";
  root.setAttribute("role", "toolbar");
  root.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(".cm-mardora-selection-toolbar-link-input")) return;
    event.preventDefault();
  });

  if (state.panel === "toolbar" || state.panel === "block-type") {
    appendToolbarButtons(root, state.buttons, callbacks);
    if (state.panel === "block-type") appendBlockTypePanel(root, state, callbacks);
  } else if (state.panel === "link") {
    appendLinkPanel(root, state, callbacks);
  } else if (state.panel === "color") {
    appendPalette(root, state.messages.panels.textColor, state.textColors, callbacks.onColor);
  } else {
    appendPalette(root, state.messages.panels.highlightColor, state.highlightColors, callbacks.onHighlight);
  }

  return root;
}
