/**
 * 기본 어댑터 클래스 (Base Adapter)
 * - 모든 장비 제어 어댑터의 부모 클래스입니다.
 * - 공통적인 인터페이스를 정의하며, 실제 구현체(PLS Adapter 등)는 이를 상속받아 구체적인 통신 로직을 구현해야 합니다.
 */
class BaseAdapter {
    /**
     * 생성자
     * @param {object} deviceController - 장비 제어 서비스 정보 (IP, Port 등)
     */
    constructor(deviceController) {
        this.deviceController = deviceController;
    }

    /**
     * 차단기(Gate) 개방 명령
     * @param {string} laneId - 제어할 차선 ID
     * @returns {Promise<boolean>} 성공 여부
     */
    async openGate(laneId) {
        throw new Error('openGate() must be implemented');
    }

    /**
     * 차단기(Gate) 폐쇄 명령
     * @param {string} laneId - 제어할 차선 ID
     * @returns {Promise<boolean>} 성공 여부
     */
    async closeGate(laneId) {
        throw new Error('closeGate() must be implemented');
    }

    /**
     * 전광판(Display) 메시지 전송
     * @param {string} laneId - 제어할 차선 ID
     * @param {string} line1 - 첫 번째 줄 텍스트
     * @param {string} line2 - 두 번째 줄 텍스트
     * @returns {Promise<boolean>} 성공 여부
     */
    async sendDisplay(laneId, line1, line2) {
        throw new Error('sendDisplay() must be implemented');
    }

    /**
     * 정산기(Payment Machine)에 요금 정보 전송 요청
     * @param {string} laneId - 제어할 차선 ID
     * @param {string} carNum - 차량 번호
     * @param {number} amount - 청구할 금액
     * @returns {Promise<boolean>} 성공 여부
     */
    async requestPayment(laneId, carNum, amount) {
        throw new Error('requestPayment() must be implemented');
    }

    /**
     * 장비 결제 요청 취소 (Cancel Payment)
     * @param {string} laneId - 제어할 차선 ID
     * @returns {Promise<boolean>} 성공 여부
     */
    async cancelPayment(laneId) {
        throw new Error('cancelPayment() must be implemented');
    }

    /**
     * 장비 연결 상태 확인 (Health Check)
     * - 장비(또는 미들웨어)와 통신이 가능한지 확인합니다.
     * @returns {Promise<boolean>} 연결 성공 여부
     */
    async checkHealth() {
        throw new Error('checkHealth() must be implemented');
    }
}

module.exports = BaseAdapter;