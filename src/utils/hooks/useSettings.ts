import { apiModifySetting } from '@/services/CommonService';
import useSWR from 'swr';

export function useSettings(settingName: string) {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'setting',
      url: 'common/getSetting',
      revalidateOnFocus: false,
      method: 'post',
      data: {
        settingName
      }
    }
  );
  return { setting: data?.result, error, isLoading, mutate, modify: (settingValue: string) => apiModifySetting(settingName, settingValue) };
};