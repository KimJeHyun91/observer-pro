const deviceControllerService = require('../../services/device-controller.service');
const socketService = require('../../services/socket.service');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (req, res, next) => {
    try {
        const data = await deviceControllerService.findAll(req.query);
        res.status(200).json({ status: 'OK', message: 'success', data });
    } catch (error) {
        next(error);
    }
};

/**
 * 상세 조회 (Find Detail)
 */
exports.findDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await deviceControllerService.findDetail(id);
        res.status(200).json({ status: 'OK', message: 'success', data });
    } catch (error) {
        next(error);
    }
};

/**
 * 생성 (Create)
 */
exports.create = async (req, res, next) => {
    try {
        await deviceControllerService.create(req.body);
        socketService.emitDeviceControllerRefresh();
        res.status(200).json({ status: 'OK', message: 'success' });            
    } catch (error) {
        next(error);
    }
};

/**
 * 수정 (Update)
 */
exports.update = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deviceControllerService.update(id, req.body);
        socketService.emitDeviceControllerRefresh();
        res.status(200).json({ status: 'OK', message: 'success' });
    } catch (error) {
        next(error);
    }
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deviceControllerService.delete(id);
        socketService.emitDeviceControllerRefresh();
        res.status(200).json({ status: 'OK', message: 'success' });
    } catch (error) {
        next(error);
    }
};

/**
 * 다중 삭제 (Multiple Delete)
 */
exports.multipleDelete = async (req, res, next) => {
    try {
        const { ids } = req.body;
        await deviceControllerService.multipleDelete(ids);
        socketService.emitDeviceControllerRefresh();
        res.status(200).json({ status: 'OK', message: 'success' });
    } catch (error) {
        next(error);
    }
}

/**
 * 수동 동기화 (Manual Sync)
 */
exports.sync = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deviceControllerService.sync(id);
        socketService.emitDeviceControllerRefresh();
        res.status(200).json({ status: 'OK', message: 'success' });
    } catch (error) {
        next(error);
    }
}