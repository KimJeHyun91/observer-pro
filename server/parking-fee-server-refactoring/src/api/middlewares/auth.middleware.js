const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer Token

  if (!token) return res.status(401).json({ message: 'Access Denied' });

  try {
    const secret = 'observer'; // auth.js와 동일한 시크릿 키 사용
    const decoded = jwt.verify(token, secret);
    
    // decoded 객체에는 이제 { id, role, logindatetime, ... }이 들어있음
    req.user = decoded; 
    
    // 관리자(admin)라면 모든 권한 허용 (필요에 따라 로직 조정)
    if (req.user.role === 'admin') {
        req.isAdmin = true;
    }

    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid Token' });
  }
};

/**
 * 역할 기반 접근 제어 미들웨어
 * @param {string[]} allowedRoles - 허용할 역할들의 배열 (반드시 배열이어야 함)
 * 예: checkRole(['admin']), checkRole(['admin', 'user'])
 */
exports.checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // 0. 개발자 실수 방지: 인자가 배열이 아니면 500 에러 발생
        if (!Array.isArray(allowedRoles)) {
            const error = new Error('Server Configuration Error: checkRole middleware requires an array of roles.');
            error.status = 500; 
            return next(error);
        }

        // 1. verifyToken을 거쳤는지 확인 (토큰 유효성)
        if (!req.user || !req.user.role) {
            const error = new Error('인증 정보가 유효하지 않습니다.');
            error.status = 401;
            return next(error);
        }

        // 2. 현재 유저의 role이 허용된 목록에 있는지 확인
        if (!allowedRoles.includes(req.user.role)) {
            const error = new Error('해당 기능에 대한 접근 권한이 없습니다.');
            error.status = 403; // Forbidden
            return next(error);
        }

        // 3. 권한 있음 -> 통과
        next();
    };
};