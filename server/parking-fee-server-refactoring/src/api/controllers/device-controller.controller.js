const DeviceControllerService = require('../../services/device-controller.service');
const service = new DeviceControllerService();

/**
 * Device Controller Controller
 * - 장비 제어 서비스(Device Controller) 관련 HTTP 요청 처리
 */
class DeviceControllerController {
    /**
     * 생성 (Create)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async create(req, res, next) {
        try {
            const data = await service.create(req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { deviceControllersCount: { 'add': 1 }});
            }
            res.status(200).json({ status: 'OK' });

            // res.status(200).json({ status: 'OK', data });
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
            const data = await service.findAll(params);
            res.status(200).json({ status: 'OK', data: data });
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
            const data = await service.findDetail(id);
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
            const data = await service.update(id, req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { deviceControllersCount: { 'add': 1 }});
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
            
            const data = await service.delete(id);
            
            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { deviceControllersCount: { 'add': 1 }});
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

    /**
     * 다중 삭제 (Delete)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async deleteMultiple(req, res, next) {
        try {
            const { deviceControllerIdList } = req.body;

            const data = await service.deleteMultiple(deviceControllerIdList);
            
            // 옵저버 요청에 맞춘 반환 형식
            if((data) && (data.rowCount > 0) && (global.websocket)) {
                global.websocket.emit("pf_parkings-update", { deviceControllersCount: { 'add': data.rowCount }});
            }
            res.status(200).json({ status: 'OK' });

            // res.status(200).json({ 
            //     status: 'OK', 
            //     message: 'Device Controller deleted successfully',
            //     data: {
            //         id: id,
            //         deleteType: result.isHardDelete ? 'HARD' : 'SOFT'
            //     }
            // });
        } catch (error) {
            next(error);
        }
    }
    



}

module.exports = new DeviceControllerController();