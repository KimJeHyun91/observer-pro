import { create } from 'zustand';
import {
	apiGetCrossinggate,
	apiAddVms,
	apiGetVms,
	apiSynchronizeVms,
	apiAddBillboardMessage,
	apiModifyBillboardMacroMessage,
	apiDeleteBillboardMessage,
	apiGetBillboardMessage,
	apiAddSpeakerMessage,
	apiModifySpeakerMessage,
	apiDeleteSpeakerMessage,
	apiGetSpeakerMessage,
	apiDeleteVms,
	apiModifyVms,
	apiAddWaterlevelGauge,
	apiGetWaterlevelGauge,
	apiModifyWaterlevelGauge,
	apiDeleteWaterlevelGauge,
	apiGetWaterlevelGaugeCrossinggates,
	apiLinkCrossinggateWithWaterlevelGauge,
	apiUpdateCrossinggateWithWaterlevelGauge,
	apiSettingThresholdToWaterlevelGauge,
	apiStatusValueChangeWaterlevelGauge,
	apiCalculatingWaterlevelRatio,
	apiGetWaterLevelOutsideInfo,
	apiGetAllWaterLevelOutsideInfo,
	apiAddWaterLevelAutoControl,
	apiGetWaterLevelAutoControl,
	apiGetWaterLevelGroups,
	apiGetWaterLevelGroupDetail,
	apiGetAvailableWaterLevels,
	apiCreateWaterLevelGroup,
	apiUpdateWaterLevelGroup,
	apiDeleteWaterLevelGroup,
} from '@/services/InundationService';

interface SettingsState {
	vmsList: any[];
	billboardMessageList: any[];
	speakerMessageList: any[];
	waterlevelGaugeList: any[];
	crossingGateList: any[];
	waterlevelLinkCrossinggateList: any[];
	waterlevelOutsideList: any[];
	waterlevelAutoControlList: any[];
	waterLevelGroups: any[];
	availableWaterLevels: any[];
	selectedGroupDetail: any | null;

	getCrossinggateList: () => Promise<void>;
	setCrossingGateList: (data: any[]) => void;

	// VMS 관련
	addVms: (params: any) => Promise<boolean>;
	modifyVms: (params: any) => Promise<boolean>;
	getVms: (params: any) => Promise<void>;
	deleteVms: (params: any) => Promise<boolean>;
	syncVms: (params: any) => Promise<boolean>;

	// Billboard 관련
	addBillboardMessage: (billboard: any) => Promise<boolean>;
	modifyBillboardMacroMessage: (billboard: any) => Promise<boolean>;
	deleteBillboardMessage: (billboard: any) => Promise<boolean>;
	getBillboardMessageList: () => Promise<void>;

	// Speaker 관련
	addSpeakerMessage: (speaker: any) => Promise<boolean>;
	modifySpeakerMessage: (speaker: any) => Promise<boolean>;
	deleteSpeakerMessage: (speaker: any) => Promise<boolean>;
	getSpeakerMessageList: () => Promise<void>;

	// Waterlevel 관련
	addWaterlevelGauge: (waterlevel: any) => Promise<boolean>;
	getWaterlevelGaugeList: () => Promise<void>;
	modifyWaterlevelGauge: (waterlevel: any) => Promise<boolean>;
	deleteWaterlevelGauge: (waterlevel: any) => Promise<boolean>;
	getWaterlevelGaugeCrossinggates: () => Promise<void>;
	linkCrossinggateWithWaterlevelGauge: (waterlevel: any) => Promise<boolean>;
	updateCrossinggateWithWaterlevelGauge: (waterlevel: any) => Promise<boolean>;
	settingThresholdToWaterlevelGauge: (params: { water_level_idx: number; threshold: string }) => Promise<boolean>;
	statusValueChangeWaterlevelGauge: (data: { waterlevelIdx: string; waterlevelStatus: boolean }) => Promise<boolean>;
	calculatingWaterlevelRatio: () => Promise<void>;
	getWaterlevelOutsideList: () => Promise<void>;

	// 자동제어
	addWaterLevelAutoControl: (waterlevel: any) => Promise<boolean>;
	getWaterLevelAutoControlList: () => Promise<void>;

	// 수위계 그룹
	getWaterLevelGroups: () => Promise<void>;
	getWaterLevelGroupDetail: (groupId: number) => Promise<void>;
	getAvailableWaterLevels: () => Promise<void>;
	createWaterLevelGroup: (groupData: any) => Promise<boolean>;
	updateWaterLevelGroup: (groupId: number, groupData: any) => Promise<boolean>;
	deleteWaterLevelGroup: (groupId: number) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
	vmsList: [],
	billboardMessageList: [],
	speakerMessageList: [],
	waterlevelGaugeList: [],
	crossingGateList: [],
	waterlevelLinkCrossinggateList: [],
	waterlevelOutsideList: [],
	waterlevelAutoControlList: [],
	waterLevelGroups: [],
	availableWaterLevels: [],
	selectedGroupDetail: null,

	getCrossinggateList: async () => {
		try {
			const response = await apiGetCrossinggate();
			const data = Array.isArray(response?.result) ? response.result : [];
			set({ crossingGateList: data });
		} catch (error) {
			console.error('CrossingGate 조회 실패:', error);
			set({ crossingGateList: [] });
		}
	},

	setCrossingGateList: (data) => {
		set({ crossingGateList: Array.isArray(data) ? data : [] });
	},

	addVms: async (params) => {
		try {
			const response = await apiAddVms(params);
			if (response?.result.status) {
				await get().getVms({ mainServiceName: params.mainServiceName });
				return true;
			}
			return false;
		} catch (error) {
			console.error('VMS 추가 실패:', error);
			return false;
		}
	},

	getVms: async (params) => {
		try {
			const response = await apiGetVms(params);
			const data = Array.isArray(response?.result) ? response.result : [];
			set({ vmsList: data });
		} catch (error) {
			console.error('VMS 조회 실패:', error);
			set({ vmsList: [] });
		}
	},

	syncVms: async (params) => {
		try {
			const response = await apiSynchronizeVms(params);
			if (response?.message === 'ok') {
				await get().getVms({ mainServiceName: params.mainServiceName });
				return true;
			}
			return false;
		} catch (error) {
			console.error('VMS 동기화 실패:', error);
			return false;
		}
	},

	modifyVms: async (params) => {
		try {
			const response = await apiModifyVms(params);
			if (response?.message === 'ok') {
				await get().getVms({ mainServiceName: params.mainServiceName });
				return true;
			}
			return false;
		} catch (error) {
			console.error('VMS 수정 실패:', error);
			return false;
		}
	},

	deleteVms: async (params) => {
		try {
			const response = await apiDeleteVms(params);
			if (response?.message === 'ok') {
				await get().getVms({ mainServiceName: params.mainServiceName });
				return true;
			}
			return false;
		} catch (error) {
			console.error('VMS 삭제 실패:', error);
			return false;
		}
	},

	// Billboard 관련
	getBillboardMessageList: async () => {
		try {
			const response = await apiGetBillboardMessage();
			const data = Array.isArray(response?.result) ? response.result : [];
			set({ billboardMessageList: data });
		} catch (error) {
			console.error('Billboard 메시지 조회 실패:', error);
			set({ billboardMessageList: [] });
		}
	},

	addBillboardMessage: async (billboard) => {
		try {
			const response = await apiAddBillboardMessage(billboard);
			if (response?.message === 'ok') {
				await get().getBillboardMessageList();
				return true;
			}
			return false;
		} catch (error) {
			console.error('Billboard 메시지 추가 실패:', error);
			return false;
		}
	},

	modifyBillboardMacroMessage: async (billboard) => {
		try {
			const response = await apiModifyBillboardMacroMessage(billboard);
			if (response?.message === 'ok') {
				await get().getBillboardMessageList();
				return true;
			}
			return false;
		} catch (error) {
			console.error('Billboard 메시지 수정 실패:', error);
			return false;
		}
	},

	deleteBillboardMessage: async (billboard) => {
		try {
			const response = await apiDeleteBillboardMessage(billboard);

			if (response?.message === 'ok') {
				await get().getBillboardMessageList();
				return true;
			} else {
				return false;
			}
		} catch (error) {
			console.error('Billboard 메시지 삭제 API 호출 실패:', error);
			return false;
		}
	},

	// Speaker 관련
	getSpeakerMessageList: async () => {
		try {
			const response = await apiGetSpeakerMessage();
			const data = Array.isArray(response?.result) ? response.result : [];
			set({ speakerMessageList: data });
		} catch (error) {
			console.error('Speaker 메시지 조회 실패:', error);
			set({ speakerMessageList: [] });
		}
	},

	addSpeakerMessage: async (speaker) => {
		try {
			const response = await apiAddSpeakerMessage(speaker);
			if (response?.message === 'ok') {
				await get().getSpeakerMessageList();
				return true;
			}
			return false;
		} catch (error) {
			console.error('Speaker 메시지 추가 실패:', error);
			return false;
		}
	},

	modifySpeakerMessage: async (speaker) => {
		try {
			const response = await apiModifySpeakerMessage(speaker);
			if (response?.message === 'ok') {
				await get().getSpeakerMessageList();

				return true;
			}
			return false;
		} catch (error) {
			console.error('Speaker 메시지 수정 실패:', error);
			return false;
		}
	},

	deleteSpeakerMessage: async (speaker) => {
		try {
			const response = await apiDeleteSpeakerMessage(speaker);
			if (response?.message === 'ok') {
				await get().getSpeakerMessageList();

				return true;
			}
			return false;
		} catch (error) {
			console.error('Speaker 메시지 삭제 실패:', error);
			return false;
		}
	},

	// Waterlevel 관련
	getWaterlevelGaugeList: async () => {
		try {
			const response = await apiGetWaterlevelGauge();
			const data = Array.isArray(response?.result) ? response.result : [];
			set({ waterlevelGaugeList: data });
		} catch (error) {
			console.error('Waterlevel gauge 조회 실패:', error);
			set({ waterlevelGaugeList: [] });
		}
	},

	addWaterlevelGauge: async (waterlevel) => {
		try {
			const response = await apiAddWaterlevelGauge(waterlevel);
			if (response?.message === 'ok') {
				await get().getWaterlevelGaugeList();
				return true;
			}
			return false;
		} catch (error) {
			console.error('Waterlevel gauge 추가 실패:', error);
			return false;
		}
	},

	modifyWaterlevelGauge: async (waterlevel) => {
		try {
			const response = await apiModifyWaterlevelGauge(waterlevel);
			if (response?.message === 'ok') {
				await get().getWaterlevelGaugeList();
				return true;
			}
			return false;
		} catch (error) {
			console.error('Waterlevel gauge 수정 실패:', error);
			return false;
		}
	},

	deleteWaterlevelGauge: async (waterlevel) => {
		try {
			const response = await apiDeleteWaterlevelGauge(waterlevel);
			if (response?.message === 'ok') {
				await get().getWaterlevelGaugeList();
				return true;
			}
			return false;
		} catch (error) {
			console.error('Waterlevel gauge 삭제 실패:', error);
			return false;
		}
	},

	getWaterlevelGaugeCrossinggates: async () => {
		try {
			const response = await apiGetWaterlevelGaugeCrossinggates();
			const data = Array.isArray(response?.result) ? response.result : [];
			set({ waterlevelLinkCrossinggateList: data });
		} catch (error) {
			console.error('Waterlevel gauge crossinggates 조회 실패:', error);
			set({ waterlevelLinkCrossinggateList: [] });
		}
	},

	linkCrossinggateWithWaterlevelGauge: async (waterlevel) => {
		try {
			const response = await apiLinkCrossinggateWithWaterlevelGauge(waterlevel);
			return response?.message === 'ok';
		} catch (error) {
			console.error('Crossing gate 연결 실패:', error);
			return false;
		}
	},

	updateCrossinggateWithWaterlevelGauge: async (waterlevel) => {
		try {
			const response = await apiUpdateCrossinggateWithWaterlevelGauge(waterlevel);
			return response?.message === 'ok';
		} catch (error) {
			console.error('Crossing gate 업데이트 실패:', error);
			return false;
		}
	},

	settingThresholdToWaterlevelGauge: async (params) => {
		try {
			const response = await apiSettingThresholdToWaterlevelGauge(params);
			return response?.message === 'ok';
		} catch (error) {
			console.error('Threshold 설정 실패:', error);
			return false;
		}
	},

	statusValueChangeWaterlevelGauge: async (data) => {
		try {
			const params = {
				waterlevelIdx: Number(data.waterlevelIdx),
				waterlevelStatus: data.waterlevelStatus,
			};
			const response = await apiStatusValueChangeWaterlevelGauge(params);
			return response?.message === 'ok';
		} catch (error) {
			console.error('Waterlevel status 변경 실패:', error);
			return false;
		}
	},

	calculatingWaterlevelRatio: async () => {
		try {
			const response = await apiCalculatingWaterlevelRatio({});
			const data = Array.isArray(response?.result) ? response.result : [];
			set({ waterlevelGaugeList: data });
		} catch (error) {
			console.error('Waterlevel ratio 계산 실패:', error);
			set({ waterlevelGaugeList: [] });
		}
	},

	getWaterlevelOutsideList: async () => {
		try {
			const response = await apiGetAllWaterLevelOutsideInfo();
			const data = Array.isArray(response?.result) ? response.result : [];
			set({ waterlevelOutsideList: data });
		} catch (error) {
			console.error('Waterlevel outside list 조회 실패:', error);
			set({ waterlevelOutsideList: [] });
		}
	},

	// 자동제어 관련
	addWaterLevelAutoControl: async (waterlevel) => {
		try {
			const response = await apiAddWaterLevelAutoControl(waterlevel);
			if (response?.message === 'ok') {
				await get().getWaterLevelAutoControlList();
				return true;
			}
			return false;
		} catch (error) {
			console.error('Water level auto control 추가 실패:', error);
			return false;
		}
	},

	getWaterLevelAutoControlList: async () => {
		try {
			const response = await apiGetWaterLevelAutoControl();
			const data = Array.isArray(response?.result) ? response.result : [];
			set({ waterlevelAutoControlList: data });
		} catch (error) {
			console.error('Water level auto control list 조회 실패:', error);
			set({ waterlevelAutoControlList: [] });
		}
	},

	// 수위계 그룹 관련
	getWaterLevelGroups: async () => {
		try {
			const response = await apiGetWaterLevelGroups();
			const data = Array.isArray(response) ? response : [];
			set({ waterLevelGroups: data });
		} catch (error) {
			console.error('Water level groups 조회 실패:', error);
			set({ waterLevelGroups: [] });
		}
	},

	getWaterLevelGroupDetail: async (groupId) => {
		try {
			const response = await apiGetWaterLevelGroupDetail(groupId);
			set({ selectedGroupDetail: response || null });
		} catch (error) {
			console.error('Water level group detail 조회 실패:', error);
			set({ selectedGroupDetail: null });
		}
	},

	getAvailableWaterLevels: async () => {
		try {
			const response = await apiGetAvailableWaterLevels();
			const data = Array.isArray(response) ? response : [];
			set({ availableWaterLevels: data });
		} catch (error) {
			console.error('Available water levels 조회 실패:', error);
			set({ availableWaterLevels: [] });
		}
	},

	createWaterLevelGroup: async (groupData) => {
		try {
			const response = await apiCreateWaterLevelGroup(groupData);
			if (response?.success) {
				await get().getWaterLevelGroups();
				await get().getAvailableWaterLevels();
				return true;
			}
			return false;
		} catch (error) {
			console.error('Water level group 생성 실패:', error);
			return false;
		}
	},

	updateWaterLevelGroup: async (groupId, groupData) => {
		try {
			const response = await apiUpdateWaterLevelGroup(groupId, groupData);
			if (response?.success) {
				await get().getWaterLevelGroups();
				await get().getAvailableWaterLevels();
				await get().getWaterLevelGroupDetail(groupId);
				return true;
			}
			return false;
		} catch (error) {
			console.error('Water level group 수정 실패:', error);
			return false;
		}
	},

	deleteWaterLevelGroup: async (groupId) => {
		try {
			const response = await apiDeleteWaterLevelGroup(groupId);
			if (response?.success) {
				await get().getWaterLevelGroups();
				await get().getAvailableWaterLevels();
				set({ selectedGroupDetail: null });
				return true;
			}
			return false;
		} catch (error) {
			console.error('Water level group 삭제 실패:', error);
			return false;
		}
	},
}));
