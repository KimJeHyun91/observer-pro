const ZoneService = require('../../services/zone.service');
const zoneService = new ZoneService();

/**
 * Zone Controller
 * - 주차장 구역(Zone) 관련 HTTP 요청 처리
 */
class ZoneController {
    /**
     * 생성 (Create)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async create(req, res, next) {
        try {
            const zone = await zoneService.create(req.body);
            res.status(201).json({ status: 'ok', data: zone });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 목록 조회 (Find All)
     * - 검색, 정렬, 페이징 처리가 적용된 목록을 반환합니다.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async findAll(req, res, next) {
        try {
            const params = req.query;
            const result = await zoneService.findAll(params);
            res.status(200).json({ status: 'ok', data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 상세 조회 (Find Detail)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async findDetail(req, res, next) {
        try {
            const { id } = req.params;
            const zone = await zoneService.findDetail(id);
            res.status(200).json({ status: 'ok', data: zone });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 수정 (Update)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updatedZone = await zoneService.update(id, req.body);
            res.status(200).json({ status: 'ok', data: updatedZone });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 삭제 (Delete)
     * - method 파라미터('SOFT' | 'HARD')에 따라 삭제 방식 결정
     * - 기본값은 'HARD' (완전 삭제)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const method = req.query.method || 'HARD';

            console.log(method);
            const isHardDelete = method === 'HARD';
            
            const result = await zoneService.delete(id, isHardDelete);
            
            res.status(200).json({ 
                status: 'ok', 
                message: 'site가 성공적으로 삭제되었습니다.',
                data: {
                    id: id,
                    method: result.isHardDelete ? 'HARD' : 'SOFT'
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ZoneController();