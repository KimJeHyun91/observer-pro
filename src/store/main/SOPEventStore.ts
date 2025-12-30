import { create } from 'zustand'
import { SOPEvent } from '@/@types/main';

type SOPEventState = {
    SOPEvent: SOPEvent;
    prevSOPEvent: SOPEvent | null;
}

type SOPEventAction = {
    setSOPEventState: (newEvent: SOPEvent) => void;
}

export const useSOPEventStore = create<SOPEventState & SOPEventAction>((set, get) => ({
    SOPEvent: {
        SOPIdx: null,
        eventIdx: null,
        eventName: null,
        occurDateTime: null,
        location: null,
        outsideIdx: null,
        insideIdx: null,
        dimensionType: null,
        eventTypeId: null,
        severityId: null,
        mapImageURL: null,
        eventCameraId: null,
        mainServiceName: 'origin',
    },
    prevSOPEvent: null, // 초기값

    setSOPEventState: (newEvent: SOPEvent) => {
        const { SOPEvent } = get(); // 현재 상태 읽기
        if (newEvent.eventIdx != null) {
            set({
                prevSOPEvent: SOPEvent,
                SOPEvent: newEvent,
            });
        } else {
            set({
                prevSOPEvent: null,
                SOPEvent: newEvent,
            });
        }

    },
}));
