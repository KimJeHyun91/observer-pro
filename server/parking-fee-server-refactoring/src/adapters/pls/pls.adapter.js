const axios = require('axios');
const logger = require('../../../../logger');

/**
 * ==============================================================================
 * PLS Adapter Creator (Functional Factory)
 * ------------------------------------------------------------------------------
 * 역할: 
 * 1. 설정 정보(deviceController)를 받아 axios 인스턴스를 설정합니다 (Closure).
 * 2. 외부에서 사용할 수 있는 메서드들만 객체로 묶어 반환합니다.
 * ==============================================================================
 * @param {object} deviceController - 장비 제어기 설정 정보 (IP, Port 등)
 */
const createPlsAdapter = (deviceController) => {
    
    // --------------------------------------------------------------------------
    // 1. [State] Private Scope (Closure)
    // - 이 변수들은 반환되는 함수들 내부에서만 접근 가능합니다.
    // - 외부에서 adapter.client 등으로 접근 불가능하므로 안전합니다.
    // --------------------------------------------------------------------------
    const baseUrl = `http://${deviceController.ipAddress}:${deviceController.port}`;
    
    const client = axios.create({
        baseURL: baseUrl,
        timeout: 5000, 
        headers: { 'Content-Type': 'application/json' }
    });

    // --------------------------------------------------------------------------
    // 2. [Helper] Private Functions
    // - 내부 로직 재사용을 위한 헬퍼 함수 (외부 노출 X)
    // --------------------------------------------------------------------------
    
    /**
     * 차단기 제어 공통 로직
     */
    const _controlGate = async (location, command) => {
        try {
            const payload = {
                kind: 'control',
                location: location,
                gate_control: command, // 'up' or 'down'
                loop_event_time: Date.now()
            };
            
            logger.info(`[PLS Adapter] 차단기 제어 요청 (${command}) -> ${location}`);
            const response = await client.post('/control', payload);
            
            return response.status === 200;
        } catch (error) {
            logger.error(`[PLS Adapter] 차단기 제어 실패 (${location}): ${error.message}`);
            throw error;
        }
    };

    // --------------------------------------------------------------------------
    // 3. [Public] Public Methods
    // - 실제 서비스 레이어에서 호출할 기능들입니다.
    // --------------------------------------------------------------------------

    /**
     * 시스템 전체 설정 조회 (Config)
     */
    const getSystemConfig = async () => {
        try {
            const payload = { kind: 'get_config' };
            const response = await client.post('/config', payload);
            return response.data; 
        } catch (error) {
            logger.error(`[PLS Adapter] Config 조회 실패: ${error.message}`);
            throw error;
        }
    };

    /**
     * 헬스 체크
     */
    const checkHealth = async () => {
        try {
            // 가벼운 요청을 보내서 연결 확인 (예: 루트 경로 혹은 config)
            await client.get('/'); 
            return true;
        } catch (e) {
            return false;
        }
    };

    // --- Gate Control ---

    const openGate = (location) => _controlGate(location, 'up');
    
    const closeGate = (location) => _controlGate(location, 'down');
    
    // --- LED Display ---

    const sendDisplay = async (location, targetDevice, msgData) => {
        try {
            // LED 장비 정보 방어 로직
            const ledIp = targetDevice?.ipAddress || '0.0.0.0';
            const ledPort = targetDevice?.port || 0;

            const payload = {
                kind: 'ledd',
                ip: ledIp,
                port: ledPort,
                location: location,
                
                text1: msgData.text1 || '',     
                text2: msgData.text2 || '',     
                color1: msgData.color1 || 'GREEN',
                color2: msgData.color2 || 'GREEN',
                effect1: msgData.effect1 || 'fixed',
                effect2: msgData.effect2 || 'fixed',
                kind1: msgData.kind1 || 'flash',
                
                loop_event_time: Date.now()
            };

            logger.info(`[PLS Adapter] 전광판 전송 -> ${location}: "${payload.text1}"`);
            await client.post('/ledd', payload);
            return true;
        } catch (error) {
            logger.error(`[PLS Adapter] 전광판 전송 실패: ${error.message}`);
            return false; // LED 실패는 전체 로직 에러로 전파하지 않음
        }
    };

    // --- Payment Info (To Kiosk) ---

    const sendPaymentInfo = async ({ location, targetIp, targetPort, carNumber, parkingFee, inTime, outTime }) => {
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
                feetype: parkingFee > 0 ? 1 : 0
            };

            logger.info(`[PLS Adapter] 요금 정보 전송 -> ${location}: ${carNumber} (${parkingFee}원)`);
            await client.post('/payment', payload);
            return true;
        } catch (error) {
            logger.error(`[PLS Adapter] 요금 정보 전송 실패: ${error.message}`);
            throw error;
        }
    };

    // --- Coupon Result (To Kiosk) ---

    const sendCouponResult = async ({ location, targetIp, targetPort, carNumber, resultCode, inTime, outTime }) => {
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
                couponret: resultCode
            };

            logger.info(`[PLS Adapter] 할인권 결과 전송 -> ${location}: Code ${resultCode}`);
            await client.post('/payment', payload);
            return true;
        } catch (error) {
            logger.error(`[PLS Adapter] 할인권 결과 전송 실패: ${error.message}`);
            return false;
        }
    };

    // --- Car Search Result (To Pre-Kiosk) ---

    const sendCarSearchResult = async ({ location, targetIp, targetPort, carList }) => {
        try {
            const payload = {
                kind: 'payment',
                ip: targetIp,
                port: targetPort,
                location: location,
                cmd: 'PARK_SEARCH_RESULT',
                resultno: carList.length,
                car_list: carList 
            };

            logger.info(`[PLS Adapter] 차량 검색 결과 전송 -> ${location}: ${carList.length}건`);
            await client.post('/payment', payload);
            return true;
        } catch (error) {
            logger.error(`[PLS Adapter] 차량 검색 결과 전송 실패: ${error.message}`);
            return false;
        }
    };

    // --------------------------------------------------------------------------
    // 4. [Return] Expose Public API
    // - 외부에서 사용할 메서드만 골라서 반환합니다.
    // --------------------------------------------------------------------------
    return {
        getSystemConfig,
        checkHealth,
        openGate,
        closeGate,
        sendDisplay,
        sendPaymentInfo,
        sendCouponResult,
        sendCarSearchResult
    };
};

module.exports = createPlsAdapter;