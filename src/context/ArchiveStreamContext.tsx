import { createContext, useContext, useState } from 'react';

type Props = {
  children: React.ReactNode;
}

export const ArchiveStreamContext = createContext({
  cameraId: '',
  startDateTime: '',
  updateArchive: (cameraId: string, startDateTime: string) => ({ cameraId, startDateTime })
});

export function ArchiveStreamProvider({ children }: Props) {

  const [cameraId, setCameraId] = useState<string>('');
  const [startDateTime, setStartDateTime] = useState<string>('');

  const updateArchive = (cameraId: string, startDateTime: string) => {
    setCameraId(cameraId);
    setStartDateTime(startDateTime);
    return {
      cameraId,
      startDateTime
    };
  };

  return (
    <ArchiveStreamContext.Provider
      value={{
        cameraId,
        startDateTime,
        updateArchive
      }}
    >
      {children}
    </ArchiveStreamContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useArchiveStreamContext() {
  return useContext(ArchiveStreamContext);
}