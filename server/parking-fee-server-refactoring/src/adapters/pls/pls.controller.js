const plsService = require('./pls.service');
const logger = require('../../../../logger');

class PlsController {

    /**
     * 차량 감지 (Loop) 신호 수신 (단순 알림)
     * POST /receive/vehicle_det
     */
    handleVehicleDetection = async (req, res, next) => {
        try {
            const { loop, status, location } = req.body;
            
            // 1. [즉시 응답]
            res.json({ status: 'ok', message: 'Loop data received' });

            // 2. [비동기 처리] 관제 클라이언트에 알림 전송 등 (차단기 제어 X)
            plsService.processVehicleDetection({ loop, status, locationName: location })
                .catch(err => {
                    logger.error(`[PLS Controller] 루프 처리 오류: ${err.message}`);
                });

        } catch (error) {
            next(error);
        }
    }

    /**
     * [Step 2] 차량 번호 인식 데이터 수신 (입차 판단 및 제어)
     * POST /receive/lpr_data
     */
    handleLprData = async (req, res, next) => {
        try {
            const { lp, imgurl, location, in_time } = req.body;

            if (!lp) {
                logger.warn('[PLS Controller] LPR 데이터 누락: 차량번호 없음');
                return res.status(400).json({ status: 'ng', message: 'Missing license plate number' });
            }

            // 1. [즉시 응답] PLS에게 수신 확인 (ACK)
            res.json({ status: 'ok', message: 'LPR data received' });

            // 2. [비동기 처리] 입차 판단 및 차단기 제어 로직 실행
            const lprData = {
                carNumber: lp,
                imageUrl: imgurl,
                locationName: location,
                entryTime: in_time || new Date()
            };

            plsService.processLprData(lprData)
                .catch(err => {
                    logger.error(`[PLS Controller] 입차 처리 오류 (${lp}): ${err.message}`);
                });

        } catch (error) {
            next(error);
        }
    }

    

    /**
     * 장비 상태 변경 수신
     */
    handleDeviceStatus = async (req, res, next) => {
        try {
            res.json({ status: 'ok' });
            // TODO: 장비 상태 DB 업데이트
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PlsController();