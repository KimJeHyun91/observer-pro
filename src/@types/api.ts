import { AxiosRequestConfig } from 'axios';

export type FetchDataWithAxios = <Response = unknown, Request = Record<string, unknown>>(
  param: AxiosRequestConfig<Request>,
) => Promise<Response>;

export type ApiResultObjectArray<T> = {
  message?: string;
  result: Array<T>;
}

export type ApiResultStatus = {
  message: string;
  status: boolean;
}

export type ApiResultBoolean = {
  message: string;
  result: {
    success: boolean;
  };
};

export interface ApiResponse<T = any> {
  initialLat?: any;
  initialLng?: any;
  status: boolean;
  result: T | null;
  message?: string;
  error?: string;
}

export interface VmsApiResponse {
  message: string;
  result: {
    status: boolean;
    message?: string;
  };
}

export interface VmsListApiResponse<T> {
  message: string;
  result: T[];
}

export interface BillboardApiResponse {
  message: string;
  result: null;
}

export interface BillboardListApiResponse<T> {
  message: string;
  result: T[] | null;
}

export interface SpeakerApiResponse {
  message: string;
  result: null;
}

export interface SpeakerListApiResponse<T> {
  message: string;
  result: T[] | null;
}

export interface WaterlevelApiResponse {
  message: string;
  result: null;
}

export interface WaterlevelListApiResponse<T> {
  message: string;
  result: T[] | null;
}

export interface CrossingGateListApiResponse<T> {
  message: string;
  result: T[] | null;
}
