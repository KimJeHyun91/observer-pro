const logger = require('../utils/logger');

class SocketService {
    constructor() {
        this.io = null;
    }

    /**
     * 서버 시작 시 io 인스턴스 주입 (src/index.js에서 호출)
     */
    init(io) {
        this.io = io;
        this.io.on('connection', (socket) => {
            logger.info(`[SocketService] 클라이언트 접속: ${socket.id}`);

            
            socket.on('ping', (data) => {
                logger.info(`📩 [Socket] Ping 수신: ${JSON.stringify(data)}`);
                
                // 클라이언트에게 'pong' 이벤트 전송
                socket.emit('pong', { 
                    message: 'pong', 
                    serverTime: new Date().toISOString(),
                    received: data 
                });
            });
            // 필요한 이벤트 리스너 등록
            socket.on('disconnect', () => {
                logger.info(`[SocketService] 클라이언트 접속 해제: ${socket.id}`);
            });
        });
    }

    /**
     * [이벤트] 차량 감지 (루프)
     */
    emitVehicleDetection(data) {
        if (!this.io) return;
        // data: { location, status, time }
        this.io.emit('vehicle_detection', data);
        logger.debug(`[Socket] 차량 감지 알림: ${data.location}`);
    }

    /**
     * [이벤트] 차량 입차 (LPR 인식 후)
     */
    emitVehicleEntry(data) {
        if (!this.io) return;
        // data: { siteId, laneId, carNumber, type, time, image }
        this.io.emit('vehicle_entry', data);
        logger.info(`[Socket] 입차 알림 전송: ${data.carNumber}`);
    }

    /**
     * [이벤트] 차량 출차 및 정산
     */
    emitVehicleExit(data) {
        if (!this.io) return;
        this.io.emit('vehicle_exit', data);
    }

    /**
     * [이벤트] 장비 상태 변경
     */
    emitDeviceStatus(data) {
        if (!this.io) return;
        this.io.emit('device_status', data);
    }
}

module.exports = new SocketService();