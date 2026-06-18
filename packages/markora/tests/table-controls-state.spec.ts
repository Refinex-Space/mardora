import { describe, expect, it } from "bun:test";
import {
  createTableControlMenuItems,
  createTableControlMenuState,
  hasTableControlStateChange,
  resolveTableControlHandleClick,
  setActiveTableControlEffect,
} from "../src/plugins/table-controls";

describe("createTableControlMenuState", () => {
  it("disables row movement at body row boundaries", () => {
    expect(createTableControlMenuState({ kind: "row", rowIndex: 1, bodyRowCount: 3, columnCount: 2 })).toMatchObject({
      canMoveRowUp: false,
      canMoveRowDown: true,
      canDeleteRow: true,
    });

    expect(createTableControlMenuState({ kind: "row", rowIndex: 3, bodyRowCount: 3, columnCount: 2 })).toMatchObject({
      canMoveRowUp: true,
      canMoveRowDown: false,
      canDeleteRow: true,
    });
  });

  it("disables column movement and deletion at column boundaries", () => {
    expect(
      createTableControlMenuState({ kind: "column", columnIndex: 1, bodyRowCount: 3, columnCount: 1 })
    ).toMatchObject({
      canMoveColumnLeft: false,
      canMoveColumnRight: false,
      canDeleteColumn: false,
    });

    expect(
      createTableControlMenuState({ kind: "column", columnIndex: 2, bodyRowCount: 3, columnCount: 3 })
    ).toMatchObject({
      canMoveColumnLeft: true,
      canMoveColumnRight: true,
      canDeleteColumn: true,
    });
  });
});

describe("createTableControlMenuItems", () => {
  it("returns row menu items with action-specific icons", () => {
    const items = createTableControlMenuItems({
      kind: "row",
      rowIndex: 2,
      bodyRowCount: 3,
      columnCount: 2,
    });

    expect(items.map((item) => [item.action, item.icon])).toEqual([
      ["insert-row-above", "arrow-up-to-line"],
      ["insert-row-below", "arrow-down-to-line"],
      ["move-row-up", "arrow-up"],
      ["move-row-down", "arrow-down"],
      ["copy-row", "copy"],
      ["delete-row", "trash-2"],
      ["delete-table", "table-delete"],
    ]);
  });

  it("returns column menu items with action-specific icons", () => {
    const items = createTableControlMenuItems({
      kind: "column",
      columnIndex: 2,
      bodyRowCount: 3,
      columnCount: 3,
    });

    expect(items.map((item) => [item.action, item.icon])).toEqual([
      ["insert-column-left", "arrow-left-to-line"],
      ["insert-column-right", "arrow-right-to-line"],
      ["move-column-left", "arrow-left"],
      ["move-column-right", "arrow-right"],
      ["copy-column", "copy"],
      ["delete-column", "trash-2"],
      ["delete-table", "table-delete"],
    ]);
  });
});

describe("resolveTableControlHandleClick", () => {
  it("closes an open menu when clicking the same row handle again", () => {
    const current = { tableFrom: 10, kind: "row" as const, rowIndex: 2, columnIndex: 1, menuOpen: true };
    const target = { tableFrom: 10, kind: "row" as const, rowIndex: 2, columnIndex: 1, menuOpen: false };

    expect(resolveTableControlHandleClick(current, target)).toBeNull();
  });

  it("opens a menu when switching to a different column handle", () => {
    const current = { tableFrom: 10, kind: "row" as const, rowIndex: 2, columnIndex: 1, menuOpen: true };
    const target = { tableFrom: 10, kind: "column" as const, columnIndex: 1, menuOpen: false };

    expect(resolveTableControlHandleClick(current, target)).toEqual({
      tableFrom: 10,
      kind: "column",
      columnIndex: 1,
      menuOpen: true,
    });
  });
});

describe("hasTableControlStateChange", () => {
  it("detects table control state effects", () => {
    const effect = setActiveTableControlEffect.of({
      tableFrom: 10,
      kind: "column",
      columnIndex: 1,
      menuOpen: true,
    });

    expect(hasTableControlStateChange([effect])).toBe(true);
  });
});
