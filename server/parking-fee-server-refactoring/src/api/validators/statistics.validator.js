const { param, query } = require('express-validator');

exports.validateGetStatistics = [
    // [변경] Path Parameter 검증
    param('siteId')
        .notEmpty().withMessage('siteId Path Parameter는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

    // [신규] 조회 범위(scope) 검증 (확장성 고려)
    query('scope')
        .optional()
        .trim()
        .isIn(['TODAY']) // 추후 'week', 'month' 추가 가능
        .withMessage('지원하지 않는 통계 범위(scope)입니다. (현재는 TODAY만 지원)')
];