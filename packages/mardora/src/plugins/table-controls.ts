import { Extension, StateEffect, StateField } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { createMardoraIcon, type MardoraIconName } from "../editor/icons";
import type { TableInfo } from "./table-model";

export type TableControlKind = "row" | "column";
export type TableControlAction =
  | "insert-row-above"
  | "insert-row-below"
  | "move-row-up"
  | "move-row-down"
  | "copy-row"
  | "delete-row"
  | "insert-column-left"
  | "insert-column-right"
  | "move-column-left"
  | "move-column-right"
  | "copy-column"
  | "delete-column"
  | "delete-table";

export interface ActiveTableControl {
  readonly tableFrom: number;
  readonly kind: TableControlKind;
  readonly rowIndex?: number;
  readonly columnIndex?: number;
  readonly menuOpen: boolean;
}

export interface TableMenuStateInput {
  readonly kind: TableControlKind;
  readonly rowIndex?: number;
  readonly columnIndex?: number;
  readonly bodyRowCount: number;
  readonly columnCount: number;
}

export interface TableControlMenuState {
  readonly canMoveRowUp: boolean;
  readonly canMoveRowDown: boolean;
  readonly canDeleteRow: boolean;
  readonly canMoveColumnLeft: boolean;
  readonly canMoveColumnRight: boolean;
  readonly canDeleteColumn: boolean;
}

export interface TableControlMenuItem {
  readonly action: TableControlAction;
  readonly label: string;
  readonly icon: MardoraIconName;
  readonly enabled: boolean;
}

export function createTableControlMenuState(input: TableMenuStateInput): TableControlMenuState {
  const rowIndex = input.rowIndex ?? 0;
  const columnIndex = input.columnIndex ?? 0;
  return {
    canMoveRowUp: input.kind === "row" && rowIndex > 1,
    canMoveRowDown: input.kind === "row" && rowIndex >= 1 && rowIndex < input.bodyRowCount,
    canDeleteRow: input.kind === "row" && rowIndex >= 1,
    canMoveColumnLeft: input.kind === "column" && columnIndex > 1,
    canMoveColumnRight: input.kind === "column" && columnIndex >= 1 && columnIndex < input.columnCount,
    canDeleteColumn: input.kind === "column" && input.columnCount > 1,
  };
}

export function createTableControlMenuItems(input: TableMenuStateInput): TableControlMenuItem[] {
  const state = createTableControlMenuState(input);
  return input.kind === "row"
    ? [
        { action: "insert-row-above", label: "在上方插入一行", icon: "arrow-up-to-line", enabled: true },
        { action: "insert-row-below", label: "在下方插入一行", icon: "arrow-down-to-line", enabled: true },
        { action: "move-row-up", label: "当前行上移", icon: "arrow-up", enabled: state.canMoveRowUp },
        { action: "move-row-down", label: "当前行下移", icon: "arrow-down", enabled: state.canMoveRowDown },
        { action: "copy-row", label: "拷贝行", icon: "copy", enabled: true },
        { action: "delete-row", label: "删除行", icon: "trash-2", enabled: state.canDeleteRow },
        { action: "delete-table", label: "删除表格", icon: "table-delete", enabled: true },
      ]
    : [
        { action: "insert-column-left", label: "在左侧插入列", icon: "arrow-left-to-line", enabled: true },
        { action: "insert-column-right", label: "在右侧插入列", icon: "arrow-right-to-line", enabled: true },
        { action: "move-column-left", label: "左移列", icon: "arrow-left", enabled: state.canMoveColumnLeft },
        { action: "move-column-right", label: "右移列", icon: "arrow-right", enabled: state.canMoveColumnRight },
        { action: "copy-column", label: "拷贝列", icon: "copy", enabled: true },
        { action: "delete-column", label: "删除列", icon: "trash-2", enabled: state.canDeleteColumn },
        { action: "delete-table", label: "删除表格", icon: "table-delete", enabled: true },
      ];
}

function areTableControlsEqual(left: ActiveTableControl | null, right: ActiveTableControl | null): boolean {
  return (
    left?.tableFrom === right?.tableFrom &&
    left?.kind === right?.kind &&
    left?.rowIndex === right?.rowIndex &&
    left?.columnIndex === right?.columnIndex &&
    left?.menuOpen === right?.menuOpen
  );
}

function isSameTableControlTarget(left: ActiveTableControl | null, right: ActiveTableControl | null): boolean {
  return (
    left?.tableFrom === right?.tableFrom &&
    left?.kind === right?.kind &&
    left?.rowIndex === right?.rowIndex &&
    left?.columnIndex === right?.columnIndex
  );
}

export function resolveTableControlHandleClick(
  current: ActiveTableControl | null,
  target: ActiveTableControl
): ActiveTableControl | null {
  if (current?.menuOpen && isSameTableControlTarget(current, target)) {
    return null;
  }
  return { ...target, menuOpen: true };
}

export const setActiveTableControlEffect = StateEffect.define<ActiveTableControl | null>();

export function hasTableControlStateChange(effects: readonly StateEffect<unknown>[]): boolean {
  return effects.some((effect) => effect.is(setActiveTableControlEffect));
}

export const activeTableControlField = StateField.define<ActiveTableControl | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setActiveTableControlEffect)) {
        return effect.value;
      }
    }
    if (transaction.docChanged) {
      return null;
    }
    return value;
  },
});

export interface TableControlsConfig {
  readonly getTableInfoByFrom: (view: EditorView, tableFrom: number) => TableInfo | null;
  readonly runAction: (view: EditorView, control: ActiveTableControl, action: TableControlAction) => void;
}

export function tableControls(config: TableControlsConfig): Extension[] {
  const plugin = ViewPlugin.define((view) => new TableControlsView(view, config));
  return [
    activeTableControlField,
    plugin,
    EditorView.domEventHandlers({
      keydown(event, view) {
        if (event.key !== "Escape" || !view.state.field(activeTableControlField, false)) {
          return false;
        }
        view.dispatch({ effects: setActiveTableControlEffect.of(null) });
        event.preventDefault();
        return true;
      },
    }),
  ];
}

class TableControlsView {
  private readonly overlay: HTMLElement;
  private hoverControl: ActiveTableControl | null = null;

  constructor(
    private readonly view: EditorView,
    private readonly config: TableControlsConfig
  ) {
    this.overlay = view.dom.ownerDocument.createElement("div");
    this.overlay.className = "cm-mardora-table-controls-overlay";
    this.overlay.addEventListener("mousedown", this.handleOverlayMouseDown);
    view.dom.appendChild(this.overlay);
    view.dom.addEventListener("mousemove", this.handleMouseMove);
    view.dom.addEventListener("mouseleave", this.handleMouseLeave);
    view.dom.ownerDocument.addEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.render();
  }

  update(update: ViewUpdate): void {
    const controlStateChanged = update.transactions.some((transaction) => hasTableControlStateChange(transaction.effects));
    if (
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged ||
      update.geometryChanged ||
      controlStateChanged
    ) {
      this.render();
    }
  }

  destroy(): void {
    this.view.dom.removeEventListener("mousemove", this.handleMouseMove);
    this.view.dom.removeEventListener("mouseleave", this.handleMouseLeave);
    this.view.dom.ownerDocument.removeEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.overlay.removeEventListener("mousedown", this.handleOverlayMouseDown);
    this.overlay.remove();
  }

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (event.target instanceof Element && event.target.closest(".cm-mardora-table-controls-overlay")) {
      return;
    }

    const cell = event.target instanceof Element ? event.target.closest(".cm-mardora-table-cell") : null;
    if (!cell || !this.view.dom.contains(cell)) {
      if (!this.currentControl()?.menuOpen) {
        this.setHoverControl(null);
      }
      return;
    }

    const tableFrom = Number(cell.getAttribute("data-mardora-table-from"));
    const rowIndex = Number(cell.getAttribute("data-mardora-row-index"));
    const columnIndex = Number(cell.getAttribute("data-mardora-column-index"));
    const rowKind = cell.getAttribute("data-mardora-row-kind");
    if (!Number.isFinite(tableFrom) || !Number.isFinite(rowIndex) || !Number.isFinite(columnIndex)) {
      return;
    }

    this.setHoverControl(
      rowKind === "body"
        ? { tableFrom, kind: "row", rowIndex, columnIndex, menuOpen: false }
        : { tableFrom, kind: "column", columnIndex, menuOpen: false }
    );
  };

  private readonly handleMouseLeave = (): void => {
    if (this.currentControl()?.menuOpen) {
      return;
    }
    this.setHoverControl(null);
  };

  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    if (event.target instanceof Node && this.overlay.contains(event.target)) {
      return;
    }
    if (this.view.state.field(activeTableControlField, false)) {
      this.view.dispatch({ effects: setActiveTableControlEffect.of(null) });
    }
  };

  private readonly handleOverlayMouseDown = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLElement>("[data-mardora-table-control-action]");
    if (!button) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const control = this.currentControl();
    if (!control) {
      return;
    }

    const action = button.dataset.mardoraTableControlAction || "";
    if (button.getAttribute("aria-disabled") === "true") {
      return;
    }

    if (action === "open-row-menu") {
      if (control.rowIndex === undefined || control.rowIndex <= 0) {
        return;
      }
      const activeControl = this.view.state.field(activeTableControlField, false) ?? null;
      this.view.dispatch({
        effects: setActiveTableControlEffect.of(
          resolveTableControlHandleClick(activeControl, {
            tableFrom: control.tableFrom,
            kind: "row",
            rowIndex: control.rowIndex,
            ...(control.columnIndex === undefined ? {} : { columnIndex: control.columnIndex }),
            menuOpen: false,
          })
        ),
      });
      return;
    }

    if (action === "open-column-menu") {
      if (control.columnIndex === undefined) {
        return;
      }
      const activeControl = this.view.state.field(activeTableControlField, false) ?? null;
      this.view.dispatch({
        effects: setActiveTableControlEffect.of(
          resolveTableControlHandleClick(activeControl, {
            tableFrom: control.tableFrom,
            kind: "column",
            columnIndex: control.columnIndex,
            menuOpen: false,
          })
        ),
      });
      return;
    }

    this.config.runAction(this.view, control, action as TableControlAction);
    this.hoverControl = null;
    this.view.dispatch({ effects: setActiveTableControlEffect.of(null) });
  };

  private currentControl(): ActiveTableControl | null {
    return this.view.state.field(activeTableControlField, false) ?? this.hoverControl ?? null;
  }

  private setHoverControl(control: ActiveTableControl | null): void {
    if (areTableControlsEqual(this.hoverControl, control)) {
      return;
    }
    this.hoverControl = control;
    this.render();
  }

  private render(): void {
    const control = this.currentControl();
    this.overlay.replaceChildren();
    if (!control) {
      return;
    }

    const table = this.config.getTableInfoByFrom(this.view, control.tableFrom);
    if (!table) {
      return;
    }

    const rowButton = control.rowIndex !== undefined && control.rowIndex > 0 ? this.createHandle("row") : null;
    const columnButton = control.columnIndex !== undefined ? this.createHandle("column") : null;
    if (rowButton) this.overlay.appendChild(rowButton);
    if (columnButton) this.overlay.appendChild(columnButton);
    if (control.menuOpen) this.overlay.appendChild(this.createMenu(control, table));
    this.positionOverlay(control, table);
  }

  private createHandle(kind: TableControlKind): HTMLButtonElement {
    const button = this.view.dom.ownerDocument.createElement("button");
    button.type = "button";
    button.className = `cm-mardora-table-handle cm-mardora-table-${kind}-handle`;
    button.dataset.mardoraTableControlAction = kind === "row" ? "open-row-menu" : "open-column-menu";
    button.setAttribute("aria-label", kind === "row" ? "Table row actions" : "Table column actions");
    button.innerHTML = "<span></span><span></span><span></span>";
    return button;
  }

  private createMenu(control: ActiveTableControl, table: TableInfo): HTMLElement {
    const input: TableMenuStateInput = {
      kind: control.kind,
      bodyRowCount: table.bodyCells.length,
      columnCount: table.columnCount,
      ...(control.rowIndex === undefined ? {} : { rowIndex: control.rowIndex }),
      ...(control.columnIndex === undefined ? {} : { columnIndex: control.columnIndex + 1 }),
    };
    const menu = this.view.dom.ownerDocument.createElement("div");
    menu.className = "cm-mardora-table-control-menu";
    menu.setAttribute("role", "menu");

    for (const { action, label, icon, enabled } of createTableControlMenuItems(input)) {
      const item = this.view.dom.ownerDocument.createElement("button");
      item.type = "button";
      item.className = "cm-mardora-table-control-menu-item";
      item.dataset.mardoraTableControlAction = action;
      item.setAttribute("role", "menuitem");
      item.setAttribute("aria-disabled", enabled ? "false" : "true");
      if (!enabled) item.disabled = true;
      const svg = createMardoraIcon(icon);
      if (svg) item.appendChild(svg);
      const text = this.view.dom.ownerDocument.createElement("span");
      text.textContent = label;
      item.appendChild(text);
      menu.appendChild(item);
    }
    return menu;
  }

  private positionOverlay(control: ActiveTableControl, table: TableInfo): void {
    this.view.requestMeasure({
      read: () => {
        const editorRect = this.view.dom.getBoundingClientRect();
        const rowRect =
          control.rowIndex !== undefined && control.rowIndex > 0
            ? this.findCellElement(table.from, control.rowIndex, 0)?.getBoundingClientRect() ?? null
            : null;
        const columnRect =
          control.columnIndex !== undefined
            ? this.findCellElement(table.from, 0, control.columnIndex)?.getBoundingClientRect() ?? null
            : null;
        return { editorRect, rowRect, columnRect };
      },
      write: (measure) => {
        const rowHandle = this.overlay.querySelector<HTMLElement>(".cm-mardora-table-row-handle");
        const columnHandle = this.overlay.querySelector<HTMLElement>(".cm-mardora-table-column-handle");
        if (rowHandle && measure.rowRect) {
          rowHandle.style.left = `${measure.rowRect.left - measure.editorRect.left - 10}px`;
          rowHandle.style.top = `${measure.rowRect.top - measure.editorRect.top + measure.rowRect.height / 2 - 10}px`;
        }
        if (columnHandle && measure.columnRect) {
          columnHandle.style.left = `${measure.columnRect.left - measure.editorRect.left + measure.columnRect.width / 2 - 10}px`;
          columnHandle.style.top = `${measure.columnRect.top - measure.editorRect.top - 10}px`;
        }
        const menu = this.overlay.querySelector<HTMLElement>(".cm-mardora-table-control-menu");
        const anchor = control.kind === "row" ? rowHandle : columnHandle;
        if (menu && anchor) {
          menu.style.left = `${Number.parseFloat(anchor.style.left) + 28}px`;
          menu.style.top = `${Number.parseFloat(anchor.style.top)}px`;
        }
      },
    });
  }

  private findCellElement(tableFrom: number, rowIndex: number, columnIndex: number): HTMLElement | null {
    const selector = [
      ".cm-mardora-table-cell",
      `[data-mardora-table-from="${tableFrom}"]`,
      `[data-mardora-row-index="${rowIndex}"]`,
      `[data-mardora-column-index="${columnIndex}"]`,
    ].join("");
    return this.view.dom.querySelector<HTMLElement>(selector);
  }
}
