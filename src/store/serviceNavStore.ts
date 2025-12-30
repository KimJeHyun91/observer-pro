import { create } from 'zustand'

type NavServiceState = {
    use: boolean;
}

type NavServiceAction = {
    setNavServiceState: (action: NavServiceState['use']) => void
}

export const useServiceNavStore = create<NavServiceState & NavServiceAction>(
    (set) => ({
        use: true,
        setNavServiceState: (action: boolean) =>
            set(() => ({ use: !action }))
    }),
)