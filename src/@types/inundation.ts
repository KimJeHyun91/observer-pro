import { DeviceBase } from "./socket";

export interface LocationInfo {
	leftLocation?: string;
	topLocation?: string;
}

export interface WaterlevelGaugeInformation extends LocationInfo {
	water_level_idx: number;
	water_level_name: string;
	water_level_location: string;
	water_level_ip: string;
	water_level_port: string;
	water_level_id: string;
	water_level_pw: string;
	waterlevelIdx: number;
}


export interface Waterlevel extends DeviceBase, WaterlevelGaugeInformation {
	idx: number;
	water_level_left_location: string;
	water_level_use_status: boolean;
	linked_status: any;
	outside_name: string;
	threshold?: string;
	curr_water_level?: string;
	ground_value?: number;
	use_status: boolean;
	waterlevelStatus: boolean;
	outside_idx: number;
	water_level_linked_status: boolean;
	water_level_model: string;
	water_level_uid: string;
}

export type AddWaterlevelRequest = Pick<Waterlevel,
	'water_level_name' | 'water_level_location' | 'water_level_ip' | 'water_level_uid' |
	'water_level_port' | 'water_level_id' | 'water_level_pw' | 'water_level_model'> & {
		ground_value?: number;
	};

export type ModifyWaterlevelRequest = Pick<Waterlevel,
	'water_level_name' | 'water_level_location' | 'water_level_id' | 'water_level_pw' | 'water_level_uid'> & {
		water_level_idx: number;
		prevWaterlevelIpaddress: string;
		prevWaterlevelPort: string;
		newWaterlevelIpaddress: string;
		newWaterlevelPort: string;
		ground_value?: number;
	};

export type WaterlevelRequest = {
	waterlevelIdx: number;
	crossingGateIds: number[];
	autoControlEnabled?: boolean;
};

export interface AreaInformation {
	temper: any;
	controller_model: any;
	ch1: string;
	ch2: string;
	ch3: string;
	ch4: string;
	ch5: string;
	ch6: any;
	ch7: any;
	ch8: any;
	camera_name: string;
	camera_id: string;
	vms_name: string;
	speaker_ip: any;
	outside_linked_status: boolean;
	outside_idx: number;
	outside_name: string;
	outside_location: string;
	outside_top_location: string;
	outside_left_location: string;
	crossing_gate_status: boolean;
	crossing_gate_ip: string;
	billboard_ip: string;
	guardianlite_ip: string;
	linked_status: boolean;
	camera_linked_status: boolean;
	billboard_linked_status: boolean;
	speaker_linked_status: boolean;
	guardianlite_linked_status: boolean;
	water_level_linked_status: boolean;
	water_level_name: string;
	water_level_location: string;
	type: string;
	vms_ip: string;
	camera_ip?: string;
	service_type: string;
	speaker_id: string;
	speaker_password: string;
	billboard_controller_model: string;
	speaker_type?: string;
	signboard_ip: string;
	signboard_port: string;
	signboard_controller_model: string;
}

export interface AreaFormInput {
	areaGuardianlite: string;
	areaName: string;
	areaLocation: string;
	areaCamera: string;
	areaCrossingGate: string;
	areaSpeaker: string;
	areaSpeakerPort: string;
	areaBillboard: string;
	areaBillboardPort: string;
	areaSignboard: string,
	areaSignboardPort: string,
	areaWaterlevelGauge: number | null;
	leftLocation: string;
	topLocation: string;
	serviceType: string;
	idx?: string;
	markerId?: string;
	camera_ip?: string;
	id: string;
	controllerModel?: string;
	billboardControllerModel?: string;
	signboardControllerModel?: string;
	speakerType?: string;
}

export interface AreaModifyFormInput {
	vms_name: any;
	areaCamera: string | undefined;
	service_type: string
	billboard_ip: string;
	billboard_port: string;
	camera_ip: string;
	crossing_gate_ip: string;
	guardianlite_ip: string;
	outside_idx: number;
	outside_location: string;
	outside_name: string;
	speaker_ip: string;
	speaker_port: string;
	water_level_idx: number;
	id: string;
	controllerModel?: string;
	controller_model: string;
	billboard_controller_model: string;
	signboard_ip: string;
	signboard_port: string;
	signboard_controller_model: string;
	speaker_id?: string;
	speaker_password?: string;
	speaker_type?: string;
}

export interface DeviceState {
	linked_status: boolean;
	deviceIdx: number;
	device_idx: number;
	name: string;
	location: string;
	ipaddress: string;
	device_type: string;
}


export interface PtzControlState {
	cameraId: string;
	vmsName: string;
	mainServiceName: string;
	direction: "up" | "down" | "left" | "right" | "zoomin" | "zoomout" | "focusin" | "focusout" | "stop";
	mode: "continuous";
	eventType: "mousedown" | "mouseup";
}

export interface WaterlevelLinkInfo {
	areaCamera?: string | undefined;
	selectedWaterlevel: number | null;
	leftLocation: string;
	topLocation: string;
}

export interface MenuState {
	isOpen: boolean;
	position: { x: number; y: number; } | null;
	type: 'context' | 'marker' | null;
	markerId?: string;
	camera_ip?: string;
	areaBillboard?: string;
}

export interface CameraRequestParams {
	mainServiceName: string;
}

export interface CameraInfo {
	vmsIp: string;
	camId: string;
}

export interface UpdatePositionParams {
	idx: string;
	topLocation: string;
	leftLocation: string;
}

export interface SelectedObject extends AreaInformation {
  speaker_password: any;
  speaker_id: any;
	id: string | number;
	type: string;
	name?: string;
	location: string;
	position: [number, number];
}

export interface DetailAreaProps {
	data: AreaInformation;
	onObjectSelect: (area: SelectedObject) => void;
}

export interface BillboardMacro {
billboardMessageIdx: number;
billboardMessage: string;
billboardMessageColor: string;
billboardMessageIp?: string;
billboard_msg: string;
billboard_color: string;
billboard_idx: number;
billboard_ip?: string;
}
// export interface BillboardMacro {
// 	billboardMessage?: string;
// 	billboardMessageIdx?: number;
// 	billboardMessageMsg?: string;
// 	billboardMessageColor?: string;
// 	billboard_idx?: number;
// 	billboard_msg?: string;
// 	billboard_color?: string;
// }
export interface BillboardMessageList {
	billboard_idx?: number;
	billboard_msg?: string;
	billboard_color?: string;
}

export interface MessageOption {
	value: string;
	label: string;
	id: number;
}

export interface BillboardOption extends MessageOption {
	color: string;
}

export interface SpeakerMessage {
	speaker_idx: number;
	speaker_msg: string;
}

export interface SpeakerOption extends MessageOption { }

export interface DialogState {
	isOpen: boolean;
	type: 'alert' | 'confirm';
	title: string;
	message: string;
	onConfirm?: () => void;
	onCancel?: () => void;
}

export interface MapDialogState {
	onCancel: () => void;
	isOpen: boolean;
	type: 'alert' | 'confirm';
	title: string;
	message: string;
	onConfirm?: () => void;
}

export interface ConnectionStatusProps {
	waterlevel: boolean;
	isConnected: boolean;
}

export interface GuardianliteChannelProps {
	data: {
		outside_idx?: number;
		outside_name?: string;
		outside_location?: string;
		guardianlite_ip?: string;
		// ch1?: 'on' | 'off';
		// ch2?: 'on' | 'off';
		// ch3?: 'on' | 'off';
		// ch4?: 'on' | 'off';
		// ch5?: 'on' | 'off';
		ch1?: string;
		ch2?: string;
		ch3?: string;
		ch4?: string;
		ch5?: string;
		ch1Label?: string;
		ch2Label?: string;
		ch3Label?: string;
		ch4Label?: string;
		ch5Label?: string;
	};
	onChannelControl: (channel: string, status: 'on' | 'off') => void;
	onLabelChange: (labels: Record<string, string>) => void;
}

export interface DeviceControlInformation {
	billboard_idx?: number;
	billboard_msg?: string;
	billboard_color: any;
	billboard_ip: string;
	speaker_idx: number;
	speaker_msg: string;
	outside_idx: number;
	crossing_gate_ip: string;
	cmd: string;
}

export interface BaseDeviceControl {
	outside_idx: number;
	cmd: 'open' | 'close';
}

export interface Billboard {
	billboard_ip: string;
	billboard_idx: number;
	outside_idx: number;
}

export interface UpdateSingleBillboardRequest {
	billboard_ip: string;
	billboard_msg: string;
	billboard_color: string;
	id: string;
	billboard_controller_model: string;
}

export interface UpdateBillboardRequest {
	billboard_msg: string;
	billboard_color: string;
	id: string;
}

export interface UpdateGreenParkingBillboardRequest {
	billboard_msg: string;
	id: string;
	billboard_ip: string; 
	billboard_controller_model: string;
}

export interface Speaker {
	speaker_ip: string;
	speaker_idx: number;
	outside_idx: number;
}

export interface SpeakerControl extends BaseDeviceControl {
	speaker_msg: string;
	speaker_idx: number;
	speaker_ip: string;
}

export interface UpdateSingleSpeakerRequest {
	speaker_msg: string;
	speaker_ip: string;
}

export interface UpdateSpeakerRequest {
	speaker_msg: string;
}

export interface CrossingGate {
	crossing_gate_ip: string;
	crossing_gate_idx: number;
	outside_idx: number;
}

export interface CrossingGateControl extends BaseDeviceControl {
	crossing_gate_ip: string;
	outside_idx: number;
	cmd: 'open' | 'close';
}

export interface ControlCrossingGateRequest {
	outside_idx: number;
	crossing_gate_ip: string;
	cmd: 'open' | 'close';
}

export interface ControlAllCrossingGateRequest {
	cmd: 'open' | 'close';
}

export interface SpeakerResult {
	ip: string;
	type: 'broadcast' | 'click';
	error?: string;
	message?: string;
	clipId?: string;
	timestamp: string;
}

export interface BroadcastResponse {
	success: boolean;
	message: string;
	error?: string;
	result: {
		total: number;
		successCount: number;
		failCount: number;
		successList: SpeakerResult[];
		failList: SpeakerResult[];
	};
}

export interface SpeakerResponse {
	success: boolean;
	message: string;
	error?: string;
	clipId?: string;
	result?: {
		data?: any;
		clipId?: string;
		success?: boolean;
		message?: string;
	};
}

export interface GroupData {
	id: number;
	name: string;
	areas: []
}

export interface WaterLevelAutoControlResult {
  type: 'waterLevelAutoControl';
  waterLevelIP: string;
  currentWaterLevel: number;
  threshold: number;
  timestamp: string;
  results: GateControlResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

export interface GateControlResult {
  gateName: string;
  location: string;
  ip: string;
  success: boolean;
  error?: string;
  timestamp: string;
}