import { create } from 'zustand';

interface MoveMapState {
  lat: number | null;
  lng: number | null;
  zoom: number;
  setCenter: (lat: number, lng: number, zoom?: number) => void;
  resetCenter: () => void;
}

export const useMoveMapStore = create<MoveMapState>((set) => ({
  lat: null,
  lng: null,
  zoom: 18,
  setCenter: (lat, lng, zoom = 18) => set({ lat, lng, zoom }),
  resetCenter: () => set({ lat: null, lng: null, zoom: 18 }),
}));