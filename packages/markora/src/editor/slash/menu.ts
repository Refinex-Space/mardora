import type { MarkoraSlashCommand } from "./types";
import { createMarkoraIcon } from "../icons";
import type { MarkoraLocale } from "../i18n";
import type { MarkoraSlashMessages } from "./types";

export type MarkoraSlashMenuState = {
  commands: MarkoraSlashCommand[];
  activeIndex: number;
  messages: MarkoraSlashMessages;
};

export type MarkoraSlashMenuCallbacks = {
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
};

const slashMessages: Record<MarkoraLocale, MarkoraSlashMessages> = {
  "zh-CN": {
    groups: {
      basic: "基本区块",
      media: "媒体",
    },
    empty: "没有匹配的命令",
    close: "关闭菜单",
    closeHint: "esc",
  },
  "en-US": {
    groups: {
      basic: "Basic blocks",
      media: "Media",
    },
    empty: "No matching commands",
    close: "Close menu",
    closeHint: "esc",
  },
};

export function getSlashMessages(locale: MarkoraLocale): MarkoraSlashMessages {
  return slashMessages[locale];
}

export function createSlashMenuElement(
  state: MarkoraSlashMenuState,
  callbacks: MarkoraSlashMenuCallbacks
): HTMLElement {
  const { messages } = state;
  const root = document.createElement("div");
  root.className = "cm-markora-slash-menu";
  root.setAttribute("role", "listbox");

  const list = document.createElement("div");
  list.className = "cm-markora-slash-list";
  root.addEventListener(
    "wheel",
    (event) => {
      list.scrollTop += event.deltaY;
      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true, passive: false }
  );

  if (state.commands.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cm-markora-slash-empty";
    empty.textContent = messages.empty;
    list.appendChild(empty);
    root.appendChild(list);
    return root;
  }

  let currentGroup: MarkoraSlashCommand["group"] | null = null;

  for (const [index, command] of state.commands.entries()) {
    if (command.group !== currentGroup) {
      currentGroup = command.group;
      const label = document.createElement("div");
      label.className = "cm-markora-slash-group";
      label.textContent = messages.groups[currentGroup];
      list.appendChild(label);
    }

    const item = document.createElement("button");
    item.type = "button";
    item.className =
      index === state.activeIndex ? "cm-markora-slash-item cm-markora-slash-item-active" : "cm-markora-slash-item";
    item.dataset.markoraSlashIndex = String(index);
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(index === state.activeIndex));
    item.addEventListener("mouseenter", () => callbacks.onHover(index));
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      callbacks.onSelect(index);
    });

    const icon = document.createElement("span");
    icon.className = "cm-markora-slash-icon";
    const svgIcon = createMarkoraIcon(command.icon);
    if (svgIcon) {
      icon.appendChild(svgIcon);
    } else {
      icon.textContent = command.icon;
    }

    const title = document.createElement("span");
    title.className = "cm-markora-slash-title";
    title.textContent = command.title;

    const hint = document.createElement("span");
    hint.className = "cm-markora-slash-hint";
    hint.textContent = command.hint;

    item.append(icon, title, hint);
    list.appendChild(item);
  }

  const footer = document.createElement("div");
  footer.className = "cm-markora-slash-footer";
  footer.innerHTML = `<span>${messages.close}</span><span>${messages.closeHint}</span>`;
  root.append(list, footer);

  return root;
}
