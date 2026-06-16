export type SlashMenuAnchorRect = {
  left: number;
  top: number;
  bottom: number;
};

export type SlashMenuViewport = {
  width: number;
  height: number;
};

export type SlashMenuLayoutInput = {
  anchor: SlashMenuAnchorRect;
  viewport: SlashMenuViewport;
};

export type SlashMenuPlacement = "top" | "bottom";

export type SlashMenuLayout = {
  placement: SlashMenuPlacement;
  left: number;
  top: number | null;
  bottom: number | null;
  maxHeight: number;
};

const menuWidth = 328;
const menuMaxHeight = 420;
const viewportPadding = 8;
const anchorGap = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeSlashMenuLayout(input: SlashMenuLayoutInput): SlashMenuLayout {
  const maxLeft = Math.max(viewportPadding, input.viewport.width - menuWidth - viewportPadding);
  const left = clamp(input.anchor.left, viewportPadding, maxLeft);
  const availableBelow = Math.max(1, input.viewport.height - input.anchor.bottom - anchorGap - viewportPadding);
  const availableAbove = Math.max(1, input.anchor.top - anchorGap - viewportPadding);
  const placement: SlashMenuPlacement =
    availableBelow >= menuMaxHeight || availableBelow >= availableAbove ? "bottom" : "top";

  if (placement === "bottom") {
    return {
      placement,
      left,
      top: input.anchor.bottom + anchorGap,
      bottom: null,
      maxHeight: Math.min(menuMaxHeight, availableBelow),
    };
  }

  return {
    placement,
    left,
    top: null,
    bottom: input.viewport.height - input.anchor.top + anchorGap,
    maxHeight: Math.min(menuMaxHeight, availableAbove),
  };
}
