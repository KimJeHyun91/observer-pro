import { create } from 'zustand';
import { apiGetUnLinkedDeviceList, apiDevicesStatusCount } from '@/services/InundationService';

interface DeviceStatus {
  id: string;
  ip: string;
  linked_status: boolean;
  name: string;
  type: 'camera' | 'billboard' | 'speaker' | 'waterLevel' | 'gate';
}

interface NetworkStatusState {
  unlinkedDevices: any[];
  devicesStatusCount: { connected: string; disconnected: string }[];
  deviceStatuses: DeviceStatus[];
  getUnLinkedDeviceList: () => Promise<void>;
  getDevicesStatusCount: () => Promise<void>;
  updateDeviceStatus: (data: DeviceStatus) => void;
}

export const useNetworkStatusStore = create<NetworkStatusState>((set, get) => ({
  unlinkedDevices: [],
  devicesStatusCount: [{ connected: '0', disconnected: '0' }],
  deviceStatuses: [],
  getUnLinkedDeviceList: async () => {
    try {
      const response = await apiGetUnLinkedDeviceList();
      if (Array.isArray(response.result)) {
        set({ unlinkedDevices: response.result });
      } else {
        console.error('unlinkedDevices 데이터가 배열 형식이 아닙니다:', response);
        set({ unlinkedDevices: [] });
      }
    } catch (error) {
      console.error('Error fetching unlinked devices:', error);
    }
  },
  getDevicesStatusCount: async () => {
    try {
      const response = await apiDevicesStatusCount();
      if (Array.isArray(response.result)) {
        set({ devicesStatusCount: response.result });
      } else {
        console.error('devicesStatusCount 데이터가 배열 형식이 아닙니다:', response);
        set({ devicesStatusCount: [{ connected: '0', disconnected: '0' }] });
      }
    } catch (error) {
      console.error('Error fetching devices status count:', error);
    }
  },
  updateDeviceStatus: (data) => {
    set((state) => {
      const existingDevice = state.deviceStatuses.find((d) => d.id === data.id && d.type === data.type);
      const oldStatus = existingDevice?.linked_status;

      const updatedDevices = existingDevice
        ? state.deviceStatuses.map((d) => (d.id === data.id && d.type === data.type ? data : d))
        : [...state.deviceStatuses, data];

      let connected = parseInt(state.devicesStatusCount[0]?.connected || '0', 10);
      let disconnected = parseInt(state.devicesStatusCount[0]?.disconnected || '0', 10);

      if (oldStatus !== undefined && oldStatus !== data.linked_status) {
        if (data.linked_status) {
          connected += 1;
          disconnected = Math.max(0, disconnected - 1);
        } else {
          connected = Math.max(0, connected - 1);
          disconnected += 1;
        }
      } else if (!existingDevice) {
        if (data.linked_status) {
          connected += 1;
        } else {
          disconnected += 1;
        }
      }

      return {
        ...state,
        deviceStatuses: updatedDevices,
        devicesStatusCount: [{ connected: connected.toString(), disconnected: disconnected.toString() }],
      };
    });
  },
}));