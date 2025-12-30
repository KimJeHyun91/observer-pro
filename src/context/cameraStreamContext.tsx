import { createContext, useContext, useState } from 'react';

type Props = {
  children: React.ReactNode;
}

export const CameraStreamContext = createContext({
  cameraId: '',
  updateCameraId: (value: string) => value
});

export function CameraStreamProvider({ children }: Props) {

  const [cameraId, setCameraId] = useState<string>('');

  const updateCameraId = (value: string) => {
    setCameraId(value);
    return value;
  }

  return (
    <CameraStreamContext.Provider
      value={{
        cameraId,
        updateCameraId
      }}
    >
      {children}
    </CameraStreamContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCameraStreamContext() {
  return useContext(CameraStreamContext);
}