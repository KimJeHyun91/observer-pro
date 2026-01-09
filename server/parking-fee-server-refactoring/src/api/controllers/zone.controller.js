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
            const data = await zoneService.create(req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { zonesCount: { 'add': 1 }});
            }
            res.status(200).json({ status: 'OK' });

            // res.status(200).json({ status: 'OK', data: zone });
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
            const data = await zoneService.findAll(params);

            // 옵저버 요청에 맞춘 반환 형식
            const zonesOnly = data.zones.map(zone => ({
                id: zone.id,
                siteId: zone.siteId,
                name: zone.name,
                createdAt: zone.createdAt,
                updatedAt: zone.updatedAt
            }));
            const response = {
                status: "ok",
                data: {
                    zones: zonesOnly,
                    meta: {
                        totalItems: data.meta.totalItems,
                        totalPages: data.meta.totalPages,
                        currentPage: data.meta.currentPage,
                        itemsPerPage: data.meta.itemsPerPage
                    }
                }
            };
            res.status(200).json(response);

            // res.status(200).json({ status: 'OK', data: data });
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
            const data = await zoneService.findDetail(id);
            res.status(200).json({ status: 'OK', data: data });
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
            const data = await zoneService.update(id, req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { zonesCount: { 'add': 1 }});
            }
            res.status(200).json({ status: 'OK' });

            // res.status(200).json({ status: 'OK', data: data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 삭제 (Delete)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            
            const data = await zoneService.delete(id);
            
            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { zonesCount: { 'add': 1 }});
            }
            res.status(200).json({ status: 'OK' });

            // res.status(200).json({ 
            //     status: 'OK', 
            //     message: '성공적으로 삭제되었습니다.',
            //     data: {
            //         id: data.id
            //     }
            // });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ZoneController();