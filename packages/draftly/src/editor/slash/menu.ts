import type { DraftlySlashCommand } from "./types";

export type DraftlySlashMenuState = {
  commands: DraftlySlashCommand[];
  activeIndex: number;
};

export type DraftlySlashMenuCallbacks = {
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
};

const groupLabels: Record<DraftlySlashCommand["group"], string> = {
  basic: "基本区块",
  media: "媒体",
};

export function createSlashMenuElement(
  state: DraftlySlashMenuState,
  callbacks: DraftlySlashMenuCallbacks
): HTMLElement {
  const root = document.createElement("div");
  root.className = "cm-draftly-slash-menu";
  root.setAttribute("role", "listbox");

  if (state.commands.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cm-draftly-slash-empty";
    empty.textContent = "没有匹配的命令";
    root.appendChild(empty);
    return root;
  }

  let currentGroup: DraftlySlashCommand["group"] | null = null;

  for (const [index, command] of state.commands.entries()) {
    if (command.group !== currentGroup) {
      currentGroup = command.group;
      const label = document.createElement("div");
      label.className = "cm-draftly-slash-group";
      label.textContent = groupLabels[currentGroup];
      root.appendChild(label);
    }

    const item = document.createElement("button");
    item.type = "button";
    item.className =
      index === state.activeIndex ? "cm-draftly-slash-item cm-draftly-slash-item-active" : "cm-draftly-slash-item";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(index === state.activeIndex));
    item.addEventListener("mouseenter", () => callbacks.onHover(index));
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      callbacks.onSelect(index);
    });

    const icon = document.createElement("span");
    icon.className = "cm-draftly-slash-icon";
    icon.textContent = command.icon;

    const title = document.createElement("span");
    title.className = "cm-draftly-slash-title";
    title.textContent = command.title;

    const hint = document.createElement("span");
    hint.className = "cm-draftly-slash-hint";
    hint.textContent = command.hint;

    item.append(icon, title, hint);
    root.appendChild(item);
  }

  const footer = document.createElement("div");
  footer.className = "cm-draftly-slash-footer";
  footer.innerHTML = "<span>关闭菜单</span><span>esc</span>";
  root.appendChild(footer);

  return root;
}
