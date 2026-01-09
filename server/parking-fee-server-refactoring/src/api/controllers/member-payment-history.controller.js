const MemberPaymentHistoryService = require('../../services/member-payment-history.service');
const memberPaymentHistoryService = new MemberPaymentHistoryService();

/**
 * Member Payment History Controller
 * - 회원 결제 기록 관련 HTTP 요청을 처리하는 컨트롤러입니다.
 */
class MemberPaymentHistoryController {
    /**
     * 생성 (Create)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async create(req, res, next) {
        try {
            const data = await memberPaymentHistoryService.create(req.body);            
            res.status(200).json({ status: 'OK', data: data });
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
            const data = await memberPaymentHistoryService.findAll(params);
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
            const data = await memberPaymentHistoryService.findDetail(id);
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
            const data = await memberPaymentHistoryService.update(id, req.body);
            res.status(200).json({ status: 'OK', data: data });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new MemberPaymentHistoryController();