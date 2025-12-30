import ApiService from '@/services/ApiService';
import { SWRConfig } from 'swr';

type Props = {
  children: React.ReactNode;
}

type Method = 'get' | 'post' | 'put' | 'delete' | 'patch';

type FetcherArgs = {
  url: string;
  method?: Method;
  params?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

export default function SWRConfigContext({ children }: Props) {
  return (
    <SWRConfig
      value={{
        fetcher: async ({ url, method = 'get', params, data }: FetcherArgs) => {
          return ApiService.fetchDataWithAxios({
            url,
            method,
            params,
            data,
          });
        },
        revalidateOnFocus: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}