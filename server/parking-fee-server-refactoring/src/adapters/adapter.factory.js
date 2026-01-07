const PlsAdapter = require('./pls/pls.adapter');
const deviceControllerService = require('../services/device-controller.service');

class AdapterFactory {
    /**
     * 특정 장비 제어 미들웨어(Device Controller)에 연결하기 위한 어댑터를 반환합니다.
     * * @param {string} deviceControllerId - DB의 device_controllers.id (UUID)
     * @returns {object} 해당 컨트롤러 타입에 맞는 Adapter 인스턴스
     */
    static async getAdapter(deviceControllerId) {

        // 1. DB에서 deviceControllerId로 설정 정보 조회
        const deviceController = await deviceControllerService.findById(deviceControllerId);

        if (!deviceController) {
            throw new Error(`장비 제어 서비스를 찾을 수 없습니다: ${deviceControllerId}`);
        }

        // 2. 코드(Code)에 따른 어댑터 인스턴스 생성 및 반환
        switch (deviceController.code) {
            case 'PLS': 
                // PLS 서버와 통신하는 어댑터 반환
                return new PlsAdapter(deviceController);
            
            // case 'OTHER_DEVICE_CONTROLLER':
            //     return new otherDeviceController(config);

            default:
                throw new Error(`지원하지 않는 장비 제어 서비스입니다. code: ${config.code}`);
        }
    }
}

module.exports = AdapterFactory;