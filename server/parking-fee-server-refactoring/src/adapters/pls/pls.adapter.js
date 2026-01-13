const axios = require('axios');
const BaseAdapter = require('../base.adapter');
const logger = require('../../../../logger');

/**
 * ==============================================================================
 * PLS (Parking Lot System) 전용 어댑터
 * ------------------------------------------------------------------------------
 * 역할:
 * 1. BaseAdapter 추상 클래스를 상속받아 표준 인터페이스를 구현합니다.
 * 2. Node.js 서버와 PLS 미들웨어(장비 제어 서버) 간의 HTTP 통신을 담당합니다.
 * 3. Service Layer의 데이터를 PLS 프로토콜 포맷(JSON)으로 변환하여 전송합니다.
 * * 참고:
 * - targetKey: BaseAdapter의 표준 식별자이며, PLS에서는 'location'(장비 위치명)으로 매핑됩니다.
 * ==============================================================================
 */
class PlsAdapter extends BaseAdapter {
    
    /**
     * 생성자
     * @param {object} deviceController - DB에서 조회한 장비 제어기 정보
     */
    constructor(deviceController) {
        // 1. 부모 생성자 호출 (유효성 검사 포함)
        super(deviceController);
        
        // 2. 통신 기본 설정
        this.baseUrl = `http://${deviceController.ipAddress}:${deviceController.port}`;
        
        // 3. [DI] Axios 인스턴스 생성 및 멤버 변수 할당
        // - timeout: 3초 (장비 응답 지연 시 빠른 실패 처리를 위함)
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 3000, 
            headers: { 'Content-Type': 'application/json' }
        });
    }   

    // =================================================================
    // 1. 차단기 제어 (Gate Control)
    // =================================================================

    /**
     * [Internal Helper] 차단기 제어 명령 전송 공통 함수
     * @param {string} location - 장비 위치명 (targetKey)
     * @param {string} command - 제어 명령어 ('up', 'down', 'up_and_lock', 'unlock')
     */
    async _sendGateCommand(location, command) {
        try {
            // PLS 프로토콜 페이로드
            const payload = {
                kind: 'control',            // 메시지 타입: 제어
                location: location,         // 제어할 장비 위치
                gate_control: command,      // 동작 명령
                loop_event_time: Date.now() // 요청 시각
            };

            logger.info(`[PLS Adapter] 차단기 제어 요청: ${location} -> ${command}`);
            
            const response = await this.client.post('/control', payload);
            
            // HTTP 200 OK면 성공으로 간주
            return response.status === 200;

        } catch (error) {
            logger.error(`[PLS Adapter] 차단기 제어 실패(${location}): ${error.message}`);
            return false;
        }
    }

    /**
     * 차단기 개방 (Open)
     * - PLS 프로토콜: gate_control = 'up'
     */
    async openGate(targetKey) {
        return this._sendGateCommand(targetKey, 'up');
    }

    /**
     * 차단기 폐쇄 (Close)
     * - PLS 프로토콜: gate_control = 'down'
     */
    async closeGate(targetKey) {
        return this._sendGateCommand(targetKey, 'down');
    }

    /**
     * 차단기 상시 개방 (Keep Open)
     * - PLS 프로토콜: gate_control = 'up_and_lock'
     */
    async keepOpen(targetKey) {
        return this._sendGateCommand(targetKey, 'up_and_lock');
    }

    // =================================================================
    // 2. 전광판 제어 (LED Display)
    // =================================================================

    /**
     * 전광판 메시지 전송
     * @param {string} targetKey - 장비 위치명
     * @param {object} msgData - 전송할 메시지 및 설정 데이터
     */
    async sendDisplay(targetKey, msgData) {
        try {
            // msgData에 포함된 IP/Port는 실제 LED 전광판의 주소입니다.
            // 미들웨어(PLS)가 이 주소를 보고 해당 전광판으로 패킷을 포워딩합니다.
            const payload = {
                kind: 'ledd',           // 메시지 타입: 전광판
                location: targetKey,    
                
                // 타겟 LED 장비 네트워크 정보 (없으면 기본값)
                ip: msgData.ip || '0.0.0.0', 
                port: msgData.port || 0,

                // 표시할 텍스트 및 효과 설정
                text1: msgData.text1 || '',      // 윗줄
                text2: msgData.text2 || '',      // 아랫줄
                color1: msgData.color1 || 'GREEN',
                color2: msgData.color2 || 'GREEN',
                
                effect1: msgData.effect1 || 'fixed', // 효과 (고정, 흐름 등)
                effect2: msgData.effect2 || 'fixed',
                kind1: msgData.kind1 || 'flash',     // 메시지 종류 (일반, 긴급 등)

                loop_event_time: Date.now()
            };

            logger.info(`[PLS Adapter] 전광판 전송 -> ${targetKey}: "${payload.text1} / ${payload.text2}"`);
            await this.client.post('/ledd', payload);
            return true;

        } catch (error) {
            logger.error(`[PLS Adapter] 전광판 전송 실패(${targetKey}): ${error.message}`);
            return false;
        }
    }

    // =================================================================
    // 3. 정산 및 요금 정보 (Payment & Fee)
    // =================================================================

    /**
     * [출차 정산] 요금 정보 전송 (PARK_FEE_INFO)
     * - 출구 무인 정산기에 "얼마 내세요"라고 알려주는 역할
     */
    async sendPaymentInfo(data) {
        try {
            const payload = {
                kind: 'payment',
                cmd: 'PARK_FEE_INFO',   // 명령어: 요금 정보 알림
                location: data.targetKey,
                
                // 정산기 IP/Port
                ip: data.targetIp || '0.0.0.0', 
                port: data.targetPort || 0,

                lp: data.carNumber,
                in_time: data.inTime ? new Date(data.inTime).getTime() : 0,
                out_time: data.outTime ? new Date(data.outTime).getTime() : Date.now(),
                
                parkingfee: data.parkingFee,
                
                // feetype: 0보다 크면 과금(1), 0원이면 무료/회차(0)
                feetype: data.parkingFee > 0 ? 1 : 0
            };

            logger.info(`[PLS Adapter] 요금 정보 전송 -> ${data.targetKey}: ${data.parkingFee}원`);
            await this.client.post('/payment', payload);
            return true;

        } catch (error) {
            logger.error(`[PLS Adapter] 요금 정보 전송 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * [할인권 투입 결과] 재계산 요금 전송 (PARK_FEE_UPDATE)
     * - 정산기에서 할인권을 넣었을 때, 서버가 계산한 결과를 다시 정산기로 보냄
     */
    async sendCouponResult(data) {
        try {
            const payload = {
                kind: 'payment',
                cmd: 'PARK_FEE_UPDATE', // 명령어: 요금 갱신
                location: data.targetKey,
                
                ip: data.targetIp || '0.0.0.0',
                port: data.targetPort || 0,

                lp: data.carNumber,
                couponret: data.resultCode, // 결과 코드 (예: 1000=성공, 1001=중복 등)
                
                out_time: Date.now()
            };

            logger.info(`[PLS Adapter] 할인권 결과 전송 -> ${data.targetKey}: Code ${data.resultCode}`);
            await this.client.post('/payment', payload);
            return true;

        } catch (error) {
            logger.error(`[PLS Adapter] 할인권 결과 전송 실패: ${error.message}`);
            return false;
        }
    }

    // =================================================================
    // 4. 차량 검색 (Car Search)
    // =================================================================

    /**
     * [사전 정산] 차량 검색 결과 리스트 전송 (PARK_SEARCH_RESULT)
     * - 키오스크에서 차량번호 4자리를 입력했을 때 서버가 찾은 차량 목록
     */
    async sendCarSearchResult(data) {
        try {
            // DB 포맷의 차량 리스트를 PLS 프로토콜 포맷으로 매핑
            const formattedList = (data.carList || []).map(car => ({
                lp: car.carNumber,
                in_time: car.entryTime ? new Date(car.entryTime).getTime() : 0,
                parkingfee: car.totalFee,
                feetype: car.totalFee > 0 ? 1 : 0,
                imgurl: car.entryImageUrl || "none"
            }));

            const payload = {
                kind: 'payment',
                cmd: 'PARK_SEARCH_RESULT', // 명령어: 검색 결과
                location: data.targetKey,
                
                ip: data.targetIp || '0.0.0.0',
                port: data.targetPort || 0,

                resultno: formattedList.length, // 검색된 차량 수
                car_list: formattedList         // 차량 목록 배열
            };

            logger.info(`[PLS Adapter] 차량 검색 결과 전송 -> ${data.targetKey}: ${formattedList.length}건`);
            await this.client.post('/payment', payload);
            return true;

        } catch (error) {
            logger.error(`[PLS Adapter] 차량 검색 결과 전송 실패: ${error.message}`);
            return false;
        }
    }

    // =================================================================
    // 5. 시스템 및 상태 (System & Health)
    // =================================================================

    /**
     * PLS 미들웨어 설정값 조회
     * - 연결된 카메라, 전광판 등의 설정 정보를 가져옴
     */
    async getSystemConfig() {
        try {
            const response = await this.client.post('/config', { kind: 'get_config' });
            return response.data;
        } catch (error) {
            logger.error(`[PLS Adapter] Config 조회 실패: ${error.message}`);
            // 설정 조회는 호출자가 실패를 알아야 할 수 있으므로 throw 가능
            // 혹은 빈 객체 반환 등 정책에 따름
            throw error; 
        }
    }

    /**
     * 헬스 체크
     * - 장비 제어 서버가 살아있는지 확인
     */
    async checkHealth() {
        try {
            // 별도의 ping API가 없다면 getSystemConfig 등으로 대체 확인
            await this.getSystemConfig();
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = PlsAdapter;