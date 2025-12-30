import { create } from 'zustand';

type TabState = {
  [tabKey: string]: {
    log: boolean;
    report: boolean;
    setting: boolean;
    data: boolean;
    service: boolean;
    minimap: boolean;
    switchingMode: boolean;
  };
};

type State = {
  tabs: TabState;
  setTabState: (tabKey: string, newState: Partial<TabState[string]>) => void;
};

export const useDataStatusStore = create<State>((set) => ({
  tabs: {
    // 초기 상태 설정 (탭별)
    parking: { log: false, report: false, setting: false, data: true, service: true, minimap: true, switchingMode: true },
    origin: { log: false, report: false, setting: false, data: true, service: true, minimap: true, switchingMode: true },
    inundation: { log: false, report: false, setting: false, data: true, service: true, minimap: true, switchingMode: true },
    vehicle: { log: false, report: false, setting: false, data: true, service: true, minimap: true, switchingMode: true },
    tunnel: { log: false, report: false, setting: false, data: true, service: true, minimap: true, switchingMode: true },
    broadcast: { log: false, report: false, setting: false, data: true, service: true, minimap: true, switchingMode: true },
    parkingFee: { log: false, report: false, setting: false, data: true, service: true, minimap: true, switchingMode: true },
  },
  setTabState: (tabKey, newState) =>
    set((state) => ({
      tabs: {
        ...state.tabs,
        [tabKey]: { ...state.tabs[tabKey], ...newState },
      },
    })),
}));