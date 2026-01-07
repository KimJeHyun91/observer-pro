const LogService = require('../../services/log.service');
const service = new LogService();

/**
 * Log Controller
 * - 각종 로그 데이터 조회를 담당합니다.
 */
class LogController {
    /**
     * 차량 감지 로그 조회
     */
    async findVehicleDetectionLogs(req, res, next) {
        try {
            const params = req.query;
            const result = await service.findVehicleDetectionLogs(params);
            res.status(200).json({ status: 'success', data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 결제 로그 조회
     */
    async findSettlementLogs(req, res, next) {
        try {
            const params = req.query;
            const result = await service.findSettlementLogs(params);
            res.status(200).json({ status: 'success', data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 장비 이벤트 로그 조회
     */
    async findDeviceEventLogs(req, res, next) {
        try {
            const params = req.query;
            const result = await service.findDeviceEventLogs(params);
            res.status(200).json({ status: 'success', data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 통신 로그 조회
     */
    async findLinkLogs(req, res, next) {
        try {
            const params = req.query;
            const result = await service.findLinkLogs(params);
            res.status(200).json({ status: 'success', data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new LogController();