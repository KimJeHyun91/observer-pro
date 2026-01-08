const PolicyService = require('../../services/policy.service');
const service = new PolicyService();

/**
 * Policy Controller
 * - 요금 및 할인 정책 관련 HTTP 요청 처리
 */
class PolicyController {
    /**
     * 정책 생성 (Create)
     */
    async create(req, res, next) {
        try {
            const data = await service.create(req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if(global.websocket) {
                global.websocket.emit("pf_parking_status-update", { "message": "ok" });
            }
            res.status(200).json({});

            // res.status(201).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 정책 목록 조회 (Find All)
     */
    async findAll(req, res, next) {
        try {
            const params = req.query;
            const result = await service.findAll(params);
            res.status(200).json({ status: 'success', data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 정책 상세 조회 (Find Detail)
     */
    async findDetail(req, res, next) {
        try {
            const { id } = req.params;
            const data = await service.findDetail(id);
            res.status(200).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 정책 정보 수정 (Update)
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updatedData = await service.update(id, req.body);

            // 옵저버 요청에 맞춘 반환 형식
            if(global.websocket) {
                global.websocket.emit("pf_parking_status-update", { "message": "ok" });
            }
            res.status(200).json({});

            // res.status(200).json({ status: 'success', data: updatedData });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 정책 삭제 (Delete)
     * - deleteMethod('SOFT'|'HARD')에 따라 처리
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const deleteMethod = req.query.deleteMethod || 'SOFT';
            const isHardDelete = deleteMethod === 'HARD';
            
            const result = await service.delete(id, isHardDelete);
            
            // 옵저버 요청에 맞춘 반환 형식
            if(global.websocket) {
                global.websocket.emit("pf_parking_status-update", { "message": "ok" });
            }
            res.status(200).json({});
            
            // res.status(200).json({ 
            //     status: 'success', 
            //     message: 'Policy deleted successfully',
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

module.exports = new PolicyController();