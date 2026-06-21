export interface PlaygroundPanelState {
  isDesktop: boolean;
  devbarOpen: boolean;
}

export function resolvePanelStateForViewport(isDesktop: boolean, current: PlaygroundPanelState): PlaygroundPanelState {
  return {
    isDesktop,
    devbarOpen: current.devbarOpen,
  };
}
