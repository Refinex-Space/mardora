import { describe, expect, it } from "bun:test";
import { TablePlugin } from "../src/plugins/table-plugin";
import { generateCSS } from "../src/preview";

describe("table plugin styles", () => {
  it("renders add-row and add-column controls with handle-aligned square hover states", () => {
    const css = generateCSS({ plugins: [new TablePlugin()] });
    const controlRule = css.match(/\.cm-markora-table-wrapper \.cm-markora-table-control \{[^}]+\}/)?.[0] ?? "";
    const controlHoverRule = css.match(/\.cm-markora-table-wrapper \.cm-markora-table-control:hover \{[^}]+\}/)?.[0] ?? "";
    const columnRule = css.match(/\.cm-markora-table-wrapper \.cm-markora-table-control-column \{[^}]+\}/)?.[0] ?? "";
    const rowRule = css.match(/\.cm-markora-table-wrapper \.cm-markora-table-control-row \{[^}]+\}/)?.[0] ?? "";

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
