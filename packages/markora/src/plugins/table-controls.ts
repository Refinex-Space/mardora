import { Extension, StateEffect, StateField } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
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

export const setActiveTableControlEffect = StateEffect.define<ActiveTableControl | null>();

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
    this.overlay.className = "cm-markora-table-controls-overlay";
    this.overlay.addEventListener("mousedown", this.handleOverlayMouseDown);
    view.dom.appendChild(this.overlay);
    view.dom.addEventListener("mousemove", this.handleMouseMove);
    view.dom.addEventListener("mouseleave", this.handleMouseLeave);
    view.dom.ownerDocument.addEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.render();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet || update.viewportChanged || update.geometryChanged) {
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
    const cell = event.target instanceof Element ? event.target.closest(".cm-markora-table-cell") : null;
    if (!cell || !this.view.dom.contains(cell)) {
      if (!this.currentControl()?.menuOpen) {
        this.hoverControl = null;
        this.render();
      }
      return;
    }

    const tableFrom = Number(cell.getAttribute("data-markora-table-from"));
    const rowIndex = Number(cell.getAttribute("data-markora-row-index"));
    const columnIndex = Number(cell.getAttribute("data-markora-column-index"));
    const rowKind = cell.getAttribute("data-markora-row-kind");
    if (!Number.isFinite(tableFrom) || !Number.isFinite(rowIndex) || !Number.isFinite(columnIndex)) {
      return;
    }

    this.hoverControl =
      rowKind === "body"
        ? { tableFrom, kind: "row", rowIndex, columnIndex, menuOpen: false }
        : { tableFrom, kind: "column", columnIndex, menuOpen: false };
    this.render();
  };

  private readonly handleMouseLeave = (): void => {
    if (this.currentControl()?.menuOpen) {
      return;
    }
    this.hoverControl = null;
    this.render();
  };

  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    if (event.target instanceof Node && (this.overlay.contains(event.target) || this.view.dom.contains(event.target))) {
      return;
    }
    this.view.dispatch({ effects: setActiveTableControlEffect.of(null) });
  };

  private readonly handleOverlayMouseDown = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLElement>("[data-markora-table-control-action]");
    if (!button) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const control = this.currentControl();
    if (!control) {
      return;
    }

    const action = button.dataset.markoraTableControlAction || "";
    if (button.getAttribute("aria-disabled") === "true") {
      return;
    }

    if (action === "open-row-menu") {
      if (control.rowIndex === undefined || control.rowIndex <= 0) {
        return;
      }
      this.view.dispatch({
        effects: setActiveTableControlEffect.of({ ...control, kind: "row", menuOpen: true }),
      });
      return;
    }

    if (action === "open-column-menu") {
      if (control.columnIndex === undefined) {
        return;
      }
      this.view.dispatch({
        effects: setActiveTableControlEffect.of({
          tableFrom: control.tableFrom,
          kind: "column",
          columnIndex: control.columnIndex,
          menuOpen: true,
        }),
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
    button.className = `cm-markora-table-handle cm-markora-table-${kind}-handle`;
    button.dataset.markoraTableControlAction = kind === "row" ? "open-row-menu" : "open-column-menu";
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
    const state = createTableControlMenuState(input);
    const menu = this.view.dom.ownerDocument.createElement("div");
    menu.className = "cm-markora-table-control-menu";
    menu.setAttribute("role", "menu");

    const items: Array<[TableControlAction, string, boolean]> =
      control.kind === "row"
        ? [
            ["insert-row-above", "在上方插入一行", true],
            ["insert-row-below", "在下方插入一行", true],
            ["move-row-up", "当前行上移", state.canMoveRowUp],
            ["move-row-down", "当前行下移", state.canMoveRowDown],
            ["copy-row", "拷贝行", true],
            ["delete-row", "删除行", state.canDeleteRow],
            ["delete-table", "删除表格", true],
          ]
        : [
            ["insert-column-left", "在左侧插入列", true],
            ["insert-column-right", "在右侧插入列", true],
            ["move-column-left", "左移列", state.canMoveColumnLeft],
            ["move-column-right", "右移列", state.canMoveColumnRight],
            ["copy-column", "拷贝列", true],
            ["delete-column", "删除列", state.canDeleteColumn],
            ["delete-table", "删除表格", true],
          ];

    for (const [action, label, enabled] of items) {
      const item = this.view.dom.ownerDocument.createElement("button");
      item.type = "button";
      item.className = "cm-markora-table-control-menu-item";
      item.dataset.markoraTableControlAction = action;
      item.setAttribute("role", "menuitem");
      item.setAttribute("aria-disabled", enabled ? "false" : "true");
      if (!enabled) item.disabled = true;
      item.textContent = label;
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
        const rowHandle = this.overlay.querySelector<HTMLElement>(".cm-markora-table-row-handle");
        const columnHandle = this.overlay.querySelector<HTMLElement>(".cm-markora-table-column-handle");
        if (rowHandle && measure.rowRect) {
          rowHandle.style.left = `${measure.rowRect.left - measure.editorRect.left - 14}px`;
          rowHandle.style.top = `${measure.rowRect.top - measure.editorRect.top + measure.rowRect.height / 2 - 14}px`;
        }
        if (columnHandle && measure.columnRect) {
          columnHandle.style.left = `${measure.columnRect.left - measure.editorRect.left + measure.columnRect.width / 2 - 18}px`;
          columnHandle.style.top = `${measure.columnRect.top - measure.editorRect.top - 18}px`;
        }
        const menu = this.overlay.querySelector<HTMLElement>(".cm-markora-table-control-menu");
        const anchor = control.kind === "row" ? rowHandle : columnHandle;
        if (menu && anchor) {
          menu.style.left = `${Number.parseFloat(anchor.style.left) + 34}px`;
          menu.style.top = `${Number.parseFloat(anchor.style.top)}px`;
        }
      },
    });
  }

  private findCellElement(tableFrom: number, rowIndex: number, columnIndex: number): HTMLElement | null {
    const selector = [
      ".cm-markora-table-cell",
      `[data-markora-table-from="${tableFrom}"]`,
      `[data-markora-row-index="${rowIndex}"]`,
      `[data-markora-column-index="${columnIndex}"]`,
    ].join("");
    return this.view.dom.querySelector<HTMLElement>(selector);
  }
}
