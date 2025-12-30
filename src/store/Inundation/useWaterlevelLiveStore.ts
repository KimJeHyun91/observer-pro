import { create } from 'zustand';

export type WaterlevelLive = {
    value: number;
    timestamp: string;
    water_level_idx?: number;
    history: Array<{ value: number; timestamp: string }>;
};

export interface WaterlevelLiveState {
    waterlevels: { [key: string]: WaterlevelLive }
    updateWaterlevel: (key: string, value: number, timestamp: string, waterlevelIdx?: number) => void;
    clearWaterlevel: (key: string) => void;
}

export const useWaterlevelLiveStore = create<WaterlevelLiveState>((set) => ({
    waterlevels: {},
    updateWaterlevel: (key, value, timestamp, waterlevelIdx) =>
        set((state) => {
            const prev = state.waterlevels[key]?.history || [];
            const newHistory = [...prev, { value, timestamp }].slice(-20); // 최근 20개 데이터 유지

            return {
                waterlevels: {
                    ...state.waterlevels,
                    [key]: {
                        value,
                        timestamp,
                        water_level_idx: waterlevelIdx,
                        history: newHistory
                    }
                }
            };
        }),
    clearWaterlevel: (key) =>
        set((state) => {
            const { [key]: _, ...rest } = state.waterlevels;
            return { waterlevels: rest };
        }),
}));

import { useEffect } from 'react';

export function useWaterlevelLiveSocketListener(socketService: any) {
    useEffect(() => {
        if (!socketService) return;

        const handler = (data: any) => {
            const arr = Array.isArray(data) ? data : [data];
            arr.forEach((d) => {
                if (d.water_level && d.water_level_ip) {
                    let value = 0;
                    let isValidData = false;

                    if (typeof d.water_level === 'string') {
                        const cp100Match = d.water_level.match(/gauge:([+-]?\d{5})mm/);
                        if (cp100Match) {
                            const gauge = parseInt(cp100Match[1], 10); // mm 단위
                            value = gauge / 1000; // m 단위
                            isValidData = true;
                        } else {
                            const parsedValue = parseFloat(d.water_level);
                            if (!isNaN(parsedValue)) {
                                value = parsedValue;
                                isValidData = true;
                            }
                        }
                    } else if (typeof d.water_level === 'number') {
                        value = d.water_level;
                        isValidData = true;
                        console.log(`[숫자] 수위: ${value}m`);
                    }

                    if (isValidData && !isNaN(value)) {
                        const key = d.water_level_idx ? `idx_${d.water_level_idx}` : d.water_level_ip;

                        useWaterlevelLiveStore.getState().updateWaterlevel(
                            key,
                            value,
                            d.timestamp || d.created_at,
                            d.water_level_idx
                        );
                    } else {
                        console.warn(`[Store] 잘못된 수위 데이터: ${d.water_level}, type: ${typeof d.water_level}`);
                    }
                } else {
                    console.warn(`[Store] 필수 필드 누락: water_level=${d.water_level}, water_level_ip=${d.water_level_ip}`);
                }
            });
        };

        const dataSocket = socketService.subscribe('fl_water_level_log-update', handler);

        return () => {
            dataSocket();
        };
    }, [socketService]);
}
