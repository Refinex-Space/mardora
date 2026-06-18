import { describe, expect, it } from "bun:test";
import { createTableControlMenuState } from "../src/plugins/table-controls";

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
