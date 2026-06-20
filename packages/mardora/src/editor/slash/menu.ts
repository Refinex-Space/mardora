import type { MardoraSlashCommand } from "./types";
import { createMardoraIcon } from "../icons";
import type { MardoraLocale } from "../i18n";
import type { MardoraSlashMessages } from "./types";

export type MardoraSlashMenuState = {
  commands: MardoraSlashCommand[];
  activeIndex: number;
  messages: MardoraSlashMessages;
};

export type MardoraSlashMenuCallbacks = {
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
};

const slashMessages: Record<MardoraLocale, MardoraSlashMessages> = {
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

export function getSlashMessages(locale: MardoraLocale): MardoraSlashMessages {
  return slashMessages[locale];
}

export function createSlashMenuElement(
  state: MardoraSlashMenuState,
  callbacks: MardoraSlashMenuCallbacks
): HTMLElement {
  const { messages } = state;
  const root = document.createElement("div");
  root.className = "cm-mardora-slash-menu";
  root.setAttribute("role", "listbox");

  const list = document.createElement("div");
  list.className = "cm-mardora-slash-list";
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
    empty.className = "cm-mardora-slash-empty";
    empty.textContent = messages.empty;
    list.appendChild(empty);
    root.appendChild(list);
    return root;
  }

  let currentGroup: MardoraSlashCommand["group"] | null = null;

  for (const [index, command] of state.commands.entries()) {
    if (command.group !== currentGroup) {
      currentGroup = command.group;
      const label = document.createElement("div");
      label.className = "cm-mardora-slash-group";
      label.textContent = messages.groups[currentGroup];
      list.appendChild(label);
    }

    const item = document.createElement("button");
    item.type = "button";
    item.className =
      index === state.activeIndex ? "cm-mardora-slash-item cm-mardora-slash-item-active" : "cm-mardora-slash-item";
    item.dataset.mardoraSlashIndex = String(index);
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(index === state.activeIndex));
    item.addEventListener("mouseenter", () => callbacks.onHover(index));
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      callbacks.onSelect(index);
    });

    const icon = document.createElement("span");
    icon.className = "cm-mardora-slash-icon";
    const svgIcon = createMardoraIcon(command.icon);
    if (svgIcon) {
      icon.appendChild(svgIcon);
    } else {
      icon.textContent = command.icon;
    }

    const title = document.createElement("span");
    title.className = "cm-mardora-slash-title";
    title.textContent = command.title;

    const hint = document.createElement("span");
    hint.className = "cm-mardora-slash-hint";
    hint.textContent = command.hint;

    item.append(icon, title, hint);
    list.appendChild(item);
  }

  const footer = document.createElement("div");
  footer.className = "cm-mardora-slash-footer";
  footer.innerHTML = `<span>${messages.close}</span><span>${messages.closeHint}</span>`;
  root.append(list, footer);

  return root;
}
