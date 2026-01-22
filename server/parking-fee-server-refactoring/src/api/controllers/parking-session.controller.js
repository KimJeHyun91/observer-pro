const parkingSessionService = require('../../services/parking-session.service');
const socketService = require('../../services/socket.service');
const lockService = require('../../services/lock.service');

/**
 * =================================================================
 * [Section 0] 동시성 제어 (Redis Lock)
 * =================================================================
 */

// 1. [점유 시작] 수정 권한 획득 (POST /:id/lock)
exports.acquireLock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const operator = req.session; 

        await lockService.acquireLock(`parking-session:${id}`, operator.user_id, operator.user_name);

        res.status(200).json({ status: 'OK', message: '세션 점유에 성공했습니다.', data: { parkingSessionId: id, owner: operator.name }});
    } catch (error) {
        next(error);
    }
};

// 2. [점유 연장] Heartbeat (PUT /:id/lock)
exports.extendLock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const operator = req.session;

        // 락 연장 시도 (실패 시 false 반환 또는 에러)
        const success = await lockService.extendLock(`parking-session:${id}`, operator.user_id);

        if (!success) {
            const error = new Error('점유 시간이 만료되었거나 권한이 없습니다.');
            error.status = 409;
            throw error;
        }

        res.status(200).json({ status: 'OK', message: '세션 점유 시간이 연장되었습니다.' });
    } catch (error) {
        next(error);
    }
};

// 3. [점유 해제] (DELETE /:id/lock)
exports.releaseLock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const operator = req.session;

        await lockService.releaseLock(`parking-session:${id}`, operator.user_id);

        res.status(200).json({ status: 'OK', message: '세션 점유가 해제되었습니다.' });
    } catch (error) {
        next(error);
    }
};

/**
 * =================================================================
 * [Section 1] Lock 검증 불필요
 * =================================================================
 */

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (req, res, next) => {
    try {
        const data = await parkingSessionService.findAll(req.query);
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
        const data = await parkingSessionService.findDetail(id);
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
        await parkingSessionService.create(req.body);
        socketService.emitParkingSessionRefresh();
        res.status(200).json({ status: 'OK', message: 'success' });            
    } catch (error) {
        next(error);
    }
};

// 수동 입차
exports.entry = async (req, res, next) => {
    try {
        const data = await parkingSessionService.entry(req.body);
        res.status(200).json({ status: 'OK', message: 'success', data });  
    } catch (error) {
        next(error);
    }
};

/**
 * =================================================================
 * [Section 2] Lock 검증 필요
 * =================================================================
 */

// 수동 출차
exports.exit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const operator = req.session;
        const data = await parkingSessionService.processExit(id, req.body, operator);
        res.status(200).json({ status: 'OK', message: 'success', data });  
    } catch (error) {
        next(error);
    }
};

// 할인 적용
exports.applyDiscount = async (req, res, next) => {
    try {
        const { id } = req.params;
        const operator = req.session;
        const data = await parkingSessionService.applyDiscount(id, req.body, operator);
        res.status(200).json({ status: 'OK', message: 'success', data });  
    } catch (error) {
        next(error);
    }
};

// 수정 (Update)
exports.updateInfo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const operator = req.session;
        const data = await parkingSessionService.update(id, req.body, operator);
        res.status(200).json({ status: 'OK', message: 'success', data });  
    } catch (error) {
        next(error);
    }
};