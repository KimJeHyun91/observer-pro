const { body, param, query } = require('express-validator');
const dayjs = require('dayjs');

const validateId = param('id')
    .notEmpty().withMessage('id는 필수입니다.')
    .isUUID().withMessage('유효하지 않은 UUID 형식입니다.');

/**
 * 알림(Alert) 목록 조회 유효성 검사
 */
exports.getAlerts = [
    // 페이징
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('page는 1이상의 숫자여야 합니다.')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1 }).withMessage('limit은 1이상의 숫자여야 합니다.')
        .toInt(),
    
    // 정렬
    query('sortBy')
        .optional()
        .isString().withMessage('sortBy는 문자열이어야 합니다.')
        .trim()
        .isIn(['createdAt', 'updatedAt'])
        .withMessage('정렬 기준이 올바르지 않습니다. (허용: createdAt, updatedAt)'),

    query('sortOrder')
        .optional()
        .toUpperCase()
        .isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'여야 합니다."),

    // 기본 검색
    query('siteId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),
    
    query('type')
        .optional()
        .toUpperCase()
        .isIn(['DEVICE_ERROR', 'WATCHLIST_VEHICLE', 'ILLEGAL_PARKING', 'SYSTEM_ERROR']).withMessage("type은 'DEVICE_ERROR', 'WATCHLIST_VEHICLE', 'ILLEGAL_PARKING', 'SYSTEM_ERROR' 중 하나여야 합니다."),

    query('severity')
        .optional()
        .toUpperCase()
        .isIn(['INFO', 'WARNING', 'CRITICAL']).withMessage("severity은 'INFO', 'WARNING', 'CRITICAL' 중 하나여야 합니다."),

    query('status')
        .optional()
        .toUpperCase()
        .isIn(['NEW', 'CHECKED', 'RESOLVED', 'FALSE_ALARM']).withMessage("status은 'NEW','CHECKED', 'RESOLVED', 'FALSE_ALARM' 중 하나여야 합니다."),

    query('parkingSessionId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),
    
    query('carNumber')
        .optional()
        .isString().withMessage('carNumber는 문자열이어야 합니다.')
        .trim()
        .customSanitizer(value => value.replace(/\s+/g, ''))
        .isLength({ min: 1 }).withMessage('carNumber에 공백만 입력할 수 없습니다.'),

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
            }),
];

/**
 * 알림(Alert) 상세 조회 유효성 검사
 */
exports.getAlert = [
    validateId
];

/**
 * 알림(Alert) 수정 유효성 검사
 */
exports.updateAlert = [
    validateId,

    body('status')
        .optional()
        .toUpperCase()
        .isIn(['CHECKED', 'RESOLVED', 'FALSE_ALARM']).withMessage("status은 'CHECKED', 'RESOLVED', 'FALSE_ALARM' 중 하나여야 합니다."),

    body('note')
        .optional()
        .isString().withMessage('note는 문자열이어야 합니다.')
];