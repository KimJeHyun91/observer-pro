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
            const data = await siteService.create(req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { deviceControllerList: { 'add': 1 }});
            }
            res.status(200).json({ status: 'ok' });
            
            // res.status(200).json({ status: 'ok', data: data });
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
            const data = await siteService.findAll(params);

            // 옵저버 요청에 맞춘 반환 형식
            res.status(200).json({ 
                status: 'ok', 
                data: {
                    sites: data.sites.map(site => ({
                        id: site.id,
                        name: site.name,
                        status: site.status, 
                        createdAt: site.createdAt,
                        updatedAt: site.updatedAt
                    })),
                    meta: data.meta
                }
            });

            // res.status(200).json({ status: 'ok', data: data });
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
            const data = await siteService.findDetail(id);
            res.status(200).json({ status: 'ok', data: data });
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
            const data = await siteService.update(id, req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { deviceControllerList: { 'add': 1 }});
            }
            res.status(200).json({ status: 'ok' });

            // res.status(200).json({ status: 'ok', data: updatedSite });
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

            const data = await siteService.delete(id);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { deviceControllerList: { 'add': 1 }});
            }
            res.status(200).json({ status: 'ok' });

            // res.status(200).json({ 
            //     status: 'ok', 
            //     message: 'site가 성공적으로 삭제되었습니다.',
            //     data: {
            //         id: id,
            //     }
            // });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 트리 조회 (Find Tree)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async findTree(req, res, next) {
        try {
            const { id } = req.params;
            const data = await siteService.findTree(id);

            // 옵저버 요청에 맞춘 반환 형식
            const customResponse = {
                status: "ok",
                data: {
                    zones: data.zones.map(zone => ({
                        id: zone.id,
                        siteId: data.id,
                        name: zone.name,
                        createdAt: zone.createdAt,
                        updatedAt: zone.updatedAt,
                        lanes: zone.lanes.map(lane => ({
                            id: lane.id,
                            zoneId: zone.id,
                            name: lane.name,
                            createdAt: lane.createdAt,
                            updatedAt: lane.updatedAt,
                            devices: lane.devices.map(device => ({
                                id: device.id,
                                laneId: lane.id,
                                ipAddress: device.ipAddress,
                                port: device.port,
                                type: device.type,
                                direction: device.direction,
                                location: device.location
                            }))
                        }))
                    }))
                },
                meta: {
                    totalItems: data.zones.length,
                    totalPages: 1,
                    currentPage: 1,
                    itemsPerPage: 10
                }
            };
            res.status(200).json(customResponse);


            // res.status(200).json({ status: 'ok', data: data });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SiteController();