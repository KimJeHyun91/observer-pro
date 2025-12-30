import { create } from 'zustand'
import type { View } from '@/components/shared/configPages/settings/types';

type SettingsMenuState = {
	currentMenuView: View
}

const defaultMenuState: SettingsMenuState = {
    currentMenuView: 'crossing_gate',
};

type ParkingFeeStateAction = {
    menuState: SettingsMenuState;
    setCurrentMenuView: (payload: View) => void;
};

// Zustand store 생성
export const useParkingFeeStore = create<ParkingFeeStateAction>()((set) => ({
    menuState: { ...defaultMenuState },
    setCurrentMenuView: (payload) =>
        set((state) => ({
            ...state,
            menuState: {
                ...state.menuState,
                currentMenuView: payload,
            },
        })),
}));