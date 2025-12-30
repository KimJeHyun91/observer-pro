// 3D 모델 로딩 상태 전역 관리
import { create } from 'zustand'

type ThreeDState = {
    isModelLoaded: boolean
    isModelError: boolean
    setIsModelLoaded: (loaded: boolean) => void
    setIsModelError: (error: boolean) => void
}

export const useThreeDStore = create<ThreeDState>((set) => ({
    isModelLoaded: false, // 초기 로딩 상태
    isModelError: false,  // 모델 로드 실패 여부
    setIsModelLoaded: (loaded) => set({ isModelLoaded: loaded }), // 로딩 상태 갱신
    setIsModelError: (error) => set({ isModelError: error }), // 에러 상태 갱신
}))
