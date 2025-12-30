
import { ServiceType } from '@/@types/common';
import useSWR from 'swr';

export function useCameras(mainServiceName: ServiceType) {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'cameras',
      url: 'observer/getAllCameraList',
      revalidateOnFocus: false,
      method: 'post',
      data: {
        mainServiceName
      }
    }
  );
  return { cameras: data?.result, error, isLoading, mutate };
};

export function useIndependentCameras(mainServiceName: ServiceType) {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'independentCameras',
      url: 'observer/cameraList/independent',
      revalidateOnFocus: false,
      method: 'post',
      data: {
        mainServiceName
      }
    }
  );
  return { cameras: data?.result, error, isLoading, mutate };
};