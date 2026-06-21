export interface PlaygroundPanelState {
  devbarOpen: boolean;
}

export function resolveInitialDesktopPanelState(isDesktop: boolean): PlaygroundPanelState {
  void isDesktop;
  return {
    devbarOpen: false,
  };
}
