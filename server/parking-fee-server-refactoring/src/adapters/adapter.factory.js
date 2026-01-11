const DeviceControllerRepository = require('../repositories/device-controller.repository');
const PlsAdapter = require('./pls/pls.adapter');
const logger = require('../../../logger'); 

const repository = new DeviceControllerRepository();

class AdapterFactory {
    /**
     * 특정 장비 제어 미들웨어(Device Controller)에 연결하기 위한 어댑터 인스턴스를 반환합니다.
     * * @param {string} deviceControllerId - DB의 device_controllers.id (UUID)
     * @returns {Promise<object>} 해당 컨트롤러 타입에 맞는 Adapter 인스턴스
     */
    static async getAdapter(deviceControllerId) {
        try {
            // 1. DB에서 설정 정보 조회 (Service가 아닌 Repository 사용 -> 순환 참조 방지)
            const deviceController = await repository.findById(deviceControllerId);

            if (!deviceController) {
                throw new Error(`장비 제어 서비스를 찾을 수 없습니다: ${deviceControllerId}`);
            }

            // 2. 컨트롤러 코드(또는 타입)에 따라 적절한 어댑터 반환
            // PLS 외에 다른 장비가 추가되면 case 문만 늘리면 됨
            
            // 코드(Code)나 벤더(Vendor) 등을 식별자로 사용 (여기선 'code' 사용 가정)
            // 만약 code가 없으면 type이나 description 등으로 판단 로직 추가 가능
            const typeCode = deviceController.code || 'PLS'; // 기본값 PLS (또는 에러 처리)

            switch (typeCode.toUpperCase()) {
                case 'PLS': 
                    return new PlsAdapter(deviceController);
                
                // [확장 예시]
                // case 'HIKVISION':
                //     return new HikvisionAdapter(deviceController);

                default:
                    // 코드가 명시되지 않았거나 지원하지 않는 경우, 
                    // 일단 PLS로 시도하거나 에러를 던질 수 있습니다.
                    logger.warn(`[AdapterFactory] 알 수 없는 장비 코드(${typeCode}). PLS 어댑터를 기본값으로 사용합니다.`);
                    return new PlsAdapter(deviceController);
            }

        } catch (error) {
            logger.error(`[AdapterFactory] 어댑터 생성 실패: ${error.message}`);
            throw error;
        }
    }
}

module.exports = AdapterFactory;