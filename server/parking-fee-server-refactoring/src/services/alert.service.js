const logger = require('../../../logger');

class AlertService {
    constructor() {
        // 알림 타입 정의 (Critical Alerts)
        this.Types = {
            BLACKLIST_DETECTED: 'BLACKLIST_DETECTED',   // 블랙리스트 차량 진입
            LPR_ERROR: 'LPR_ERROR',                     // 번호 미인식
            DEVICE_OFFLINE: 'DEVICE_OFFLINE',           // 장비 연결 끊김
            SYSTEM_ERROR: 'SYSTEM_ERROR',               // 시스템 내부 오류
            GHOST_EXIT: 'GHOST_EXIT'                    // 미입차 차량 출차 시도
        }
    }
    
    /**
     * [Critical] 중요 알림 전송 (에러, 블랙리스트 등)
     * - 대상 이벤트: pf_alert-update
     * @param {Object} data 
     */
    async sendAlert(data) {
        try {
            const { type, message, siteId, data } = data;
            
            logger.warn(`[AlertService] Critical Alert: [${type}] ${message}`);

            // 웹소켓으로 알림 전송 (이벤트명: pf_alert-update)
            if (global.websocket) {
                global.websocket.emit('pf_alert-update', {
                    type,
                    message,
                    siteId,
                    timestamp: new Date(),
                    details: data
                });
            }

            // TODO: 필요 시 Slack, SMS, Push Notification 연동 로직 추가
        } catch (error) {
            logger.error(`[AlertService] 알림 전송 실패: ${error.message}`);
        }
    }

    /**
     * [Operation] LPR 입출차 및 상태 변경 알림 전송
     * - 대상 이벤트: pf_lpr-update
     * @param {Object} data
     */
    sendLprUpdate(data) {
        if (!global.websocket) return;

        try {
            // 1. 데이터 구조 분해 할당 (기본값 설정)
            const {
                parkingSessionId,
                siteId,
                carNumber,
                direction,
                location = 'UNKNOWN',
                deviceIp = null,
                devicePort = null,
                imageUrl,
                eventTime = new Date(),
                totalFee = 0,
                discountFee = 0,
                preSettledFee = 0,
                remainingFee = 0,
                discountPolicyIds = [],
                status,
                isBlacklist = false,
                vehicleType = 'NORMAL',
                message = ''
            } = data;

            // 2. 차종 한글 명칭 변환
            let vehicleTypeName = "일반";
            if (vehicleType === 'MEMBER') vehicleTypeName = "정기권";
            else if (vehicleType === 'COMPACT') vehicleTypeName = "경차";
            else if (vehicleType === 'ELECTRIC') vehicleTypeName = "전기차";

            // 3. 페이로드 구성
            const payload = {
                parkingSessionId,
                siteId,
                carNumber,
                direction,
                location,
                deviceIp,
                devicePort,
                imageUrl,
                eventTime,
                totalFee,
                discountFee,
                preSettledFee,
                remainingFee,
                discountPolicyIds,
                status,
                isBlacklist,
                vehicleType: vehicleTypeName,
                message
            };

            global.websocket.emit("pf_lpr-update", { parkingSession: { 'data': payload } });
            logger.info(`[AlertService] LPR Update sent: ${carNumber} (${direction})`);

        } catch (error) {
            logger.error(`[AlertService] LPR 업데이트 전송 실패: ${error.message}`);
        }
    }

    /**
     * [Operation] 차단기 상태 변경 알림 전송
     * - 대상 이벤트: pf_gate_state-update
     * @param {Object} data
     */
    sendGateStatus(data) {
        if (!global.websocket) return;

        try {
            const {
                siteId,
                zoneId,
                laneId,
                deviceId,
                direction = 'UNKNOWN',
                deviceIp,
                devicePort,
                location,
                status,
                eventTime
            } = data;

            const payload = {
                siteId,
                zoneId,
                laneId,
                deviceId,
                direction,
                deviceIp,
                devicePort,
                location,
                status,
                eventTime
            };

            global.websocket.emit("pf_gate_state-update", { gateState: { 'data': payload } });

        } catch (error) {
            logger.error(`[AlertService] Gate 상태 전송 실패: ${error.message}`);
        }
    }
}

module.exports = AlertService;