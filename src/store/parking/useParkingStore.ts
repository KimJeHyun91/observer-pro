import { create } from 'zustand'
import { ParkingBuilding } from '@/@types/parking';
import type { View } from '@/components/shared/configPages/settings/types';

type SettingsMenuState = {
	currentMenuView: View
}

const defaultParkingBuilding: ParkingBuilding = {
    buildingIdx: 0,
    floorIdx: 0,
    mapImageURL: null,
};

const defaultMenuState: SettingsMenuState = {
    currentMenuView: 'vms',
};

type ParkingStateAction = {
    buildingState: ParkingBuilding;
    menuState: SettingsMenuState;
    setParkingBuildingState: (payload: ParkingBuilding) => void;
    setCurrentMenuView: (payload: View) => void;
};

// Zustand store 생성
export const useParkingStore = create<ParkingStateAction>()((set) => ({
    buildingState: { ...defaultParkingBuilding },
    menuState: { ...defaultMenuState },
    setParkingBuildingState: (payload) =>
        set((state) => ({
            ...state,
            buildingState: {
                ...state.buildingState,
                ...payload,
            },
        })),
    setCurrentMenuView: (payload) =>
        set((state) => ({
            ...state,
            menuState: {
                ...state.menuState,
                currentMenuView: payload,
            },
        })),
}));