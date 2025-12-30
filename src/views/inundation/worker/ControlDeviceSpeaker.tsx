import ApiService from '../../../services/ApiService';
import { AxiosResponse } from 'axios';
import { BroadcastResponse, SpeakerResponse } from '@/types/inundation';

export default class SpeakerService {
  private readonly baseURL?: string;
  private readonly proxyURL: string;
  private readonly ipaddress?: string;
  private readonly ipaddresses?: string[];
  private readonly type: 'single' | 'all' | 'group';

  constructor(type: 'single' | 'all' | 'group', ipaddressOrIps?: string | string[]) {
    this.type = type;
    if (type === 'single') {
      this.baseURL = `http://${ipaddressOrIps}`;
      this.ipaddress = ipaddressOrIps as string;
    } else if (type === 'group') {
      this.ipaddresses = ipaddressOrIps as string[];
    } else if (type === 'all') {
      this.ipaddress = 'all';
    }
    this.proxyURL = `http://${window.location.hostname}:4200/speakers`;
  }

  async controlGate(): Promise<SpeakerResponse> {
    try {
      const pathUrl = '/axis-cgi/playclip.cgi';
      const params = 'location=%EC%B0%A8%EB%8B%A8%EA%B8%B0%20%EC%9D%8C%EC%84%B1%20%EC%95%88%EB%82%B4.mp3&repeat=1&volume=100&audiooutput=1';

      const response: AxiosResponse = await ApiService.fetchDataWithAxios({
        url: '/inundation/controlgate',
        method: 'get',
        params: {
          ip: this.ipaddress,
          pathUrl,
          params,
        },
      });

      return {
        success: true,
        result: response.data,
        message: '차단기 음성 안내가 재생되었습니다',
      };
    } catch (err: any) {
      console.error('Control gate error:', err);
      return {
        success: false,
        error: err.message || '스피커 제어 중 오류가 발생했습니다',
        message: '스피커 제어 중 오류가 발생했습니다',
      };
    }
  }

  async broadcastToAll(message: string, type: 'broadcast' | 'click' = 'broadcast'): Promise<BroadcastResponse> {
    try {
      const response = await ApiService.fetchDataWithAxios({
        url: '/inundation/broadcastAll',
        method: 'post',
        data: { type, text: message },
      });
  
      const responseData = response.data !== undefined ? response.data : response;
  
      if (!responseData) {
        throw new Error('서버로부터 유효한 응답을 받지 못했습니다.');
      }
  
      const resultData = responseData.result || {
        total: 0,
        successCount: 0,
        failCount: 0,
        successList: [],
        failList: [],
      };
  
      return {
        success: responseData.success ?? false,
        message: responseData.message || '응답 메시지 없음',
        result: {
          total: resultData.total ?? 0,
          successCount: resultData.successCount ?? 0,
          failCount: resultData.failCount ?? 0,
          successList: resultData.successList ?? [],
          failList: resultData.failList ?? [],
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || '다중 스피커 제어 중 오류가 발생했습니다',
        error: err.message,
        result: {
          total: 0,
          successCount: 0,
          failCount: 0,
          successList: [],
          failList: [],
        },
      };
    }
  }

  async clickSound(): Promise<SpeakerResponse> {
    if (this.type === 'group') {
      return this.clickSoundToGroup();
    }

    if (!this.ipaddress) {
      throw new Error('스피커 IP 주소가 제공되지 않았습니다');
    }
    try {
      const pathUrl = '/axis-cgi/playclip.cgi';
      const params = 'location=logo.mp3&repeat=0&volume=100&audiooutput=1';

      const response: AxiosResponse = await ApiService.fetchDataWithAxios({
        url: '/inundation/clicksound',
        method: 'get',
        params: {
          ip: this.ipaddress,
          pathUrl,
          params,
        },
      });

      return {
        success: true,
        result: response.data,
        message: '경고음이 재생되었습니다',
      };
    } catch (err: any) {
      console.error('Click sound error:', err);
      return {
        success: false,
        error: err.message || '경고음 재생 중 오류가 발생했습니다',
        message: '경고음 재생 중 오류가 발생했습니다',
      };
    }
  }

  async playMessage(text: string): Promise<SpeakerResponse> {
    try {
      console.log(`메시지 재생 요청: "${text}" (IP: ${this.ipaddress})`);

      const response: AxiosResponse = await ApiService.fetchDataWithAxios({
        url: '/inundation/playtts',
        method: 'post',
        data: {
          ip: this.ipaddress,
          text: text,
        },
      });

      const responseData = response?.data || {};
      const isSuccess = responseData.status === true || responseData.message === 'ok';

      return {
        success: isSuccess,
        message: responseData.message || '메시지가 재생되었습니다',
        clipId: responseData.clipId || responseData.result?.clipId,
        result: responseData.result || {},
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'TTS 재생 중 오류가 발생했습니다',
        message: 'TTS 재생 중 오류가 발생했습니다',
      };
    }
  }

  async getClipByName(text: string): Promise<string | null> {
    try {
      const response: AxiosResponse = await ApiService.fetchDataWithAxios({
        url: '/inundation/getClipMetadata',
        method: 'post',
        data: { ip: this.ipaddress, text },
      });


      const responseData = response?.data || {};
      const result = responseData.result || {};

      const clipId = result.clipId || responseData.clipId;

      if (responseData.status === true && clipId) {
        return clipId;
      }
      return null;
    } catch (error: any) {
      console.error('클립 메타데이터 조회 오류:', error);
      return null;
    }
  }

  async playSpeakerMessage(text: string): Promise<SpeakerResponse> {
    if (this.type === 'group') {
      return this.broadcastToGroup(text);
    }

    try {
      try {
        const playResult = await this.playMessage(text);

        if (playResult && playResult.success === true) {
          return playResult;
        }

        console.warn('통합 API 호출은 했지만 재생에 실패했습니다. 대체 방식 시도:', playResult);
      } catch (integratedApiError) {
        console.warn('통합 API 호출 실패, 대체 방식으로 진행:', integratedApiError);
      }

      let clipId = null;
      try {
        clipId = await this.getClipByName(text);
      } catch (clipError) {
        console.warn('클립 ID 조회 실패, 계속 진행:', clipError);
      }

      if (clipId) {
        try {
          const pathUrl = '/axis-cgi/playclip.cgi';
          const params = `clip=${clipId}&audiooutput=1&volume=100`;

          const response: AxiosResponse = await ApiService.fetchDataWithAxios({
            url: '/speakers',
            method: 'get',
            params: {
              ip: this.ipaddress,
              pathUrl,
              params,
            },
          });


          const responseData = response?.data || {};
          const isSuccess = responseData.message === 'ok' ||
            (responseData.result && responseData.result.success === true);

          if (isSuccess) {
            return {
              success: true,
              result: responseData,
              clipId,
              message: '기존 클립이 재생되었습니다',
            };
          }

          console.warn('기존 클립 재생 실패, 대체 방식으로 진행:', responseData);
        } catch (playError) {
          console.warn('기존 클립 재생 중 오류, 대체 방식으로 진행:', playError);
        }
      }

      try {
        const pathUrl = '/axis-cgi/playclip.cgi';
        const params = `location=${encodeURIComponent(text)}.wav&audiooutput=1&volume=100`;
        
        const response: AxiosResponse = await ApiService.fetchDataWithAxios({
          url: '/speakers',
          method: 'get',
          params: {
            ip: this.ipaddress,
            pathUrl,
            params,
          },
        });


        const responseData = response?.data || {};
        const isSuccess = responseData.message === 'ok' ||
          (responseData.result && responseData.result.success === true);

        if (isSuccess) {
          return {
            success: true,
            result: responseData,
            message: '파일명으로 직접 재생되었습니다',
          };
        }
      } catch (directError) {
        console.warn('직접 스피커 제어 실패:', directError);
      }

      return {
        success: false,
        error: '모든 재생 방법이 실패했습니다',
        message: '스피커 메시지 재생 중 오류가 발생했습니다',
      };
    } catch (error: any) {
      console.error('스피커 메시지 재생 오류:', error);
      return {
        success: false,
        error: error.message || '스피커 메시지 재생 중 오류가 발생했습니다',
        message: '스피커 메시지 재생 중 오류가 발생했습니다',
      };
    }
  }

  async broadcastToGroup(message: string): Promise<BroadcastResponse> {
    if (!this.ipaddresses || !this.ipaddresses.length) {
      return {
        success: false,
        message: '그룹 스피커 IP 목록이 없습니다',
        result: { total: 0, successCount: 0, failCount: 0, successList: [], failList: [] }
      };
    }

    try {
      const response = await ApiService.fetchDataWithAxios({
        url: '/inundation/broadcastGroup',
        method: 'post',
        data: { speaker_ips: this.ipaddresses, text: message }
      });

      const responseData = response || {};
      const resultData = responseData.result || { total: this.ipaddresses.length, successCount: responseData.result.successCount, failCount: responseData.result.failCount, successList: responseData.result.successList, failList: responseData.result.failList };

      return {
        success: responseData.success ?? false,
        message: responseData.message || '그룹 방송 완료',
        result: {
          total: resultData.total,
          successCount: resultData.successCount,
          failCount: resultData.failCount,
          successList: resultData.successList,
          failList: resultData.failList
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '그룹 스피커 방송 중 오류 발생',
        result: { total: this.ipaddresses.length, successCount: 0, failCount: this.ipaddresses.length, successList: [], failList: this.ipaddresses }
      };
    }
  }

  async clickSoundToGroup(): Promise<BroadcastResponse> {
    if (!this.ipaddresses || !this.ipaddresses.length) {
      return {
        success: false,
        message: '그룹 스피커 IP 목록이 없습니다',
        result: { total: 0, successCount: 0, failCount: 0, successList: [], failList: [] }
      };
    }

    try {
      const response = await ApiService.fetchDataWithAxios({
        url: '/inundation/clicksoundGroup',
        method: 'post',
        data: { speaker_ips: this.ipaddresses }
      });

      const responseData = response || {};
      const resultData = responseData.result || { total: this.ipaddresses.length, successCount: 0, failCount: this.ipaddresses.length, successList: [], failList: this.ipaddresses };

      return {
        success: responseData.success ?? false,
        message: responseData.message || '그룹 경고음 출력 완료',
        result: {
          total: resultData.total,
          successCount: resultData.successCount,
          failCount: resultData.failCount,
          successList: resultData.successList,
          failList: resultData.failList
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '그룹 스피커 경고음 출력 중 오류 발생',
        result: { total: this.ipaddresses.length, successCount: 0, failCount: this.ipaddresses.length, successList: [], failList: this.ipaddresses }
      };
    }
  }
}