const PolicyService = require('../../services/policy.service');
const policyService = new PolicyService();

/**
 * Policy Controller
 * - 정책(Policy) 관련 HTTP 요청을 처리하는 컨트롤러입니다.
 */
class PolicyController {
    /**
     * 생성 (Create)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async create(req, res, next) {
        try {
            const data = await policyService.create(req.body);            
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
            const data = await policyService.findAll(params);

            // 옵저버 요청에 맞춘 반환 형식
            // res.status(200).json({ 
            //     status: 'OK', 
            //     data: {
     
            //         meta: data.meta
            //     }
            // });

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
            const data = await policyService.findDetail(id);

            // 옵저버 요청에 맞춘 반환 형식
            // res.status(200).json({ 
            //     status: 'OK', 
            //     data: {
     
            //         meta: data.meta
            //     }
            // });

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
            const data = await policyService.update(id, req.body);

            // 옵저버 요청에 맞춘 반환 형식
            // res.status(200).json({ 
            //     status: 'OK', 
            //     data: {
     
            //         meta: data.meta
            //     }
            // });

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

            const data = await policyService.delete(id);
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

    /**
     * 정책 초기화
     * - 특정 사이트의 정책을 모두 지우고 기본값으로 세팅합니다.
     */
    async initializeDefaults(req, res, next) {
        try {
            const { siteId } = req.body;

            const result = await policyService.initializeDefaults(siteId);

            res.status(200).json({
                status: 'OK',
                message: '해당 사이트의 정책이 초기화되었습니다.',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PolicyController();