const DeviceService = require('../../services/device.service');
const deviceService = new DeviceService();

/**
 * Device Controller
 * - 물리적 장비(Device) 관련 HTTP 요청 처리
 */
class DeviceController {
    /**
     * 생성 (Create)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async create(req, res, next) {
        try {
            const data = await deviceService.create(req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { devicesCount: { 'add': 1 }});
            }
            res.status(200).json({ status: 'OK' });

            // res.status(201).json({ status: 'OK', data });
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
            const data = await deviceService.findAll(params);

            const mappedDevices = data.devices.map(device => ({
                id: device.id,
                siteId: device.siteId,
                ipAddress: device.ipAddress,
                port: device.port,
                direction: device.direction,
                type: device.type,
                location: device.location,
                createdAt: device.createdAt,
                updatedAt: device.updatedAt
            }));

            return res.status(200).json({
                status: 'OK',
                data: {
                    devices: mappedDevices,
                    meta: data.meta
                }
            });

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
            const data = await deviceService.findDetail(id);
            res.status(200).json({ status: 'OK', data });
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
            const data = await deviceService.update(id, req.body);
            res.status(200).json({ status: 'OK', data: data });
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

            const data = await deviceService.delete(id);

            res.status(200).json({ 
                status: 'OK', 
                message: '성공적으로 삭제되었습니다.',
                data: {
                    id: data.id
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DeviceController();