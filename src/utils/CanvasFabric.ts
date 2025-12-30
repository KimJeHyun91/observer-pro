// eslint-disable-next-line import/named
import { Canvas, FabricImage, Point, util, TPointerEventInfo, TPointerEvent, Shadow, FabricText, Group, FabricObject, Rect, Textbox, Gradient, Circle, Triangle, Line, Path } from 'fabric';
import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { ClickObject, ClickLocation, CanvasObject, ObserverObject, CameraAngle } from '@/@types/canvas';
import { Building } from '@/@types/building';
import { ParkingArea } from '@/@types/parking';
import { CanvasMapState } from '@/store/canvasMapStore';
import { CameraType } from '@/@types/camera';
import { DevicePopupType, ObDeviceType, ObGuardianliteType } from '@/@types/device';
import { ServiceType } from '@/@types/common';
import buildingIcon from '../assets/styles/images/building.png';
import waterGaugeIcon from '../assets/styles/images/gauge.ico';
import cameraBulletIcon from '../assets/styles/images/bullet.ico';
import cameraBulletEventIcon from '../assets/styles/images/bullet_event.ico';
import cameraDomIcon from '../assets/styles/images/dome.ico';
import cameraDomEventIcon from '../assets/styles/images/dome_event.ico';
import cameraBulletFlameIcon from '../assets/styles/images/bullet_flame.ico';
import cameraDomElevatorIcon from '../assets/styles/images/dome_elevator.ico';
import speedDomIcon from '../assets/styles/images/speed_dome.ico';
import ebellOutdoorIcon from '../assets/styles/images/ebell_outdoor.ico';
import ebellIndoorIcon from '../assets/styles/images/ebell_indoor.ico';
import ebellOutdoorIconEvent from '../assets/styles/images/ebell_outdoor_event.ico';
import ebellIndoorIconEvent from '../assets/styles/images/ebell_indoor_event.ico';
import doorEventLockIcon from '../assets/styles/images/door_event_lock.ico';
import doorEventUnLockIcon from '../assets/styles/images/door_event_unlock.ico';
import doorLockIcon from '../assets/styles/images/door_lock.ico';
import doorUnLockIcon from '../assets/styles/images/door_unlock.ico';
import GuardianliteIcon from '../assets/styles/images/guardianlite.ico';
import GuardianliteEventIcon from '../assets/styles/images/guardianlite_event.ico';
import MDETIcon from '../assets/styles/images/mdetIcon.ico';
import { ObGuardianlitePopup } from '@/views/main/types/guardianlite';
import { PIDS } from '@/@types/pids';
import { ApiResultBoolean } from '@/@types/api';
import { WaterGaugeType, WaterLevelType } from '@/@types/tunnel';
import { AccessCtlLog } from '@/views/main/types/accessCtl';

export interface mapCanvas {
	setBackgroundImage: (canvas: Canvas, imageURL: string) => Promise<void>;
}

type UpdateObjectLocationProps = {
	canvas: Canvas | null; // fabric.Canvas 타입
	object: CanvasObject; // fabric 객체에 data 속성 추가
	callback: (topLocation: number, leftLocation: number) => Promise<{ success: boolean }>;
};

type ScenePoint = {
	x: number
	y: number
};

type NewPIDS = {
	idx: number;
	label: string;
};

type DevicePopup = {
	deviceId: string | number;
	topLocation: string;
	leftLocation: string;
} | null;

type AddPIDSAPIData = ({ idx: number, line_x1: number, line_x2: number, line_y1: number, line_y2: number });
type AddPIDSAPICallback = ({ idx, line_x1, line_x2, line_y1, line_y2 }: AddPIDSAPIData) => Promise<ApiResultBoolean | void | 'OK'>;

function showContextMenu(x: number, y: number, canvas: Canvas) {
	const menu = document.getElementById('contextMenu')!;
	menu.style.display = 'block';
	menu.style.zIndex = '12';

	// 다음 프레임에서 크기 계산
	requestAnimationFrame(() => {
		const menuWidth = menu.offsetWidth;
		const menuHeight = menu.offsetHeight;
		const canvasWidth = canvas.getWidth();
		const canvasHeight = canvas.getHeight();

		// 캔버스를 벗어나면 왼쪽으로 정렬
		if (x + menuWidth > canvasWidth) {
			x = x - menuWidth - 2;
		}

		// 캔버스를 벗어나면 위쪽으로 정렬
		if (y + menuHeight > canvasHeight) {
			y = y - menuHeight - 2;
		}

		// 메뉴 위치 설정
		menu.style.top = `${y}px`;
		menu.style.left = `${x}px`;
	});
}

function closeContextMenu() {
	const menu = document.getElementById('contextMenu')!;
	menu.style.display = 'none'; // 메뉴 숨기기
}

class CanvasImpl implements mapCanvas {
	private canvas: Canvas;
	public scenePoint: ScenePoint;
	private onBuildingClick?: (building: Building) => void
	private showDevicePopup: boolean;
	private showDeviceEventPopup: DevicePopup;
	private setDevicePopup?: Dispatch<SetStateAction<DevicePopupType>>;
	private setDeviceEventPopup?: Dispatch<SetStateAction<DevicePopupType>>;
	private cameraAngle?: boolean;
	private showGuardianlitePopup: boolean;
	private setGuardianlitePopup?: Dispatch<SetStateAction<ObGuardianlitePopup>>;
	private isCreatingPIDS: boolean = false;
	private pidsStartPoint: Point | null = null;
	private newPIDS: NewPIDS | null = null;
	private animationLine: Line | null = null;
	private addPIDSAPICallback: AddPIDSAPICallback | null = null;
	private isUpdatingAngleOfView: boolean = false;
	private updatingObject: CanvasObject | null = null;
	private handleIsUpdatingObject?: (status: boolean) => void;
	private lastClickedObject: FabricObject | null = null;
	private resetObject?: (event: TPointerEventInfo<TPointerEvent>, isCancel?: boolean) => void;
	private objectLabel?: boolean;
	constructor(
		private imageURL: string,
		width: number = 800,
		height: number = 600,
		private isDraggingRef: MutableRefObject<boolean>,
		private lastPosXRef: MutableRefObject<number>,
		private lastPosYRef: MutableRefObject<number>,
		private clickLocationRef: MutableRefObject<ClickLocation>,
		setClickObject: Dispatch<SetStateAction<ClickObject>>,
		setFabricObject: Dispatch<SetStateAction<CanvasObject>>,
		setCanvasMapState: (payload: CanvasMapState) => void,
		private isDraggingObject: boolean = false,
		onBuildingClick?: (building: Building) => void,
		setDevicePopup?: Dispatch<SetStateAction<DevicePopupType>>,
		setGuardianlitePopup?: Dispatch<SetStateAction<ObGuardianlitePopup>>,
		setDeviceEventPopup?: Dispatch<SetStateAction<DevicePopupType>>,
		handleIsUpdatingObject?: (status: boolean) => void
	) {
		this.imageURL = imageURL;
		this.canvas = new Canvas('mainCanvas', {
			width,
			height,
			backgroundImageStretch: true,
			hoverCursor: 'cursor'
		});
		this.scenePoint = {
			x: 0,
			y: 0
		}
		this.onBuildingClick = onBuildingClick
		this.canvas.on('mouse:wheel', (event) => this.handleMouseWheel(event as TPointerEventInfo<WheelEvent>, this.canvas))
		this.canvas.on('mouse:down', (event) => this.handleMouseDown(event));
		this.canvas.on('mouse:move', (event) => this.handleMouseMove(event));
		this.canvas.on('mouse:up', () => this.handleMouseUp());
		this.setMouseEvent(this.canvas, clickLocationRef, setClickObject, setFabricObject, setCanvasMapState);
		this.showDevicePopup = false;
		this.showDeviceEventPopup = null;
		this.showGuardianlitePopup = false;
		this.setDevicePopup = setDevicePopup;
		this.setGuardianlitePopup = setGuardianlitePopup;
		this.setDeviceEventPopup = setDeviceEventPopup;
		this.canvas.on('mouse:down', this.handleMouseClickForPIDS.bind(this));
		this.canvas.on('mouse:move', this.handleMouseMoveForPIDS.bind(this));
		this.handleIsUpdatingObject = handleIsUpdatingObject;
	}
	/**
@param imageURL backgroundImageURL
@param width canvas width size
@param height canvas height size
@param isDraggingRef canvas dragging status
@param lastPosXRef last positionX
@param lastPosYRef last positionY
@param clickLocationRef click position
@param setClickObject click object data
@param setFabricObject click fabric object(canvas)
@param setCanvasMapState update map type(outdoor, building, floor(location))
@param setDevicePopup show device popup
@param setGuardianlitePopup handle show guardianlite device popup
@param setDeviceEventPopup show device event popup
*/
	static async createCanvas(
		imageURL: string,
		width: number,
		height: number,
		isDraggingRef: MutableRefObject<boolean>,
		lastPosXRef: MutableRefObject<number>,
		lastPosYRef: MutableRefObject<number>,
		clickLocationRef: MutableRefObject<ClickLocation>,
		setClickObject: Dispatch<SetStateAction<ClickObject>>,
		setFabricObject: Dispatch<SetStateAction<CanvasObject>>,
		setCanvasMapState: (payload: CanvasMapState) => void,
		onBuildingClick?: (building: Building) => void,
		setDevicePopup?: Dispatch<SetStateAction<DevicePopupType>>,
		setGuardianlitePopup?: Dispatch<SetStateAction<ObGuardianlitePopup>>,
		setDeviceEventPopup?: Dispatch<SetStateAction<DevicePopupType>>,
		handleIsUpdatingObject?: (status: boolean) => void,
	) {
		const canvas = new CanvasImpl(
			imageURL,
			width,
			height,
			isDraggingRef,
			lastPosXRef,
			lastPosYRef,
			clickLocationRef,
			setClickObject,
			setFabricObject,
			setCanvasMapState,
			false,
			onBuildingClick,
			setDevicePopup,
			setGuardianlitePopup,
			setDeviceEventPopup,
			handleIsUpdatingObject
		);
		try {
			await canvas.setBackgroundImage(canvas.canvas, imageURL);
		} catch (error) {
			console.error('배경 이미지 설정 오류:', error);
			canvas.canvas.dispose();
			return null;
		}
		return canvas;
	}

	/**
 * 배경 이미지를 설정하는 메소드
 * @param imageUrl - 배경 이미지의 URL
 */
	// async setBackgroundImage(canvas: Canvas, imageURL: string): Promise<void> {
	// 	return new Promise((resolve, reject) => {
	// 		FabricImage.fromURL(
	// 			imageURL,
	// 			{ crossOrigin: 'use-credentials' }
	// 		).then((img) => {
	// 			if (!img) {
	// 				reject(new Error('이미지 로드에 실패했습니다.'));
	// 				return;
	// 			}

	// 			// 캔버스 크기와 이미지 크기 
	// 			const canvasWidth = canvas.getWidth();
	// 			const canvasHeight = canvas.getHeight();
	// 			const imgWidth = img.width || 0;
	// 			const imgHeight = img.height || 0;

	// 			const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);

	// 			img.set({
	// 				originX: "center",
	// 				originY: "center",
	// 				left: canvasWidth / 2,
	// 				top: canvasHeight / 2,
	// 				selectable: false,
	// 				evented: false,
	// 			});

	// 			img.scale(scale);

	// 			// 배경 이미지 설정
	// 			canvas.backgroundImage = img;

	// 			// 캔버스 다시 렌더링
	// 			canvas.requestRenderAll();

	// 			resolve();
	// 		}).catch((error) => {
	// 			reject(new Error('이미지 로드 중 오류가 발생했습니다: ' + error.message));
	// 		});
	// 	});
	// }

	async setBackgroundImage(canvas: Canvas, imageURL: string): Promise<void> {
		return new Promise((resolve, reject) => {
			FabricImage.fromURL(imageURL, { crossOrigin: 'use-credentials' })
				.then((img) => {
					if (!img) {
						reject(new Error('이미지 로드에 실패했습니다.'));
						return;
					}

					const imgWidth = img.width || 0;
					const imgHeight = img.height || 0;
					if (!imgWidth || !imgHeight) {
						reject(new Error('이미지 크기를 가져오지 못했습니다.'));
						return;
					}

					const parentEl = canvas.wrapperEl?.parentElement as HTMLElement | null;

					const availableWidth =
						(parentEl?.getBoundingClientRect().width || canvas.getWidth() || 0);

					const availableHeight =
						(parentEl?.getBoundingClientRect().height || canvas.getHeight() || 0);

					if (!availableWidth || !availableHeight) {
						reject(new Error('캔버스 가용 영역 크기를 계산하지 못했습니다.'));
						return;
					}

					const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

					const newCanvasWidth = Math.max(1, Math.round(imgWidth * scale));
					const newCanvasHeight = Math.max(1, Math.round(imgHeight * scale));

					// 캔버스 리사이즈 (이미지 영역만 사용)
					canvas.setWidth(newCanvasWidth);
					canvas.setHeight(newCanvasHeight);

					// 배경 이미지를 (0,0) 좌상단에 딱 맞춰서
					img.set({
						originX: 'left',
						originY: 'top',
						left: 0,
						top: 0,
						selectable: false,
						evented: false,
					});

					img.scale(scale);

					// backgroundImage 적용
					canvas.backgroundImage = img;

					// 혹시 기존 줌/패닝이 남아있으면 초기화
					canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
					canvas.setZoom(1);

					canvas.requestRenderAll();
					resolve();
				})
				.catch((error) => {
					reject(new Error('이미지 로드 중 오류가 발생했습니다: ' + error.message));
				});
		});
	}

	/*
	* 줌 상태 확인
	*/
	getZoom(event: TPointerEventInfo<WheelEvent | TPointerEvent>, canvas: Canvas) {
		const zoom = canvas.getZoom();
		const delta = (event.e as WheelEvent).deltaY; // 휠의 이동량
		const newZoom = zoom - delta / 500; // 줌 변경값
		return newZoom;
	}

	/**
* 마우스 스크롤로 확대/축소 구현
* 
*/
	handleMouseWheel(event: TPointerEventInfo<WheelEvent>, canvas: Canvas) {
		event.e.preventDefault();
		event.e.stopPropagation();

		// 현재 줌 상태
		let newZoom = this.getZoom(event, canvas);

		// 줌 제한 설정
		if (newZoom > 10) newZoom = 10; // 최대 10배 확대
		if (newZoom < 1) newZoom = 1; // 최소 1배 축소
		if (newZoom === 1) {
			this.canvas.viewportTransform = [1, 0, 0, 1, 0, 0]; // 초기 상태로 리셋
		}

		if (newZoom !== 1) {
			closeContextMenu();
		}

		if (this.setDevicePopup && this.showDevicePopup) {
			this.setDevicePopup({
				show: false,
				idx: null,
				main_service_name: '',
				vms_name: '',
				camera_id: '',
				name: '',
				ip: '',
				top_location: '',
				left_location: '',
				icon_width: 0,
				icon_height: 0,
				canvas_width: 0,
				canvas_height: 0,
				type: '',
				service_type: '',
				access_point: '',
				device_id: ''
			});
			this.showDevicePopup = false;
		};

		if (this.setDeviceEventPopup && this.showDeviceEventPopup != null) {
			this.setDeviceEventPopup({
				show: false,
				idx: null,
				main_service_name: '',
				vms_name: '',
				camera_id: '',
				name: '',
				ip: '',
				top_location: '',
				left_location: '',
				icon_width: 0,
				icon_height: 0,
				canvas_width: 0,
				canvas_height: 0,
				type: '',
				service_type: '',
				access_point: ''
			});
			this.showDeviceEventPopup = null;
		};

		if (this.setGuardianlitePopup && this.showGuardianlitePopup) {
			this.setGuardianlitePopup({
				show: false,
				name: '',
				ip: '',
				id: '',
				password: '',
				status: false,
				ch1: '',
				ch2: '',
				ch3: '',
				ch4: '',
				ch5: '',
				ch1_label: '',
				ch2_label: '',
				ch3_label: '',
				ch4_label: '',
				ch5_label: '',
				temper: '',
				top_location: '',
				left_location: '',
				icon_width: 0,
				icon_height: 0,
				canvas_width: 0,
				canvas_height: 0
			});

		}


		// 마우스 이벤트 좌표 가져오기
		const mouseEvent = event.e as MouseEvent;
		const pointer = new Point(mouseEvent.offsetX, mouseEvent.offsetY);

		// 뷰포트 변환 행렬을 사용한 좌표 변환
		const viewportTransform = canvas.viewportTransform!;
		const invertedViewportTransform = util.invertTransform(viewportTransform);

		// 좌표 변환 수동 계산
		const canvasCoords = pointer.transform(invertedViewportTransform);

		canvas.zoomToPoint(canvasCoords, newZoom);
	};

	// 위치 이동 시작 핸들러
	handleMouseDown(event: TPointerEventInfo<TPointerEvent>) {
		// if (!event.e.altKey) return; // Alt 키를 눌렀을 때만 이동 활성화

		const zoom = this.canvas.getZoom();
		if (zoom <= 1) return; // 확대 상태가 아닐 때 위치 이동 비활성화

		this.isDraggingRef.current = true;
		this.canvas.selection = false;

		const mouseEvent = event.e as MouseEvent;
		this.lastPosXRef.current = mouseEvent.clientX;
		this.lastPosYRef.current = mouseEvent.clientY;
	};

	// 위치 이동 중 핸들러
	handleMouseMove(event: TPointerEventInfo<TPointerEvent>) {
		if (!this.isDraggingRef.current) return;

		const zoom = this.canvas.getZoom();
		if (zoom <= 1) return;

		const mouseEvent = event.e as MouseEvent;
		const deltaX = mouseEvent.clientX - this.lastPosXRef.current;
		const deltaY = mouseEvent.clientY - this.lastPosYRef.current;

		this.lastPosXRef.current = mouseEvent.clientX;
		this.lastPosYRef.current = mouseEvent.clientY;

		const viewportTransform = this.canvas.viewportTransform!;
		viewportTransform[4] += deltaX; // X축 이동
		viewportTransform[5] += deltaY; // Y축 이동

		// 이동 범위를 제한하여 배경 이미지 밖으로 나가지 않도록 설정
		const canvasWidth = this.canvas.getWidth();
		const canvasHeight = this.canvas.getHeight();
		const scaledWidth = canvasWidth * zoom;
		const scaledHeight = canvasHeight * zoom;

		viewportTransform[4] = Math.min(0, Math.max(viewportTransform[4], canvasWidth - scaledWidth));
		viewportTransform[5] = Math.min(0, Math.max(viewportTransform[5], canvasHeight - scaledHeight));

		this.canvas.requestRenderAll();
	};

	// 위치 이동 종료 핸들러
	handleMouseUp() {
		this.isDraggingRef.current = false;
		this.canvas.selection = true;
	};

	setMouseEvent(
		canvas: Canvas,
		clickLocation: MutableRefObject<ClickLocation>,
		setClickObject: Dispatch<SetStateAction<ClickObject>>,
		setFabricObject: Dispatch<SetStateAction<CanvasObject>>,
		setCanvasMapState: (payload: CanvasMapState) => void,
	) {
		// 마우스 우클릭 이벤트 리스너 추가
		this.canvas.wrapperEl.addEventListener('contextmenu', function (event) {
			// 기본 브라우저의 우클릭 메뉴 비활성화
			event.preventDefault();
			// Fabric.js 좌표 계산
			const scenePointer = canvas.getScenePoint(event); // 캔버스 기본 좌표
			clickLocation.current = scenePointer;

			// 클릭된 객체 찾기
			let target = canvas.getObjects().find(obj => obj.containsPoint(scenePointer)) ?? null;

			if ('isTriangle' in (target?.data || {})) {
				const cameraObjects = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'camera');
				target = (cameraObjects.find((cameraObject) => `${(cameraObject.data as CameraType)?.main_service_name}:${(cameraObject.data as CameraType)?.vms_name}:${(cameraObject.data as CameraType)?.camera_id}` === `${(target?.data as CameraAngle)?.cameraId}`)) || null;
			}
			if (target?.data) {
				setFabricObject(target);
				setClickObject(target.data)
			} else {
				setClickObject(null);
			};
			const zoom = canvas.getZoom();
			const delta = ((event as unknown) as WheelEvent).deltaY; // 휠의 이동량
			const newZoom = zoom - delta / 500; // 줌 변경값
			if (newZoom !== 1) {
				canvas.viewportTransform = [1, 0, 0, 1, 0, 0]; // 초기 상태로 리셋
				canvas.setZoom(1);
			}

			showContextMenu(canvas.width === 1473 ? scenePointer.x + 92.5 : scenePointer.x, scenePointer.y, canvas);
		});

		// 줌 원래 상태로 init
		const initZoom = (event: TPointerEventInfo<TPointerEvent>) => {
			const newZoom = this.getZoom(event, this.canvas);
			if (newZoom !== 1) {
				this.canvas.viewportTransform = [1, 0, 0, 1, 0, 0]; // 초기 상태로 리셋
				canvas.setZoom(1);
			}
		}

		const callbacks = {
			'mouse:down': (event: TPointerEventInfo<TPointerEvent>) => {
				if (this.updatingObject) {
					return;
				}
				const pointer = canvas.getScenePoint(event.e as MouseEvent);
				this.lastClickedObject = canvas.getObjects().find(obj => obj.containsPoint(pointer)) ?? null;
			},
			'mouse:up': async (event: TPointerEventInfo<TPointerEvent>) => {
				closeContextMenu();
				const { scenePoint } = event;
				this.scenePoint = {
					x: scenePoint.x,
					y: scenePoint.y
				};
				if (this.updatingObject && !this.isUpdatingAngleOfView && this.resetObject) {
					this.resetObject(event, true);

					if (this.handleIsUpdatingObject) {
						this.handleIsUpdatingObject(false);
					};
					return;
				};

				if (this.updatingObject && this.isUpdatingAngleOfView) {
					const group = this.updatingObject as Group;
					const label = group.getObjects().find((obj) => obj.type === 'text') as FabricText;
					if (label) label.set({ opacity: 1 });
					this.isUpdatingAngleOfView = false;
					this.updatingObject = null;
					this.applyIsUpdatingVisualEffects(group, false);
					canvas.renderAll();
					if (this.handleIsUpdatingObject) {
						this.handleIsUpdatingObject(false);
					};
					return;
				}

				// if (this.isDraggingObject || this.isUpdatingAngleOfView || !target || !target.data) {
				//   return;
				// }
				const target = event.target ?? this.lastClickedObject;

				if (!target || !target.data) {
					this.lastClickedObject = null; // 꼭 초기화
					return;
				}
				const type = target.data.type;
				if (type === 'building') {
					const buildingData = target?.data as Building;

					if (this.onBuildingClick) {
						this.onBuildingClick(buildingData);
					} else {
						if (event.transform?.action === 'drag') {
							// 위치 이동 클릭 이벤트 무시
							return;
						}
						setCanvasMapState(({
							threeDModelId: buildingData.idx,
							mainServiceName: buildingData.service_type as ServiceType,
							buildingIdx: buildingData.idx,
							floorIdx: 0,
							mapImageURL: buildingData.map_image_url != null ? `http://${window.location.hostname}:4200/images/buildingplan/${buildingData.map_image_url}` : null,
							buildingName: buildingData.outside_name,
							floorName: ''
						}));
					}
				} else if (target.data.type === 'camera' && this.setDevicePopup) {
					initZoom(event);
					const cameraData = target?.data as CameraType;

					if (event.transform?.action === 'rotate' || event.transform?.action === 'drag') {
						// 화각 수정 클릭 이벤트 무시
						// 위치 이동 클릭 이벤트 무시
						return;
					};

					if (this.showDeviceEventPopup != null &&
						this.showDeviceEventPopup.deviceId === `${cameraData.main_service_name}:${cameraData.vms_name}:${cameraData.camera_id}` &&
						this.showDeviceEventPopup.leftLocation === cameraData.left_location &&
						this.showDeviceEventPopup.topLocation === cameraData.top_location) {
						return;
					};

					removeActiveFromElement();
					addActiveToDevicePopup();

					this.setDevicePopup({
						show: true,
						main_service_name: cameraData.main_service_name,
						vms_name: cameraData.vms_name,
						camera_id: cameraData.camera_id,
						ip: cameraData.camera_ip,
						name: cameraData.camera_name,
						on_event: false,
						top_location: cameraData.top_location,
						left_location: cameraData.left_location,
						icon_width: target.width,
						icon_height: target.height,
						canvas_width: this.canvas.width,
						canvas_height: this.canvas.height,
						type: 'camera',
						service_type: cameraData.service_type,
						access_point: cameraData.access_point
					});
					this.showDevicePopup = true;
				} else if (target.data.type === 'door' && this.setDevicePopup) {
					initZoom(event);
					const deviceData = target?.data as ObDeviceType;
					if (event.transform?.action === 'drag' || !deviceData.top_location || !deviceData.left_location) {
						// 위치 이동 클릭 이벤트 무시
						return;
					}

					if (this.showDeviceEventPopup != null &&
						this.showDeviceEventPopup.deviceId === deviceData.idx &&
						this.showDeviceEventPopup.leftLocation === deviceData.left_location &&
						this.showDeviceEventPopup.topLocation === deviceData.top_location) {
						return;
					};

					const main_service_name = deviceData.camera_id?.split(':')[0];
					const vms_name = deviceData.camera_id?.split(':')[1];
					const camera_id = deviceData.camera_id?.split(':')[2];
					removeActiveFromElement();
					addActiveToDevicePopup();
					this.setDevicePopup({
						show: true,
						idx: deviceData.idx,
						main_service_name: main_service_name! as ("" | ServiceType),
						vms_name,
						camera_id,
						ip: deviceData.device_ip,
						name: deviceData.device_name,
						on_event: false,
						top_location: deviceData.top_location,
						left_location: deviceData.left_location,
						icon_width: target.width,
						icon_height: target.height,
						canvas_width: this.canvas.width,
						canvas_height: this.canvas.height,
						type: 'door',
						service_type: deviceData.service_type,
						device_id: deviceData.device_id,
					});
					this.showDevicePopup = true;
				} else if (target.data.type === 'ebell' && this.setDevicePopup) {
					initZoom(event);
					const deviceData = target?.data as ObDeviceType;

					if (event.transform?.action === 'drag' || !deviceData.top_location || !deviceData.left_location) {
						// 위치 이동 클릭 이벤트 무시
						return;
					};

					if (this.showDeviceEventPopup != null &&
						this.showDeviceEventPopup.deviceId === deviceData.idx &&
						this.showDeviceEventPopup.leftLocation === deviceData.left_location &&
						this.showDeviceEventPopup.topLocation === deviceData.top_location) {
						return;
					};
					removeActiveFromElement();
					addActiveToDevicePopup();
					const main_service_name = deviceData.camera_id?.split(':')[0];
					const vms_name = deviceData.camera_id?.split(':')[1];
					const camera_id = deviceData.camera_id?.split(':')[2];
					this.setDevicePopup({
						show: true,
						idx: deviceData.idx,
						main_service_name: main_service_name! as ("" | ServiceType),
						vms_name,
						camera_id,
						ip: deviceData.device_ip,
						name: deviceData.device_name,
						on_event: false,
						top_location: deviceData.top_location,
						left_location: deviceData.left_location,
						icon_width: target.width,
						icon_height: target.height,
						canvas_width: this.canvas.width,
						canvas_height: this.canvas.height,
						type: 'ebell',
						service_type: deviceData.service_type,
					});
					this.showDevicePopup = true;
				} else if (target.data.type === 'guardianlite' && this.setGuardianlitePopup) {
					initZoom(event);
					const deviceData = target?.data as ObGuardianliteType;

					if (event.transform?.action === 'drag' || !deviceData.top_location || !deviceData.left_location) {
						// 위치 이동 클릭 이벤트 무시
						return;
					};

					if (this.showDeviceEventPopup != null &&
						this.showDeviceEventPopup.deviceId === deviceData.guardianlite_ip &&
						this.showDeviceEventPopup.leftLocation === deviceData.left_location &&
						this.showDeviceEventPopup.topLocation === deviceData.top_location) {
						return;
					};

					removeActiveFromElement();
					addActiveToGuardianlitePopup();
					this.setGuardianlitePopup({
						show: true,
						on_event: false,
						ip: deviceData.guardianlite_ip,
						id: deviceData.user_id,
						password: deviceData.user_pw,
						name: deviceData.guardianlite_name,
						status: deviceData.status,
						ch1: deviceData.ch1,
						ch2: deviceData.ch2,
						ch3: deviceData.ch3,
						ch4: deviceData.ch4,
						ch5: deviceData.ch5,
						ch1_label: deviceData.ch1_label,
						ch2_label: deviceData.ch2_label,
						ch3_label: deviceData.ch3_label,
						ch4_label: deviceData.ch4_label,
						ch5_label: deviceData.ch5_label,
						temper: deviceData.temper,
						top_location: deviceData.top_location,
						left_location: deviceData.left_location,
						icon_width: target.width,
						icon_height: target.height,
						canvas_width: this.canvas.width,
						canvas_height: this.canvas.height,
					});
					this.showGuardianlitePopup = true;
				} else if (target.data.type === 'pids' && this.setDevicePopup) {
					initZoom(event);
					const deviceData = target?.data as PIDS;

					if (event.transform?.action === 'drag' || !deviceData.line_x1 || !deviceData.line_x2 || !deviceData.line_y1 || !deviceData.line_y2) {
						// 위치 이동 클릭 이벤트 무시
						return;
					};

					if (this.showDeviceEventPopup != null &&
						this.showDeviceEventPopup.deviceId === deviceData.idx) {
						return;
					};

					removeActiveFromElement();
					addActiveToDevicePopup();
					const main_service_name = deviceData.camera_id?.split(':')[0];
					const vms_name = deviceData.camera_id?.split(':')[1];
					const camera_id = deviceData.camera_id?.split(':')[2];
					this.setDevicePopup({
						show: true,
						idx: deviceData.idx,
						main_service_name: main_service_name! as ("" | ServiceType),
						vms_name,
						camera_id,
						ip: deviceData.pids_ip,
						name: deviceData.pids_id,
						on_event: false,
						top_location: `${(parseFloat(deviceData.line_y1) + parseFloat(deviceData.line_y2)) / 2}`,
						left_location: `${(parseFloat(deviceData.line_x1) + parseFloat(deviceData.line_x2)) / 2}`,
						icon_width: target.width,
						icon_height: target.height,
						canvas_width: this.canvas.width,
						canvas_height: this.canvas.height,
						type: 'pids',
					});
					this.showDevicePopup = true;
				}
				this.lastClickedObject = null;
			}
		}
		this.canvas.on(callbacks);
	}

	// 캔버스를 반환 (필요한 경우 외부에서 접근 가능)
	getCanvas() {
		return this.canvas
	};

	async addObject({ items, cameraAngle, objectLabel, type }: { items: (Building | ParkingArea | CameraType | ObDeviceType | ObGuardianliteType | PIDS | WaterGaugeType | WaterLevelType)[], cameraAngle?: boolean, objectLabel?: boolean, type: 'building' | 'parkingArea' | 'camera' | 'door' | 'ebell' | 'guardianlite' | 'pids' | 'waterGauge' | 'waterLevel' }) {
		// 데이터 자체가 없다고 판단하고 캔버스 데이터 값 삭제
		if (!items || items.length === 0) {
			// 캔버스의 모든 객체를 삭제
			this.canvas.getObjects().filter((object) => object.data?.type === type).forEach((object) => {
				if (type === 'camera') {
					const objectData = object.data as CameraType;
					const label = objectData.service_type === 'mgist' ? `${objectData.camera_id}.${objectData.camera_name}` : objectData.camera_name;
					this.removeTriangle(this.canvas, label);
				}

				this.canvas.remove(object);
			});

			this.canvas.renderAll(); // 렌더링 업데이트
			return;
		}

		// 값이 있다면 첫번째 타입 설정
		const itemType = items[0].type ?? '';

		const cameraAngleNoUpdate = this.cameraAngle === cameraAngle;
		const objectLabelNoUpdate = this.objectLabel === objectLabel;

		function syncObjects({ canvas, objects, type, removeTriangle }: { canvas: Canvas, objects: ObserverObject[], type: string, removeTriangle: (canvas: Canvas, label: string) => void }) {
			switch (type) {

				case 'building':
					if (objects.length === 0) {
						const removeBuildings = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'building');
						if (removeBuildings && removeBuildings.length > 0) {
							canvas.remove(...removeBuildings);
						}
					} else {
						const removeBuildings = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'building')
							.filter((buildingObj) => !objects.some((building) => isType<Building>(building, 'building') && building.idx === (buildingObj.data as Building).idx))
						if (removeBuildings && removeBuildings.length > 0) {
							canvas.remove(removeBuildings[0]);
						}
					}
					return;
				case 'parkingArea':
					if (objects.length === 0) {
						const removeParkingAreas = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'parkingArea');
						if (removeParkingAreas && removeParkingAreas.length > 0) {
							canvas.remove(...removeParkingAreas);
						}
					} else {
						const removeParkingAreas = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'parkingArea').filter((parkingAreaObj) =>
							!objects.some((parkingArea) => isType<ParkingArea>(parkingArea, 'parkingArea') && parkingArea.idx === (parkingAreaObj.data as ParkingArea).idx));

						if (removeParkingAreas && removeParkingAreas.length > 0) {
							canvas.remove(removeParkingAreas[0]);
						}
					}
					return;
				case 'camera':
					if (objects.length === 0) {
						const removeCameras = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'camera');

						if (removeCameras && removeCameras.length > 0) {
							removeCameras.forEach(obj => {
								const objectData = obj.data as CameraType;
								const label = objectData.service_type === 'mgist' ? `${objectData.camera_id}.${objectData.camera_name}` : objectData.camera_name;
								removeTriangle(canvas, label);
							});

							canvas.remove(...removeCameras);
						}
					} else {
						const removeCameras = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'camera').filter((cameraObj) =>
							!objects.some((camera) => isType<CameraType>(camera, 'camera') && cameraObj.data && isType<CameraType>(cameraObj.data, 'camera') && camera.vms_name === cameraObj.data?.vms_name && camera.camera_id === cameraObj.data?.camera_id));

						if (removeCameras && removeCameras.length > 0) {
							removeCameras.forEach(obj => {
								const objectData = obj.data as CameraType;
								const label = objectData.service_type === 'mgist' ? `${objectData.camera_id}.${objectData.camera_name}` : objectData.camera_name;
								removeTriangle(canvas, label);
							});

							canvas.remove(...removeCameras);
						}
					}
					return;
				case 'door':
					if (objects.length === 0) {
						const removeDoors = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'door');
						if (removeDoors && removeDoors.length > 0) {
							canvas.remove(...removeDoors);
						}
					} else {
						const removeDoors = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'door').filter((doorObj) =>
							!objects.some((door) => isType<ObDeviceType>(door, 'door') && doorObj.data && isType<ObDeviceType>(doorObj.data, 'door') && door.idx === doorObj.data?.idx));
						if (removeDoors && removeDoors.length > 0) {
							canvas.remove(...removeDoors);
						}
					}
					return;
				case 'ebell':
					if (objects.length === 0) {
						const removeEbells = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'ebell');
						if (removeEbells && removeEbells.length > 0) {
							canvas.remove(...removeEbells);
						}
					} else {
						const removeEbells = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'ebell').filter((ebellObj) =>
							!objects.some((ebell) => isType<ObDeviceType>(ebell, 'ebell') && ebellObj.data && isType<ObDeviceType>(ebellObj.data, 'ebell') && ebell.idx === ebellObj.data?.idx));
						if (removeEbells && removeEbells.length > 0) {
							canvas.remove(...removeEbells);
						}
					}
					return;
				case 'guardianlite':
					if (objects.length === 0) {
						const removeGuardianlites = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'guardianlite');
						if (removeGuardianlites && removeGuardianlites.length > 0) {
							canvas.remove(...removeGuardianlites);
						}
					} else {
						const removeGuardianlites = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'guardianlite').filter((guardianliteObj) =>
							!objects.some((guardianlite) => isType<ObGuardianliteType>(guardianlite, 'guardianlite') && guardianliteObj.data && isType<ObGuardianliteType>(guardianliteObj.data, 'guardianlite') && guardianlite.guardianlite_ip === guardianliteObj.data?.guardianlite_ip));
						if (removeGuardianlites && removeGuardianlites.length > 0) {
							canvas.remove(...removeGuardianlites);
						}
					}
					return;
				case 'pids':
					if (objects.length === 0) {
						const removePIDSList = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'pids');
						if (removePIDSList && removePIDSList.length > 0) {
							canvas.remove(...removePIDSList);
						}
					} else {
						const removePIDSList = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'pids').filter((pidsObj) =>
							objects.some((pids) => isType<PIDS>(pids, 'pids') && pidsObj.data && isType<PIDS>(pidsObj.data, 'pids') && (pids.idx === pidsObj.data.idx && pids.line_x1 == null || pids.line_x2 == null || pids.line_y1 == null || pids.line_y2 == null)));
						if (removePIDSList && removePIDSList.length > 0) {
							canvas.remove(...removePIDSList);
						}
					}
					return;
				case 'mdet':
					if (objects.length === 0) {
						const removeMDETs = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'mdet');
						if (removeMDETs && removeMDETs.length > 0) {
							canvas.remove(...removeMDETs);
						};
					} else {
						const removeMDETs = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'mdet').filter((doorObj) =>
							!objects.some((door) => isType<ObDeviceType>(door, 'mdet') && doorObj.data && isType<ObDeviceType>(doorObj.data, 'mdet') && door.idx === doorObj.data?.idx));
						if (removeMDETs && removeMDETs.length > 0) {
							canvas.remove(...removeMDETs);
						};
					}
					return;

				case 'waterGauge':
					if (objects.length === 0) {
						const removeWaterGauges = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'waterGauge');
						if (removeWaterGauges && removeWaterGauges.length > 0) {
							canvas.remove(...removeWaterGauges);
						};
					} else {

						const removeWaterGauges = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'waterGauge').filter((gaugeObj) =>
							!objects.some((gauge) => isType<ObDeviceType>(gauge, 'waterGauge') && gaugeObj.data && isType<ObDeviceType>(gaugeObj.data, 'waterGauge') && gauge.idx === gaugeObj.data?.idx));
						if (removeWaterGauges && removeWaterGauges.length > 0) {
							canvas.remove(...removeWaterGauges);
						};
					}
					return;

				case 'waterLevel':
					if (objects.length === 0) {
						const removeWaterLevel = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'waterLevel');
						if (removeWaterLevel && removeWaterLevel.length > 0) {
							canvas.remove(...removeWaterLevel);
						};
					} else {
						const removeWaterLevel = canvas.getObjects().filter((object: FabricObject) => (object.data && object.data.type) === 'waterLevel').filter((gaugeObj) =>
							!objects.some((gauge) => isType<ObDeviceType>(gauge, 'waterLevel') && gaugeObj.data && isType<ObDeviceType>(gaugeObj.data, 'waterLevel') && gauge.idx === gaugeObj.data?.idx));
						if (removeWaterLevel && removeWaterLevel.length > 0) {
							canvas.remove(...removeWaterLevel);
						};
					}
					return;



				default:
					break;
			}
		}

		function checkSameObject({ canvas, object, type }: { canvas: Canvas, object: ObserverObject, type: string }) {
			if (object == null) {
				return;
			}

			switch (type) {
				case 'building':
					return canvas.getObjects()
						.filter((canvasObject) => canvasObject.data?.type === 'building')
						.find((canvasObject: FabricObject) => {
							const data = canvasObject.data as Building;

							if (isType<Building>(object, 'building')) {
								return (
									data.idx === object.idx &&
									data.outside_name === object.outside_name &&
									data.top_location === object.top_location &&
									data.left_location === object.left_location &&
									data.service_type === object.service_type &&
									data.alarm_status === object.alarm_status
								)
							}
						});
				case 'parkingArea': {
					return canvas.getObjects()
						.filter((canvasObject) => canvasObject.data?.type === 'parkingArea')
						.find((canvasObject: FabricObject) => {
							const data = canvasObject.data as ParkingArea;

							if (isType<ParkingArea>(object, 'parkingArea')) {
								return (
									data.idx === object.idx &&
									data.area_name === object.area_name &&
									data.top_location === object.top_location &&
									data.left_location === object.left_location &&
									data.icon_height === object.icon_height &&
									data.icon_width === object.icon_width &&
									data.use_area === object.use_area &&
									data.linked_status === object.linked_status
								)
							}
						});
				}
				case 'camera':
					return canvas.getObjects()
						.filter((canvasObject) => canvasObject.data?.type === 'camera')
						.find((canvasObject: FabricObject) => {
							const data = canvasObject.data as CameraType;

							if (isType<CameraType>(object, 'camera')) {
								return (
									data.camera_id === object.camera_id &&
									data.main_service_name === object.main_service_name &&
									data.vms_name === object.vms_name &&
									data.outside_idx === object.outside_idx &&
									data.inside_idx === object.inside_idx &&
									data.top_location === object.top_location &&
									data.left_location === object.left_location &&
									data.camera_angle === object.camera_angle &&
									cameraAngleNoUpdate &&
									objectLabelNoUpdate
								)
							}
						})

				case 'waterGauge':
					return canvas.getObjects()
						.filter((canvasObject) => canvasObject.data?.type === 'waterGauge')
						.find((canvasObject: FabricObject) => {
							const data = canvasObject.data as WaterGaugeType;

							if (isType<WaterGaugeType>(object, 'waterGauge')) {
								return (
									data.idx === object.idx &&
									data.outside_idx === object.outside_idx &&
									data.water_gauge_name === object.water_gauge_name &&
									data.top_location === object.top_location &&
									data.left_location === object.left_location
								)
							}
						})

				case 'waterLevel':
					return canvas.getObjects()
						.filter((canvasObject) => canvasObject.data?.type === 'waterLevel')
						.find((canvasObject: FabricObject) => {
							const data = canvasObject.data as WaterLevelType;

							if (isType<WaterLevelType>(object, 'waterLevel')) {
								return (
									data.idx === object.idx &&
									data.outside_idx === object.outside_idx &&
									data.water_level_name === object.water_level_name &&
									data.top_location === object.top_location &&
									data.left_location === object.left_location
								)
							}
						})

				case 'door':
					return canvas.getObjects()
						.filter((canvasObject) => canvasObject.data?.type === 'door')
						.find((canvasObject: FabricObject) => {
							const data = canvasObject.data as ObDeviceType;

							if (isType<ObDeviceType>(object, 'door')) {
								return (
									data.idx === object.idx &&
									data.camera_id === object.camera_id &&
									data.outside_idx === object.outside_idx &&
									data.inside_idx === object.inside_idx &&
									data.top_location === object.top_location &&
									data.left_location === object.left_location &&
									data.is_lock === object.is_lock &&
									objectLabelNoUpdate
								);
							};
						});
				case 'ebell':
					return canvas.getObjects()
						.filter((canvasObject) => canvasObject.data?.type === 'ebell')
						.find((canvasObject: FabricObject) => {
							const data = canvasObject.data as ObDeviceType;

							if (isType<ObDeviceType>(object, 'ebell')) {
								return (
									data.idx === object.idx &&
									data.camera_id === object.camera_id &&
									data.outside_idx === object.outside_idx &&
									data.inside_idx === object.inside_idx &&
									data.top_location === object.top_location &&
									data.left_location === object.left_location
								)
							}
						});
				case 'guardianlite':
					return canvas.getObjects()
						.filter((canvasObject) => canvasObject.data?.type === 'guardianlite')
						.find((canvasObject: FabricObject) => {
							const data = canvasObject.data as ObGuardianliteType;

							if (isType<ObGuardianliteType>(object, 'guardianlite')) {
								return (
									data.guardianlite_ip === object.guardianlite_ip &&
									data.guardianlite_name === object.guardianlite_name &&
									data.outside_idx === object.outside_idx &&
									data.inside_idx === object.inside_idx &&
									data.top_location === object.top_location &&
									data.left_location === object.left_location &&
									data.status === object.status &&
									data.ch1 === object.ch1 &&
									data.ch2 === object.ch2 &&
									data.ch3 === object.ch3 &&
									data.ch4 === object.ch4 &&
									data.ch5 === object.ch5 &&
									data.ch1_label === object.ch1_label &&
									data.ch2_label === object.ch2_label &&
									data.ch3_label === object.ch3_label &&
									data.ch4_label === object.ch4_label &&
									data.ch5_label === object.ch5_label &&
									data.temper === object.temper
								)
							}
						});
				case 'pids':
					return canvas.getObjects()
						.filter((canvasObject) => canvasObject.data?.type === 'pids')
						.find((canvasObject: FabricObject) => {
							const data = canvasObject.data as PIDS;

							if (isType<PIDS>(object, 'pids')) {
								return (
									data.idx === object.idx &&
									data.pids_id === object.pids_id &&
									data.pids_ip === object.pids_ip &&
									data.pids_name === object.pids_name &&
									data.pids_location === object.pids_location &&
									data.line_x1 === object.line_x1 &&
									data.line_x2 === object.line_x2 &&
									data.line_y1 === object.line_y1 &&
									data.line_y2 === object.line_y2 &&
									data.camera_id === object.camera_id &&
									data.alarm_status === object.alarm_status &&
									data.linked_status === object.linked_status
								);
							};
						});
				case 'mdet':
					return canvas.getObjects()
						.filter((canvasObject) => canvasObject.data?.type === 'mdet')
						.find((canvasObject: FabricObject) => {
							const data = canvasObject.data as ObDeviceType;

							if (isType<ObDeviceType>(object, 'mdet')) {
								return (
									data.idx === object.idx &&
									data.device_name === object.device_name,
									data.device_ip === object.device_ip,
									data.device_location === object.device_location,
									data.camera_id === object.camera_id &&
									data.outside_idx === object.outside_idx &&
									data.inside_idx === object.inside_idx &&
									data.top_location === object.top_location &&
									data.left_location === object.left_location
								);
							};
						});
					break;
				default:
					break;
			}
		}

		function checkUpdateObject({ canvas, object, type }: { canvas: Canvas, object: ObserverObject, type: string }): FabricObject | undefined {
			if (object == null) {
				return;
			}

			switch (type) {
				case 'building':
					return canvas.getObjects().filter((canvasObject: FabricObject) => canvasObject.data?.type === 'building').find((buildingObj: FabricObject) => (buildingObj.data as Building).idx === (object as Building).idx)
					break;
				case 'parkingArea':
					return canvas.getObjects().filter((canvasObject: FabricObject) => canvasObject.data?.type === 'parkingArea').find((parkingAreaObject: FabricObject) => (parkingAreaObject.data as ParkingArea).idx === (object as ParkingArea).idx)
					break;
				case 'camera':
					return canvas.getObjects().find((canvasObject: FabricObject) => (
						isType<CameraType>(object, 'camera') &&
						canvasObject.data &&
						isType<CameraType>(canvasObject.data, 'camera') &&
						canvasObject.data?.vms_name === object.vms_name &&
						canvasObject.data?.camera_id === object.camera_id &&
						canvasObject.data?.main_service_name === object.main_service_name
					));
					break;
				case 'door':
					return canvas.getObjects().find((canvasObject: FabricObject) => (
						isType<ObDeviceType>(object, 'door') &&
						canvasObject.data &&
						isType<ObDeviceType>(canvasObject.data, 'door') &&
						canvasObject.data?.idx === object.idx
					));
					break;
				case 'ebell':
					return canvas.getObjects().find((canvasObject: FabricObject) => (
						isType<ObDeviceType>(object, 'ebell') &&
						canvasObject.data &&
						isType<ObDeviceType>(canvasObject.data, 'ebell') &&
						canvasObject.data?.idx === object.idx
					));
					break;
				case 'guardianlite':
					return canvas.getObjects().find((canvasObject: FabricObject) => (
						isType<ObGuardianliteType>(object, 'guardianlite') &&
						canvasObject.data &&
						isType<ObGuardianliteType>(canvasObject.data, 'guardianlite') &&
						canvasObject.data?.guardianlite_ip === object.guardianlite_ip
					));
					break;
				case 'pids':
					return canvas.getObjects().find((canvasObject: FabricObject) => (
						isType<PIDS>(object, 'pids') &&
						canvasObject.data &&
						isType<PIDS>(canvasObject.data, 'pids') &&
						canvasObject.data?.idx === object.idx
					));
					break;
				case 'mdet':
					return canvas.getObjects().find((canvasObject: FabricObject) => (
						isType<ObDeviceType>(object, 'mdet') &&
						canvasObject.data &&
						isType<ObDeviceType>(canvasObject.data, 'mdet') &&
						canvasObject.data?.idx === object.idx
					));
				case 'waterGauge':
					// console.log(canvas.getObjects(), object)
					return canvas.getObjects().find((canvasObject: FabricObject) => (
						isType<WaterGaugeType>(object, 'waterGauge') &&
						canvasObject.data &&
						isType<WaterGaugeType>(canvasObject.data, 'waterGauge') &&
						canvasObject.data?.idx === object.idx
					));
					break;
				case 'waterLevel':
					return canvas.getObjects().find((canvasObject: FabricObject) => (
						isType<WaterLevelType>(object, 'waterLevel') &&
						canvasObject.data &&
						isType<WaterLevelType>(canvasObject.data, 'waterLevel') &&
						canvasObject.data?.idx === object.idx
					));
					break;
				default:
					break;
			}
		}

		if (items) {
			syncObjects({ canvas: this.canvas, objects: items, type: itemType, removeTriangle: this.removeTriangle.bind(this) })
		}

		const addImageWithLabel = async (
			canvas: Canvas,
			imageUrl: string,
			labelText: string,
			type: string,
			object: ObserverObject,
			options: {
				left?: number;
				top?: number;
				labelOffsetY?: number;
				fontSize?: number;
				fontFamily?: string;
				fovLength?: number;
			} = {}
		): Promise<void> => {
			if (object == null) {
				return;
			}

			const isExistSameObject = checkSameObject({ canvas, object, type });
			if (isExistSameObject) {
				return;
			}

			const isExistUpdateObject = checkUpdateObject({ canvas, object, type });
			if (isExistUpdateObject) {
				canvas.remove(isExistUpdateObject);
			}
			if (isType<Building>(object, 'building')) {
				const {
					left = 100,
					top = 100,
					labelOffsetY = 10,
					fontSize = 14,
					fontFamily = "Arial",
				} = options;
				try {
					// 이미지 객체 생성
					new Promise<FabricImage>((resolve, reject) => {
						FabricImage.fromURL(
							imageUrl,
							{ crossOrigin: 'use-credentials' }
						).then((img) => {
							if (!img) {
								reject(new Error('이미지 로드에 실패했습니다.'));
								return;
							}
							// 이미지 크기 설정
							img.scaleToWidth(60); // 원하는 크기
							const imageWidth = img.getScaledWidth();
							const imageHeight = img.getScaledHeight();

							// 이미지 크기 및 위치 설정
							img.set({
								left,
								top,
								originX: 'center',
								originY: 'center',
								clipPath: new Circle({
									radius: imageWidth / 2,
									originX: 'center',
									originY: 'center',
								}),
								scaleX: 0.8,
								scaleY: 0.8
							});

							// 텍스트 객체 생성
							const label = new FabricText(labelText, {
								fill: 'black',
								left: left,
								top: imageHeight / 2 + labelOffsetY + 5,
								fontSize: fontSize,
								fontFamily: fontFamily,
								originX: "center",
								originY: "center",
								backgroundColor: 'yellowgreen',
								fontWeight: 600,
							});

							const shadow = new Shadow({
								color: "black",
								blur: 15,
								offsetX: 8,
								offsetY: 11,
							});
							const eventShadow = new Shadow({
								color: "red",
								blur: 30,
							});
							// Linear Gradient 배경 생성
							const gradientBackground = new Circle({
								radius: imageWidth / 2 + 5, // 이미지 크기 + padding
								fill: new Gradient({
									type: 'linear', // 선형 그라디언트
									gradientUnits: 'pixels', // 좌표 단위
									coords: { x1: -imageWidth / 2, y1: 0, x2: imageWidth / 2, y2: 0 },
									colorStops: [
										{ offset: 0, color: '#00801E' }, // 시작 색
										{ offset: 1, color: '#6CFF72' }, // 끝 색
									],
								}),
								originX: 'center',
								originY: 'center',
								scaleX: 0.88,
								scaleY: 0.88,
								shadow: object?.alarm_status ? eventShadow : shadow,
							});

							// 그룹화
							const group = new Group([gradientBackground, img, label], {
								originX: 'left',
								originY: 'top',
								hasControls: false,
								lockMovementX: true,
								lockMovementY: true,
								hoverCursor: 'pointer',
								selectable: false,
							});

							group.set({
								top: Math.min(Math.max(0, top * this.canvas.height), this.canvas.height - (group.height! + 5)),
								left: Math.min(Math.max(0, left * this.canvas.width), this.canvas.width - (group.width! + 5)),
							});

							group.set('data', { ...object, type, });
							// Canvas에 추가
							canvas.add(group);
							canvas.renderAll();
						})
					});
				} catch (error) {
					console.error("Error adding image with label:", error);
				}
			}

			if (isType<CameraType>(object, 'camera')) {
				const {
					left = 100,
					top = 100,
					labelOffsetY = 10,
					fontSize = 14,
					fontFamily = "Arial",
				} = options;
				try {
					// 이미지 객체 생성
					new Promise<FabricImage>((resolve, reject) => {
						FabricImage.fromURL(
							imageUrl,
							{ crossOrigin: 'use-credentials' }
						).then((img) => {
							if (!img) {
								reject(new Error('이미지 로드에 실패했습니다.'));
								return;
							}
							// 이미지 크기 설정
							// img.scaleToWidth(50); // 원하는 크기
							const imageWidth = img.getScaledWidth();
							const imageHeight = img.getScaledHeight();

							// 이미지 크기 및 위치 설정
							img.set({
								left: left,
								top: top,
								originX: "center",
								originY: "center",
								clipPath: new Circle({
									radius: imageWidth / 2,
									originX: 'center',
									originY: 'center',
								}),
								scaleX: 0.35,
								scaleY: 0.35,
							});
							let label;
							if (objectLabel) {
								// 텍스트 객체 생성
								label = new FabricText(labelText, {
									fill: 'black',
									left: left,
									// top: imageHeight / 2 + labelOffsetY + 5,
									top: imageHeight / 4 + labelOffsetY + 5,
									fontSize: fontSize,
									fontFamily: fontFamily,
									originX: "center",
									originY: "center",
									backgroundColor: 'yellowgreen',
									fontWeight: 600,
								});
							}

							const shadow = new Shadow({
								color: "black",
								blur: 15,
								offsetX: 8,
								offsetY: 11,
							});
							const eventShadow = new Shadow({
								color: "red",
								blur: 30,
							});

							// Linear Gradient 배경 생성
							const gradientBackground = new Circle({
								// radius: imageWidth / 2 + 1, // 이미지 크기 + padding
								radius: 15,
								fill: new Gradient({
									type: 'linear', // 선형 그라디언트
									gradientUnits: 'pixels', // 좌표 단위
									coords: { x1: -imageWidth / 2, y1: 0, x2: imageWidth / 2, y2: 0 },
									colorStops: [
										{ offset: 0, color: '#00801E' }, // 시작 색
										{ offset: 1, color: '#6CFF72' }, // 끝 색
									],
								}),
								originX: 'center',
								originY: 'center',
								scaleX: 1,
								scaleY: 1,
								shadow: object?.linked_status === false ? eventShadow : shadow,
							});

							let triangle: Triangle | null = null;

							if (cameraAngle) {

								// 예: options로 길이 받기 (px)
								const fovLength = options?.fovLength ?? 90;          // 기존 150 -> 90으로 줄이기
								const clipRatio = 0.8;                                // clip이 path 길이의 몇 %를 보이게 할지
								const clipH = Math.round(fovLength * clipRatio);      // 기존 120 대응
								const clipTop = -clipH / 2;

								// 폭(원하면 같이 조절 가능)
								const topWidth = 50;   // 기존 -25~25 => 50
								const bottomWidth = 40; // 기존 -20~20 => 40

								// const pathData = 'M -25,0 L 25,0 L -20,150 L 20,150 Z';
								const pathData = `M ${-topWidth / 2},0 L ${topWidth / 2},0 L ${-bottomWidth / 2},${fovLength} L ${bottomWidth / 2},${fovLength} Z`;
								const clip = new Rect({
									// width: 60,
									// height: 120,
									width: 60,
									// height: 120,
									height: clipH,
									// top: -60,
									top: clipTop,
									originX: 'center',
									originY: 'center',
								});

								triangle = new Path(pathData, {
									fill: new Gradient({
										type: 'linear',
										gradientUnits: 'pixels',
										// coords: { x1: 30, y1: 0, x2: 30, y2: 150 },
										coords: { x1: 30, y1: 0, x2: 30, y2: 150 },
										colorStops: [
											{ offset: 0, color: 'rgba(255, 130, 7, 0)' },
											{ offset: 0.15, color: 'rgba(255, 129, 4, 0.8)' },
											{ offset: 0.7, color: 'rgba(255, 98, 0, 0.95)' },
											{ offset: 1, color: 'rgba(255, 98, 0, 1)' },
										]
									}),
									originX: 'center',
									originY: 'center',
									angle: object.camera_angle ? parseFloat(object.camera_angle) : 290,
									selectable: false,
									hasControls: false,
									clipPath: clip,
									objectCaching: true,
									data: {
										labelText,
										isTriangle: true,
										cameraId: `${object.main_service_name}:${object.vms_name}:${object.camera_id}`
									},
								});
							}
							let group;
							if (label) {
								group = new Group([gradientBackground, img, label], {
									originX: 'left',
									originY: 'top',
									hasControls: false,
									lockMovementX: true,
									lockMovementY: true,
									hoverCursor: 'pointer',
									selectable: false,
								});
							} else {
								group = new Group([gradientBackground, img], {
									originX: 'left',
									originY: 'top',
									hasControls: false,
									lockMovementX: true,
									lockMovementY: true,
									hoverCursor: 'pointer',
									selectable: false,
								});
							}

							group.set({
								top: Math.min(Math.max(0, top * this.canvas.height), this.canvas.height - (group.height! + 5)),
								left: Math.min(Math.max(0, left * this.canvas.width), this.canvas.width - (group.width! + 5)),
							});

							group.set('data', { ...object, type });


							this.removeTriangle(canvas, labelText);

							if (triangle) {
								group.setCoords();

								const adjustLeft = objectLabel ? (group.width! / 1.85) : (group.width! / 1.7);
								const adjustTop = objectLabel ? (group.height! / 3.5) : (group.height! / 1.9);

								triangle.set({
									// left: group.left! + (group.width! / 1.9),
									// top: group.top! + (group.height! / 2.7),
									left: group.left! + adjustLeft,
									top: group.top! + adjustTop,
								});
								canvas.add(triangle);
							}

							canvas.add(group);
							canvas.renderAll();
						})
					});
				} catch (error) {
					console.error("Error adding image with label:", error);
				}
			}

			if (isType<WaterGaugeType>(object, 'waterGauge')) {
				const {
					left = 100,
					top = 100,
					labelOffsetY = 10,
					fontSize = 14,
					fontFamily = "Arial",
				} = options;
				try {
					// 이미지 객체 생성
					new Promise<FabricImage>((resolve, reject) => {
						FabricImage.fromURL(
							imageUrl,
							{ crossOrigin: 'use-credentials' }
						).then((img) => {
							if (!img) {
								reject(new Error('이미지 로드에 실패했습니다.'));
								return;
							}
							// 이미지 크기 설정
							img.scaleToWidth(35); // 원하는 크기
							const imageWidth = img.getScaledWidth();
							const imageHeight = img.getScaledHeight();

							// 이미지 크기 및 위치 설정
							img.set({
								left: left,
								top: top,
								originX: "center",
								originY: "center",
								clipPath: new Circle({
									radius: imageWidth / 2,
									originX: 'center',
									originY: 'center',
								}),
								scaleX: 0.8,
								scaleY: 0.8,
							});

							// 텍스트 객체 생성
							const label = new FabricText(labelText, {
								fill: 'black',
								left: left,
								top: imageHeight / 2 + labelOffsetY + 5,
								fontSize: fontSize,
								fontFamily: fontFamily,
								originX: "center",
								originY: "center",
								// backgroundColor: 'white',
								fontWeight: 600,
							});

							const shadow = new Shadow({
								color: "lightblue",
								blur: 20,
								offsetX: 8,
								offsetY: 11,
							});
							const eventShadow = new Shadow({
								color: "red",
								blur: 30,
							});

							// Linear Gradient 배경 생성
							const gradientBackground = new Circle({
								radius: imageWidth / 2 + 1, // 이미지 크기 + padding
								fill: new Gradient({
									type: 'linear', // 선형 그라디언트
									gradientUnits: 'pixels', // 좌표 단위
									coords: { x1: -imageWidth / 2, y1: 0, x2: imageWidth / 2, y2: 0 },
									colorStops: [
										{ offset: 0, color: '#cceeff' },
										{ offset: 1, color: '#e0f7ff' },
									],

								}),
								originX: 'center',
								originY: 'center',
								scaleX: 1,
								scaleY: 1,
								// 상태 변경!!!!!!!!!!!!!
								shadow: object?.use_status ? shadow : eventShadow,
							});

							const group = new Group([gradientBackground, img, label], {
								originX: 'left',
								originY: 'top',
								hasControls: false,
								lockMovementX: true,
								lockMovementY: true,
								hoverCursor: 'pointer',
								selectable: false,
							});

							group.set({
								top: Math.min(Math.max(0, top * this.canvas.height), this.canvas.height - (group.height! + 5)),
								left: Math.min(Math.max(0, left * this.canvas.width), this.canvas.width - (group.width! + 5)),
							});

							group.set('data', { ...object, type, });

							this.removeTriangle(canvas, labelText);

							canvas.add(group);
							canvas.renderAll();
						})
					});
				} catch (error) {
					console.error("Error adding image with label:", error);
				}
			}

			if (isType<WaterLevelType>(object, 'waterLevel')) {
				const {
					left = 100,
					top = 100,
					labelOffsetY = 10,
					fontSize = 14,
					fontFamily = "Arial",
				} = options;
				try {
					// 이미지 객체 생성
					new Promise<FabricImage>((resolve, reject) => {
						FabricImage.fromURL(
							imageUrl,
							{ crossOrigin: 'use-credentials' }
						).then((img) => {
							if (!img) {
								reject(new Error('이미지 로드에 실패했습니다.'));
								return;
							}
							// 이미지 크기 설정
							img.scaleToWidth(35); // 원하는 크기
							const imageWidth = img.getScaledWidth();
							const imageHeight = img.getScaledHeight();

							// 이미지 크기 및 위치 설정
							img.set({
								left: left,
								top: top,
								originX: "center",
								originY: "center",
								clipPath: new Circle({
									radius: imageWidth / 2,
									originX: 'center',
									originY: 'center',
								}),
								scaleX: 0.8,
								scaleY: 0.8,
							});

							// 텍스트 객체 생성
							const label = new FabricText(labelText, {
								fill: 'black',
								left: left,
								top: imageHeight / 2 + labelOffsetY + 5,
								fontSize: fontSize,
								fontFamily: fontFamily,
								originX: "center",
								originY: "center",
								// backgroundColor: 'white',
								fontWeight: 600,
							});

							const shadow = new Shadow({
								color: "lightblue",
								blur: 20,
								offsetX: 8,
								offsetY: 11,
							});
							const eventShadow = new Shadow({
								color: "red",
								blur: 30,
							});

							// Linear Gradient 배경 생성
							const gradientBackground = new Circle({
								radius: imageWidth / 2 + 1, // 이미지 크기 + padding
								fill: new Gradient({
									type: 'linear', // 선형 그라디언트
									gradientUnits: 'pixels', // 좌표 단위
									coords: { x1: -imageWidth / 2, y1: 0, x2: imageWidth / 2, y2: 0 },
									colorStops: [
										{ offset: 0, color: '#cceeff' },
										{ offset: 1, color: '#e0f7ff' },
									],

								}),
								originX: 'center',
								originY: 'center',
								scaleX: 1,
								scaleY: 1,
								// 상태 변경!!!!!!!!!!!!!
								shadow: object?.use_status ? shadow : eventShadow,
							});

							const group = new Group([gradientBackground, img, label], {
								originX: 'left',
								originY: 'top',
								hasControls: false,
								lockMovementX: true,
								lockMovementY: true,
								hoverCursor: 'pointer',
								selectable: false,
							});

							group.set({
								top: Math.min(Math.max(0, top * this.canvas.height), this.canvas.height - (group.height! + 5)),
								left: Math.min(Math.max(0, left * this.canvas.width), this.canvas.width - (group.width! + 5)),
							});

							group.set('data', { ...object, type, });

							this.removeTriangle(canvas, labelText);



							canvas.add(group);
							canvas.renderAll();
						})
					});
				} catch (error) {
					console.error("Error adding image with label:", error);
				}
			}

			if (isType<ObDeviceType>(object, 'door')) {
				const {
					left = 100,
					top = 100,
					labelOffsetY = 10,
					fontSize = 14,
					fontFamily = "Arial",
				} = options;
				try {
					// 이미지 객체 생성
					new Promise<FabricImage>((resolve, reject) => {
						FabricImage.fromURL(
							imageUrl,
							{ crossOrigin: 'use-credentials' }
						).then((img) => {
							if (!img) {
								reject(new Error('이미지 로드에 실패했습니다.'));
								return;
							}
							// 이미지 크기 설정
							// img.scaleToWidth(50); // 원하는 크기
							const imageWidth = img.getScaledWidth();
							const imageHeight = img.getScaledHeight();

							// 이미지 크기 및 위치 설정
							img.set({
								left: left,
								top: top,
								originX: "center",
								originY: "center",
								clipPath: new Circle({
									radius: imageWidth / 2,
									originX: 'center',
									originY: 'center',
								}),
								scaleX: 0.35,
								scaleY: 0.35,
							});
							let label;
							// 텍스트 객체 생성
							if (objectLabel) {
								label = new FabricText(labelText, {
									fill: 'black',
									left: left,
									top: imageHeight / 2 + labelOffsetY + 5,
									fontSize: fontSize,
									fontFamily: fontFamily,
									originX: "center",
									originY: "center",
									backgroundColor: 'yellowgreen',
									fontWeight: 600,
									// scaleX: 1.1,
									// scaleY: 1.1
								});
							}

							const shadow = new Shadow({
								color: "black",
								blur: 15,
								offsetX: 8,
								offsetY: 11,
							});
							const eventShadow = new Shadow({
								color: "red",
								blur: 30,
							});
							// Linear Gradient 배경 생성
							const gradientBackground = new Circle({
								radius: imageWidth / 2 + 1, // 이미지 크기 + padding
								fill: new Gradient({
									type: 'linear', // 선형 그라디언트
									gradientUnits: 'pixels', // 좌표 단위
									coords: { x1: -imageWidth / 2, y1: 0, x2: imageWidth / 2, y2: 0 },
									colorStops: [
										{ offset: 0, color: '#00801E' }, // 시작 색
										{ offset: 1, color: '#6CFF72' }, // 끝 색
									],
								}),
								originX: 'center',
								originY: 'center',
								shadow: object?.linked_status === false ? eventShadow : shadow,
								scaleX: 0.45,
								scaleY: 0.45
							});
							let group;
							if (label) {
								group = new Group([gradientBackground, img, label], {
									originX: 'left',
									originY: 'top',
									hasControls: false,
									lockMovementX: true,
									lockMovementY: true,
									hoverCursor: 'pointer',
									selectable: false,
									// scaleX: 0.9,
									// scaleY: 0.9
								});
							} else {
								group = new Group([gradientBackground, img], {
									originX: 'left',
									originY: 'top',
									hasControls: false,
									lockMovementX: true,
									lockMovementY: true,
									hoverCursor: 'pointer',
									selectable: false,
									scaleX: 0.9,
									scaleY: 0.9
								});
							}

							group.set({
								top: Math.min(Math.max(0, top * this.canvas.height), this.canvas.height - (group.height! + 5)),
								left: Math.min(Math.max(0, left * this.canvas.width), this.canvas.width - (group.width! + 5)),
							});

							group.set('data', { ...object, type, });
							// Canvas에 추가
							canvas.add(group);
							canvas.renderAll();
						})
					});
				} catch (error) {
					console.error("Error adding image with label:", error);
				}
			}

			if (isType<ObDeviceType>(object, 'ebell')) {
				const {
					left = 100,
					top = 100,
					labelOffsetY = 10,
					fontSize = 14,
					fontFamily = "Arial",
				} = options;
				try {
					// 이미지 객체 생성
					new Promise<FabricImage>((resolve, reject) => {
						FabricImage.fromURL(
							imageUrl,
							{ crossOrigin: 'use-credentials' }
						).then((img) => {
							if (!img) {
								reject(new Error('이미지 로드에 실패했습니다.'));
								return;
							}
							// 이미지 크기 설정
							img.scaleToWidth(50); // 원하는 크기
							const imageWidth = img.getScaledWidth();
							const imageHeight = img.getScaledHeight();

							// 이미지 크기 및 위치 설정
							img.set({
								left: left,
								top: top,
								originX: "center",
								originY: "center",
								clipPath: new Circle({
									radius: imageWidth / 2,
									originX: 'center',
									originY: 'center',
								}),
							});

							// 텍스트 객체 생성
							const label = new FabricText(labelText, {
								fill: 'black',
								left: left,
								top: imageHeight / 2 + labelOffsetY + 5,
								fontSize: fontSize,
								fontFamily: fontFamily,
								originX: "center",
								originY: "center",
								backgroundColor: 'yellowgreen',
								fontWeight: 600,
								scaleX: 1.1,
								scaleY: 1.1
							});

							const shadow = new Shadow({
								color: "black",
								blur: 15,
								offsetX: 8,
								offsetY: 11,
							});
							const eventShadow = new Shadow({
								color: "red",
								blur: 30,
							});
							// Linear Gradient 배경 생성
							const gradientBackground = new Circle({
								radius: imageWidth / 2 + 1, // 이미지 크기 + padding
								fill: new Gradient({
									type: 'linear', // 선형 그라디언트
									gradientUnits: 'pixels', // 좌표 단위
									coords: { x1: -imageWidth / 2, y1: 0, x2: imageWidth / 2, y2: 0 },
									colorStops: [
										{ offset: 0, color: '#00801E' }, // 시작 색
										{ offset: 1, color: '#6CFF72' }, // 끝 색
									],
								}),
								originX: 'center',
								originY: 'center',
								shadow: object?.linked_status === false ? eventShadow : shadow,
							});
							const group = new Group([gradientBackground, img, label], {
								originX: 'left',
								originY: 'top',
								hasControls: false,
								lockMovementX: true,
								lockMovementY: true,
								hoverCursor: 'pointer',
								selectable: false,
								scaleX: 0.9,
								scaleY: 0.9
							});

							group.set({
								top: Math.min(Math.max(0, top * this.canvas.height), this.canvas.height - (group.height! + 5)),
								left: Math.min(Math.max(0, left * this.canvas.width), this.canvas.width - (group.width! + 5)),
							});

							group.set('data', { ...object, type, });
							// Canvas에 추가
							canvas.add(group);
							canvas.renderAll();
						})
					});
				} catch (error) {
					console.error("Error adding image with label:", error);
				}
			}

			if (isType<ObGuardianliteType>(object, 'guardianlite')) {
				const {
					left = 100,
					top = 100,
					labelOffsetY = 10,
					fontSize = 14,
					fontFamily = "Arial",
				} = options;
				try {
					// 이미지 객체 생성
					new Promise<FabricImage>((resolve, reject) => {
						FabricImage.fromURL(
							imageUrl,
							{ crossOrigin: 'use-credentials' }
						).then((img) => {
							if (!img) {
								reject(new Error('이미지 로드에 실패했습니다.'));
								return;
							}
							// 이미지 크기 설정
							img.scaleToWidth(50); // 원하는 크기
							const imageWidth = img.getScaledWidth();
							const imageHeight = img.getScaledHeight();

							// 이미지 크기 및 위치 설정
							img.set({
								left: left,
								top: top,
								originX: "center",
								originY: "center",
								clipPath: new Circle({
									radius: imageWidth / 2,
									originX: 'center',
									originY: 'center',
								}),
							});

							// 텍스트 객체 생성
							const label = new FabricText(labelText, {
								fill: 'black',
								left: left,
								top: imageHeight / 2 + labelOffsetY + 5,
								fontSize: fontSize,
								fontFamily: fontFamily,
								originX: "center",
								originY: "center",
								backgroundColor: 'yellowgreen',
								fontWeight: 600,
								scaleX: 1.1,
								scaleY: 1.1
							});

							const shadow = new Shadow({
								color: "black",
								blur: 15,
								offsetX: 8,
								offsetY: 11,
							});
							const eventShadow = new Shadow({
								color: "red",
								blur: 30,
							});
							// Linear Gradient 배경 생성
							const gradientBackground = new Circle({
								radius: imageWidth / 2 + 1, // 이미지 크기 + padding
								fill: new Gradient({
									type: 'linear', // 선형 그라디언트
									gradientUnits: 'pixels', // 좌표 단위
									coords: { x1: -imageWidth / 2, y1: 0, x2: imageWidth / 2, y2: 0 },
									colorStops: [
										{ offset: 0, color: '#00801E' }, // 시작 색
										{ offset: 1, color: '#6CFF72' }, // 끝 색
									],
								}),
								originX: 'center',
								originY: 'center',
							});
							const group = new Group([gradientBackground, img, label], {
								originX: 'left',
								originY: 'top',
								hasControls: false,
								lockMovementX: true,
								lockMovementY: true,
								shadow: !object?.status ? eventShadow : shadow,
								hoverCursor: 'pointer',
								selectable: false,
								scaleX: 0.9,
								scaleY: 0.9
							});

							group.set({
								top: Math.min(Math.max(0, top * this.canvas.height), this.canvas.height - (group.height! + 5)),
								left: Math.min(Math.max(0, left * this.canvas.width), this.canvas.width - (group.width! + 5)),
							});

							group.set('data', { ...object, type, });
							// Canvas에 추가
							canvas.add(group);
							canvas.renderAll();
						})
					});
				} catch (error) {
					console.error("Error adding image with label:", error);
				};
			};

			if (isType<ObDeviceType>(object, 'mdet')) {
				const {
					left = 100,
					top = 100,
					labelOffsetY = 10,
					fontSize = 14,
					fontFamily = "Arial",
				} = options;
				try {
					// 이미지 객체 생성
					new Promise<FabricImage>((resolve, reject) => {
						FabricImage.fromURL(
							imageUrl,
							{ crossOrigin: 'use-credentials' }
						).then((img) => {
							if (!img) {
								reject(new Error('이미지 로드에 실패했습니다.'));
								return;
							}
							// 이미지 크기 설정
							img.scaleToWidth(50); // 원하는 크기
							const imageWidth = img.getScaledWidth();
							const imageHeight = img.getScaledHeight();

							// 이미지 크기 및 위치 설정
							img.set({
								left: left,
								top: top,
								originX: "center",
								originY: "center",
								clipPath: new Circle({
									radius: imageWidth / 2,
									originX: 'center',
									originY: 'center',
								}),
							});

							// 텍스트 객체 생성
							const label = new FabricText(labelText, {
								fill: 'black',
								left: left,
								top: imageHeight / 2 + labelOffsetY + 5,
								fontSize: fontSize,
								fontFamily: fontFamily,
								originX: "center",
								originY: "center",
								backgroundColor: 'yellowgreen',
								fontWeight: 600,
								scaleX: 1.1,
								scaleY: 1.1
							});

							const shadow = new Shadow({
								color: "black",
								blur: 15,
								offsetX: 8,
								offsetY: 11,
							});
							const eventShadow = new Shadow({
								color: "red",
								blur: 30,
							});
							// Linear Gradient 배경 생성
							const gradientBackground = new Circle({
								radius: imageWidth / 2 + 1, // 이미지 크기 + padding
								fill: new Gradient({
									type: 'linear', // 선형 그라디언트
									gradientUnits: 'pixels', // 좌표 단위
									coords: { x1: -imageWidth / 2, y1: 0, x2: imageWidth / 2, y2: 0 },
									colorStops: [
										{ offset: 0, color: '#00801E' }, // 시작 색
										{ offset: 1, color: '#6CFF72' }, // 끝 색
									],
								}),
								originX: 'center',
								originY: 'center',
								shadow: object?.linked_status === false ? eventShadow : shadow,
							});
							const group = new Group([gradientBackground, img, label], {
								originX: 'left',
								originY: 'top',
								hasControls: false,
								lockMovementX: true,
								lockMovementY: true,
								hoverCursor: 'pointer',
								selectable: false,
								scaleX: 0.9,
								scaleY: 0.9
							});

							group.set({
								top: Math.min(Math.max(0, top * this.canvas.height), this.canvas.height - (group.height! + 5)),
								left: Math.min(Math.max(0, left * this.canvas.width), this.canvas.width - (group.width! + 5)),
							});

							group.set('data', { ...object, type, });
							// Canvas에 추가
							canvas.add(group);
							canvas.renderAll();
						})
					});
				} catch (error) {
					console.error("Error adding image with label(MDET):", error);
				};
			};
		};

		const parkingAreaLabel = async (
			canvas: Canvas,
			labelText: string,
			parkingTypeColor: number,
			useArea: boolean,
			type: string,
			object: ObserverObject,
			options: {
				left?: number;
				top?: number;
				fontSize?: number;
				fontFamily?: string;
			} = {}
		): Promise<void> => {
			if (isType<ParkingArea>(object, 'parkingArea')) {
				if (object == null) {
					return;
				}

				const isExistSameObject = checkSameObject({ canvas, object, type });

				if (isExistSameObject) {
					return;
				}

				const isExistUpdateObject = checkUpdateObject({ canvas, object, type });

				if (isExistUpdateObject) {
					canvas.remove(isExistUpdateObject);
				}

				const {
					icon_height,
					icon_width,
				} = object;

				const {
					left = 100,
					top = 100,
					fontSize = 10,
					fontFamily = "Arial",
				} = options;


				const width = parseFloat(icon_width || '70');
				const height = parseFloat(icon_height || '100');
				const fillColor = object.linked_status ? (useArea ? 'rgba(255, 0, 0, 0.5)' : 'rgba(154, 205, 50, 0.5)') : 'rgba(0, 0, 0, 0.5)';
				const strokeWidth = 3;

				const parkingTypeColorMap: { [key: number]: string } = {
					1: 'rgba(0, 0, 255, 0.9)',     // 일반: 파랑
					2: 'rgba(70, 255, 235, 0.9)',  // 경차: 하늘색
					3: 'rgba(255, 189, 0, 0.9)',   // 장애인: 주황색
					4: 'rgba(0, 155, 0, 0.9)',     // 전기: 녹색
				};

				const rect = new Rect({
					width,
					height,
					fill: fillColor,
					stroke: parkingTypeColorMap[parkingTypeColor],
					strokeWidth: strokeWidth,
					originX: 'center',
					originY: 'center',
					left: left,
					top: top,
				});

				const textBox = new Textbox(labelText, {
					fill: 'black',
					fontSize: fontSize,
					fontFamily: fontFamily,
					originX: 'center',
					originY: 'center',
					width: width - strokeWidth * 2,
					textAlign: 'center',
					top: top,
					left: left,
					splitByGrapheme: true,
					backgroundColor: 'transparent',
					fontWeight: 600,
					scaleX: 1.1,
					scaleY: 1.1
				});

				const group = new Group([rect, textBox], {
					top: Math.min(Math.max(0, top * this.canvas.height), this.canvas.height - (rect.height! + 5)),
					left: Math.min(Math.max(0, left * this.canvas.width), this.canvas.width - (rect.width! + 5)),
					originX: 'left',
					originY: 'top',
					hasControls: false,
					lockMovementX: true,
					lockMovementY: true,
					hoverCursor: 'pointer',
					selectable: false
				});

				group.set('data', { ...object, type });

				canvas.add(group);
				canvas.renderAll();
			}
		}

		const addPIDSObject = async ({ canvas, startPoint, endPoint, object }: { canvas: Canvas, startPoint: { x: number, y: number }, endPoint: { x: number, y: number }, object: PIDS }) => {

			if (object == null || startPoint.x == null || startPoint.y == null || endPoint.x == null || endPoint.y == null) {
				return;
			}

			if (isType<PIDS>(object, 'pids')) {

				// 라인 객체 생성
				const line = new Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
					// stroke: '#E4E4EA',
					stroke: object.alarm_status ? 'red' : '#B9B8BF',
					strokeWidth: 3,
					selectable: false,
					hasControls: false,
					originX: 'center',
					originY: 'center',
				});

				// 라벨 객체 생성
				const midPointX = (startPoint.x + endPoint.x) / 2;
				const midPointY = (startPoint.y + endPoint.y) / 2;
				const label = new FabricText(object.pids_id, {
					left: midPointX,
					top: midPointY - 10,
					fontSize: 14,
					fontFamily: 'Arial',
					fill: 'black',
					originX: 'center',
					originY: 'center',
					backgroundColor: 'yellow',
					fontWeight: 'bold',
				});

				// 그룹 생성
				const pidsGroup = new Group([line, label], {
					selectable: false,
					hasControls: false,
					originX: 'left',
					originY: 'top',
					hoverCursor: 'pointer',
				});
				pidsGroup.set('data', { ...object });
				canvas.add(pidsGroup);
				canvas.renderAll();
			}
		}

		const setCameraImageIcon = (cameraType: '' | 'dome' | 'dome_elevator' | 'speed_dome' | 'bullet' | 'bullet_flame' | null, alarmStatus: boolean) => {
			switch (cameraType) {
				case 'dome':
					return alarmStatus ? cameraDomEventIcon : cameraDomIcon;
				case 'dome_elevator':
					return cameraDomElevatorIcon;
				case 'speed_dome':
					return speedDomIcon;
				case 'bullet':
					return alarmStatus ? cameraBulletEventIcon : cameraBulletIcon;
				case 'bullet_flame':
					return cameraBulletFlameIcon;
				default:
					return alarmStatus ? cameraDomEventIcon : cameraDomIcon;
			};
		};

		switch (itemType) {
			case 'building':
				items.forEach((building) => {
					if (isType<Building>(building, 'building')) {
						addImageWithLabel(
							this.canvas,
							buildingIcon,
							building.outside_name,
							'building',
							{ ...building, type: 'building', idx: building.idx },
							{
								top: parseFloat(building.top_location),
								left: parseFloat(building.left_location)
							}
						);
					}
				});
				break;

			case 'camera':
				items.forEach((camera) => {
					if (isType<CameraType>(camera, 'camera')) {
						addImageWithLabel(
							this.canvas,
							setCameraImageIcon(camera.camera_type, camera.alarm_status),
							camera.service_type === 'mgist' ? `${camera.camera_id}.${camera.camera_name}` : camera.camera_name,
							'camera',
							{ ...camera, type: 'camera', camera_id: camera.camera_id, vms_name: camera.vms_name, main_service_name: camera.main_service_name },
							{
								top: parseFloat(camera.top_location),
								left: parseFloat(camera.left_location)
							}
						);
					}
				});
				break;


			case 'parkingArea':
				items.forEach((parkingArea) => {
					if (isType<ParkingArea>(parkingArea, 'parkingArea')) {
						parkingAreaLabel(
							this.canvas,
							parkingArea.area_name,
							parkingArea.parking_type_id,
							parkingArea.use_area,
							itemType,
							{ ...parkingArea, type: itemType, idx: parkingArea.idx },
							{
								top: parseFloat(parkingArea.top_location),
								left: parseFloat(parkingArea.left_location),
							}
						);
					}
				});
				break;

			case 'door':
				items.forEach((door) => {
					if (isType<ObDeviceType>(door, 'door')) {
						addImageWithLabel(
							this.canvas,
							door.is_lock ?
								door.alarm_status ? doorEventLockIcon : doorLockIcon
								:
								door.alarm_status ? doorEventUnLockIcon : doorUnLockIcon,
							`${door.device_id}.${door.device_name}`,
							'door',
							{ ...door, type: 'door' },
							{
								top: parseFloat(door.top_location!),
								left: parseFloat(door.left_location!)
							}
						);
					}
				});
				break;


			case 'ebell':
				items.forEach((ebell) => {
					if (isType<ObDeviceType>(ebell, 'ebell')) {
						addImageWithLabel(
							this.canvas,
							setEbellImageIcon(ebell.outside_idx, ebell.alarm_status),
							`${ebell.device_id}.${ebell.device_name}`,
							'ebell',
							{ ...ebell, type: 'ebell' },
							{
								top: parseFloat(ebell.top_location!),
								left: parseFloat(ebell.left_location!)
							}
						);
					}
				});
				break;
			case 'guardianlite':
				items.forEach((guardianlite) => {
					if (isType<ObGuardianliteType>(guardianlite, 'guardianlite')) {
						addImageWithLabel(
							this.canvas,
							guardianlite.status ? GuardianliteIcon : GuardianliteEventIcon,
							guardianlite.guardianlite_name,
							'guardianlite',
							{ ...guardianlite, type: 'guardianlite' },
							{
								top: parseFloat(guardianlite.top_location!),
								left: parseFloat(guardianlite.left_location!)
							}
						);
					}
				});
				break;
			case 'pids':
				items.forEach((pids) => {
					if (isType<PIDS>(pids, 'pids') && pids.line_x1 && pids.line_x2 && pids.line_y1 && pids.line_y2) {
						addPIDSObject({
							canvas: this.canvas,
							startPoint: {
								x: parseFloat(pids.line_x1) * this.canvas.width,
								y: parseFloat(pids.line_y1) * this.canvas.height
							},
							endPoint: {
								x: parseFloat(pids.line_x2) * this.canvas.width,
								y: parseFloat(pids.line_y2) * this.canvas.height
							},
							object: { ...pids, type: 'pids' },
						});
					}
				});
				break;
			case 'mdet':
				items.forEach((MDET) => {
					if (isType<ObDeviceType>(MDET, 'mdet')) {
						addImageWithLabel(
							this.canvas,
							MDETIcon,
							MDET.device_name,
							'mdet',
							{ ...MDET, type: 'mdet' },
							{
								top: parseFloat(MDET.top_location!),
								left: parseFloat(MDET.left_location!)
							}
						);
					}
				});
				break;
			case 'waterGauge':
				items.forEach((gauge) => {
					if (isType<WaterGaugeType>(gauge, 'waterGauge')) {
						addImageWithLabel(
							this.canvas,
							waterGaugeIcon,
							`${gauge.water_gauge_name}`,
							'waterGauge',
							{ ...gauge, type: 'waterGauge', idx: gauge.idx },
							{
								top: parseFloat(gauge.top_location!),
								left: parseFloat(gauge.left_location!)
							}
						);
					}
				});
				break;

			case 'waterLevel':
				items.forEach((gauge) => {
					if (isType<WaterLevelType>(gauge, 'waterLevel')) {
						addImageWithLabel(
							this.canvas,
							waterGaugeIcon,
							`${gauge.water_level_name}`,
							'waterLevel',
							{ ...gauge, type: 'waterLevel', idx: gauge.idx },
							{
								top: parseFloat(gauge.top_location!),
								left: parseFloat(gauge.left_location!)
							}
						);
					}
				});
				break;
			default:
				break;
		}
		this.canvas.renderAll();
		// 객체별 타입 구분을 위해 사용 (현재 : Building & ParkingArea만 사용 중)
		// TODO : 추후 cctv 및 다른 객체들 들어올 경우 사용하면 될 것 같습니다.
		function isType<T extends ObserverObject>(object: ObserverObject, type: T['type']): object is T {
			return object.type === type;
		}
		function setEbellImageIcon(outside_idx: number | null, alarm_status: boolean) {
			if (outside_idx === 0) {
				return alarm_status ? ebellIndoorIconEvent : ebellIndoorIcon;
			} else {
				return alarm_status ? ebellOutdoorIconEvent : ebellOutdoorIcon;
			}
		}
	}

	/**
	 * 
	 * @param canvas: background canvas
	 * @param object: moving object
	 * @param callback: {
	 *  (topLocation: number, leftLocation: number) => Promise<{ success: boolean }>
	 * }
	 */

	updateObjectLocation({
		canvas,
		object,
		callback
	}: UpdateObjectLocationProps): Canvas | void {
		if (!canvas) {
			console.warn('Canvas is not provided.');
			return;
		}

		if (!object) {
			console.warn('object data is not available on the canvas.');
			return;
		}
		console.log('updateObjectLocation', object);
		this.updatingObject = object;

		this.canvas.defaultCursor = 'grabbing';
		let isDragging: boolean = false;     // 마우스 이동 이벤트
		let isMovingKey: boolean = false;     // 키보드 이동 이벤트
		let dragCompleted: boolean = false;
		let lastPosX: number = 0;
		let lastPosY: number = 0;
		let moveTimeout: number | null = null;
		let lastEvent: TPointerEventInfo<TPointerEvent>;
		let lastObjectLeft: number = object.left || 0;
		let lastObjectTop: number = object.top || 0;

		// 수정 상태 시각 효과 적용
		this.applyIsUpdatingVisualEffects(object, true);

		// 객체를 활성화
		canvas.setActiveObject(object);
		// 객체의 기본 설정
		object.set({
			selectable: true, // 객체 선택 가능
			evented: true, // 이벤트 활성화
		});
		object.set('stroke', 'blue'); // 외곽선 색상 변경
		object.set('strokeWidth', 4); // 외곽선 두께 설정
		canvas.renderAll();

		const resetObject = async (event: TPointerEventInfo<TPointerEvent>, isCancel?: boolean) => {
			if (!this.updatingObject) return;
			isDragging = false;
			isMovingKey = false;
			if (!event.scenePoint) {
				console.warn('Pointer event is not available.');
				return;
			}

			const currentLeft = Math.max(0, Math.min(canvas.width - (this.updatingObject.width || 0), this.updatingObject.left || 0));
			const currentTop = Math.max(0, Math.min(canvas.height - (this.updatingObject.height || 0), this.updatingObject.top || 0));

			// 같은 위치의 경우 리셋 플로우 제외
			if (this.updatingObject.left === lastObjectLeft && this.updatingObject.top === lastObjectTop && !isCancel) {
				return;
			}

			const result = await callback(currentLeft, currentTop);
			if (result.success || isCancel) {
				dragCompleted = true;
				this.updatingObject.set({
					selectable: false,
					evented: false,
				});
				// 수정 시각 효과 제거
				this.applyIsUpdatingVisualEffects(this.updatingObject, false);
				this.updatingObject = null;
				this.isDraggingObject = false;
				this.canvas.defaultCursor = 'default'; // 커서 복원
				this.canvas.setActiveObject(object); // 드래그 종료 후 객체 유지
				this.canvas.discardActiveObject(); // 선택 해제
				this.canvas.renderAll();
				window.removeEventListener("keydown", arrowKeyDown);
				window.removeEventListener("keyup", stopKeyMove);
				lastObjectLeft = currentLeft;
				lastObjectTop = currentTop;
			}
		};

		this.resetObject = resetObject;
		const arrowKeyDown = (event: KeyboardEvent) => {
			if (!object) return;
			if (isDragging) return;

			isMovingKey = true;

			let moveX: number = 0;
			let moveY: number = 0;
			const step: number = event.shiftKey ? 10 : 5; // shift + 방향키 시 더 빠르게 움직임

			switch (event.key) {
				case "ArrowUp":
					moveY = -step;
					break;
				case "ArrowDown":
					moveY = step;
					break;
				case "ArrowLeft":
					moveX = -step;
					break;
				case "ArrowRight":
					moveX = step;
					break;
				default:
					return;
			}

			event.preventDefault();

			const left = Math.max(0, Math.min(canvas.width - 5 - object.width!, (object.left || 0) + moveX))
			const top = Math.max(0, Math.min(canvas.height - 5 - object.height!, (object.top || 0) + moveY))

			object.set({
				left: left,
				top: top
			});

			object.setCoords();
			canvas.renderAll();

			lastEvent = {
				scenePoint: new Point(object.left || 0, object.top || 0),
				pointer: new Point(object.left || 0, object.top || 0),
				absolutePointer: new Point(object.left || 0, object.top || 0),
				viewportPoint: new Point(object.left || 0, object.top || 0),
				e: event as unknown as TPointerEvent,
			};

			if (moveTimeout !== null) {
				clearTimeout(moveTimeout);
			}

			moveTimeout = window.setTimeout(() => {
				resetObject(lastEvent);
			}, 1000);
		};

		const stopKeyMove = () => {
			isMovingKey = false;
		};

		// 드래그 및 위치 업데이트 이벤트 처리
		object.on('mousedown', (event: TPointerEventInfo<TPointerEvent>) => {
			if (this.isDraggingObject) {
				return;
			}

			if (isMovingKey) {
				isMovingKey = false;
				window.removeEventListener("keydown", arrowKeyDown);
				window.removeEventListener("keyup", stopKeyMove);
			}

			if (moveTimeout !== null) {
				clearTimeout(moveTimeout);
				moveTimeout = null;
			}

			isDragging = true;
			this.isDraggingObject = isDragging;
			const { x, y } = event.scenePoint

			dragCompleted = false;
			lastPosX = x;
			lastPosY = y;
			object.set('opacity', 0.5);
		});

		canvas.on('mouse:move', (event: TPointerEventInfo<TPointerEvent>) => {
			if (!isDragging || this.isUpdatingAngleOfView) return;
			const cameraObject = object.data as CameraType;
			const objectLabelText = cameraObject.service_type === 'mgist' ? `${cameraObject.camera_id}.${cameraObject.camera_name}` : cameraObject.camera_name;
			const triangle = canvas.getObjects().find(obj =>
				obj.type === 'path' &&
				obj.data &&
				'labelText' in obj.data &&
				obj.data.labelText === objectLabelText
			);

			const pointer = canvas.getScenePoint(event.e);

			const dx = pointer.x - lastPosX;
			const dy = pointer.y - lastPosY;

			const left = Math.max(0, Math.min(canvas.width - 5 - object.width!, (object.left || 0) + dx));
			const top = Math.max(0, Math.min(canvas.height - 5 - object.height!, (object.top || 0) + dy));
			object.set({
				left: left,
				top: top
			});

			if (triangle) {
				triangle.set({
					left: left + object.width! / 1.9,
					top: top + object.height! / 2.7
				});
				triangle.setCoords();
			}

			object.setCoords();
			canvas.renderAll();

			// 마지막 좌표 업데이트 (캔버스 내부 좌표 기준으로 저장)
			lastPosX = Math.max(0, Math.min(canvas.width, pointer.x));
			lastPosY = Math.max(0, Math.min(canvas.height, pointer.y));
		});


		window.addEventListener("keydown", arrowKeyDown);
		window.addEventListener("keyup", stopKeyMove);

		canvas.on('selection:updated', () => {
			const activeObject = canvas.getActiveObject();
			if (activeObject !== object) {
				if (!dragCompleted) {
					// 드래그 완료 전인 경우 시각 효과 유지
					canvas.setActiveObject(object);
					canvas.renderAll();
					console.log('Drag not completed, keeping visual effects');
				} else {
					// 드래그 완료된 경우 시각 효과 초기화
					object.set('stroke', '');
					object.set('strokeWidth', 0);
					object.set('opacity', 1);
					this.isDraggingObject = false;
					this.canvas.defaultCursor = 'default';
					canvas.renderAll();
				}
			}
		});
	}

	updateObjectSize({
		canvas,
		object,
		callback,
	}: {
		canvas: Canvas;
		object: CanvasObject;
		callback: (width: number, height: number, leftLocation: number, topLocation: number) => Promise<{ success: boolean }>;
	}) {
		if (!canvas || !object) {
			return;
		}
		this.canvas.defaultCursor = 'grabbing';
		// 수정 상태 시각 효과 적용
		this.applyIsUpdatingVisualEffects(object, true);
		canvas.setActiveObject(object);
		object.set({
			selectable: true,
			evented: true,
			hasControls: true,
			lockRotation: true,
		});

		object.setControlsVisibility({
			mtr: false, // 회전 핸들 삭제
		});

		object.set('stroke', 'blue');
		object.set('strokeWidth', 4);
		canvas.renderAll();

		let isScaling: boolean = false;

		object.on('scaling', () => {
			isScaling = true;
			object.setCoords();
			this.canvas.renderAll();
		});

		object.on('mouseup', async () => {
			if (!isScaling) return;

			// 최소 줄일 수 있는 크기 25px
			const width = Math.max(object.width! * object.scaleX!, 25);
			const height = Math.max(object.height! * object.scaleY!, 25);
			const leftLocation = object.left!;
			const topLocation = object.top!;

			object.set({
				scaleX: 0,
				scaleY: 0,
				width: width,
				height: height,
				selectable: false,
				hasControls: false,
			});

			const result = await callback(width, height, leftLocation, topLocation);

			if (result.success) {
				object.setCoords();
				object.set('opacity', 1);
				object.set('stroke', ''); // 외곽선 색상 제거
				object.set('strokeWidth', 0); // 외곽선 두께 제거
				this.canvas.defaultCursor = 'default'; // 커서 복원
				this.applyIsUpdatingVisualEffects(object, false); // 수정 상태 시각 효과 제거
				this.canvas.setActiveObject(object); // 드래그 종료 후 객체 유지
				this.canvas.discardActiveObject(); // 선택 해제
				this.canvas.renderAll();
			}
			isScaling = false;
		});

		// canvas.on('selection:cleared', () => {
		//   isScaling = false;

		//   object.set({
		//     selectable: false,
		//     hasControls: false,
		//   });

		//   this.canvas.renderAll();
		// });
	}

	// 카메라 화각 설정
	async applyRotationToTriangle(canvas: Canvas, object: CanvasObject, callback: (object: FabricObject, camera_angle: number) => Promise<{ success: boolean }>) {
		if (object instanceof Group) {
			const triangle = object.getObjects().find((obj) => obj.type === 'triangle') as Triangle;
			if (!triangle) {
				console.error('Triangle object not found in the group.');
				return;
			}
			const groupAngle = object.angle || 0; // 그룹의 현재 회전 각도
			const triangleInitialAngle = triangle.angle || 0; // 삼각형의 초기 회전 각도
			// 삼각형에 그룹의 회전 각도를 더함
			const finalAngle = triangleInitialAngle + groupAngle;
			const camera_angle = finalAngle % 360
			const res = await callback(object, camera_angle);
			if (res.success) {
				// 삼각형에 최종 각도 적용
				triangle.set({
					angle: camera_angle, // 각도는 0~360도로 제한
				});

				triangle.setCoords(); // 새로운 좌표 설정

				// 그룹의 회전 값 초기화
				object.set({
					angle: 0,
				});
				object.setCoords(); // 새로운 좌표 설정
				this.applyIsUpdatingVisualEffects(object, false); // 수정 상태 시각 효과 제거
				canvas.renderAll(); // 캔버스 갱신
			}
		}
	}
	// 그룹 회전 활성화
	enableUpdateCameraAngle(
		canvas: Canvas,
		object: CanvasObject,
		callback: (object: FabricObject, camera_angle: number) => Promise<{ success: boolean }>
	) {
		if (!(object instanceof Group)) {
			console.error('Object is not a Group');
			return;
		}
		const group = object as Group;
		const triangle = canvas.getObjects().find(
			(obj) =>
				obj.type === 'path' &&
				obj.data &&
				'labelText' in obj.data && (
					obj.data.labelText === ((group.data as CameraType)?.camera_id + '.' + (group.data as CameraType)?.camera_name) ||
					obj.data.labelText === ((group.data as CameraType)?.camera_name)
				)
		) as Triangle;
		if (!triangle) {
			console.error('triangle X');
			return;
		}
		this.isUpdatingAngleOfView = true;
		this.updatingObject = group;
		triangle.set({
			selectable: true,
			hasControls: true,
			lockMovementX: true,
			lockMovementY: true,
			lockScalingX: true,
			lockScalingY: true
		});

		// 라벨 숨기고 그룹 고정
		const label = group.getObjects().find((obj) => obj.type === 'text') as FabricText;
		if (label) label.set({ opacity: 0 });

		// 시각 효과
		this.applyIsUpdatingVisualEffects(group, true);

		// 삼각형만 활성화
		canvas.setActiveObject(triangle);

		// 수정 시 콜백 처리
		triangle.on('modified', () => {
			const angle = triangle.angle || 0;
			callback(group, angle);
			triangle.setCoords();
			if (label) label.set({ opacity: 1 });
			this.isUpdatingAngleOfView = false;
			this.updatingObject = null;
			this.applyIsUpdatingVisualEffects(group, false);
			canvas.renderAll();
		});

		canvas.renderAll();
	}

	removeTriangle(canvas: Canvas, labelText: string) {
		const triangle = canvas.getObjects().find(obj =>
			obj.type === 'path' &&
			obj.data &&
			'labelText' in obj.data &&
			obj.data.labelText === labelText
		);

		if (triangle) canvas.remove(triangle);
	}

	// 그룹 회전 비활성화
	disableUpdateCameraLocation(canvas: Canvas, object: Group) {
		if (object instanceof Group) {
			object.set({
				selectable: false,
				hasControls: false
			});
			// 이벤트 제거
			object.off();
			canvas.discardActiveObject();
			canvas.renderAll();
		}
	}

	// 시각 효과 적용 메서드
	applyIsUpdatingVisualEffects(object: FabricObject, isActive: boolean): void {
		if (isActive) {
			object.set({
				stroke: 'blue', // 외곽선 색상
				strokeWidth: 4, // 외곽선 두께
				opacity: 0.5, // 투명도
			});
		} else {
			object.set({
				stroke: '',
				strokeWidth: 0,
				opacity: 1,
			});
		}
		this.canvas.renderAll();
	}

	/**
	 * PIDS 울타리 생성
	 */
	/**
		* 외부에서 호출하여 PIDS 생성 시작
		*/

	startPIDSCreation(idx: number, label: string, callback: AddPIDSAPICallback) {
		this.isCreatingPIDS = true;
		this.canvas.defaultCursor = 'crosshair';
		this.newPIDS = {
			idx,
			label
		};
		this.addPIDSAPICallback = callback;
		return {
			success: true
		}
	}

	stopPIDSCreation() {
		this.isCreatingPIDS = false;
		this.pidsStartPoint = null;
		this.newPIDS = null;
	}

	/**
	 * 캔버스에서 마우스를 클릭하여 시작점과 종료점 지정
	 */
	async handleMouseClickForPIDS(event: TPointerEventInfo<TPointerEvent>) {
		const pointer = this.canvas.getScenePoint(event.e);

		if (!this.newPIDS) {
			return;
		}
		if (!this.pidsStartPoint) {
			// 시작점 설정
			this.pidsStartPoint = new Point(pointer.x, pointer.y);
			// 애니메이션 라인 초기화
			this.animationLine = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
				stroke: '#E9E7EF',
				strokeWidth: 2,
				selectable: false,
				hasControls: false,
			});
			this.canvas.add(this.animationLine);
		} else {
			// 종료점 설정 후 라인 생성
			const endPoint = new Point(pointer.x, pointer.y);
			const res = await this.createPIDSGroup(this.pidsStartPoint, endPoint);
			if (res === 'OK') {
				this.stopPIDSCreation();
				this.stopAnimation();
			}
		}
	}

	/**
	* 마우스 이동 이벤트 처리 - 애니메이션 라인 업데이트
	*/
	handleMouseMoveForPIDS(event: TPointerEventInfo<TPointerEvent>) {
		if (this.pidsStartPoint && this.animationLine) {
			const pointer = this.canvas.getScenePoint(event.e);
			this.animationLine.set({ x2: pointer.x, y2: pointer.y });
			this.canvas.renderAll();
		}
	}

	/**
	 * 애니메이션 종료 및 이벤트 제거
	 */
	stopAnimation() {
		this.canvas.defaultCursor = 'default';
		// 애니메이션 라인 제거
		if (this.animationLine) {
			this.canvas.remove(this.animationLine);
			this.animationLine = null;
		}
	}

	/**
	 * 시작점과 종료점을 잇는 라인과 라벨을 생성하여 그룹으로 추가
	 */
	async createPIDSGroup(startPoint: Point, endPoint: Point) {

		if (!this.newPIDS || !this.addPIDSAPICallback) {
			return;
		}
		return await this.addPIDSAPICallback({
			idx: this.newPIDS.idx,
			line_x1: startPoint.x,
			line_x2: endPoint.x,
			line_y1: startPoint.y,
			line_y2: endPoint.y
		});
	}

	/**
	* 이벤트 팝업 호출 함수
	*/
	showEventPopup({
		deviceType,
		deviceIdx,
		eventCameraId,
		pidsId,
		guardianliteIp,
		parkingAreaIdx,
		eventName,
		mainServiceName,
		vmsName,
		cameraId,
		mapType,
		topLocation,
		leftLocation,
		ipaddress,
		service_type,
	}: {
		deviceType: 'camera' | 'door' | 'ebell' | 'guardianlite' | 'pids' | 'parkingArea';
		deviceIdx: number | null;
		eventName: string;
		mainServiceName: ServiceType;
		vmsName: string;
		cameraId: string;
		ipaddress: string;
		mapType: 'indoor' | 'outdoor';
		eventCameraId?: string;
		pidsId?: string;
		guardianliteIp?: string;
		parkingAreaIdx?: number;
		topLocation: string;
		leftLocation: string;
		service_type?: string | '';
	}) {
		let findDevice;
		let deviceId;
		let icon_width;
		let icon_height;
		switch (deviceType) {
			case 'camera':
				findDevice = this.canvas.getObjects().filter((object: FabricObject) => object.data?.type === deviceType)
					.find((cameraObject: FabricObject) => {
						const data = cameraObject.data as CameraType;
						if (eventCameraId === `${data.main_service_name}:${data.vms_name}:${data.camera_id}`) {
							deviceId = eventCameraId;
							icon_width = cameraObject.width;
							icon_height = cameraObject.height;
							return (
								data
							);
						};
					});
				break;
			case 'ebell':
				findDevice = this.canvas.getObjects().filter((object: FabricObject) => object.data?.type === deviceType)
					.find((deviceObject: FabricObject) => {
						const data = deviceObject.data as ObDeviceType;
						if (deviceIdx === data.idx) {
							deviceId = deviceIdx;
							icon_width = deviceObject.width;
							icon_height = deviceObject.height;
							return (
								data
							);
						};
					});
				break;
			case 'door':
				findDevice = this.canvas.getObjects().filter((object: FabricObject) => object.data?.type === deviceType)
					.find((deviceObject: FabricObject) => {
						const data = deviceObject.data as ObDeviceType;
						if (deviceIdx === data.idx) {
							deviceId = deviceIdx;
							icon_width = deviceObject.width;
							icon_height = deviceObject.height;
							return (
								data
							);
						};
					});
				break;
			case 'pids':
				findDevice = this.canvas.getObjects().filter((object: FabricObject) => object.data?.type === deviceType)
					.find((PIDSObject: FabricObject) => {
						const data = PIDSObject.data as PIDS;
						if (pidsId === data.pids_id) {
							deviceId = pidsId;
							return (
								data
							);
						};
					});
				break;
			case 'guardianlite':
				findDevice = this.canvas.getObjects().filter((object: FabricObject) => object.data?.type === deviceType)
					.find((guardianliteObject: FabricObject) => {
						const data = guardianliteObject.data as ObGuardianliteType;
						if (guardianliteIp === data.guardianlite_ip) {
							deviceId = guardianliteIp;
							icon_width = guardianliteObject.width;
							icon_height = guardianliteObject.height;
							return (
								data
							);
						};
					});
				break;
			case 'parkingArea':
				findDevice = this.canvas.getObjects().filter((object: FabricObject) => object.data?.type === deviceType)
					.find((parkingAreaObject: FabricObject) => {
						const data = parkingAreaObject.data as ParkingArea;
						if (parkingAreaIdx === data.idx) {
							deviceId = parkingAreaIdx;
							icon_width = parkingAreaObject.width;
							icon_height = parkingAreaObject.height;
							return (
								data
							);
						};
					});
				break;
			default:
				throw new Error(`unKnown Canvas Device Object type: ${deviceType}`);
		}
		if (findDevice == null || deviceId == null || topLocation == null || leftLocation == null) {
			return {
				success: false,
				message: '이벤트 팝업이 발생한 장비를 캔버스에서 찾지 못했습니다.'
			};
		};
		this.showDeviceEventPopup = {
			deviceId,
			topLocation,
			leftLocation
		};

		if (this.setDeviceEventPopup) {
			const deviceData = findDevice.data as ObDeviceType | CameraType | PIDS | ParkingArea | ObGuardianliteType;

			this.setDeviceEventPopup({
				show: true,
				canvas_height: this.canvas.height,
				canvas_width: this.canvas.width,
				icon_height: icon_height! as number,
				icon_width: icon_width! as number,
				ip: ipaddress,
				top_location: topLocation,
				left_location: leftLocation,
				name: eventName,
				type: deviceType,
				camera_id: cameraId,
				idx: deviceIdx,
				main_service_name: mainServiceName,
				map_type: mapType,
				on_event: true,
				vms_name: vmsName,
				service_type: service_type,
				access_point: '',
				device_name: deviceData as ObDeviceType ? (deviceData as ObDeviceType).device_name : deviceData as ParkingArea ? (deviceData as ParkingArea).area_name : deviceData as ObGuardianliteType ? (deviceData as ObGuardianliteType).guardianlite_name : deviceData as CameraType ? (deviceData as CameraType).camera_name : '',
			});
		}
		return {
			success: true,
			data: findDevice
		};
	};

	handleCloseShowDeviceEventPopup() {
		if (this.showDeviceEventPopup != null) {
			this.showDeviceEventPopup = null;
		}
	};

	handleDoorPopup(accessCtlLog: AccessCtlLog) {
		if (!this.setDevicePopup) {
			return;
		}
		const zoom = this.canvas.getZoom();
		if (zoom !== 1) {
			this.canvas.viewportTransform = [1, 0, 0, 1, 0, 0]; // 초기 상태로 리셋
			this.canvas.setZoom(1);
		};
		const deviceObject = this.canvas.getObjects().find((object) => {
			return object.data?.type === 'door' &&
				(object.data as ObDeviceType).device_id === `${accessCtlLog.LogDoorID}`;
		});

		if (!deviceObject) {
			return;
		};
		const deviceData = deviceObject.data as ObDeviceType;
		if (!deviceData || accessCtlLog == null || accessCtlLog.LogDateTime == null || accessCtlLog.LogPersonLastName == null) {
			return;
		}

		if (!deviceData.top_location || !deviceData.left_location) {
			// 위치 이동 클릭 이벤트 무시
			return;
		}

		if (this.showDeviceEventPopup != null &&
			this.showDeviceEventPopup.deviceId === deviceData.idx &&
			this.showDeviceEventPopup.leftLocation === deviceData.left_location &&
			this.showDeviceEventPopup.topLocation === deviceData.top_location) {
			return;
		};

		const main_service_name = deviceData.camera_id?.split(':')[0];
		const vms_name = deviceData.camera_id?.split(':')[1];
		const camera_id = deviceData.camera_id?.split(':')[2];
		removeActiveFromElement();
		addActiveToDevicePopup();
		this.setDevicePopup({
			show: true,
			idx: deviceData.idx,
			main_service_name: main_service_name! as ("" | ServiceType),
			vms_name,
			camera_id,
			ip: deviceData.device_ip,
			device_id: accessCtlLog.LogPersonLastName,
			name: deviceData.device_name,
			on_event: false,
			top_location: deviceData.top_location,
			left_location: deviceData.left_location,
			icon_width: deviceObject.width,
			icon_height: deviceObject.height,
			canvas_width: this.canvas.width,
			canvas_height: this.canvas.height,
			type: 'door',
			service_type: vms_name ? 'mgist' : 'independent',
			startDateTime: accessCtlLog.LogDateTime,
			timeout: 1000 * 1 * 20, // 20초
		});
		this.showDevicePopup = true;
		return deviceData.idx;
	}

}

function removeActiveFromElement() {
	const activeElement = document.querySelectorAll('.active');
	if (!activeElement) {
		return;
	}
	activeElement.forEach(function (userItem) {
		userItem.classList.remove('active');
	});
}

function addActiveToDevicePopup() {
	const popup = document.querySelector('#device-popup') as HTMLDivElement;
	if (popup) {
		popup.classList.add('active');
	}
	const leadLine1 = document.querySelector('leadLine1') as HTMLDivElement;
	const leadLine2 = document.querySelector('leadLine2') as HTMLDivElement;
	if (popup) {
		popup.classList.add('active');
	}
	if (leadLine1) {
		leadLine1.classList.add('active');
	}
	if (leadLine2) {
		leadLine1.classList.add('active');
	}
}

function addActiveToGuardianlitePopup() {
	const popup = document.querySelector('#guardianlite-popup') as HTMLDivElement;
	if (popup) {
		popup.classList.add('active');
	}
	const leadLine1 = document.querySelector('leadLine1') as HTMLDivElement;
	const leadLine2 = document.querySelector('leadLine2') as HTMLDivElement;
	if (popup) {
		popup.classList.add('active');
	}
	if (leadLine1) {
		leadLine1.classList.add('active');
	}
	if (leadLine2) {
		leadLine1.classList.add('active');
	}
};


export default CanvasImpl;

