import { create } from 'zustand';
import {
	apiUpdateMessageToSpeakr,
	apiUpdateMessageToAllSpeakers,
	apiUpdateMessageToBillboard,
	apiUpdateMessageToAllBillboards,
	apiUpdateMessageToGreenParkingBillboard,
	apiGetBillboardList,
	apiGetSpeakerList,
	apiGetCrossinggate,
	apiUpdateGroupBillboards
} from '@/services/InundationService';
import {
	UpdateBillboardRequest,
	UpdateSingleBillboardRequest,
	UpdateSingleSpeakerRequest,
	UpdateSpeakerRequest
} from '@/@types/inundation';

interface DeviceControlState {
	billboardList: [];
	speakerList: [];
	crossingGateList: [];

	// 일반 전광판
	updateBillboard: (data: UpdateSingleBillboardRequest) => Promise<boolean>;
	updateGroupBillboards: (data: any) => Promise<boolean>;
	updateAllBillboards: (data: UpdateBillboardRequest) => Promise<boolean>;
	// 그린파킹 전광판
	updateGreenParkingBillboard: (data: UpdateSingleBillboardRequest) => Promise<boolean>;

	getBillboardList: () => Promise<boolean>;

	updateSpeaker: (data: UpdateSingleSpeakerRequest) => Promise<boolean>;
	updateAllSpeakers: (data: UpdateSpeakerRequest) => Promise<boolean>;
	getSpeakerList: () => Promise<boolean>;

	getCrossingGateList: () => Promise<boolean>;
}

export const useDeviceControlStore = create<DeviceControlState>((set) => ({
	billboardList: [],
	speakerList: [],
	crossingGateList: [],

	updateSpeaker: async (data) => {
		try {
			const response = await apiUpdateMessageToSpeakr(data);
			return response?.status ?? false;
		} catch (error) {
			console.error('Error updating speaker:', error);
			return false;
		}
	},
	updateGroupBillboards: async (data) => {
		const response = await apiUpdateGroupBillboards(data);
		return response;
	},
	updateAllSpeakers: async (data) => {
		try {
			const response = await apiUpdateMessageToAllSpeakers(data);
			return response?.status ?? false;
		} catch (error) {
			console.error('Error fetching areas:', error);
			return false;
		}
	},
	getSpeakerList: async () => {
		try {
			const response = await apiGetSpeakerList();
			if (Array.isArray(response.result)) {
				set({ speakerList: response.result });
				return true;
			} else {
				console.error('speakerList 데이터가 배열 형식이 아닙니다:', response);
				set({ speakerList: [] });
				return false;
			}
		} catch (error) {
			console.error('Error adding area:', error);
			return false;

		}
	},
	updateBillboard: async (data) => {
		try {
			const response = await apiUpdateMessageToBillboard(data);
			return response?.message === 'ok'
		} catch (error) {
			console.error('Error fetching areas:', error);
			return false;
		}
	},
	updateAllBillboards: async (data) => {
		try {
			const response = await apiUpdateMessageToAllBillboards(data);
			return response?.message === 'ok'
		} catch (error) {
			console.error('Error fetching areas:', error);
			return false;
		}
	},
	updateGreenParkingBillboard: async (data) => {
		try {
			const response = await apiUpdateMessageToGreenParkingBillboard(data);
			return response?.message === 'ok'
		} catch (error) {
			console.error('Error fetching areas:', error);
			return false;
		}
	},
	getBillboardList: async () => {
		try {
			const response = await apiGetBillboardList();
			if (Array.isArray(response?.result)) {
				set({ billboardList: response.result });
				return true;
			}
			console.error('billboard data is not an array:', response);
			set({ billboardList: [] });
			return false;
		} catch (error) {
			console.error('Error fetching billboard list:', error);
			set({ billboardList: [] });
			return false;
		}
	},

	getCrossingGateList: async () => {
		try {
			const response = await apiGetCrossinggate();
			if (Array.isArray(response?.result)) {
				set({ crossingGateList: response.result });
				return true;
			}
			console.error('billboard data is not an array:', response);
			set({ crossingGateList: [] });
			return false;
		} catch (error) {
			console.error('Error fetching billboard list:', error);
			set({ crossingGateList: [] });
			return false;
		}
	},
}));