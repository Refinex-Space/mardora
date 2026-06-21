import { describe, expect, it } from "bun:test";
import { generateCSS } from "../src/preview";
import { CodePlugin, HeadingPlugin } from "../src/plugins";

describe("mardora font config", () => {
  it("emits preview font variables from generateCSS", () => {
    const css = generateCSS({
      fonts: {
        code: '"JetBrains Mono", monospace',
        document: '"Songti SC", serif',
        ui: '"SF Pro Text", sans-serif',
      },
      plugins: [new HeadingPlugin(), new CodePlugin()],
    });

    expect(css).toContain('--mardora-font-document: "Songti SC", serif;');
    expect(css).toContain('--mardora-font-code: "JetBrains Mono", monospace;');
    expect(css).toContain('--mardora-font-ui: "SF Pro Text", sans-serif;');
    expect(css).toContain("font-family: var(--mardora-font-document);");
    expect(css).toContain("font-family: var(--mardora-font-code);");
    expect(css).not.toContain("font-family: sans-serif;");
    expect(css).not.toContain("font-family: var(--font-jetbrains-mono");
  });
});
