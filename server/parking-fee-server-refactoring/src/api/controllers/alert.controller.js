const alertService = require('../../services/alert.service');

class AlertController {

    /**
     * 알림 목록 조회 (GET /api/v1/alerts)
     */
    async findAll(req, res, next) {
        try {
            // 쿼리 파라미터 전달 (page, limit, siteId, isRead 등)
            const data = await alertService.findAll(req.query);
            
            res.status(200).json({ 
                status: 'OK', 
                data: data 
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 알림 읽음 처리 (PATCH /api/v1/alerts/:id/read)
     */
    async markAsRead(req, res, next) {
        try {
            const { id } = req.params;
            const data = await alertService.markAsRead(id);

            res.status(200).json({ 
                status: 'OK', 
                message: '알림을 읽음 상태로 변경했습니다.',
                data 
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AlertController();