import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type EditorView } from "@codemirror/view";
import { describe, expect, it } from "bun:test";
import {
  CodePlugin,
  CODE_COPY_SUCCESS_ICON,
  decodeCodeCopyPayload,
  encodeCodeCopyPayload,
  getCodeInfoLanguageTokenLength,
  replaceCodeInfoLanguage,
  resolveCodeFenceAutoClose,
  resolveCodeFenceAutoCloseTransaction,
} from "../src/plugins/code-plugin";
import { generateCSS, preview } from "../src/preview";

function stateFromDoc(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
}

function replacementRanges(doc: string, selectionOverlaps = false): Array<[number, number]> {
  const state = stateFromDoc(doc);
  const decorations: Range<Decoration>[] = [];

  new CodePlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => selectionOverlaps,
    cursorInRange: () => selectionOverlaps,
  });

  return decorations
    .filter((decoration) => (decoration.value as { isReplace?: boolean }).isReplace)
    .map((decoration) => [decoration.from, decoration.to] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

describe("code plugin", () => {
  it("replaces only the language token in code info", () => {
    expect(replaceCodeInfoLanguage("ts line-numbers{5} title=\"demo.ts\" {2-4}", "java")).toBe(
      'java line-numbers{5} title="demo.ts" {2-4}'
    );
    expect(replaceCodeInfoLanguage('line-numbers copy title="demo"', "python")).toBe(
      'python line-numbers copy title="demo"'
    );
    expect(replaceCodeInfoLanguage("ts copy", "")).toBe("copy");
  });

  it("detects only the leading language token for focused code fences", () => {
    expect(getCodeInfoLanguageTokenLength("vue")).toBe(3);
    expect(getCodeInfoLanguageTokenLength('vue title="demo.vue" line-numbers')).toBe(4);
    expect(getCodeInfoLanguageTokenLength('line-numbers title="demo.vue"')).toBe(0);
  });

  it("hides all fenced code syntax while editing inside the code block", () => {
    const doc = "```vue\nnpm install mardora\n```";

    expect(replacementRanges(doc, true)).toEqual([
      [0, 3],
      [3, 6],
      [27, 30],
    ]);
  });

  it("renders preview code blocks with the compact hover toolbar instead of a solid header", async () => {
    const html = await preview("```ts\nconst ok = true;\n```", {
      plugins: [new CodePlugin()],
      sanitize: true,
    });

    expect(html).toContain("cm-mardora-code-container");
    expect(html).toContain("cm-mardora-code-toolbar");
    expect(html).toContain("cm-mardora-code-language-button");
    expect(html).toContain("cm-mardora-code-copy-btn");
    expect(html).toContain("data-lang=\"ts\"");
    expect(html).not.toContain("cm-mardora-code-header");
  });

  it("stores copy button payload as plain code text and uses the required success icon", async () => {
    const code = 'const el = document.querySelector("img");\nconsole.log(el);';
    const html = await preview(`\`\`\`ts\n${code}\n\`\`\``, {
      plugins: [new CodePlugin()],
      sanitize: true,
    });
    const encodedPayload = html.match(/data-code="([^"]+)"/)?.[1];

    expect(encodedPayload).toBeTruthy();
    expect(decodeCodeCopyPayload(encodedPayload ?? "")).toBe(code);
    expect(encodeCodeCopyPayload(code)).toBe(encodedPayload);
    expect(CODE_COPY_SUCCESS_ICON).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"></path></svg>'
    );
  });

  it("generates transparent bordered code block styles with hover tools", () => {
    const css = generateCSS({ plugins: [new CodePlugin()] });

    expect(css).toContain(".cm-mardora-code-toolbar");
    expect(css).toContain("opacity: 0;");
    expect(css).toContain("background-color: transparent;");
    expect(css).toContain("border: 1px solid var(--color-border, #d4d4d8);");
    expect(css).toContain(".cm-mardora-code-fence-line");
    expect(css).toContain("height: 0;");
    expect(css).toContain("position: absolute;");
  });

  it("keeps single-line code blocks vertically balanced with floating tools", () => {
    const css = generateCSS({ plugins: [new CodePlugin()] });

    expect(css).toContain(".cm-mardora-code-block-single-line");
    expect(css).toContain(".cm-mardora-code-block-rendered.cm-mardora-code-block-single-line");
    expect(css).toContain("min-height: 1.5em;");
    expect(css).toContain("padding-top: 0.5rem !important;");
    expect(css).toContain("padding-bottom: 0.5rem !important;");
    expect(css).toContain("top: 50%;");
    expect(css).toContain("transform: translateY(-50%);");
  });

  it("keeps empty fenced code blocks tall enough for direct input", () => {
    const css = generateCSS({ plugins: [new CodePlugin()] });

    expect(css).toContain(".cm-mardora-code-block-line {");
    expect(css).toContain("min-height: 1.5em;");
    expect(css).not.toContain(".cm-mardora-code-block-line-end br {display: none;}");
  });

  it("auto-closes a manually typed opening code fence on an otherwise empty line", () => {
    expect(
      resolveCodeFenceAutoClose({
        text: "`",
        from: 2,
        to: 2,
        lineFrom: 0,
        lineTo: 2,
        lineText: "``",
        selectionEmpty: true,
      })
    ).toEqual({
      changes: { from: 0, to: 2, insert: "```\n\n```" },
      selection: { anchor: 4 },
    });
  });

  it("auto-closes a complete triple-backtick input event on an empty line", () => {
    expect(
      resolveCodeFenceAutoClose({
        text: "```",
        from: 0,
        to: 0,
        lineFrom: 0,
        lineTo: 0,
        lineText: "",
        selectionEmpty: true,
      })
    ).toEqual({
      changes: { from: 0, to: 0, insert: "```\n\n```" },
      selection: { anchor: 4 },
    });
  });

  it("rewrites the third typed backtick transaction into a complete code block", () => {
    const state = EditorState.create({ doc: "``" });
    const transaction = state.update({
      changes: { from: 2, to: 2, insert: "`" },
      selection: { anchor: 3 },
      userEvent: "input.type",
    });

    expect(resolveCodeFenceAutoCloseTransaction(transaction)).toEqual({
      changes: { from: 0, to: 2, insert: "```\n\n```" },
      selection: { anchor: 4 },
      scrollIntoView: true,
      filter: false,
      userEvent: "input.type",
    });
  });

  it("does not auto-close code fences typed inside an existing code block", () => {
    const state = stateFromDoc("```\n``");
    const transaction = state.update({
      changes: { from: 6, to: 6, insert: "`" },
      selection: { anchor: 7 },
      userEvent: "input.type",
    });

    expect(resolveCodeFenceAutoCloseTransaction(transaction)).toBeNull();
  });

  it("does not auto-close backticks typed inside ordinary text", () => {
    expect(
      resolveCodeFenceAutoClose({
        text: "`",
        from: 8,
        to: 8,
        lineFrom: 0,
        lineTo: 8,
        lineText: "value ``",
        selectionEmpty: true,
      })
    ).toBeNull();
  });
});
