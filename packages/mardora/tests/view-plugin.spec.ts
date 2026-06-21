import { describe, expect, it } from "bun:test";
import { shouldRebuildMardoraDecorations } from "../src/editor/view-plugin";

function updateSignal(input: {
  docChanged?: boolean;
  selectionSet?: boolean;
  viewportChanged?: boolean;
  composing?: boolean;
  compositionStarted?: boolean;
}) {
  return {
    docChanged: !!input.docChanged,
    selectionSet: !!input.selectionSet,
    viewportChanged: !!input.viewportChanged,
    view: {
      composing: !!input.composing,
      compositionStarted: !!input.compositionStarted,
    },
  };
}

describe("mardora view plugin decoration updates", () => {
  it("does not rebuild rich decorations while IME composition is active", () => {
    expect(
      shouldRebuildMardoraDecorations(
        updateSignal({
          docChanged: true,
          composing: true,
        })
      )
    ).toBe(false);

    expect(
      shouldRebuildMardoraDecorations(
        updateSignal({
          docChanged: true,
          compositionStarted: true,
        })
      )
    ).toBe(false);
  });

  it("rebuilds rich decorations after composition has ended", () => {
    expect(
      shouldRebuildMardoraDecorations(
        updateSignal({
          docChanged: true,
        })
      )
    ).toBe(true);
  });

  it("rebuilds pending rich decorations after composition ends without another document change", () => {
    expect(
      shouldRebuildMardoraDecorations({
        ...updateSignal({}),
        pendingCompositionDecorationRebuild: true,
      })
    ).toBe(true);
  });
});
