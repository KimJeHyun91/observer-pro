import { create } from 'zustand'

type MinimapServiceState = {
  use: boolean;
}

type MinimapServiceAction = {
  setMinimapServiceState: (action: MinimapServiceState['use']) => void
}

export const useMinimapStore = create<MinimapServiceState & MinimapServiceAction>(
  (set) => ({
    use: true,
    setMinimapServiceState: (action: boolean) =>
      set(() => ({ use: !action }))
  }),
)