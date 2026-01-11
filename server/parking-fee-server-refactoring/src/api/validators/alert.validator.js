const { query, param } = require('express-validator');

exports.getAlerts = [
    query('page').optional().isInt({ min: 1 }).withMessage('page는 1 이상의 정수여야 합니다.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('limit은 1 이상의 정수여야 합니다.'),
    
    query('siteId').optional().isUUID().withMessage('유효한 UUID 형식이어야 합니다.'),
    query('type').optional().isString(),
    query('isRead').optional().isBoolean().toBoolean(), // "true" -> true 변환
    
    // [수정] startTime, endTime으로 변경 (ISO8601은 날짜+시간 포맷 모두 지원)
    query('startTime').optional().isISO8601().withMessage('startTime은 유효한 날짜/시간 형식(ISO8601)이어야 합니다.'),
    query('endTime').optional().isISO8601().withMessage('endTime은 유효한 날짜/시간 형식(ISO8601)이어야 합니다.'),
];

exports.markAsRead = [
    param('id').notEmpty().withMessage('ID는 필수입니다.').isUUID().withMessage('유효한 UUID 형식이어야 합니다.'),
];