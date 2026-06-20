import type { SelectionToolbarLayout, SelectionToolbarLayoutInput, SelectionToolbarPlacement } from "./types";

const viewportPadding = 8;
const anchorGap = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeSelectionToolbarLayout(input: SelectionToolbarLayoutInput): SelectionToolbarLayout {
  const selectionCenter = (input.anchor.left + input.anchor.right) / 2;
  const boundary = input.boundary ?? {
    left: viewportPadding,
    right: input.viewport.width - viewportPadding,
    top: viewportPadding,
    bottom: input.viewport.height - viewportPadding,
  };
  const minLeft = Math.max(viewportPadding, boundary.left);
  const maxLeft = Math.max(minLeft, Math.min(input.viewport.width - input.floating.width - viewportPadding, boundary.right - input.floating.width));
  const left = clamp(Math.round(selectionCenter - input.floating.width / 2), minLeft, maxLeft);
  const topLimit = Math.max(viewportPadding, boundary.top);
  const bottomLimit = Math.min(input.viewport.height - viewportPadding, boundary.bottom);
  const availableAbove = Math.max(1, input.anchor.top - anchorGap - topLimit);
  const availableBelow = Math.max(1, bottomLimit - input.anchor.bottom - anchorGap);
  const placement: SelectionToolbarPlacement =
    availableAbove >= input.floating.height || availableAbove >= availableBelow ? "top" : "bottom";

  if (placement === "top") {
    return {
      placement,
      left,
      top: Math.max(topLimit, Math.round(input.anchor.top - anchorGap - input.floating.height)),
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
