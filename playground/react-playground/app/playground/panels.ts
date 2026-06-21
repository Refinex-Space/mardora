export interface PlaygroundPanelState {
  sidebarOpen: boolean;
  devbarOpen: boolean;
}

export function resolveInitialDesktopPanelState(isDesktop: boolean): PlaygroundPanelState {
  return {
    sidebarOpen: isDesktop,
    devbarOpen: false,
  };
}
