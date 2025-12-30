import { useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useNetworkStatusStore } from '@/store/Inundation/useNetworkStatusStore';

export function useDebouncedDevicesStatus() {
  const getDevicesStatusCount = useNetworkStatusStore((state) => state.getDevicesStatusCount);

  const debouncedGetDevicesStatusCount = useDebouncedCallback(async () => {
    try {
      await getDevicesStatusCount();
    } catch (error) {
      console.error('디바운싱된 장치 상태 업데이트 중 오류:', error);
    }
  }, 1000);

  return debouncedGetDevicesStatusCount;
}