const axios = require('axios');
const BaseAdapter = require('../base.adapter');
const logger = require('../../utils/logger');

/**
 * PLS (Parking Lot System) 어댑터
 * - PLS 장비 제어 서버와의 HTTP 통신을 담당합니다.
 * - 연동 정의서(2025_12_24_V3)에 맞춰 구현되었습니다.
 */
class PlsAdapter extends BaseAdapter {
    /**
     * @param {object} deviceController - 장비 제어 서비스 정보 (IP, Port 등)
     */
    constructor(deviceController) {
        super(deviceController);
        this.baseUrl = `http://${deviceController.ip_address}:${deviceController.port}`;
        // axios 인스턴스 생성 (타임아웃 등 설정)
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 5000, // 5초 타임아웃
            headers: { 'Content-Type': 'application/json' }
        });
    }

    /**
     * 장비 연결 상태 확인 (Health Check)
     */
    async checkHealth() {
        try {

            // PLS 서버에 장비 연결 상태 확인 기능 추가 요청 필요

            return false;
        } catch (error) {
            logger.warn(`[PLS] Health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * 차단기(Gate) 개방 명령
     * - URL: /control
     * - Body: { kind: 'control', gate_control: 'up', ... }
     */
    async openGate(location) {
        try {

            const payload = {
                kind: 'control',
                location: location,
                gate_control: 'up',
                loop_event_time: Date.now()
            };
            
            logger.info(`[PLS] Sending Open Gate (up) to ${this.baseUrl} for ${location}`);
            const response = await this.client.post('/control', payload);
            
            // 응답 포맷이 정의서에는 없으나, 통상적인 성공 확인 로직 적용
            if (response.status === 200) {
                return true;
            } else {
                throw new Error(`PLS response status: ${response.status}`);
            }
        } catch (error) {
            logger.error(`[PLS] Failed to open gate: ${error.message}`);
            throw error;
        }
    }

    /**
     * 차단기(Gate) 폐쇄 명령
     * - URL: /control
     * - Body: { kind: 'control', gate_control: 'down', ... }
     */
    async closeGate(location) {
        try {
            const payload = {
                kind: 'control',
                location: location,
                gate_control: 'down',
                loop_event_time: Date.now()
            };
            
            logger.info(`[PLS] Sending Close Gate (down) to ${this.baseUrl} for ${location}`);
            const response = await this.client.post('/control', payload);
            
            if (response.status === 200) {
                return true;
            } else {
                throw new Error(`PLS response status: ${response.status}`);
            }
        } catch (error) {
            logger.error(`[PLS] Failed to close gate: ${error.message}`);
            throw error;
        }
    }

    /**
     * 전광판(Display) 메시지 전송
     * - URL: /ledd
     */
    async sendDisplay(ip, port, location, effect1, effect2, text1, text2, color1, color2, kind1, loop_event_time) {
        try {
            const payload = {
                kind: 'ledd',
                ip: ip,
                port: port,
                location: location,
                effect1: effect1,                   // 첫 번째 줄 표시 효과 (fixed, to_left, to_right)
                effect2: effect2,                   // 두 번째 줄 표시 효과 (fixed, to_left, to_right)
                text1: text1,                       // 첫 번째 줄 표시 문자열 (예: 등록차량, 일반차량) 
                text2: text2,                       // 두 번째 줄 표시 문자열 (예: 12가2345)
                color1: color1,                     // 첫 번째 줄 표시 색상 (RED, GREEN, YELLOW, BLUE, PURPLE, SBLUE, WHITE)
                color2: color2,                     // 두 번째 줄 표시 색상 (RED, GREEN, YELLOW, BLUE, PURPLE, SBLUE, WHITE)
                kind1: kind1,                       // flash: 평소 보여주는 글자, ram: 일시적 표출
                loop_event_time: loop_event_time    // 루프 이벤트 발생 시간
            };

            logger.info(`[PLS] 전광판 메시지 전송 ip: ${ip}, port: ${port}, location: ${location}, loop_event_time: ${loop_event_time}`);
            await this.client.post('/ledd', payload);
            return true;
        } catch (error) {
            logger.error(`[PLS] 전광판 메시지 전송 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * 정산기(Payment Machine)에 요금 정보 전송
     * - URL: /payment
     * - Body: { cmd: 'PARK_FEE_INFO', ... }
     */
    async requestPayment(ip, port, location, carNumber, inLoopEventTime, outLoopEventTime, parkingFee, feeType) {
        try {
            const payload = {
                kind: 'payment',
                ip: ip,
                port: port,
                location: location,
                cmd: 'PARK_FEE_INFO',
                lp: carNumber,
                in_time: inLoopEventTime,
                out_time: outLoopEventTime,
                parkingfee: parkingFee,
                feetype: feeType
            };

            logger.info(`[PLS] 요금 정보 전송. 요금: ${parkingFee}원, 차량번호: ${carNum}`);
            await this.client.post('/payment', payload);
            return true;
        } catch (error) {
            logger.error(`[PLS] Failed to request payment: ${error.message}`);
            throw error;
        }
    }

    /**
     * 장비 결제 요청 취소 (Cancel Payment)
     * feetype: 0 (요금 없음) 정보를 보내거나 0원 처리를 통해 상태를 해제하는 방식으로 구현
     */
    async cancelPayment() {
        try {
            // 추후에 구현
            return true;
        } catch (error) {
            logger.error(`[PLS] Failed to cancel payment: ${error.message}`);
            return false;
        }
    }
    
}

module.exports = PlsAdapter;