import { create } from 'zustand'

interface DeviceState {
    isMobile: boolean
    setIsMobile: (val: boolean) => void
}

export const useDeviceStore = create<DeviceState>((set) => ({
    isMobile: false,
    setIsMobile: (val) => set({ isMobile: val })
}))