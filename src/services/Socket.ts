import { io, Socket } from 'socket.io-client';
import { ArchiveStreamResImpl, CameraStreamResImpl, SocketEventMap, GateControlResponse } from '@/@types/socket';

const SOCKET_URL = `http://${window.location.hostname}:4200`;

export type LiveStreamResponseType = (data: SocketEventMap['ob_cameraStream']) => void;

export interface ServerToClientEvents {
	connect: () => void;
	disconnect: () => void;
	connect_error: (error: Error) => void;

	'fl_areaList-update': (data: SocketEventMap['fl_areaList-update']) => void;
	'fl_cameras-update': (data: SocketEventMap['fl_cameras-update']) => void;
	'fl_vms-update': (data: SocketEventMap['fl_vms-update']) => void;
	'fl_waterlevels-update': (data: SocketEventMap['fl_waterlevels-update']) => void;
	'fl_water_level_log-update': (data: SocketEventMap['fl_water_level_log-update']) => void;
	'fl_crossingGates-update': (data: SocketEventMap['fl_crossingGates-update']) => void;
	'fl_billboards-update': (data: SocketEventMap['fl_billboards-update']) => void;
	'fl_signboards-update': (data: SocketEventMap['fl_signboards-update']) => void;
	'fl_cameras-batch-update': (data: SocketEventMap['fl_cameras-batch-update']) => void;
	'fl_speakers-update': (data: SocketEventMap['fl_speakers-update']) => void;
	'fl_guardianlites-update': (data: SocketEventMap['fl_guardianlites-update']) => void;
	'fl_eventThreshold-update': (data: SocketEventMap['fl_eventThreshold-update']) => void;
	'fl_events-update': (data: SocketEventMap['fl_events-update']) => void;
	'fl_waterLevelAutoControlResult-update': (data: SocketEventMap['fl_waterLevelAutoControlResult-update']) => void;
	'ob_ebells-update': (data: SocketEventMap['ob_ebells-update']) => void;
	'ob_doors-update': (data: SocketEventMap['ob_doors-update']) => void;
	'ob_acu-update': (data: SocketEventMap['ob_acu-update']) => void;
	'ob_guardianlites-update': (data: SocketEventMap['ob_guardianlites-update']) => void;
	'ob_pids-update': (data: SocketEventMap['ob_pids-update']) => void;
	'ob_vehicles-update': (data: SocketEventMap['ob_vehicles-update']) => void;
	'ob_buildings-update': (data: SocketEventMap['ob_buildings-update']) => void;
	'ob_mdets-update': (data: SocketEventMap['ob_mdets-update']) => void;
	'pm_area-update': (data: SocketEventMap['pm_area-update']) => void;
	'pm_event-update': (data: SocketEventMap['pm_event-update']) => void;
	'pm_buildings-update': (data: SocketEventMap['pm_buildings-update']) => void;
	'ob_floors-update': (data: SocketEventMap['ob_floors-update']) => void;
	'ob_cameras-update': (data: SocketEventMap['ob_cameras-update']) => void;
	'pm_cameras-update': (data: SocketEventMap['pm_cameras-update']) => void;
	'tm_cameras-update': (data: SocketEventMap['tm_cameras-update']) => void;
	'vb_areaList-update': (data: SocketEventMap['vb_areaList-update']) => void;
	'vb_speaker-update': (data: SocketEventMap['vb_speaker-update']) => void;
	'vb_reserve-update': (data: SocketEventMap['vb_reserve-update']) => void;
	'vb_broadcast-update': (data: SocketEventMap['vb_broadcast-update']) => void;
	'vb_reserve_broadcast-update': (data: SocketEventMap['vb_reserve_broadcast-update']) => void;
	'vb_event-update': (data: SocketEventMap['vb_event-update']) => void;
	'fl_nearby_alert': (data: SocketEventMap['fl_nearby_alert']) => void;
	'tm_event-update': (data: SocketEventMap['tm_event-update']) => void;
	'tm_areaList-update': (data: SocketEventMap['tm_areaList-update']) => void;
	'tm_waterGauges-update': (data: SocketEventMap['tm_waterGauges-update']) => void;
	'tm_waterLevel-update': (data: SocketEventMap['tm_waterLevel-update']) => void;
	'tm_billboard-update': (data: SocketEventMap['tm_billboard-update']) => void;

	'prm_notification-update' : (data: SocketEventMap['prm_notification-update']) => void;

	'cameraStream': (data: CameraStreamResImpl) => void;
	'archiveStream': (data: ArchiveStreamResImpl) => void;
	'ob_cameraStream': LiveStreamResponseType;
	'ob_archiveStream': (data: SocketEventMap['ob_archiveStream']) => void;
	'ob_archiveStreamSOP': (data: SocketEventMap['ob_archiveStream']) => void;
	'ob_cameraStreamErr': (data: SocketEventMap['ob_cameraStreamErr']) => void;
	'ob_archiveStreamErr': (data: SocketEventMap['ob_archiveStreamErr']) => void;
	'ob_archiveStreamSOPErr': (data: SocketEventMap['ob_archiveStreamErr']) => void;
	'ob_cameraStreamEvent': (data: SocketEventMap['ob_cameraStreamEvent']) => void;
	'ob_cameraStreamEventErr': (data: SocketEventMap['ob_cameraStreamEventErr']) => void;
	'pm_cameraStream': LiveStreamResponseType;
	'pm_archiveStream': (data: SocketEventMap['ob_archiveStream']) => void;
	'pm_cameraStreamErr': (data: SocketEventMap['ob_cameraStreamErr']) => void;
	'pm_archiveStreamErr': (data: SocketEventMap['ob_archiveStreamErr']) => void;
	'fl_cameraStream': LiveStreamResponseType;
	'fl_archiveStream': (data: SocketEventMap['ob_archiveStream']) => void;
	'fl_cameraStreamErr': (data: SocketEventMap['ob_cameraStreamErr']) => void;
	'fl_archiveStreamErr': (data: SocketEventMap['ob_archiveStreamErr']) => void;
	'vm_cameraStream': LiveStreamResponseType;
	'vm_archiveStream': (data: SocketEventMap['ob_archiveStream']) => void;
	'vm_cameraStreamErr': (data: SocketEventMap['ob_cameraStreamErr']) => void;
	'vm_archiveStreamErr': (data: SocketEventMap['ob_archiveStreamErr']) => void;
	'tm_cameraStream': LiveStreamResponseType;
	'tm_archiveStream': (data: SocketEventMap['ob_archiveStream']) => void;
	'tm_cameraStreamErr': (data: SocketEventMap['ob_cameraStreamErr']) => void;
	'tm_archiveStreamErr': (data: SocketEventMap['ob_archiveStreamErr']) => void;
	'vb_cameraStream': LiveStreamResponseType;
	'vb_archiveStream': (data: SocketEventMap['ob_archiveStream']) => void;
	'vb_cameraStreamErr': (data: SocketEventMap['ob_cameraStreamErr']) => void;
	'vb_archiveStreamErr': (data: SocketEventMap['ob_archiveStreamErr']) => void;

	'ob_accessCtlLog': (data: SocketEventMap['ob_accessCtlLog']) => void;

	// 'manageGate': (data: { status: string; message: string }) => void;
	'manageGate': (data: { ipaddress: string; cmd: string; id: string; controllerModel: string; }) => void;

	'setGate': (data: GateControlResponse) => void;

	'manageWaterLevel': (data: { status: string; message: string }) => void;
	'setWaterLevel': (data: { status: string; message: string }) => void;

	'greenParkingManageGate': (data: { status: string; message: string }) => void;
	'greenParkingSetGate': (data: GateControlResponse) => void;

	'manageBillboard': (data: { status: string; message: string }) => void;

	'requestAllBarrierStatuses': (data: { status: string; message: string }) => void;
	'barrierStatusUpdate': (data: { ip: string; statusText: string; timestamp: string; }) => void

	'ob_events-update': (data: SocketEventMap['ob_events-update']) => void;
	'pm_events-update': (data: SocketEventMap['ob_events-update']) => void;
	'ob_event_types-update': (data: SocketEventMap['ob_event_types-update']) => void;
	'cm_event_log-update': (data: SocketEventMap['cm_event_log-update']) => void;
	'cm_warningBoard-update': (data: SocketEventMap['cm_warningBoard-update']) => void;
	'cm_sop-update': (data: SocketEventMap['cm_sop-update']) => void;
	'cm_sop_stage-update': (data: SocketEventMap['cm_sop_stage-update']) => void;
	'cm_sop_falseAlarm-update': (data: SocketEventMap['cm_sop_falseAlarm-update']) => void;

	'ob_events-SOP': (data: SocketEventMap['ob_events-SOP']) => void;

	'cm_settings-update': (data: { settingName: string }) => void;
	'ob_anpr-vehicleNumber': (data: SocketEventMap['ob_anpr_vehicleNumber']) => void;
	'ob_accessCtl_sms-fail': (data: SocketEventMap['ob_accessCtl_sms-fail']) => void;
	'pf_parkings-update': (data: SocketEventMap['pf_parkings-update']) => void;
	'pf_lpr-update': (data: SocketEventMap['pf_lpr-update']) => void;
	'pf_gate_state-update': (data: SocketEventMap['pf_gate_state-update']) => void;
	'pf_fee_calculation_result-update': (data: SocketEventMap['pf_fee_calculation_result-update']) => void;	
}

interface ClientToServerEventsData {
	cameraStream: (data: { cameraId: string; cmd: "on" | "off" }) => void;
	archiveStream: (data: { cameraId: string; cmd: "on" | "off"; startDateTime: string }) => void;
	archiveStreamSOP: (data: { cameraId: string; cmd: "on" | "off"; startDateTime: string }) => void;
	stopCameraStreamEvent: (data: { cameraId: string; }) => void;
	stopArchiveStreamSOPEvent: (data: { cameraId: string; startDateTime: string; }) => void;
	manageGate: (data: { ipaddress: string; cmd: string; id: string; controllerModel: string; }) => void;
	setGate: (data: {
		ipaddress?: string;
		cmd: string;
		outside_idx?: number;
		type?: 'single' | 'all' | 'group'
		id: string
	}) => void;
	manageWaterLevel: (data: { ipaddress: string; port: string; cmd: string; id: string; ground_value?: string; }) => void;
	greenParkingManageGate: (data: { ipaddress: string; cmd: string; id: string; }) => void;
	greenParkingSetGate: (data: {
		ipaddress?: string;
		cmd: string;
		outside_idx?: number;
		type?: 'single' | 'all' | 'group'
		id: string
	}) => void;
	manageBillboard: (data: { ipaddress: string; cmd: string, id: string }) => void;
	requestAllBarrierStatuses: () => void;
	barrierStatusUpdate: (data: { ip: string; statusText: string; timestamp: string }) => void;
}

class SocketService {
	private static instance: SocketService;
	private socket: Socket<ServerToClientEvents, ClientToServerEventsData>;
	private initialized: boolean = false;

	private constructor() {
		const socketOptions = {
			transports: ['websocket', 'polling'],
			reconnection: true,
			reconnectionAttempts: Infinity,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			timeout: 20000,
			forceNew: true,
			autoConnect: false,
			path: '/socket.io',
			rejectUnauthorized: false
		};

		this.socket = io(SOCKET_URL, socketOptions);
		this.setupListeners();
	}

	static getInstance(): SocketService {
		if (!this.instance) {
			this.instance = new SocketService();
		}
		return this.instance;
	}

	public async initialize(): Promise<void> {
		if (!this.initialized && !this.socket.connected) {
			this.initialized = true;
			console.log('Socket initialization started');
			return new Promise((resolve, reject) => {
				this.socket.on('connect', () => {
					console.log('Socket connected:', this.socket.id);
					resolve();
				});
				this.socket.on('connect_error', (error) => {
					console.error('Socket connection error:', error);
					this.initialized = false;
					reject(error);
				});
				this.socket.connect();
			});
		}
	}

	private setupListeners(): void {
		this.socket.on('connect', () => {
			console.log('Socket connected:', this.socket.id);
		});

		this.socket.on('disconnect', (reason) => {
			console.log('Socket disconnected:', reason);
		});

		this.socket.on('connect_error', (error) => {
			console.error('Socket connection error:', error.message);
		});

		this.socket.on('reconnect_attempt', (attemptNumber: number) => {
			console.log('Reconnect to attempt:', attemptNumber);
		});

		this.socket.io.on("error", (error) => {
			console.error('Transport error:', error);
		});
	}

	public subscribe<K extends keyof ServerToClientEvents>(
		event: K,
		callback: (data: Parameters<ServerToClientEvents[K]>[0]) => void
	): () => void {
		this.socket.on(event as any, callback as any);
		return () => this.socket.off(event as any, callback as any);
	}

	public onRequest<T extends keyof ClientToServerEventsData>(
		event: T,
		data: Parameters<ClientToServerEventsData[T]>[0]
	): void {
		if (!this.socket || !this.isConnected()) {
			console.error(`소켓이 연결되지 않았습니다. 상태:`, {
				socketExists: !!this.socket,
				connected: this.socket?.connected,
				id: this.socket?.id
			});
			throw new Error('소켓이 연결되지 않았습니다.');
		}

		this.socket.emit(event, data);
	}

	public onConnect(callback: () => void): void {
		this.socket.on('connect', callback);
	}

	public onDisconnect(callback: () => void): void {
		this.socket.on('disconnect', callback);
	}

	public isConnected(): boolean {
		return this.socket.connected;
	}

	// public emit(event: string, data: any): void {
	// 	if (!this.socket || !this.isConnected()) {
	// 		return;
	// 	}
	// 	this.socket.emit(event, data);
	// }
	
	public disconnect(): void {
		if (this.initialized && this.socket.connected) {
			this.initialized = false;
			this.socket.disconnect();
		}
	}

	public reconnect(): void {
		this.initialized = false;
		this.initialize();
	}
}

export default SocketService;
