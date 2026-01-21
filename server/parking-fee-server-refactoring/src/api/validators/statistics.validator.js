const { param, query } = require('express-validator');

/**
 * 대시보드(Dashboard) 조회
 */
exports.validateGetDashboard = [
    query('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효한 UUID가 아닙니다.'),

    query('year')
        .notEmpty().withMessage('연도(year)를 선택해주세요.')
        .isInt({ min: 2000, max: 2100 }),

    query('month')
        .notEmpty().withMessage('월(month)을 선택해주세요.')
        .isInt({ min: 1, max: 12 })
];