const SiteService = require('../../services/site.service');
const siteService = new SiteService();

/**
 * Site Controller
 * - 주차장 사이트 관련 HTTP 요청을 처리하는 컨트롤러입니다.
 */
class SiteController {
    /**
     * 생성 (Create)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async create(req, res, next) {
        try {
            const site = await siteService.create(req.body);

            // 옵저버 프로 구조에 맞춘 반환 형식
            if(global.websocket) {
                global.websocket.emit("pf_parking_status-update", { "message": "ok" });
            }
            
            res.status(200).json({ status: 'ok', data: site });

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
            const result = await siteService.findAll(params);
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
            const site = await siteService.findDetail(id);
            res.status(200).json({ status: 'ok', data: site });
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
            const updatedSite = await siteService.update(id, req.body);

            // 옵저버 프로 구조에 맞춘 반환 형식
            if(global.websocket) {
                global.websocket.emit("pf_parking_status-update", { "message": "ok" });
            }

            res.status(200).json({ status: 'ok', data: updatedSite });
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
            
            const result = await siteService.delete(id, isHardDelete);

            // 옵저버 프로 구조에 맞춘 반환 형식
            if(global.websocket) {
                global.websocket.emit("pf_parking_status-update", { "message": "ok" });
            }

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

module.exports = new SiteController();