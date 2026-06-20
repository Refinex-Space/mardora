import { describe, expect, it } from "bun:test";
import {
  copyTableColumn,
  copyTableRow,
  deleteTableColumn,
  deleteTableRow,
  formatTableMarkdown,
  insertTableColumn,
  insertTableRow,
  moveTableColumn,
  moveTableRow,
  normalizeParsedTable,
  parseTableMarkdown,
  splitTableLine,
} from "../src/plugins/table-model";

describe("table model parsing and formatting", () => {
  it("splits escaped pipes without creating extra cells", () => {
    expect(splitTableLine("| Name | Value \\| detail |")).toEqual([" Name ", " Value \\| detail "]);
  });

  it("normalizes ragged rows into a stable markdown table", () => {
    const parsed = parseTableMarkdown("| A | B |\n| --- | ---: |\n| one |\n| two | three |");

    expect(parsed).not.toBeNull();
    expect(formatTableMarkdown(normalizeParsedTable(parsed!))).toBe(
      ["| A   |     B |", "| --- | ----: |", "| one |       |", "| two | three |"].join("\n")
    );
  });
});

const sampleTable = () =>
  normalizeParsedTable({
    headers: ["Name", "Role", "Notes"],
    alignments: ["left", "center", "right"],
    rows: [
      ["Ada", "Engineer", "One"],
      ["Linus", "Maintainer", "Two"],
      ["Grace", "Architect", "Three"],
    ],
  });

describe("table row commands", () => {
  it("inserts rows above and below a body row", () => {
    expect(insertTableRow(sampleTable(), 1, "above").rows.map((row) => row.join(","))).toEqual([
      ",,",
      "Ada,Engineer,One",
      "Linus,Maintainer,Two",
      "Grace,Architect,Three",
    ]);

    expect(insertTableRow(sampleTable(), 1, "below").rows.map((row) => row.join(","))).toEqual([
      "Ada,Engineer,One",
      ",,",
      "Linus,Maintainer,Two",
      "Grace,Architect,Three",
    ]);
  });

  it("moves body rows within bounds", () => {
    expect(moveTableRow(sampleTable(), 2, "up").rows.map((row) => row[0])).toEqual(["Linus", "Ada", "Grace"]);
    expect(moveTableRow(sampleTable(), 2, "down").rows.map((row) => row[0])).toEqual(["Ada", "Grace", "Linus"]);
    expect(moveTableRow(sampleTable(), 1, "up")).toEqual(sampleTable());
    expect(moveTableRow(sampleTable(), 3, "down")).toEqual(sampleTable());
  });

  it("copies and deletes body rows", () => {
    expect(copyTableRow(sampleTable(), 2).rows.map((row) => row[0])).toEqual(["Ada", "Linus", "Linus", "Grace"]);
    expect(deleteTableRow(sampleTable(), 2).rows.map((row) => row[0])).toEqual(["Ada", "Grace"]);
  });

  it("clears the last remaining body row instead of removing it", () => {
    const oneRow = normalizeParsedTable({ headers: ["A", "B"], alignments: ["left", "left"], rows: [["x", "y"]] });
    expect(deleteTableRow(oneRow, 1).rows).toEqual([["", ""]]);
  });
});

describe("table column commands", () => {
  it("inserts columns left and right", () => {
    expect(insertTableColumn(sampleTable(), 1, "left").headers).toEqual(["", "Name", "Role", "Notes"]);
    expect(insertTableColumn(sampleTable(), 1, "right").headers).toEqual(["Name", "", "Role", "Notes"]);
  });

  it("moves columns within bounds", () => {
    expect(moveTableColumn(sampleTable(), 1, "left")).toEqual(sampleTable());
    expect(moveTableColumn(sampleTable(), 2, "left").headers).toEqual(["Role", "Name", "Notes"]);
    expect(moveTableColumn(sampleTable(), 2, "right").headers).toEqual(["Name", "Notes", "Role"]);
    expect(moveTableColumn(sampleTable(), 3, "right")).toEqual(sampleTable());
  });

  it("copies a column with alignment and body values", () => {
    const copied = copyTableColumn(sampleTable(), 2);
    expect(copied.headers).toEqual(["Name", "Role", "Role", "Notes"]);
    expect(copied.alignments).toEqual(["left", "center", "center", "right"]);
    expect(copied.rows[0]).toEqual(["Ada", "Engineer", "Engineer", "One"]);
  });

  it("deletes a column but keeps a single-column table intact", () => {
    const deleted = deleteTableColumn(sampleTable(), 2);
    expect(deleted.headers).toEqual(["Name", "Notes"]);
    expect(deleted.alignments).toEqual(["left", "right"]);
    expect(deleted.rows[0]).toEqual(["Ada", "One"]);

    const oneColumn = normalizeParsedTable({ headers: ["A"], alignments: ["left"], rows: [["x"]] });
    expect(deleteTableColumn(oneColumn, 1)).toEqual(oneColumn);
  });
});
