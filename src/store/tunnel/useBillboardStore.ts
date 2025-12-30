import { create } from 'zustand'

interface BillboardState {
    isSettingUpdate: boolean
    isSettingDelete: boolean

    setIsSettingUpdate: (val: boolean) => void
    setIsSettingDelete: (val: boolean) => void

    lcsMsgs: string[]
    setLcsMsgs: (val: string[]) => void

}

export const useBillboardStore = create<BillboardState>((set) => ({
    isSettingUpdate: false,
    setIsSettingUpdate: (val) => set({ isSettingUpdate: val }),

    isSettingDelete: false,
    setIsSettingDelete: (val) => set({ isSettingUpdate: val }),

    lcsMsgs: [],
    setLcsMsgs: (val) => set({ lcsMsgs: val }),

}))