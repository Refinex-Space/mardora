import type { SelectionToolbarLayout, SelectionToolbarLayoutInput, SelectionToolbarPlacement } from "./types";

const viewportPadding = 8;
const anchorGap = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeSelectionToolbarLayout(input: SelectionToolbarLayoutInput): SelectionToolbarLayout {
  const selectionCenter = (input.anchor.left + input.anchor.right) / 2;
  const maxLeft = Math.max(viewportPadding, input.viewport.width - input.floating.width - viewportPadding);
  const left = clamp(Math.round(selectionCenter - input.floating.width / 2), viewportPadding, maxLeft);
  const availableAbove = Math.max(1, input.anchor.top - anchorGap - viewportPadding);
  const availableBelow = Math.max(1, input.viewport.height - input.anchor.bottom - anchorGap - viewportPadding);
  const placement: SelectionToolbarPlacement =
    availableAbove >= input.floating.height || availableAbove >= availableBelow ? "top" : "bottom";

  if (placement === "top") {
    return {
      placement,
      left,
      top: Math.max(viewportPadding, Math.round(input.anchor.top - anchorGap - input.floating.height)),
      maxHeight: availableAbove,
    };
  }

  return {
    placement,
    left,
    top: Math.round(input.anchor.bottom + anchorGap),
    maxHeight: availableBelow,
  };
}
