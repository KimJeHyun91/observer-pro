const logger = require('../../../logger');
const AlertRepository = require('../repositories/alert.repository');

/**
 * 알림 유형 상수 정의
 */
const AlertType = {
    BLACKLIST_DETECTED: 'BLACKLIST_DETECTED',   // 블랙리스트 차량 진입
    LPR_ERROR: 'LPR_ERROR',                     // 번호 미인식
    DEVICE_OFFLINE: 'DEVICE_OFFLINE',           // 장비 연결 끊김
    SYSTEM_ERROR: 'SYSTEM_ERROR',               // 시스템 내부 오류
    GHOST_EXIT: 'GHOST_EXIT'                    // 미입차 차량 출차 시도
};

class AlertService {
    constructor() {
        this.repository = new AlertRepository();
    }

    /**
     * 알림 전송 메인 메서드
     */
    async sendAlert({ type, message, siteId, data = {} }) {
        try {
            // 1. 알림 객체 생성 (WebSocket용)
            const alertPayload = {
                type,
                message,
                siteId,
                data, 
                timestamp: new Date()
            };

            // 2. 서버 로그 기록
            logger.warn(`[Alert Service] ${type} - ${message}`, data);

            // 3. [활성화] DB 저장 (이력 관리용)
            await this.repository.create({
                siteId,
                type,
                message,
                metadata: data 
            });

            // 4. 실시간 웹소켓 전송
            if (global.websocket) {
                global.websocket.emit('pf_alert', alertPayload);
                logger.info(`[Alert Service] WebSocket 전송 완료: ${type}`);
            }

        } catch (error) {
            // 알림 실패가 전체 로직을 망가뜨리지 않도록 로그만 남김
            logger.error(`[Alert Service] 알림 전송 중 오류: ${error.message}`);
        }
    }

    /**
     * 알림 목록 조회
     */
    async findAll(params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 20; 
        const offset = (page - 1) * limit;

        const sortOptions = {
            sortBy: params.sortBy || 'created_at',
            sortOrder: params.sortOrder || 'DESC'
        };

        const filters = {
            siteId: params.siteId,
            type: params.type,
            isRead: params.isRead,
            startTime: params.startTime, 
            endTime: params.endTime      
        };

        const { rows, count } = await this.repository.findAll(filters, sortOptions, limit, offset);

        return {
            alerts: rows,
            meta: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        };
    }

    /**
     * [추가됨] 알림 읽음 처리 (Controller와 연결)
     */
    async markAsRead(id) {
        const data = await this.repository.markAsRead(id);
        
        if (!data) {
            const error = new Error('해당 알림을 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }
        return data;
    }

    // (선택 사항) 인스턴스 메서드로도 접근하고 싶다면 유지
    get Types() {
        return AlertType;
    }
}

// 인스턴스와 상수를 함께 내보냄
module.exports = new AlertService();
module.exports.AlertType = AlertType;