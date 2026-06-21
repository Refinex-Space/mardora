export interface PlaygroundPanelState {
  isDesktop: boolean;
  sidebarOpen: boolean;
  devbarOpen: boolean;
}

export function resolvePanelStateForViewport(isDesktop: boolean, current: PlaygroundPanelState): PlaygroundPanelState {
  return {
    isDesktop,
    sidebarOpen: isDesktop ? true : current.sidebarOpen,
    devbarOpen: current.devbarOpen,
  };
}
