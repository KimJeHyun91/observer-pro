const holidayService = require('../../services/holiday.service');
const socketService = require('../../services/socket.service');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (req, res, next) => {
    try {
        const data = await holidayService.findAll(req.query);
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
        const data = await holidayService.findDetail(id);
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
        await holidayService.create(req.body);
        socketService.emitHolidayRefresh();
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
        await holidayService.update(id, req.body);
        socketService.emitHolidayRefresh();
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
        await holidayService.delete(id);
        socketService.emitHolidayRefresh();
        res.status(200).json({ status: 'OK', message: 'success' });
    } catch (error) {
        next(error);
    }
};