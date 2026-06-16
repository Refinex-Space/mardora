export type NativeSelectionActivationInput = {
  editorSelectionEmpty: boolean;
  nativeSelectionCollapsed: boolean;
  anchorInEditor: boolean;
  focusInEditor: boolean;
  rangeCount: number;
};

/** Returns whether a browser native selection should activate the toolbar. */
export function canActivateFromNativeSelection(input: NativeSelectionActivationInput): boolean {
  return (
    !input.editorSelectionEmpty &&
    !input.nativeSelectionCollapsed &&
    input.anchorInEditor &&
    input.focusInEditor &&
    input.rangeCount > 0
  );
}
