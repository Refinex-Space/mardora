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
