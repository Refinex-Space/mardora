import { describe, expect, it } from "bun:test";
import { TablePlugin, __mapTableCellTextOffsetToMarkdownOffset } from "../src/plugins/table-plugin";
import { generateCSS } from "../src/preview";

describe("table plugin styles", () => {
  it("renders add-row and add-column controls with handle-aligned square hover states", () => {
    const css = generateCSS({ plugins: [new TablePlugin()] });
    const controlRule = css.match(/\.cm-mardora-table-wrapper \.cm-mardora-table-control \{[^}]+\}/)?.[0] ?? "";
    const controlHoverRule = css.match(/\.cm-mardora-table-wrapper \.cm-mardora-table-control:hover \{[^}]+\}/)?.[0] ?? "";
    const columnRule = css.match(/\.cm-mardora-table-wrapper \.cm-mardora-table-control-column \{[^}]+\}/)?.[0] ?? "";
    const rowRule = css.match(/\.cm-mardora-table-wrapper \.cm-mardora-table-control-row \{[^}]+\}/)?.[0] ?? "";

    expect(controlRule).toContain("border-radius: 0.375rem;");
    expect(controlHoverRule).toContain("border-color: rgba(37, 99, 235, 0.55);");
    expect(controlHoverRule).toContain("background-color: rgba(37, 99, 235, 0.08);");
    expect(controlHoverRule).toContain("color: rgba(37, 99, 235, 0.95);");
    expect(columnRule).toContain("right: -0.625rem;");
    expect(rowRule).toContain("bottom: -0.625rem;");
    expect(controlRule).not.toContain("border-radius: 999px;");
    expect(controlHoverRule).not.toContain("background-color: rgba(15, 23, 42, 0.05);");
  });
});

describe("table cell pointer mapping", () => {
  it("maps visible offsets past hidden inline-code backticks back to markdown offsets", () => {
    const rawCellText = "基于 `@codemirror/lang-markdown` 与 Lezer Markdown，支持插件追加 `MarkdownConfig`。";
    const visibleText = rawCellText.replace(/`/g, "");
    const visibleOffset = visibleText.indexOf("MarkdownConfig");

    expect(__mapTableCellTextOffsetToMarkdownOffset(rawCellText, visibleOffset)).toBe(
      rawCellText.indexOf("MarkdownConfig")
    );
  });
});
