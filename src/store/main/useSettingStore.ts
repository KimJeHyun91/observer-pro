import { create } from 'zustand'

export type MainSetting = 'vms' | 'camera' | 'event' | 'sop-1' | 'sop-2' | 'accessCtl' | 'accessCtl-sms' | 'ebell' | 'PIDS';

type SettingsMenuState = {
    currentMenuView: MainSetting;
};

const defaultMenuState: SettingsMenuState = {
    currentMenuView: 'vms',
};

type MainSettingStateAction = {
    menuState: SettingsMenuState;
    setCurrentMenuView: (payload: MainSetting) => void;
};

// Zustand store 생성
export const useSettingStore = create<MainSettingStateAction>()((set) => ({
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