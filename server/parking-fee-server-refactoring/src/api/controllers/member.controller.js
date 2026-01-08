const MemberService = require('../../services/member.service');
const service = new MemberService();

/**
 * Member Controller
 * - 정기권 회원 관련 HTTP 요청 처리
 */
class MemberController {
    /**
     * 회원 생성 (Create)
     */
    async create(req, res, next) {
        try {
            const data = await service.create(req.body);

            // 옵저버 프로 구조에 맞춘 반환 형식
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
     * 회원 목록 조회 (Find All)
     */
    async findAll(req, res, next) {
        try {
            const params = req.query;
            const result = await service.findAll(params);

            // 옵저버 프로 구조에 맞춘 반환 형식
            if(global.websocket) {
                global.websocket.emit("pf_parking_status-update", { "message": "ok" });
            }
            res.status(200).json({});

            // res.status(200).json({ status: 'success', data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 회원 상세 조회 (Find Detail)
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
     * 회원 정보 수정 (Update)
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updatedData = await service.update(id, req.body);
            res.status(200).json({ status: 'success', data: updatedData });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 회원 삭제 (Delete)
     * - deleteMethod('SOFT'|'HARD')에 따라 처리
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const deleteMethod = req.query.deleteMethod || 'SOFT';
            const isHardDelete = deleteMethod === 'HARD';
            
            const result = await service.delete(id, isHardDelete);

            // 옵저버 프로 구조에 맞춘 반환 형식
            if(global.websocket) {
                global.websocket.emit("pf_parking_status-update", { "message": "ok" });
            }
            res.status(200).json({});
            
            // res.status(200).json({ 
            //     status: 'success', 
            //     message: 'Member deleted successfully',
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

module.exports = new MemberController();