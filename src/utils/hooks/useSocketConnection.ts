import { useEffect } from 'react';
import { useDataStore } from '@/store/receivedDataStore';
import { DeviceType, DeviceTypeToData } from '@/@types/socket';
import SocketService from '@/services/socket';

type UpdateEvents = {
	[K in DeviceType]: `${K}-update`;
};

export function useSocketConnection() {
	const socketService = SocketService.getInstance();
	const dataStore = useDataStore();

	useEffect(() => {
		const deviceEvents: UpdateEvents = {
			fl_cameras: 'fl_cameras-update',
			fl_waterlevels: 'fl_waterlevels-update',
			fl_crossingGates: 'fl_crossingGates-update',
			fl_billboards: 'fl_billboards-update',
			fl_signboards: 'fl_signboards-update',
			fl_speakers: 'fl_speakers-update',
			fl_guardianlites: 'fl_guardianlites-update',
			fl_vms: 'fl_vms-update',
			fl_eventThreshold: 'fl_eventThreshold-update',
			fl_events: 'fl_events-update',
			fl_waterLevelAutoControlResult: 'fl_waterLevelAutoControlResult-update',
			ob_ebells: 'ob_ebells-update',
			ob_doors: 'ob_doors-update',
			ob_acu: 'ob_acu-update',
			ob_pids: 'ob_pids-update',
			ob_vehicles: 'ob_vehicles-update',
			ob_buildings: 'ob_buildings-update',
			pm_area: 'pm_area-update',
			pm_event: 'pm_event-update',
			pm_buildings: 'pm_buildings-update',
			ob_floors: 'ob_floors-update',
			ob_cameras: 'ob_cameras-update',
			pm_cameras: 'pm_cameras-update',
			tm_cameras: 'tm_cameras-update',
			vb_areaList: 'vb_areaList-update',
			vb_speaker: 'vb_speaker-update',
			vb_reserve: 'vb_reserve-update',
			vb_broadcast: 'vb_broadcast-update',
			vb_reserve_broadcast: 'vb_reserve_broadcast-update',
			vb_event: 'vb_event-update',
			cm_event_log: 'cm_event_log-update',
			cm_warningBoard: 'cm_warningBoard-update',
			fl_nearby_alert: 'fl_nearby_alert-update',
			tm_event: 'tm_event-update',
			tm_areaList: 'tm_areaList-update',
			tm_waterGauges: 'tm_waterGauges-update',
			tm_waterLevel: 'tm_waterLevel-update',
			tm_billboard: 'tm_billboard-update',
			pf_parkings: 'pf_parkings-update',
			pf_lpr: 'pf_lpr-update',
			pf_gate_state: 'pf_gate_state-update',
			pf_fee_calculation_result: 'pf_fee_calculation_result-update',
			prm_notification : 'prm_notification-update'
		} as const;

		const setterMap: Record<string, string> = {
			fl_cameras: 'setCamerasData',
			fl_waterlevels: 'setWaterlevelsData',
			fl_crossingGates: 'setCrossingGatesData',
			fl_billboards: 'setBillboardsData',
			fl_speakers: 'setSpeakersData',
			fl_guardianlites: 'setGuardianlitesData',
			fl_vms: 'setVmsData',
			fl_eventThreshold: 'setEventThresholdData',
			fl_events: 'setFlEventData',
			fl_nearby_alert: 'setNearbyAlert',
			fl_waterLevelAutoControlResult: 'setWaterLevelAutoControlResult',
			ob_ebells: 'setEbellsData',
			ob_doors: 'setDoorsData',
			ob_acu: 'setAcuData',
			ob_pids: 'setPidsData',
			ob_vehicles: 'setVehiclesData',
			ob_buildings: 'setBuildingsData',
			pm_area: 'setAreaData',
			pm_event: 'setPmEventData',
			pm_buildings: 'setBuildingsData',
			ob_floors: 'setFloorsData',
			ob_cameras: 'setCamerasData',
			pm_cameras: 'setCamerasData',
			tm_cameras: 'setCamerasData',
			vb_areaList: 'setAreaListData',
			vb_speaker: 'setSpeakersData',
			vb_reserve: 'setReserveData',
			vb_broadcast: 'setBroadcastData',
			vb_reserve_broadcast: 'setReserveBroadcastData',
			vb_event: 'setVbEventData',
			cm_event_log: 'setEventLogData',
			cm_warningBoard: 'setWarningBoardData',
			tm_areaList: 'setAreaData',
			tm_waterLevel: 'setWaterlevelsData',
			tm_billboard: 'setBillboardsData',
			tm_event: 'setTmEventData',
			pf_parkings: 'setParkingsData',
			pf_lpr: 'setLprData',
			pf_gate_state: 'setGateStateData',
			pf_fee_calculation_result: 'setFeeCalculationResult',
			prm_notification:'setPrmNotificationData'
		};

		const subscriptions = (Object.entries(deviceEvents) as [DeviceType, UpdateEvents[DeviceType]][]).map(
			([deviceType, eventName]) => {
				return socketService?.subscribe(eventName, (data: DeviceTypeToData[typeof deviceType]) => {
					const setterName = setterMap[deviceType];
					const setter = dataStore[setterName as keyof typeof dataStore];

					if (typeof setter === 'function') {
						setter({ [data.id]: data });
					} else {
						console.warn(`Setter not found for ${deviceType}. Expected setter: ${setterName}`);
					}
				});
			}
		);

		return () => subscriptions.forEach((unsubscribe) => unsubscribe && unsubscribe());
	}, []);

	return {
		socketService
	};
}