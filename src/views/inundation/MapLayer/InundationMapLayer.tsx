import { useState, useEffect, useCallback, useMemo } from "react";
import { useAreaStore } from "@/store/Inundation/useAreaStore";
import BaseMapLayer, { MarkerData, ContextMenuData, MarkerMenuData } from "@/components/map/BaseMapLayer";
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useSettingsStore } from "@/store/Inundation/useSettingsStore";
import { AlertDialog } from "@/components/shared/AlertDialog";
import { AreaFormInput, AreaInformation, DialogState, MapDialogState, MenuState, SelectedObject, Waterlevel, WaterlevelLinkInfo, WaterLevelAutoControlResult } from '@/@types/inundation';
import L from "leaflet";
import { getLevelStatus } from "../Detail/components/water-level-utils";
import WaterlevelCameraDialog from "./dialogs/WaterlevelCameraDialog";
import { CommonAlertDialog } from '../modals/CommonAlertDialog';
import AddAreaDialog from "./dialogs/AddAreaDialog";
import AddWaterlevelDialog from "./dialogs/AddWaterlevelDialog";
import ModifyAreaDialog from "./dialogs/ModifyAreaDialog";
import { useMinimapStore } from "@/store/minimapStore";
import NavigationMinimap from "@/components/map/MinimapBounds";
import '../../../assets/styles/waterlevel-animation.css';
import { useSessionUser } from "@/store/authStore";
import AutoControlResultPopup from '@/components/shared/AutoControlResultPopup';

import disconnectedIcon from '@/assets/styles/images/disconnect-gate.png';
import openGateIcon from '@/assets/styles/images/open-gate.png';
import closeGateIcon from '@/assets/styles/images/close-gate.png';

interface InundationMapLayerProps {
	onMapClick: (coordinates: { lat: number; lng: number }) => void;
	onObjectSelect: (data: SelectedObject) => void;
}

const MAIN_SERVCIE_NAME = 'inundation';

const WaterlevelIcon = L.divIcon({
	className: 'custom-div-icon',
	html: `<div style="
		background-color: #3B82F6;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid white;
		box-shadow: 0 0 4px rgba(0,0,0,0.4);
		"></div>`,
	iconSize: [20, 20],
	iconAnchor: [6, 6]
});

// const createGateIcon = (status: boolean | undefined, gateLinkedStatus: boolean) => L.divIcon({
// 	className: 'custom-div-icon',
// 	html: `
// 			 <div style="
// 				  position: relative;
// 				  width: 0;
// 				  height: 0;
// 				  border-left: 15px solid transparent;
// 				  border-right: 15px solid transparent;
// 				  border-top: 45px solid ${gateLinkedStatus
// 			? (status === true ? '#2563eb' : status === false ? '#dc2626' : '#0e1163')
// 			: '#6b7280'
// 		};
// 				  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
// 			 ">
// 				  <div style="
// 						position: absolute;
// 						top: -40px;
// 						left: -7px;
// 						width: 14px;
// 						text-align: center;
// 						color: white;
// 						font-size: 11px;
// 						font-weight: bold;
// 						text-shadow: 0 1px 2px rgba(0,0,0,0.3);
// 				  ">${gateLinkedStatus
// 			? (status === true ? 'O' : status === false ? 'C' : '?')
// 			: 'D'
// 		}</div>
// 				  <div style="
// 						position: absolute;
// 						top: -45px;
// 						left: -15px;
// 						border-left: 15px solid transparent;
// 						border-right: 15px solid transparent;
// 						border-top: 45px solid rgba(255, 255, 255, 0.3);
// 						z-index: -1;
// 				  "></div>
// 			 </div>
// 		`,
// 	iconSize: [30, 45],
// 	iconAnchor: [15, 45],
// 	popupAnchor: [0, -45],
// });

export const customIcons = {
	waterlevel: WaterlevelIcon
};

const createGateIcon = (gateStatus, gateLinkedStatus) => {
let iconUrl;
	
	if (!gateLinkedStatus) {
		iconUrl = disconnectedIcon;
	} else if (gateStatus) {
		iconUrl = openGateIcon;
	} else {
		iconUrl = closeGateIcon;
	}
	
	return L.icon({
		iconUrl: iconUrl,
		iconSize: [34, 45],
		iconAnchor: [16, 32],
		popupAnchor: [0, -32],
	});
};

const getMarkerIcon = (type: string, gateStatus: boolean, gateLinkedStatus: boolean, waterlevel?: { curr_water_level?: string; threshold?: string }) => {
	if (type === 'area') {
		return createGateIcon(gateStatus, gateLinkedStatus);
	}

	if (type === 'waterlevel') {
		if (!waterlevel) {
			return WaterlevelIcon;
		}

		if (waterlevel.curr_water_level && waterlevel.threshold) {
			const status = getLevelStatus(
				parseFloat(waterlevel.curr_water_level),
				parseFloat(waterlevel.threshold)
			);

			const emergencyClass = ['주의', '경계', '심각', '대피'].includes(status.text)
				? `waterlevel-status-${status.text}`
				: '';

			return L.divIcon({
				className: `custom-div-icon ${emergencyClass}`,
				html: `<div class="waterlevel-marker" style="
					background-color: ${status.hexColor};
					width: 20px;
					height: 20px;
					border-radius: 50%;
					border: 2px solid white;
					box-shadow: 0 0 4px rgba(0,0,0,0.4);
				"></div>`,
				iconSize: [20, 20],
				iconAnchor: [6, 6]
			});
		} else {
			console.log('Missing water level or threshold data');
		}
	}
	return WaterlevelIcon;
};

function InundationMapLayer({ onObjectSelect }: InundationMapLayerProps) {
	const [markers, setMarkers] = useState<MarkerData[]>([]);
	const [isDraggingEnabled, setIsDraggingEnabled] = useState(false);
	const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
	const [draggedMarkerType, setDraggedMarkerType] = useState<'area' | 'waterlevel' | null>(null);
	const [tempMarkerPositions, setTempMarkerPositions] = useState<Record<string, [number, number]>>({});
	const [dialogIsOpen, setIsOpen] = useState(false);
	const [modifyDialogIsOpen, setModifyDialogIsOpen] = useState(false);
	const [waterlevelDialogIsOpen, setWaterlevelDialogOpen] = useState(false);
	const [alertOpen, setAlertOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [contextMenuOpen, setContextMenuOpen] = useState(false);
	const [waterlevelMarkers, setWaterlevelMarkers] = useState<MarkerData[]>([]);

	const [autoControlResult, setAutoControlResult] = useState<WaterLevelAutoControlResult | null>(null);
	const [isPopupOpen, setIsPopupOpen] = useState(false);

	const [areaInformation, setAreaInformation] = useState<AreaFormInput>({
		areaName: '',
		areaLocation: '',
		areaCamera: '',
		areaCrossingGate: '',
		areaSpeaker: '',
		areaSpeakerPort: '',
		areaBillboard: '',
		areaBillboardPort: '',
		areaSignboard: '',
		areaSignboardPort: '',
		areaGuardianlite: '',
		areaWaterlevelGauge: null,
		leftLocation: '',
		topLocation: '',
		serviceType: 'inundation',
		id: ''
	});
	const [waterlevelLinkInfo, setWaterlevelLinkInfo] = useState<WaterlevelLinkInfo>({
		leftLocation: '',
		topLocation: '',
		selectedWaterlevel: null
	});
	const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
	const [selectedCamera, setSelectedCamera] = useState<Waterlevel | null>(null);
	const [cameraPosition, setCameraPosition] = useState<{ x: number; y: number } | null>(null);
	const [selectedMarkerType, setSelectedMarkerType] = useState<"area" | "waterlevel" | "broadcast" | null>(null);
	const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
	const [selectedArea, setSelectedArea] = useState<AreaInformation | null>(null);
	const [dialogState, setDialogState] = useState<DialogState>({
		isOpen: false,
		type: 'alert',
		title: '',
		message: '',
	});
	const [menuState, setMenuState] = useState<MenuState>({
		isOpen: false,
		position: null,
		type: null
	});

	const { socketService } = useSocketConnection();

	const { user } = useSessionUser();

	const {
		areas,
		fetchAreas,
		getCameras,
		removeArea,
		removeWaterlevelToMap,
		cameras,
		updateWaterlevelPosition,
		updateAreaPosition
	} = useAreaStore();
	const {
		getWaterlevelGaugeList,
		getCrossinggateList,
		waterlevelGaugeList,
	} = useSettingsStore();

	const minimapState = useMinimapStore((state) => state.use);

	const cameraOptions = useMemo(() => {
		return cameras.map((cam) => ({
			vms_name: cam.vms_name,
			camera_id: cam.camera_id,
			camera_name: cam.camera_name,
			camera_ip: cam.camera_ip,
			camera_idx: cam.camera_idx,
			service_type: cam.service_type,
			access_point: cam.access_point,
			main_service_name: MAIN_SERVCIE_NAME
		}));
	}, [cameras]);

	const waterlevelOptions = waterlevelGaugeList
		// .filter(waterlevel => waterlevel.water_level_model === 'AI BOX')
		.map(waterlevel => ({
			value: waterlevel.water_level_idx,
			label: `${waterlevel.water_level_name} (${waterlevel.water_level_location})`,
		}));

	const addAreaWaterlevelOptions = waterlevelGaugeList
		.filter(waterlevel =>
			!waterlevel.left_location &&
			!waterlevel.top_location &&
			waterlevel.water_level_model === 'AI BOX'
		)
		.map(waterlevel => ({
			value: waterlevel.water_level_idx,
			label: `${waterlevel.water_level_name} (${waterlevel.water_level_location})`,
		}));

	useEffect(() => {
		const fetchData = async () => {
			try {
				await Promise.all([
					getWaterlevelGaugeList(),
					fetchAreas(),
					getCameras({ mainServiceName: MAIN_SERVCIE_NAME })
				]);
			} catch (error) {
				setErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
				setAlertOpen(true);
			}
		};
		fetchData();
	}, []);

	useEffect(() => {
		if (!socketService) return;
		const unsubscribe = socketService.subscribe('fl_crossingGates-update', (data) => {
			fetchAreas();
		});
		return () => unsubscribe();
	}, [socketService, fetchAreas]);

	useEffect(() => {
		if (!socketService) return;
		const unsubscribe = socketService.subscribe('fl_cameras-update', (data) => {
			getCameras({ mainServiceName: MAIN_SERVCIE_NAME });
		});
		return () => unsubscribe();
	}, [socketService, getCameras]);

	useEffect(() => {
		if (!socketService) return;

		const unsubscribe = socketService.subscribe('fl_waterLevelAutoControlResult-update', (received) => {
			setAutoControlResult(received);
			setIsPopupOpen(true);
		});

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	}, [socketService]);

	useEffect(() => {
		if (areas.length > 0) {
			const uniqueAreas = Array.from(
				new Map(areas.map(area => [area.outside_idx, area])).values()
			);
			const newMarkers = uniqueAreas
				.filter(area => area.outside_left_location && area.outside_top_location)
				.map((area): MarkerData => {
					const markerId = area.outside_idx.toString();
					const position = draggedMarkerId === markerId && tempMarkerPositions[markerId]
						? tempMarkerPositions[markerId]
						: [
							parseFloat(area.outside_top_location),
							parseFloat(area.outside_left_location)
						] as [number, number];;

					return {
						id: markerId,
						position,
						name: area.outside_name,
						type: 'area',
						gateStatus: area.crossing_gate_status,
						camera_ip: area.camera_ip,
						gateLinkedStatus: area.outside_linked_status,
						speaker_name: '',
						broadcast_device: null
					};
				});
			setMarkers([]);
			setMarkers(newMarkers);
		} else {
			setMarkers([]);
		}
	}, [areas, tempMarkerPositions]);

	useEffect(() => {
		if (waterlevelGaugeList.length > 0) {
			const newMarkers = waterlevelGaugeList
				.filter(waterlevel => waterlevel.left_location && waterlevel.top_location)
				.map((waterlevel): MarkerData => {
					const markerId = waterlevel.water_level_idx.toString();
					const position = tempMarkerPositions[markerId] || [
						parseFloat(waterlevel.top_location || ''),
						parseFloat(waterlevel.left_location || '')
					];

					return {
						id: markerId,
						position,
						name: waterlevel.water_level_name,
						type: 'waterlevel',
						gateStatus: false,
						waterlevel: {
							curr_water_level: waterlevel.curr_water_level,
							threshold: waterlevel.threshold,
							water_level_idx: waterlevel.water_level_idx,
							water_level_name: waterlevel.water_level_name
						},
						speaker_name: '',
						broadcast_device: null
					};
				});
			setWaterlevelMarkers(newMarkers);
		}
	}, [waterlevelGaugeList, tempMarkerPositions]);

	const handleMarkerDragEnd = async (markerId: string, newPosition: [number, number], type: string) => {
		try {
			setTempMarkerPositions((prev) => ({
				...prev,
				[markerId]: newPosition,
			}));

			if (type === 'area') {
				const result = await updateAreaPosition({
					idx: markerId,
					topLocation: String(newPosition[0]),
					leftLocation: String(newPosition[1]),
				});

				if (result) {
					showDialog({
						type: 'alert',
						title: '알림',
						message: '개소 위치가 업데이트되었습니다.',
						onConfirm: closeDialog,
					});
				} else {
					throw new Error('개소 위치 업데이트 실패');
				}
			} else if (type === 'waterlevel') {
				const result = await updateWaterlevelPosition({
					idx: markerId,
					topLocation: String(newPosition[0]),
					leftLocation: String(newPosition[1]),
				});

				if (result) {
					showDialog({
						type: 'alert',
						title: '알림',
						message: '수위계 위치가 업데이트되었습니다.',
						onConfirm: closeDialog,
					});
				} else {
					throw new Error('수위계 위치 업데이트 실패');
				}
			}
		} catch (error) {
			setTempMarkerPositions((prev) => {
				const { [markerId]: _, ...rest } = prev;
				return rest;
			});
			showDialog({
				type: 'alert',
				title: '오류',
				message: `${type === 'area' ? '개소' : '수위계'} 위치 업데이트 중 오류가 발생했습니다.`,
				onConfirm: closeDialog,
			});
		} finally {
			setIsDraggingEnabled(false);
			setDraggedMarkerId(null);
			setDraggedMarkerType(null);
		}
	};

	const enableMarkerDrag = () => {
		if (menuState.markerId && selectedMarkerType) {
			setDraggedMarkerId(menuState.markerId);
			setDraggedMarkerType(selectedMarkerType);
			setIsDraggingEnabled(true);

			resetMenuState();
		}
	};

	const handleMarkerClick = (marker: MarkerData, clickPosition?: { x: number; y: number }) => {
		const entityId = parseInt(marker.id, 10);
		switch (marker.type) {
			case 'area': {
				const area = areas.find(a => a.outside_idx === entityId);
				if (area) {
					onObjectSelect?.({
						id: marker.id,
						name: area.outside_name,
						location: area.outside_location,
						position: marker.position as [number, number],
						...area,
					});
				}
				break;
			}
			case 'waterlevel': {
				const waterlevel = waterlevelGaugeList.find(w => w.water_level_idx === entityId);
				if (waterlevel && clickPosition) {
					setSelectedCamera(waterlevel);
					setCameraPosition({
						x: clickPosition.x,
						y: clickPosition.y
					});
					setCameraDialogOpen(true);
				}
				break;
			}
		}
	};

	const resetMenuState = useCallback(() => {
		setMenuState({
			isOpen: false,
			position: null,
			type: null
		});
	}, []);

	const handleMarkerContextMenu = useCallback((data: MarkerMenuData) => {
		const marker = [...markers, ...waterlevelMarkers].find(m => m.id === data.markerId);

		setSelectedMarkerType(marker?.type || null);
		setMenuState({
			isOpen: true,
			position: { x: data.x, y: data.y },
			type: 'marker',
			markerId: data.markerId || undefined,
			camera_ip: data.camera_ip
		});
	}, [markers, waterlevelMarkers]);

	const handleMapClick = (coordinates: { lat: number; lng: number }) => {
		setSelectedCoordinates(coordinates);
		setAreaInformation(prev => ({
			...prev,
			leftLocation: String(coordinates.lng),
			topLocation: String(coordinates.lat)
		}));
	};

	const handleAddArea = () => {
		resetMenuState();
		setIsOpen(true);
	};

	const handleAddWaterlevel = () => {
		resetMenuState();
		setWaterlevelDialogOpen(true);
	}

	const handleModifyArea = () => {
		const areaToModify = areas.find(area => area.outside_idx === parseInt(menuState.markerId || ''));
		if (areaToModify) {
			setSelectedArea(areaToModify);
			setSelectedCoordinates({
				lat: parseFloat(areaToModify.outside_top_location),
				lng: parseFloat(areaToModify.outside_left_location)
			});
			setModifyDialogIsOpen(true);
			resetMenuState();
		}
	};
	const showDialog = useCallback((dialogConfig: Partial<MapDialogState>) => {
		setDialogState(prev => ({
			...prev,
			isOpen: true,
			...dialogConfig,
			onConfirm: () => {
				dialogConfig.onConfirm?.();
				setDialogState(prev => ({ ...prev, isOpen: false }));
				setContextMenuOpen(false);
			}
		}));
	}, []);

	const closeDialog = useCallback(() => {
		setDialogState(prev => ({ ...prev, isOpen: false }));
		setContextMenuOpen(false);
	}, []);

	const handleRemoveArea = async () => {
		resetMenuState();
		try {
			const confirmed = await new Promise<boolean>((resolve) => {
				showDialog({
					type: 'confirm',
					title: '개소 삭제',
					message: '해당 개소를 삭제하시겠습니까?',
					onConfirm: () => {
						closeDialog();
						resolve(true);
					},
					onCancel: () => {
						closeDialog();
						resolve(false);
					}
				});
			});

			if (confirmed && menuState.markerId) {
				const areaToRemove = areas.find(area =>
					area.outside_idx === parseInt(menuState.markerId as string)
				);

				if (!areaToRemove) {
					throw new Error('삭제할 개소를 찾을 수 없습니다.');
				}

				const success = await removeArea({
					idx: menuState.markerId,
					camera_ip: menuState.camera_ip || '',
					id: user.userId || ''
				});

				if (success) {
					if (areaToRemove.crossing_gate_ip) {
						await socketService.onRequest('manageGate', [{
							ipaddress: areaToRemove.crossing_gate_ip,
							cmd: 'remove',
							id: user.userId || '',
							controllerModel: areaToRemove.controller_model
						}]);
						console.log('게이트 삭제 요청 성공');
					}

					if (areaToRemove.billboard_ip) {
						socketService.onRequest('manageBillboard', [{
							ipaddress: areaToRemove.billboard_ip,
							cmd: 'remove',
							id: user.userId || ''
						}]);
					}
					setMarkers((prev) => prev.filter((marker) => marker.id !== menuState.markerId));
					await fetchAreas();
					resetMenuState();
					showDialog({
						type: 'alert',
						title: '알림',
						message: '개소가 삭제되었습니다.',
						onConfirm: () => {
							closeDialog();
							fetchAreas();
						},
					});
				} else {
					throw new Error('개소 삭제 실패');
				}
			}
		} catch (error) {
			console.error('Error removing area:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '개소 삭제 중 오류가 발생했습니다.',
				onConfirm: closeDialog,
			});
		} finally {
			resetMenuState();
		}
	};


	const handleRemoveWaterlevel = async () => {
		resetMenuState();
		try {
			const confirmed = await new Promise<boolean>((resolve) => {
				showDialog({
					type: 'confirm',
					title: '수위계 삭제',
					message: '해당 수위계를 삭제하시겠습니까?',
					onConfirm: () => {
						closeDialog();
						resolve(true);
					},
					onCancel: () => {
						closeDialog();
						resolve(false);
					}
				});
			});

			if (confirmed && menuState.markerId) { 
				const success = await removeWaterlevelToMap({ idx: menuState.markerId || '' });

				if (success) {
					getWaterlevelGaugeList();
					resetMenuState();
					showDialog({
						type: 'alert',
						title: '알림',
						message: '수위계가 삭제되었습니다.',
						onConfirm: () => {
							closeDialog();
							fetchAreas();
						},
					});
				} else {
					throw new Error('수위계 삭제 실패');
				}
			}
		} catch (error) {
			console.error('Error removing waterlevel:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '수위계 삭제 중 오류가 발생했습니다.',
				onConfirm: closeDialog,
			});
		} finally {
			resetMenuState();
		}
	};

	const handleContextMenu = useCallback((data: ContextMenuData) => {
		setMenuState({
			isOpen: true,
			position: { x: data.x, y: data.y },
			type: 'context'
		});
		setWaterlevelLinkInfo(prev => ({
			...prev,
			leftLocation: String(data.latlng.lng),
			topLocation: String(data.latlng.lat)
		}));

		setAreaInformation(prev => ({
			...prev,
			leftLocation: String(data.latlng.lng),
			topLocation: String(data.latlng.lat)
		}));
	}, []);

	const contextMenuContent = (
		<>
			<div
				onClick={handleAddArea}
				style={{ cursor: "pointer", marginBottom: "5px" }}
			>
				개소 추가
			</div>
			<div
				onClick={handleAddWaterlevel}
				style={{ cursor: "pointer" }}
			>
				수위계 추가
			</div>
		</>
	);

	const markerMenuContent = (
		<>
			<div
				style={{
					cursor: "pointer",
					marginBottom: "5px",
					padding: "5px 10px",
					borderBottom: "1px solid #eee",
				}}
				onClick={handleModifyArea}
			>
				개소 수정
			</div>
			<div
				style={{
					cursor: "pointer",
					marginBottom: "5px",
					padding: "5px 10px",
					borderBottom: "1px solid #eee",
				}}
				onClick={handleRemoveArea}
			>
				개소 삭제
			</div>
			<div
				style={{
					cursor: "pointer",
					padding: "5px 10px",
				}}
				onClick={enableMarkerDrag}
			>
				마커 위치 이동
			</div>
		</>
	);

	const waterlevelMarkerMenuContent = (
		<>
			<div
				style={{
					cursor: "pointer",
					padding: "5px 10px",
				}}
				onClick={handleRemoveWaterlevel}
			>
				수위계 삭제
			</div>
			<div
				style={{
					cursor: "pointer",
					padding: "5px 10px",
				}}
				onClick={enableMarkerDrag}
			>
				마커 위치 이동
			</div>
		</>
	)


	return (
		<>
			<AlertDialog
				isOpen={alertOpen}
				onClose={() => setAlertOpen(false)}
				message={errorMessage}
			/>
			<CommonAlertDialog
				isOpen={dialogState.isOpen}
				onClose={closeDialog}
				message={dialogState.message}
				title={dialogState.title}
				type={dialogState.type}
				onConfirm={dialogState.onConfirm}
			/>
			<BaseMapLayer
				markers={[...markers, ...waterlevelMarkers]}
				customIcons={customIcons}
				getMarkerIcon={getMarkerIcon}
				onMarkerClick={handleMarkerClick}
				onMarkerDragEnd={handleMarkerDragEnd}
				onMapClick={handleMapClick}
				onContextMenu={handleContextMenu}
				onMarkerContextMenu={handleMarkerContextMenu}
				isContextMenuOpen={menuState.isOpen}
				onContextMenuClose={resetMenuState}
				contextMenuContent={menuState.type === 'context' ? contextMenuContent : null}
				markerMenuContent={menuState.type === 'marker' ?
					selectedMarkerType === 'waterlevel' ? waterlevelMarkerMenuContent : markerMenuContent
					: null
				}
				isDraggingEnabled={isDraggingEnabled}
				draggedMarkerId={draggedMarkerId}
				showDialog={showDialog}
			>
				{minimapState && <NavigationMinimap
					position="topright"
					zoomLevelOffset={-3}
					width={250}
					height={200}
				/>}
			</BaseMapLayer>

			{cameraDialogOpen && (
				<WaterlevelCameraDialog
					isOpen={cameraDialogOpen}
					onClose={() => setCameraDialogOpen(false)}
					position={cameraPosition}
					waterlevel={selectedCamera}
				/>
			)}
			{dialogIsOpen && (
				<AddAreaDialog
					isOpen={dialogIsOpen}
					onClose={() => setIsOpen(false)}
					coordinates={selectedCoordinates}
					cameraList={cameraOptions}
					waterlevelOptions={waterlevelOptions}
				/>
			)}
			{waterlevelDialogIsOpen && (
				<AddWaterlevelDialog
					isOpen={waterlevelDialogIsOpen}
					onClose={() => setWaterlevelDialogOpen(false)}
					coordinates={selectedCoordinates}
					cameraList={cameraOptions}
					waterlevelOptions={addAreaWaterlevelOptions}
				/>
			)}
			{modifyDialogIsOpen && (
				<ModifyAreaDialog
					isOpen={modifyDialogIsOpen}
					onClose={() => {
						setModifyDialogIsOpen(false);
						setSelectedArea(null);
					}}
					coordinates={selectedCoordinates}
					cameraList={cameraOptions}
					waterlevelOptions={waterlevelOptions}
					areaData={selectedArea}
				/>
			)}

			{isDraggingEnabled && (
				<div
					style={{
						position: 'fixed',
						top: '10px',
						left: '50%',
						transform: 'translateX(-50%)',
						backgroundColor: 'green',
						color: 'white',
						padding: '8px 16px',
						borderRadius: '4px',
						zIndex: 1000,
						fontWeight: 'bold'
					}}
				>
					개소 이동 모드 활성화 - ESC 키를 눌러 취소
				</div>
			)}

			{autoControlResult && (
				<AutoControlResultPopup
					result={autoControlResult}
					isOpen={isPopupOpen}
					onClose={() => {
						setIsPopupOpen(false);
						setAutoControlResult(null);
					}}
				/>
			)}
		</>
	);
}

export default InundationMapLayer;