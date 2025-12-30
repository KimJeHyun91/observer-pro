import { ServiceType } from '@/@types/common';
import { create } from 'zustand'

export type CanvasMapState = {
  mainServiceName: ServiceType | '';
  buildingIdx: number;
  floorIdx: number;
  buildingName?: string | null;
  floorName?: string | null;
  mapImageURL?: string | null;
  is3DView?: boolean;
  threeDModelId: number;
}

type CanvasMapStateAction = {
  setCanvasMapState: (payload: CanvasMapState) => void
}

const initialState: CanvasMapState = {
  mainServiceName: '',
  buildingIdx: 0,
  floorIdx: 0,
  is3DView: false,
  threeDModelId: 0,
  mapImageURL: `http://${window.location.hostname}:4200/images/outdoorplan/outdoor.png`,
}

export const useCanvasMapStore = create<CanvasMapState & CanvasMapStateAction>(
  (set) => ({
    ...initialState,
    setCanvasMapState: (payload) =>
      set(() => ({
        ...payload
      })),
  }),
)