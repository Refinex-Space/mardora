import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type EditorView } from "@codemirror/view";
import { describe, expect, it } from "bun:test";
import { ThemeEnum } from "../src/editor";
import { QuotePlugin, resolveCalloutTitleInputTarget, resolveCalloutTypeChange } from "../src/plugins";

function stateFromDoc(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
}

function replacementRanges(doc: string, selectionOverlaps = false): Array<[number, number]> {
  const state = stateFromDoc(doc);
  const decorations: Range<Decoration>[] = [];

  new QuotePlugin().buildDecorations({
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

function widgetSummaries(
  doc: string,
  selectionOverlaps = false
): Array<{ from: number; to: number; isReplace: boolean; widgetName: string }> {
  const state = stateFromDoc(doc);
  const decorations: Range<Decoration>[] = [];

  new QuotePlugin().buildDecorations({
    view: { state } as unknown as EditorView,
    decorations,
    selectionOverlapsRange: () => selectionOverlaps,
    cursorInRange: () => selectionOverlaps,
  });

  return decorations
    .filter((decoration) => Boolean((decoration.value as { widget?: unknown }).widget))
    .map((decoration) => {
      const value = decoration.value as {
        isReplace?: boolean;
        widget?: { constructor?: { name?: string } };
      };

      return {
        from: decoration.from,
        to: decoration.to,
        isReplace: Boolean(value.isReplace),
        widgetName: value.widget?.constructor?.name ?? "",
      };
    })
    .sort((a, b) => a.from - b.from || a.to - b.to || Number(b.isReplace) - Number(a.isReplace));
}

describe("QuotePlugin decorations", () => {
  it("keeps ordinary quote markers hidden while editing inside the quote", () => {
    expect(replacementRanges("> First\n> Second", true)).toEqual([
      [0, 2],
      [8, 10],
    ]);
  });

  it("keeps callout control markers hidden while editing inside the callout", () => {
    expect(replacementRanges("> [!NOTE]\n> Body", true)).toEqual([
      [0, 2],
      [2, 9],
      [10, 12],
    ]);
  });

  it("keeps a writable text anchor on empty callout body lines", () => {
    expect(replacementRanges("> [!WARNING]\n> ", true)).toEqual([
      [0, 2],
      [2, 12],
      [13, 14],
    ]);
  });

  it("replaces the full empty ordinary quote marker", () => {
    expect(replacementRanges("> ", true)).toEqual([[0, 2]]);
  });

  it("adds a writable content anchor after an empty ordinary quote marker", () => {
    expect(widgetSummaries("> ", true)).toEqual([
      {
        from: 2,
        to: 2,
        isReplace: false,
        widgetName: "EmptyQuoteContentAnchorWidget",
      },
    ]);
  });
});

describe("QuotePlugin callout editing", () => {
  it("keeps empty ordinary quote lines tall enough for visible cursor placement", () => {
    const styles = new QuotePlugin().theme(ThemeEnum.LIGHT);

    expect(styles[".cm-mardora-quote-line"]?.minHeight).toBe("1.6em");
    expect(styles[".cm-mardora-quote-line"]?.boxSizing).toBe("border-box");
  });

  it("keeps empty callout body lines tall enough for visible cursor placement", () => {
    const styles = new QuotePlugin().theme(ThemeEnum.LIGHT);

    expect(styles[".cm-mardora-callout-line"]?.minHeight).toBe("1.6em");
    expect(styles[".cm-mardora-callout-line"]?.boxSizing).toBe("border-box");
  });

  it("lets quote and callout content shrink when nested list styles make the line a flex container", () => {
    const styles = new QuotePlugin().theme(ThemeEnum.LIGHT);
    const flexContentSelectors = [
      ".cm-mardora-quote-line.cm-mardora-list-line-ul > .cm-mardora-quote-content",
      ".cm-mardora-quote-line.cm-mardora-list-line-ol > .cm-mardora-quote-content",
      ".cm-mardora-callout-line.cm-mardora-list-line-ul > .cm-mardora-callout-content",
      ".cm-mardora-callout-line.cm-mardora-list-line-ol > .cm-mardora-callout-content",
    ];

    for (const selector of flexContentSelectors) {
      expect(styles[selector]?.flexShrink).toBe(1);
      expect(styles[selector]?.minWidth).toBe("0");
    }
  });

  it("uses dark menu colors for callout type switching in dark theme", () => {
    const styles = new QuotePlugin().theme(ThemeEnum.DARK);

    expect(styles[".cm-mardora-callout-type-menu"]?.backgroundColor).toBe("var(--mardora-bg-primary, #18181b)");
    expect(styles[".cm-mardora-callout-type-menu"]?.border).toBe("1px solid var(--mardora-border-color, #3f3f46)");
    expect(styles[".cm-mardora-callout-type-menu"]?.boxShadow).toBe("0 18px 48px rgba(0, 0, 0, 0.36)");
    expect(styles[".cm-mardora-callout-type-menu-item"]?.color).toBe("var(--mardora-text-primary, #f4f4f5)");
    expect(styles[".cm-mardora-callout-type-menu-item:hover"]?.backgroundColor).toBe(
      "var(--mardora-bg-secondary, #27272a)"
    );
    expect(styles[".cm-mardora-callout-type-menu-item-active"]?.backgroundColor).toBe(
      "var(--mardora-bg-secondary, #27272a)"
    );
  });

  it("moves title-line clicks to the callout body when the body exists", () => {
    const state = stateFromDoc("> [!WARNING]\n> Body");

    expect(resolveCalloutTitleInputTarget(state, 2)).toEqual({
      anchor: 15,
    });
  });

  it("creates a writable callout body when title-line clicks have no body line", () => {
    const state = stateFromDoc("> [!WARNING]");

    expect(resolveCalloutTitleInputTarget(state, 2)).toEqual({
      anchor: 15,
      changes: {
        from: 12,
        insert: "\n> ",
      },
    });
  });

  it("replaces the callout marker type without changing the body", () => {
    const state = stateFromDoc("> [!WARNING]\n> Body");

    expect(resolveCalloutTypeChange(state, 2, "TIP")).toEqual({
      from: 4,
      to: 11,
      insert: "TIP",
    });
  });

  it("does not create a change when switching to the current callout type", () => {
    const state = stateFromDoc("> [!WARNING]\n> Body");

    expect(resolveCalloutTypeChange(state, 2, "WARNING")).toBeNull();
  });

  it("does not create a callout type change outside a callout title line", () => {
    const state = stateFromDoc("> Body");

    expect(resolveCalloutTypeChange(state, 2, "NOTE")).toBeNull();
  });
});
