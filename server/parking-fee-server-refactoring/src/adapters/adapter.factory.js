const deviceControllerRepository = require('../repositories/device-controller.repository');
const logger = require('../../../logger');
const createPlsAdapter = require('./pls/pls.adapter');

/**
 * ==============================================================================
 * Adapter Creator Map (Strategy Pattern)
 * ------------------------------------------------------------------------------
 * DB의 프로토콜 코드(code)와 '어댑터 생성 함수'를 매핑합니다.
 * 클래스가 아니므로 대문자(PlsAdapter)가 아닌 동사형(createPlsAdapter) 변수명을 사용합니다.
 * ==============================================================================
 */
const ADAPTER_CREATORS = {
    'PLS': createPlsAdapter
};

/**
 * [Helper] 인터페이스 유효성 검사 (Duck Typing Check)
 * BaseAdapter 상속을 제거했으므로, 생성된 객체가 필수 메서드를 가지고 있는지 확인합니다.
 * * @param {object} adapter - 생성된 어댑터 객체
 * @param {string} protocol - 프로토콜 이름 (로깅용)
 */
const validateInterface = (adapter, protocol) => {
    // 서비스 로직에서 반드시 호출하는 메서드 목록
    const requiredMethods = [
        'openGate', 
        'closeGate', 
        'sendDisplay', 
        'sendPaymentInfo'
    ];
    
    const missing = requiredMethods.filter(method => typeof adapter[method] !== 'function');
    
    if (missing.length > 0) {
        // 개발 환경에서는 즉시 알 수 있도록 경고 로그 출력
        logger.warn(`[AdapterFactory] ⚠️ ${protocol} 어댑터에 필수 구현 누락됨: ${missing.join(', ')}`);
    }
};

/**
 * ==============================================================================
 * getAdapter (Main Factory Function)
 * ------------------------------------------------------------------------------
 * 역할: DeviceController를 받아, 해당 장비와 통신 가능한 '함수들의 집합(객체)'을 반환
 * ==============================================================================
 */
exports.getAdapter = async (deviceController) => {
    if (!deviceController) {
            throw new Error(`[AdapterFactory] 장비 제어기 정보를 찾을 수 없습니다. (ID: ${deviceController.id})`);
        }

    try {
        // 1. 프로토콜 식별 (대소문자 무시 처리)
        const protocolCode = (deviceController.code || '').toUpperCase();
        
        // 2. 생성 함수(Creator) 찾기
        const createAdapter = ADAPTER_CREATORS[protocolCode];

        if (!createAdapter) {
            throw new Error(`[AdapterFactory] 지원하지 않는 프로토콜입니다: ${protocolCode}`);
        }

        // 3. 어댑터 객체 생성 (함수형: new 키워드 사용 안 함)
        // -> 내부적으로 클로저를 통해 config와 client를 간직한 객체가 반환됨
        const adapterInstance = createAdapter(deviceController);

        // 4. [Safety] 인터페이스 검사 (주로 개발/스테이징 단계에서 유용)
        if (process.env.NODE_ENV !== 'production') {
            validateInterface(adapterInstance, protocolCode);
        }

        return adapterInstance;

    } catch (error) {
        logger.error(`[AdapterFactory] 어댑터 생성 실패: ${error.message}`);
        throw error;
    }
};