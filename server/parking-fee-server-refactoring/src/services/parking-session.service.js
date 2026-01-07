const ParkingSessionRepository = require('../repositories/parking-session.repository');

class ParkingSessionService {
    constructor() {
        this.parkingSessionRepository = new ParkingSessionRepository();
    }

    /**
     * 입차 세션 생성 (트랜잭션 지원)
     */
    async createSession(client, data) {
        return await this.parkingSessionRepository.create(client, data);
    }

    /**
     * 현재 주차 중인 차량 조회 (출차하지 않은 차량)
     * - 중복 입차 체크, 출차 정산 시 사용
     */
    async findRunningSession(siteId, carNum) {
        return await this.parkingSessionRepository.findByCarNum(siteId, carNum);
    }

    /**
     * ID로 세션 상세 조회
     */
    async getSessionById(siteId, sessionId) {
        const session = await this.parkingSessionRepository.findById(siteId, sessionId);
        if (!session) {
            // 필요 시 커스텀 에러 던지기 가능
            return null;
        }
        return session;
    }

    /**
     * 차량번호 4자리로 주차 중인 차량 검색 (사전정산기용)
     */
    async searchRunningSessionsBy4Digit(siteId, carNum4Digit) {
        return await this.parkingSessionRepository.findRunningByCarNum4Digit(siteId, carNum4Digit);
    }

    /**
     * 상태 및 요금 업데이트 (결제 대기 중 전환 등)
     */
    async updateSessionStatus(client, sessionId, status, totalFee) {
        return await this.parkingSessionRepository.updateStatus(client, sessionId, status, totalFee);
    }

    /**
     * 사전 정산 완료 정보 업데이트
     */
    async completePreSettlement(client, sessionId, paidFee) {
        return await this.parkingSessionRepository.updatePreSettlement(client, sessionId, { paidFee });
    }

    /**
     * 출차 완료 처리 (세션 종료)
     */
    async closeSession(client, sessionId, closeData) {
        // closeData: { outTime, laneId, fee }
        return await this.parkingSessionRepository.closeSession(client, sessionId, closeData);
    }
}

module.exports = ParkingSessionService;