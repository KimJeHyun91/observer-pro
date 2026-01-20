const memberService = require('../../services/member.service');
const socketService = require('../../services/socket.service');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (req, res, next) => {
    try {
        const data = await memberService.findAll(req.query);
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
        const data = await memberService.findDetail(id);
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
        await memberService.create(req.body);
        socketService.emitMemberRefresh();
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
        await memberService.update(id, req.body);
        socketService.emitMemberRefresh();
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
        await memberService.delete(id);
        socketService.emitMemberRefresh();
        res.status(200).json({ status: 'OK', message: 'success' });
    } catch (error) {
        next(error);
    }
};
