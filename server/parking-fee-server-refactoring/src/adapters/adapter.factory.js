const DeviceControllerRepository = require('../repositories/device-controller.repository');
const PlsAdapter = require('./pls/pls.adapter');
const logger = require('../../../logger'); 

/**
 * ==============================================================================
 * Adapter Factory
 * ------------------------------------------------------------------------------
 * 역할:
 * 1. 장비 제어기 ID(deviceControllerId)를 입력받습니다.
 * 2. DB에서 해당 제어기의 설정 정보(IP, Port, Protocol Type 등)를 조회합니다.
 * 3. 프로토콜 타입(PLS, Hikvision 등)에 맞는 구체적인 Adapter 인스턴스를 생성하여 반환합니다.
 * ==============================================================================
 */
class AdapterFactory {
    constructor() {
        this.deviceControllerRepository = new DeviceControllerRepository();
    }

    /**
     * 장비 제어기 ID를 받아 적절한 어댑터 인스턴스를 반환합니다.
     * * @param {string} deviceControllerId - DB의 device_controllers.id (UUID)
     * @returns {Promise<BaseAdapter>} 해당 프로토콜을 구현한 Adapter 인스턴스
     * @throws {Error} 장비 제어기 정보를 찾을 수 없거나 지원하지 않는 프로토콜일 때
     */
    async getAdapter(deviceControllerId) {

        if (!deviceControllerId) {
            throw new Error('[AdapterFactory] deviceControllerId가 유효하지 않습니다.');
        }
        
        try {
            // 1. DB에서 장비 제어기 설정 정보 조회
            const deviceController = await this.deviceControllerRepository.findById(deviceControllerId);

            if (!deviceController) {
                throw new Error(`[AdapterFactory] 장비 제어기 정보를 찾을 수 없습니다. ID: ${deviceControllerId}`);
            }

            // 2. 장비 프로토콜 코드(Type) 식별
            const protocolCode = deviceController.code;

            // 3. 타입에 따른 어댑터 생성 및 반환
            // 여기서 생성자에 config 객체 전체를 넘겨줍니다. (BaseAdapter 생성자 시그니처와 일치)
            switch (protocolCode.toUpperCase()) {
                case 'PLS': 
                    return new PlsAdapter(deviceController);
                
                // [확장 포인트] 추후 다른 장비(예: HIKVISION, DAHUA 등)가 추가되면 case만 늘리면 됩니다.
                // case 'HIKVISION':
                //      return new HikvisionAdapter(deviceController);

                default:
                    throw new Error(`[AdapterFactory] 지원하지 않는 장비 프로토콜입니다: ${protocolCode}`);
            }

        } catch (error) {
            logger.error(`[AdapterFactory] 어댑터 생성 실패 (ID: ${deviceControllerId}): ${error.message}`);
            throw error;
        }
    }
}

module.exports = new AdapterFactory();