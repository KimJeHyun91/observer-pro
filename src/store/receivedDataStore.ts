import { create } from 'zustand';

interface DataStore {
	crossingGatesData: Record<string, any>;
	camerasData: Record<string, any>;
	billboardsData: Record<string, any>;
	speakersData: Record<string, any>;
	waterlevelsData: Record<string, any>;
	guardianlitesData: Record<string, any>;
	flEventData: Record<string, any>;
	vmsData: Record<string, any>;
	ebellsData: Record<string, any>;
	doorsData: Record<string, any>;
	acuData: Record<string, any>;
	pidsData: Record<string, any>;
	vehiclesData: Record<string, any>;
	buildingsData: Record<string, any>;
	areaData: Record<string, any>;
	eventLogData: Record<string, any>;
	warningBoardData: Record<string, any>;
	pmEventData: Record<string, any>;
	nearbyAlertData: Record<string, any>;
	parkingsData: Record<string, any>;
	lprData: Record<string, any>;
	gateStateData: Record<string, any>;
	feeCalculationResultData: Record<string, any>;
	tmEventData: Record<string, any>;
	prmNotificationData: Record<string, any>;

	setCrossingGatesData: (data: Record<string, any>) => void;
	setCamerasData: (data: Record<string, any>) => void;
	setBillboardsData: (data: Record<string, any>) => void;
	setSpeakersData: (data: Record<string, any>) => void;
	setWaterlevelsData: (data: Record<string, any>) => void;
	setGuardianlitesData: (data: Record<string, any>) => void;
	setVmsData: (data: Record<string, any>) => void;
	setNearbyAlert: (data: Record<string, any>) => void;
	setFlEventData: (data: Record<string, any>) => void;
	setEbellsData: (data: Record<string, any>) => void;
	setDoorsData: (data: Record<string, any>) => void;
	setAcuData: (data: Record<string, any>) => void;
	setPidsData: (data: Record<string, any>) => void;
	setVehiclesData: (data: Record<string, any>) => void;
	setBuildingsData: (data: Record<string, any>) => void;
	setAreaData: (data: Record<string, any>) => void;
	setEventLogData: (data: Record<string, any>) => void;
	setWarningBoardData: (data: Record<string, any>) => void;
	setPmEventData: (data: Record<string, any>) => void;
	setParkingsData: (data: Record<string, any>) => void;
	setLprData: (data: Record<string, any>) => void;
	setGateStateData: (data: Record<string, any>) => void;
	setFeeCalculationResult: (data: Record<string, any>) => void;
	setTmEventData: (data: Record<string, any>) => void;
	setPrmNotificationData: (data: Record<string, any>) => void;
}
export const useDataStore = create<DataStore>((set) => {
	const createSetter = (key: keyof DataStore) =>
		(data: Record<string, any>) =>
			set((state) => ({
				[key]: { ...state[key], ...data },
			}));

	return {
		crossingGatesData: {},
		camerasData: {},
		billboardsData: {},
		speakersData: {},
		waterlevelsData: {},
		guardianlitesData: {},
		vmsData: {},
		flEventData: {},
		ebellsData: {},
		doorsData: {},
		acuData: {},
		pidsData: {},
		vehiclesData: {},
		buildingsData: {},
		areaData: {},
		eventLogData: {},
		warningBoardData: {},
		pmEventData: {},
		nearbyAlertData: {},
		parkingsData: {},
		lprData: {},
		gateStateData: {},
		tmEventData: {},
		prmNotificationData: {},
		feeCalculationResultData: {},

		setCrossingGatesData: createSetter('crossingGatesData'),
		setCamerasData: createSetter('camerasData'),
		setBillboardsData: createSetter('billboardsData'),
		setSpeakersData: createSetter('speakersData'),
		setWaterlevelsData: createSetter('waterlevelsData'),
		setGuardianlitesData: createSetter('guardianlitesData'),
		setVmsData: createSetter('vmsData'),
		setFlEventData: createSetter('flEventData'),
		setEbellsData: createSetter('ebellsData'),
		setDoorsData: createSetter('doorsData'),
		setAcuData: createSetter('acuData'),
		setPidsData: createSetter('pidsData'),
		setVehiclesData: createSetter('vehiclesData'),
		setBuildingsData: createSetter('buildingsData'),
		setAreaData: createSetter('areaData'),
		setEventLogData: createSetter('eventLogData'),
		setWarningBoardData: createSetter('warningBoardData'),
		setPmEventData: createSetter('pmEventData'),
		setNearbyAlert: createSetter('nearbyAlertData'),
		setParkingsData: createSetter('parkingsData'),
		setLprData: createSetter('lprData'),
		setGateStateData: createSetter('gateStateData'),
		setFeeCalculationResult: createSetter('feeCalculationResultData'),
		setTmEventData: createSetter('tmEventData'),
		setPrmNotificationData: createSetter('prmNotificationData'),
	};
});