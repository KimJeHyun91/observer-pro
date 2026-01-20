/**
 * 역할 기반 접근 제어(RBAC) 미들웨어 Factory
 * @param {string[]} allowedRoles - 접근을 허용할 역할 배열 (예: ['admin', 'user'])
 * @returns {Function} Express Middleware
 */
exports.restrictTo = (allowedRoles) => {
    return (req, res, next) => {
        // 0. 개발자 설정 오류 방지
        if (!Array.isArray(allowedRoles)) {
            const err = new Error('Server Configuration Error: allowedRoles must be an array.');
            err.status = 500; 
            return next(err);
        }
        
        // 1. 인증 정보 확인 (verifyToken 미들웨어 통과 여부)
        if (!req.session) {
            
            const err = new Error('인증 정보가 유효하지 않습니다.');
            err.status = 401;
            return next(err);
        }

        // console.log(`User Role: ${req.session.user_role}`);

        // 2. 권한 확인
        if (!allowedRoles.includes(req.session.user_role)) {
            const err = new Error('해당 기능에 대한 접근 권한이 없습니다.');
            err.status = 403; 
            return next(err);        
        }

        // 3. 권한 승인
        next();
    };
};