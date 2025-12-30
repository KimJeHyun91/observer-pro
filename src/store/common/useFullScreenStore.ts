import { create } from 'zustand';

type FullScreenState = {
    isFullscreen: boolean;
    setFullscreen: (isFullscreen: boolean) => void;
};

export const useFullScreenStore = create<FullScreenState>((set) => ({
    isFullscreen: false,
    setFullscreen: (isFullscreen) => set({ isFullscreen }),
}));