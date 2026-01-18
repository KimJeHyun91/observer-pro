const jwt = require('jsonwebtoken');

// 보안: 시크릿 키는 환경 변수(process.env)에서 가져오는 것이 원칙입니다.
// 현재는 'observer'를 사용하지만, 배포 환경에서는 반드시 환경 변수를 설정해야 합니다.
const JWT_SECRET = process.env.JWT_SECRET || 'observer';

/**
 * JWT 토큰 검증 미들웨어
 * 요청 헤더(Authorization)에서 Bearer 토큰을 추출하여 유효성을 검사합니다.
 */
exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Optional Chaining(?.)을 사용하여 authHeader가 없을 때 에러 방지
    const token = authHeader?.split(' ')[1]; 

    if (!token) {
        const err = new Error('토큰이 존재하지 않습니다.');
        err.status = 401;
        return next(err);
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('111111')

        console.log(decoded)

        // 검증된 사용자 정보를 req.user에 저장 ({ id, role, ... })
        req.user = decoded;

        next();
    } catch (error) {
        const err = new Error('유효하지 않은 토큰입니다.');
        err.status = 401; 
        return next(err);      
    }
};

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
        console.log(`!!!!!!!!!!!!!!!: ${req.user.userId}`)
        // 1. 인증 정보 확인 (verifyToken 미들웨어 통과 여부)
        if (!req.user) {
            
            const err = new Error('인증 정보가 유효하지 않습니다.');
            err.status = 401;
            return next(err);
        }

        // 2. 권한 확인
        if (!allowedRoles.includes(req.user.role)) {
            const err = new Error('해당 기능에 대한 접근 권한이 없습니다.');
            err.status = 403; 
            return next(err);        
        }

        // 3. 권한 승인
        next();
    };
};