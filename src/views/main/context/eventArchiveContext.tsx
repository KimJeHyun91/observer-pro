import { createContext, ReactNode, useContext, useState } from 'react';

export type EventArchiveContextType = {
  occurDateTime: string,
  location: string,
  eventName: string,
  eventCameraId: string,
  handleUpdateEventDetail: ({
    occurDateTime,
    location,
    eventName,
    eventCameraId
  }: {
    occurDateTime: string,
    location: string,
    eventName: string,
    eventCameraId: string,
  }) => void
}

export const EventArchiveContext = createContext<EventArchiveContextType | null>(null);

type Props = {
  children: ReactNode;
}

export function EventArchiveProvider({ children }: Props) {

  const [occurDateTime, setOccurDateTime] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [eventName, setEventName] = useState<string>('');
  const [eventCameraId, setEventCameraId] = useState<string>('');

  const handleUpdateEventDetail = ({
    occurDateTime,
    location,
    eventName,
    eventCameraId
  }: {
    occurDateTime: string,
    location: string,
    eventName: string,
    eventCameraId: string,
  }) => {
    setOccurDateTime(occurDateTime);
    setLocation(location);
    setEventName(eventName);
    setEventCameraId(eventCameraId);
  };

  return (
    <EventArchiveContext.Provider
      value={{
        occurDateTime,
        location,
        eventName,
        eventCameraId,
        handleUpdateEventDetail
      }}
    >
      {children}
    </EventArchiveContext.Provider>
  );
}

export function useEventArchiveContext() {
  return useContext(EventArchiveContext);
}