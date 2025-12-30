import { create } from 'zustand'
import type { View } from '@/components/shared/configPages/settings/types';

export type SettingsMenuState = {
	currentMenuView: View
}

type SettingsAction = {
	setCurrentMenuView: (payload: View) => void
}

const initialState: SettingsMenuState = {
	currentMenuView: 'vms',
}

export const useSettingsMenuStore = create<SettingsMenuState & SettingsAction>(
	(set) => ({
		...initialState,
		setCurrentMenuView: (payload) => set(() => ({ currentMenuView: payload })),
	}),
)
