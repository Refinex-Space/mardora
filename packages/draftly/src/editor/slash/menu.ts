import type { DraftlySlashCommand } from "./types";
import { createDraftlyIcon } from "../icons";
import type { DraftlyLocale } from "../i18n";
import type { DraftlySlashMessages } from "./types";

export type DraftlySlashMenuState = {
  commands: DraftlySlashCommand[];
  activeIndex: number;
  messages: DraftlySlashMessages;
};

export type DraftlySlashMenuCallbacks = {
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
};

const slashMessages: Record<DraftlyLocale, DraftlySlashMessages> = {
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

export function getSlashMessages(locale: DraftlyLocale): DraftlySlashMessages {
  return slashMessages[locale];
}

export function createSlashMenuElement(
  state: DraftlySlashMenuState,
  callbacks: DraftlySlashMenuCallbacks
): HTMLElement {
  const { messages } = state;
  const root = document.createElement("div");
  root.className = "cm-draftly-slash-menu";
  root.setAttribute("role", "listbox");

  const list = document.createElement("div");
  list.className = "cm-draftly-slash-list";
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
    empty.className = "cm-draftly-slash-empty";
    empty.textContent = messages.empty;
    list.appendChild(empty);
    root.appendChild(list);
    return root;
  }

  let currentGroup: DraftlySlashCommand["group"] | null = null;

  for (const [index, command] of state.commands.entries()) {
    if (command.group !== currentGroup) {
      currentGroup = command.group;
      const label = document.createElement("div");
      label.className = "cm-draftly-slash-group";
      label.textContent = messages.groups[currentGroup];
      list.appendChild(label);
    }

    const item = document.createElement("button");
    item.type = "button";
    item.className =
      index === state.activeIndex ? "cm-draftly-slash-item cm-draftly-slash-item-active" : "cm-draftly-slash-item";
    item.dataset.draftlySlashIndex = String(index);
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(index === state.activeIndex));
    item.addEventListener("mouseenter", () => callbacks.onHover(index));
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      callbacks.onSelect(index);
    });

    const icon = document.createElement("span");
    icon.className = "cm-draftly-slash-icon";
    const svgIcon = createDraftlyIcon(command.icon);
    if (svgIcon) {
      icon.appendChild(svgIcon);
    } else {
      icon.textContent = command.icon;
    }

    const title = document.createElement("span");
    title.className = "cm-draftly-slash-title";
    title.textContent = command.title;

    const hint = document.createElement("span");
    hint.className = "cm-draftly-slash-hint";
    hint.textContent = command.hint;

    item.append(icon, title, hint);
    list.appendChild(item);
  }

  const footer = document.createElement("div");
  footer.className = "cm-draftly-slash-footer";
  footer.innerHTML = `<span>${messages.close}</span><span>${messages.closeHint}</span>`;
  root.append(list, footer);

  return root;
}
