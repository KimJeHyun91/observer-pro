const plsAdapter = require('../adapters/pls/pls.adapter'); // 또는 adapterFactory 사용
const deviceRepository = require('../repositories/device.repository');
const deviceControlServerRepository = require('../repositories/device-controller.repository');
const logger = require('../utils/logger');

class DisplayService {
    /**
     * 전광판에 메시지 표시 (기본)
     * @param {string} deviceId - 전광판 장비 ID
     * @param {string} line1 - 첫 번째 줄 텍스트
     * @param {string} line2 - 두 번째 줄 텍스트 (옵션)
     */
    async showMessage(deviceId, line1, line2 = '') {
        try {
            // 1. 장비 정보 조회
            const device = await deviceRepository.findById(deviceId);
            if (!device || device.deviceType !== 'LED') {
                logger.warn(`[DisplayService] 유효하지 않은 전광판 장비 ID: ${deviceId}`);
                return;
            }

            // 2. 연결된 시스템(PLS) 정보 조회
            const extSystem = await deviceControlServerRepository.findById(device.deviceControlServerId);
            if (!extSystem) {
                logger.warn(`[DisplayService] 전광판(${device.name})의 제어 시스템 정보를 찾을 수 없습니다.`);
                return;
            }

            // 3. 어댑터를 통해 메시지 전송
            // PLS API: { kind: 'ledd', cmd: 'display', text: '...' } 등 규격에 맞춤
            // 여기서는 plsAdapter.sendDisplay가 있다고 가정하고 호출
            logger.info(`[DisplayService] 전광판(${device.name}) 메시지 전송: "${line1}" / "${line2}"`);
            
            // TODO: plsAdapter에 sendDisplay 메서드 구현 필요
            // await plsAdapter.sendDisplay(extSystem, device, line1, line2);

        } catch (error) {
            logger.error(`[DisplayService] 메시지 전송 실패: ${error.message}`);
        }
    }

    /**
     * 입차 환영 메시지 ("어서오세요")
     */
    async showWelcome(deviceId) {
        return this.showMessage(deviceId, "어서오세요", "반갑습니다");
    }

    /**
     * 정기권 차량 메시지 ("정기권 차량")
     */
    async showMember(deviceId, carNumber) {
        return this.showMessage(deviceId, "정기권 차량", carNumber);
    }

    /**
     * 출차 요금 안내 ("요금 1000원")
     */
    async showFee(deviceId, fee) {
        return this.showMessage(deviceId, "주차 요금", `${fee.toLocaleString()}원`);
    }

    /**
     * 출차 완료 메시지 ("안녕히가세요")
     */
    async showGoodbye(deviceId) {
        return this.showMessage(deviceId, "안녕히가세요", "감사합니다");
    }
}

module.exports = new DisplayService();