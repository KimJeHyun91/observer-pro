import { create } from 'zustand';

interface BroadcastStore {
    siteId: string[];
    isReserveBroadcastStatus: boolean;
    reserveBroadcastStatus: string;
    reserveBroadcastTypeName: string
    setSiteId: (siteId: string) => void;
    setIsReserveBroadcastStatus: (status: boolean) => void;
    updateBroadcastStatus: (status: string, type: string, isUsePopUp: boolean) => void;
}

export const useBroadcastStore = create<BroadcastStore>((set) => ({
    siteId: [],
    isReserveBroadcastStatus: false,
    reserveBroadcastStatus: '',
    reserveBroadcastTypeName: '',

    setSiteId: (siteId: string) => set({ siteId }),
    setIsReserveBroadcastStatus: (status: boolean) => 
        set({ isReserveBroadcastStatus: status }),

    updateBroadcastStatus: (status: string, type: string, isUsePopUp: boolean) => 
        set({ 
            reserveBroadcastStatus: status,
            reserveBroadcastTypeName: type,
            isReserveBroadcastStatus: 
                !isUsePopUp ? false : 
                status === 'Started' ? true : 
                (status === 'Finished' || status === 'Error') ? false : 
                false 
        })
}));
