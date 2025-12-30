import { create } from 'zustand'

interface WaterLevelState {
    addWaterLevelControlIn: boolean
    setAddWaterLevelControlIn: (val: boolean) => void
}

export const useWaterLevelStore = create<WaterLevelState>((set) => ({
    addWaterLevelControlIn: false,
    setAddWaterLevelControlIn: (val) => set({ addWaterLevelControlIn: val }),

}))