/**
 * ==============================================================================
 * Base Adapter (Abstract Class)
 * ------------------------------------------------------------------------------
 * 역할:
 * 1. 모든 장비 제어 어댑터(PLS, Hikvision, Dahua 등)의 부모 클래스
 * 2. Service Layer는 구체적인 장비 타입을 몰라도 이 인터페이스에 의존하여 비즈니스 로직 수행
 * 3. 하위 구현체는 이 메서드들을 반드시 오버라이딩해야 함
 * ==============================================================================
 */
class BaseAdapter {
    /**
     * 생성자
     * @param {object} deviceController - 장비 제어 미들웨어 연결 정보
     * @param {string} deviceController.id - 제어기 UUID
     * @param {string} deviceController.ipAddress - IP 주소
     * @param {number} deviceController.port - 포트 번호
     * @param {string} [deviceController.type] - 장비 타입 (PLS, etc.)
     * @throws {Error} 추상 클래스를 직접 인스턴스화하거나 설정이 누락된 경우
     */
    constructor(deviceController) {
        // 1. 추상 클래스 인스턴스화 방지
        if (new.target === BaseAdapter) {
            throw new Error('[BaseAdapter] 추상 클래스는 직접 인스턴스화할 수 없습니다. 구현체를 사용하세요.');
        }

        // 2. 필수 설정 정보 확인
        if (!deviceController) {
            throw new Error(`[${this.constructor.name}] deviceController 설정 정보가 누락되었습니다.`);
        }

        // 3. 공통 속성 주입
        this.deviceController = deviceController;
        this.id = deviceController.id;
        
        // 로깅 시 식별을 위한 이름 (없으면 Unknown)
        this.name = deviceController.name || 'Unknown DeviceController';
    }

    // =================================================================
    // 1. 차단기 제어 (Gate Control)
    // =================================================================

    /**
     * 차단기(Gate) 개방 요청
     * @param {string} targetKey - 장비 식별키
     * @returns {Promise<boolean>} 성공 여부
     */
    async openGate(targetKey) {
        throw new Error(`[${this.constructor.name}] openGate() must be implemented.`);
    }

    /**
     * 차단기(Gate) 폐쇄 요청
     * @param {string} targetKey - 장비 식별키
     * @returns {Promise<boolean>} 성공 여부
     */
    async closeGate(targetKey) {
        throw new Error(`[${this.constructor.name}] closeGate() must be implemented.`);
    }

    /**
     * 차단기(Gate) 상시 개방 (Unlock / Keep Open) 
     * @param {string} targetKey - 장비 식별키
     * @returns {Promise<boolean>} 성공 여부
     */
    async keepOpen(targetKey) {
        throw new Error(`[${this.constructor.name}] keepOpen() must be implemented.`);
    }

    // =================================================================
    // 2. 전광판 제어 (LED Display)
    // =================================================================

    /**
     * 전광판 메시지 전송
     * @param {string} targetKey - 장비 식별키
     * @param {object} msgData - 메시지 데이터 
     * @returns {Promise<boolean>} 성공 여부
     */
    async sendDisplay(targetKey, msgData) {
        throw new Error(`[${this.constructor.name}] sendDisplay() must be implemented.`);
    }

    // =================================================================
    // 3. 정산 및 요금 정보 (Payment & Fee)
    // =================================================================

    /**
     * [출차] 요금 정보 전송 (To 정산기/장비)
     * - Service에서 계산된 최종 요금을 장비 화면에 띄우기 위해 전송
     * @param {object} data
     * @param {string} data.targetKey - 장비 식별키
     * @param {string} data.carNumber - 차량번호
     * @param {number} data.parkingFee - 청구할 요금
     * @param {Date} data.inTime - 입차시간
     * @param {Date} data.outTime - 출차(현재)시간
     * @returns {Promise<boolean>} 성공 여부
     */
    async sendPaymentInfo(data) {
        throw new Error(`[${this.constructor.name}] sendPaymentInfo() must be implemented.`);
    }
    
    /**
     * [할인권] 할인 적용 결과 및 재계산 요금 전송
     * @param {object} data
     * @param {string} data.targetKey - 장비 식별키
     * @param {string} data.carNumber - 차량번호
     * @param {number} data.resultCode - 결과 코드 (성공/실패)
     * @returns {Promise<boolean>} 성공 여부
     */
    async sendCouponResult(data) {
        throw new Error(`[${this.constructor.name}] sendCouponResult() must be implemented.`);
    }

    // =================================================================
    // 4. 차량 검색 (Car Search)
    // =================================================================

    /**
     * [사전정산] 차량 검색 결과 전송 (To 사전정산기)
     * @param {object} data
     * @param {string} data.targetKey - 장비 식별키
     * @param {Array} data.carList - 검색된 차량 리스트 [{ carNumber, totalFee, imgUrl ... }]
     * @returns {Promise<boolean>} 성공 여부
     */
    async sendCarSearchResult(data) {
        throw new Error(`[${this.constructor.name}] sendCarSearchResult() must be implemented.`);
    }

    // =================================================================
    // 5. 시스템 및 상태 (System & Health)
    // =================================================================

    /**
     * 전체 시스템 설정(카메라, 장비 목록 등) 조회
     * @returns {Promise<object>} 설정 데이터
     */
    async getSystemConfig() {
        throw new Error(`[${this.constructor.name}] getSystemConfig() must be implemented.`);
    }

    /**
     * 장비 연결 상태 확인 (Health Check)
     * @returns {Promise<boolean>} 연결 성공 여부
     */
    async checkHealth() {
        throw new Error(`[${this.constructor.name}] checkHealth() must be implemented.`);
    }
}

module.exports = BaseAdapter;