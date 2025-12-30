import SocketService from '../../../services/Socket';

interface SetGateRequest {
    ipaddress?: string;
    ipaddresses?: string[];
    cmd: string;
    outside_idx?: number;
    type?: 'single' | 'all' | 'group';
    id: string;
}

interface GateControlResponse {
    status: 'success' | 'partial' | 'error';
    message: string;
    errorList?: Array<{
        ipaddress: string;
        message: string;
    }>;
    successList?: string[];
    cmd?: string;
    type?: 'all' | 'single' | 'group';
    ipaddress?: string;
    ipaddresses?: string[];
}

interface ControlDeviceCrossingGateProps {
    crossing_gate_ip?: string;
    crossing_gate_ips?: string[];
    cmd: string;
    outside_idx?: number;
    type: 'single' | 'all' | 'group';
    id: string;
    controllerModel: string;
}

export async function ControlDeviceCrossingGate({
    crossing_gate_ip,
    crossing_gate_ips,
    cmd,
    outside_idx,
    type = 'single',
    id,
    controllerModel
}: ControlDeviceCrossingGateProps): Promise<GateControlResponse> {
    const socketService = SocketService.getInstance();

    try {
        await socketService.initialize();
    } catch (error) {
        console.error('SocketService 초기화 실패:', error);
        throw new Error('소켓 연결에 실패했습니다.');
    }

    const requestData: SetGateRequest = type === 'all'
        ? { type: 'all', cmd, id }
        : type === 'group'
            ? { type: 'group', cmd, ipaddresses: crossing_gate_ips, id }
            : { type: 'single', ipaddress: crossing_gate_ip, cmd, outside_idx, id };

    return new Promise((resolve, reject) => {
        let responseTimeout: NodeJS.Timeout;

        const unsubscribe = socketService.subscribe(controllerModel === '그린파킹' ? 'greenParkingSetGate' : 'setGate', (response: GateControlResponse) => {
            if (response.type === type && response.cmd === cmd) {
                clearTimeout(responseTimeout);
                unsubscribe();
                resolve(response);
            }
        });

        socketService.onRequest(controllerModel === '그린파킹' ? 'greenParkingSetGate' : 'setGate', requestData);

        responseTimeout = setTimeout(() => {
            unsubscribe();
            console.error('차단기 제어 응답 시간 초과:', { type, cmd, crossing_gate_ips });
            reject(new Error('차단기 제어 응답 시간 초과'));
        }, 60000);
    });
}