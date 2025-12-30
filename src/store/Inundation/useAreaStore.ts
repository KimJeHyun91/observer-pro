import { create } from 'zustand';
import {
	apiCreateArea,
	apiGetArea,
	apiModifyArea,
	apiRemoveArea,
	apiGetCameras,
	apiAddWaterlevelGaugeToMap,
	apiRemoveWaterlevelToMap,
	apiGetGuardianliteInfo,
	apiGetGuardianliteList,
	apiModifyGuardianliteChannel,
	apiModifyGuardianliteChannelLabel,
	apiPtzCameraControl,
	apiUpdateAreaPosition,
	apiUpdateWaterlevelPosition,
	apiGetAllWaterlevelLog,
	apiGetCameraPreset
} from '@/services/InundationService';
import { Billboard, Camera, Guardianlite } from '@/@types/socket';
import { AreaFormInput, AreaInformation, PtzControlState, AreaModifyFormInput, WaterlevelGaugeInformation, WaterlevelLinkInfo, CameraRequestParams, Waterlevel } from '@/@types/inundation';

export type GuardianliteResponse = Guardianlite & { [key: string]: string | null | boolean | number };
interface AreaState {
	areas: AreaInformation[];
	cameras: Camera[];
	waterlevelLogValue: WaterlevelGaugeInformation[];
	guardianliteList: Guardianlite[];
	guardianliteInfo: GuardianliteResponse[] | null;
	cameraPresetList: any;
	isFetching: boolean;
	lastFetchTime: number;

	fetchAreas: () => Promise<void>;
	addArea: (area: AreaFormInput) => Promise<boolean | null>;
	setAreas: (areas: AreaInformation[]) => void;
	modifyArea: (area: AreaModifyFormInput) => Promise<boolean>;
	getCameras: (params: CameraRequestParams) => Promise<void>;
	removeArea: (area: AreaFormInput) => Promise<boolean>;
	// removeWaterlevelToMap: (area: AreaFormInput) => Promise<boolean>;
	addWaterlevelGaugeToMap: (waterlevel: WaterlevelLinkInfo) => Promise<boolean>;
	removeWaterlevelToMap: (waterlevel: WaterlevelLinkInfo) => Promise<boolean>;
	waterlevelLog: () => Promise<boolean>;
	// guardianlite
	getGuardianliteInfo: (guardianlite: Pick<Guardianlite, 'guardianliteIp'>) => Promise<void>;
	getGuardianliteList: () => Promise<void>;
	modifyGuardianliteChannel: (guardianlite: Guardianlite) => Promise<boolean>;
	modifyGuardianliteChannelLabel: (guardianlite: Guardianlite) => Promise<boolean>;

	ptzCameraControl: (control: PtzControlState) => Promise<boolean>;
	getCameraPreset: (camInfo: any) => Promise<any>;

	updateAreaPosition: (params: { idx: string; topLocation: string; leftLocation: string }) => Promise<boolean>;
	updateWaterlevelPosition: (params: { idx: string; topLocation: string; leftLocation: string }) => Promise<boolean>;
}

export const useAreaStore = create<AreaState>((set, get) => ({
	areas: [],
	cameras: [],
	waterlevelLogValue: [],
	guardianliteList: [],
	guardianliteInfo: null,
	cameraPresetList: [],
	isFetching: false,
	lastFetchTime: 0,

	addArea: async (area) => {
		try {
			const response = await apiCreateArea(area as any);
			return response?.result;
		} catch (error) {
			console.error('Error adding area:', error);
			return false;
		}
	},
	setAreas: (areas) => set(() => ({ areas: areas || [] })),
	modifyArea: async (area) => {
		try {
			const response = await apiModifyArea(area);
			return response?.message === 'ok' && Boolean(response?.result);
		} catch (error) {
			console.error('Error modifying area:', error);
			return error;
		}
	},
	fetchAreas: async () => {
		const state = get();
		const now = Date.now();

		if (state.isFetching || (now - state.lastFetchTime < 1000)) {
			return;
		}

		try {
			set({ isFetching: true, lastFetchTime: now });
			const response = await apiGetArea();
			if (response?.result && Array.isArray(response.result)) {
				set({ areas: response.result, isFetching: false });
			}
		} catch (error) {
			console.error('Error fetching areas:', error);
			set({ isFetching: false });
		}
	},
	getCameras: async (params) => {
		try {
			const response = await apiGetCameras(params as any);
			if (Array.isArray(response.result)) {
				set({ cameras: response.result as any });
			} else {
				console.error('Camera 데이터가 배열 형식이 아닙니다:', response);
				set({ cameras: [] });
			}
		} catch (error) {
			console.error('Error fetching cameras:', error);
			set({ cameras: [] });
			throw error;
		}
	},
	removeArea: async (area) => {
		try {
			const response = await apiRemoveArea(area as any);
			const { message, result } = response || {};
			return message === 'ok' && Boolean(result);
		} catch (error) {
			console.error('Error deleting Speaker Message:', error);
			return false;
		}
	},
	removeWaterlevelToMap: async (waterlevel) => {
		try {
			const response = await apiRemoveWaterlevelToMap(waterlevel as any);
			return response?.message === 'ok' && Boolean(response?.result);
		} catch (error) {
			console.error('Error deleting Speaker Message:', error);
			return false;
		}

	},
	addWaterlevelGaugeToMap: async (gauge) => {
		try {
			const response = await apiAddWaterlevelGaugeToMap(gauge as any);
			return response?.message === 'ok' && Boolean(response?.result);
		} catch (error) {
			console.error('Error adding area:', error);
			return false;
		}
	},
	waterlevelLog: async () => {
		try {
			const response = await apiGetAllWaterlevelLog();
			if (Array.isArray(response.result)) {
				set({ waterlevelLogValue: response.result });
			} else {
				console.error('Camera 데이터가 배열 형식이 아닙니다:', response);
				set({ waterlevelLogValue: [] });
			}
			return true;
		} catch (error) {
			console.error('Error adding area:', error);
			return false;
		}
	},

	getGuardianliteInfo: async (guardianlite) => {
		const state = get();
		const now = Date.now();

		if (state.isFetching || (now - state.lastFetchTime < 1000)) {
			return;
		}

		try {
			set({ isFetching: true, lastFetchTime: now });
			const response = await apiGetGuardianliteInfo(guardianlite as any);
			if (response && response.result) {
				set({ guardianliteInfo: response.result as any, isFetching: false });
			}
		} catch (error) {
			console.error('Error fetching guardianlite info:', error);
			set({ guardianliteInfo: null, isFetching: false });
		}
	},
	getGuardianliteList: async () => {
		try {
			const response = await apiGetGuardianliteList();
			if (Array.isArray(response.result)) {
				set({ guardianliteList: response.result });
			} else {
				console.error('Guardianlite 데이터가 배열 형식이 아닙니다:', response);
				set({ guardianliteList: [] });
			}
		} catch (error) {
			console.error('Error fetching guardianlite list:', error);
			set({ guardianliteList: [] });
		}
	},
	modifyGuardianliteChannel: async (guardianlite) => {
		try {
			const response = await apiModifyGuardianliteChannel(guardianlite);
			return response?.message === 'ok' && Boolean(response?.result);
		} catch (error) {
			console.error('Error controlling guardianlite channel:', error);
			return false;
		}
	},
	modifyGuardianliteChannelLabel: async (guardianlite) => {
		try {
			const response = await apiModifyGuardianliteChannelLabel(guardianlite);
			return response?.message === 'ok' && Boolean(response?.result);
		} catch (error) {
			console.error('Error modifying guardianlite channel label:', error);
			return false;
		}
	},
	ptzCameraControl: async (control) => {
		try {
			const response = await apiPtzCameraControl(control);
			return response?.message === 'ok' && Boolean(response?.result);
		} catch (error) {
			console.error('Error controlling PTZ camera:', error);
			return false;
		}
	},
	getCameraPreset: async (camInfo) => {
		try {
			const response = await apiGetCameraPreset(camInfo);

			if (response) {
				set({ cameraPresetList: response });
			} else {
				console.error('Camera preset 데이터가 없습니다:', response);
				set({ cameraPresetList: {} });
			}
			return response

		} catch (error) {
			console.error('Error get camera preset lists', error);
			set({ cameraPresetList: {} });
			return false;
		}
	},
	updateAreaPosition: async (params) => {
		try {
			const response = await apiUpdateAreaPosition(params as any);
			return response?.message === 'ok' && Boolean(response?.result);
		} catch (error) {
			console.error('Error updating area position:', error);
			return false;
		}
	},
	updateWaterlevelPosition: async (params) => {
		try {
			const response = await apiUpdateWaterlevelPosition(params as any);
			return response?.message === 'ok' && Boolean(response?.result);
		} catch (error) {
			console.error('Error updating waterlevel position:', error);
			return false;
		}
	},

}));