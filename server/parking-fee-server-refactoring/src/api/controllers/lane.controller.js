const LaneService = require('../../services/lane.service');
const laneService = new LaneService();

/**
 * Lane Controller
 * - 차선(Lane) 관련 HTTP 요청 처리
 */
class LaneController {
    /**
     * 생성 (Create)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async create(req, res, next) {
        try {
            const data = await laneService.create(req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { lanesCount: { 'add': 1 }});
            }
            res.status(200).json({ status: 'OK' });

            // res.status(200).json({ status: 'OK', data: lane });
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
            const data = await laneService.findAll(params);

            const mappedLanes = data.lanes.map(lane => ({
                id: lane.id,
                zoneId: lane.zoneId,
                name: lane.name,
                createdAt: lane.createdAt,
                updatedAt: lane.updatedAt,
                devices: (lane.devices || []).map(device => ({
                    id: device.id,
                    laneId: lane.id,
                    ipAddress: device.ipAddress,
                    port: device.port,
                    type: device.type,
                    direction: device.direction,
                    location: device.location
                }))
            }));
            const response = {
                status: "ok",
                data: {
                    lanes: mappedLanes,
                    meta: data.meta
                }
            };
            return res.status(200).json(response);

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
            const data = await laneService.findDetail(id);
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
            const data = await laneService.update(id, req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { lanesCount: { 'add': 1 }});
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

            const data = await laneService.delete(id);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { lanesCount: { 'add': 1 }});
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

module.exports = new LaneController();