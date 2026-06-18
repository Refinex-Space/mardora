import { describe, expect, it } from "bun:test";
import { formatTableMarkdown, normalizeParsedTable, parseTableMarkdown, splitTableLine } from "../src/plugins/table-model";

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
