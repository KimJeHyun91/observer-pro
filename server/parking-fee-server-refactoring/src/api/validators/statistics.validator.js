const { query, param } = require('express-validator');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

/**
 * 대시보드(Dashboard) 조회 유효성 검사
 */
exports.validateGetDashboard = [
    param('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효한 UUID가 아닙니다.'),

    query('baseMonth')
        .notEmpty().withMessage('기준 월(baseMonth)은 필수입니다.')
        // 1차: 포맷 검사 (Regex) - 빠른 필터링
        .matches(/^\d{4}-\d{2}$/).withMessage('YYYY-MM 형식이어야 합니다. (예: 2025-04)')
        // 2차: 실제 날짜 유효성 검사 (Logic)
        .custom((value) => {
            // 'YYYY-MM' 형식과 일치하며, 실제로 존재하는 날짜인지 엄격하게(true) 확인
            const isValidDate = dayjs(value, 'YYYY-MM', true).isValid();
            
            if (!isValidDate) {
                // 예: 2025-13, 2025-00 등
                throw new Error('존재하지 않는 날짜(월)입니다.');
            }
            return true; // 통과
        })
];

/**
 * 요약(Summary) 조회 유효성 검사
 */
exports.validateGetSummary = [
    param('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효한 UUID가 아닙니다.'),

    query('startTime')
        .notEmpty().withMessage('시작 시간(startTime)은 필수입니다.')
        // YYYY-MM-DD 형식 검사 (예: 2025-04-01)
        .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('YYYY-MM-DD 형식이어야 합니다. (예: 2025-04-01)')
        .custom((value) => {
            // 실제 달력에 존재하는 날짜인지 검사 (예: 2025-02-30 방지)
            const isValidDate = dayjs(value, 'YYYY-MM-DD', true).isValid();
            if (!isValidDate) {
                throw new Error('존재하지 않는 날짜입니다.');
            }
            return true;
        }),

    query('endTime')
        .notEmpty().withMessage('종료 시간(endTime)은 필수입니다.')
        // YYYY-MM-DD 형식 검사
        .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('YYYY-MM-DD 형식이어야 합니다. (예: 2025-04-30)')
        .custom((value, { req }) => {
            const isValidDate = dayjs(value, 'YYYY-MM-DD', true).isValid();
            if (!isValidDate) {
                throw new Error('존재하지 않는 날짜입니다.');
            }
            
            // 종료일이 시작일보다 앞서면 안 됨
            if (dayjs(value).isBefore(dayjs(req.query.startTime))) {
                throw new Error('종료 날짜는 시작 날짜보다 이후여야 합니다.');
            }
            return true;
        })
];