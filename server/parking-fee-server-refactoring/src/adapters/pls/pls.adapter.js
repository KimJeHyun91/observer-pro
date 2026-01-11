const axios = require('axios');
const BaseAdapter = require('../base.adapter');
const logger = require('../../../../logger'); // 로거 경로는 프로젝트 구조에 맞게 수정해주세요

/**
 * PLS (Parking Lot System) 어댑터
 * - PLS 장비 제어 서버와의 HTTP 통신을 담당합니다.
 * - 연동 정의서(2025_12_24_V3)에 맞춰 구현되었습니다.
 */
class PlsAdapter extends BaseAdapter {
    /**
     * @param {object} deviceController - 장비 제어 서비스 정보 (ipAddress, port 등)
     */
    constructor(deviceController) {
        super(deviceController);
        
        // deviceController 객체는 Service에서 camelCase로 변환되어 넘어온다고 가정
        this.baseUrl = `http://${deviceController.ipAddress}:${deviceController.port}`;
        
        // axios 인스턴스 생성 (타임아웃 5초)
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 5000, 
            headers: { 'Content-Type': 'application/json' }
        });
    }

    /**
     * [공통] 헬스 체크
     */
    async checkHealth() {
    }

    /**
     * [추가] 시스템 전체 설정 조회 (Config)
     * - PLS 서버로부터 카메라, 차단기, 전광판 등의 목록을 받아옵니다.
     * - URL: /config (GET 또는 POST 확인 필요, 여기선 POST로 가정)
     */
    async getSystemConfig() {
        try {
            const payload = { kind: 'get_config' };
            const response = await this.client.post('/config', payload);
            
            return response.data; 
        } catch (error) {
            logger.error(`[PLS Adapter] Config 조회 실패: ${error.message}`);
            throw error;
        }
    }

    // =================================================================
    // 1. 차단기 제어 (Gate Control)
    // =================================================================

    /**
     * 차단기 제어 요청 (통합 메서드)
     * @param {string} location - 장비 위치명 (예: "입차1")
     * @param {string} command - 'up', 'down', 'unlock', 'up_and_lock'
     */
    async _controlGate(location, command) {
        try {
            const payload = {
                kind: 'control',
                location: location,
                gate_control: command,
                loop_event_time: Date.now()
            };
            
            logger.info(`[PLS Adapter] 차단기 제어 요청 (${command}) -> ${location}`);
            const response = await this.client.post('/control', payload);
            
            return response.status === 200;
        } catch (error) {
            logger.error(`[PLS Adapter] 차단기 제어 실패: ${error.message}`);
            throw error;
        }
    }

    async openGate(location) {
        return this._controlGate(location, 'up');
    }

    async closeGate(location) {
        return this._controlGate(location, 'down');
    }

    async keepOpen(location) {
        return this._controlGate(location, 'up_and_lock'); // 필요 시 구현
    }

    // =================================================================
    // 2. 전광판 제어 (LED Display)
    // =================================================================

    /**
     * 전광판 메시지 전송
     * @param {string} location - 장비 위치명
     * @param {object} targetDevice - 대상 LED 장비 정보 (ipAddress, port) **필수**
     * @param {object} msgData - 메시지 정보
     */
    async sendDisplay(location, targetDevice, msgData) {
        try {
            // targetDevice가 없을 경우에 대한 방어 로직
            const ledIp = targetDevice?.ipAddress || '0.0.0.0';
            const ledPort = targetDevice?.port || 0;

            const payload = {
                kind: 'ledd',
                ip: ledIp,   // LED 장비의 실제 IP
                port: ledPort, 
                location: location,
                
                effect1: msgData.effect1 || 'fixed',
                effect2: msgData.effect2 || 'fixed',
                text1: msgData.text1 || '',     
                text2: msgData.text2 || '',     
                color1: msgData.color1 || 'GREEN',
                color2: msgData.color2 || 'GREEN',
                kind1: msgData.kind1 || 'flash',
                
                loop_event_time: Date.now()
            };

            logger.info(`[PLS Adapter] 전광판 전송 -> ${location} (${ledIp}): "${payload.text1}"`);
            await this.client.post('/ledd', payload);
            return true;
        } catch (error) {
            logger.error(`[PLS Adapter] 전광판 전송 실패: ${error.message}`);
            return false;
        }
    }

    // =================================================================
    // 3. 요금 정보 전송 (To 정산기)
    // =================================================================

    /**
     * 출구 정산기에 요금 정보 전송 (PARK_FEE_INFO)
     * @param {object} params
     * @param {string} params.location - 위치
     * @param {string} params.targetIp - 정산기 IP
     * @param {number} params.targetPort - 정산기 Port
     * @param {string} params.carNumber - 차량번호
     * @param {number} params.parkingFee - 요금
     * @param {Date} params.inTime - 입차시간
     * @param {Date} params.outTime - 출차시간
     */
    async sendPaymentInfo({ location, targetIp, targetPort, carNumber, parkingFee, inTime, outTime }) {
        try {
            const payload = {
                kind: 'payment',
                ip: targetIp,
                port: targetPort,
                location: location,
                cmd: 'PARK_FEE_INFO',
                lp: carNumber,
                in_time: inTime ? new Date(inTime).getTime() : 0,
                out_time: outTime ? new Date(outTime).getTime() : Date.now(),
                parkingfee: parkingFee,
                feetype: parkingFee > 0 ? 1 : 0 // 1:요금있음, 0:없음
            };

            logger.info(`[PLS Adapter] 요금 정보 전송 -> ${location}: ${carNumber} (${parkingFee}원)`);
            await this.client.post('/payment', payload);
            return true;
        } catch (error) {
            logger.error(`[PLS Adapter] 요금 정보 전송 실패: ${error.message}`);
            throw error;
        }
    }

    // =================================================================
    // 4. 할인권 재계산 결과 전송 (Response to Coupon Input)
    // =================================================================

    /**
     * 할인권 투입 결과 및 재계산 요금 전송 (PARK_FEE_UPDATE)
     * @param {object} params
     * @param {string} params.location
     * @param {string} params.targetIp
     * @param {number} params.targetPort
     * @param {string} params.carNumber
     * @param {number} params.resultCode - 1000(정상), 1011(미등록) 등
     * @param {Date} params.inTime
     * @param {Date} params.outTime
     */
    async sendCouponResult({ location, targetIp, targetPort, carNumber, resultCode, inTime, outTime }) {
        try {
            const payload = {
                kind: 'payment',
                ip: targetIp,
                port: targetPort,
                location: location,
                cmd: 'PARK_FEE_UPDATE',
                lp: carNumber,
                in_time: inTime ? new Date(inTime).getTime() : 0,
                out_time: outTime ? new Date(outTime).getTime() : Date.now(),
                couponret: resultCode // 결과 코드 (1000 등)
            };

            logger.info(`[PLS Adapter] 할인권 결과 전송 -> ${location}: Code ${resultCode}`);
            await this.client.post('/payment', payload);
            return true;
        } catch (error) {
            logger.error(`[PLS Adapter] 할인권 결과 전송 실패: ${error.message}`);
            return false;
        }
    }

    // =================================================================
    // 5. 차량 검색 결과 전송 (Response to Car Search)
    // =================================================================

    /**
     * 사전 정산기 차량 검색 결과 전송 (PARK_SEARCH_RESULT)
     * @param {object} params
     * @param {string} params.location
     * @param {string} params.targetIp
     * @param {number} params.targetPort
     * @param {Array} params.carList - 검색된 차량 목록
     */
    async sendCarSearchResult({ location, targetIp, targetPort, carList }) {
        try {
            const payload = {
                kind: 'payment',
                ip: targetIp,
                port: targetPort,
                location: location,
                cmd: 'PARK_SEARCH_RESULT',
                resultno: carList.length,
                car_list: carList 
                // car_list 구조: [{ lp, intime, parkingfee, feetype, imgurl }, ...]
            };

            logger.info(`[PLS Adapter] 차량 검색 결과 전송 -> ${location}: ${carList.length}건`);
            await this.client.post('/payment', payload);
            return true;
        } catch (error) {
            logger.error(`[PLS Adapter] 차량 검색 결과 전송 실패: ${error.message}`);
            return false;
        }
    }
}

module.exports = PlsAdapter;