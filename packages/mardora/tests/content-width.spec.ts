import { describe, expect, it } from "bun:test";
import { mardora } from "../src/editor";
import { tocTheme } from "../src/editor/table-of-contents";
import { createMardoraBaseTheme } from "../src/editor/theme";

describe("mardora content width", () => {
  it("keeps the default readable width when contentWidth is not provided", () => {
    const rules = getThemeRules(createMardoraBaseTheme());

    expect(rules).toContain("max-width: 48rem");
    expect(rules).toContain("margin: 0 auto");
  });

  it("supports full-width live editing through first-class config", () => {
    const rules = getThemeRules(mardora({ contentWidth: "full", plugins: [], toc: { enabled: false } }));

    expect(rules).toContain("max-width: none");
    expect(rules).toContain("margin: 0");
    expect(rules).not.toContain("max-width: 48rem");
  });

  it("exposes first-class font variables for live editing", () => {
    const rules = getThemeRules(
      mardora({
        contentWidth: "full",
        fonts: {
          code: '"JetBrains Mono", monospace',
          document: '"Songti SC", serif',
          ui: '"SF Pro Text", sans-serif',
        },
        plugins: [],
        toc: { enabled: false },
      })
    );

    expect(rules).toContain('--mardora-font-document: "Songti SC", serif');
    expect(rules).toContain('--mardora-font-code: "JetBrains Mono", monospace');
    expect(rules).toContain('--mardora-font-ui: "SF Pro Text", sans-serif');
    expect(rules).toContain("font-family: var(--mardora-font-document)");
  });

  it("falls back to built-in font stacks for invalid font values", () => {
    const rules = getThemeRules(
      createMardoraBaseTheme("default", {
        code: "Bad; color: red",
        document: "",
        ui: "Bad { font-family: hacked }",
      })
    );

    expect(rules).toContain("--mardora-font-document: var(--font-sans");
    expect(rules).toContain("--mardora-font-code: var(--font-jetbrains-mono");
    expect(rules).toContain("--mardora-font-ui: var(--font-sans");
    expect(rules).not.toContain("color: red");
    expect(rules).not.toContain("hacked");
  });

  it("applies table of contents spacing to the same cm-mardora editor element", () => {
    const rules = getThemeRules(tocTheme);

    expect(rules).toMatch(/\.\S+\.cm-mardora \.cm-scroller/);
    expect(rules).not.toMatch(/\.\S+ \.cm-mardora \.cm-scroller/);
  });
});

function getThemeRules(extension: unknown): string {
  return flattenExtensions(extension)
    .flatMap((item) => {
      const maybeStyleModule = item as { value?: { rules?: string[] } };

      return maybeStyleModule.value?.rules ?? [];
    })
    .join("\n");
}

function flattenExtensions(extension: unknown): unknown[] {
  if (Array.isArray(extension)) {
    return extension.flatMap(flattenExtensions);
  }

  if (extension && typeof extension === "object" && "inner" in extension) {
    return flattenExtensions((extension as { inner: unknown }).inner);
  }

  return [extension];
}
