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

exports.isAdmin = (req, res, next) => {
    // verifyToken에서 req.user에 토큰 정보를 담아두었다고 가정
    // role이 'admin'이 아니면 에러 처리
    if (!req.user || req.user.role !== 'admin') {
        const error = new Error('관리자 권한이 필요합니다.');
        error.status = 403; // Forbidden
        return next(error);
    }
    next(); // 통과
};