const { body, query, param } = require('express-validator');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const validateId = param('id')
    .notEmpty().withMessage('id는 필수입니다.')
    .isUUID().withMessage('유효하지 않은 UUID 형식입니다.');

/**
 * 휴일(Holiday) 목록 조회 유효성 검사
 */
exports.getHolidays = [
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
        .isIn(['name', 'code', 'siteId', 'date', 'createdAt', 'updatedAt'])
        .withMessage('정렬 기준이 올바르지 않습니다. (허용: name, code, siteId, createdAt, updatedAt)'),

    query('sortOrder')
        .optional()
        .toUpperCase()
        .isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'여야 합니다."),
    
    // 기본 검색
    query('siteId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    query('name')
        .optional()
        .isString().withMessage('name은 문자열이어야 합니다.')
        .trim(),

    query('code')
        .optional()
        .isString().withMessage('code는 문자열이어야 합니다.')
        .trim(),

    query('date')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('날짜 형식이 올바르지 않습니다. (예: 2026-01-01)')
        .custom((value) => {
            const date = dayjs(value, 'YYYY-MM-DD', true); // true: 엄격 모드
            if (!date.isValid()) {
                throw new Error('존재하지 않는 날짜입니다.');
            }
            return true;
        }),

    query('isRecurring')
        .optional()
        .isBoolean().withMessage('isRecurring는 true 또는 false이어야 합니다.')
        .toBoolean()
];

/**
 * 휴일(Holiday) 상세 조회 유효성 검사
 */
exports.getHoliday = [
    validateId
];


/**
 * 휴일(Holiday) 생성 유효성 검사
 */
exports.createHoliday = [
    body('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('name')
        .notEmpty().withMessage('name은 필수입니다.')
        .isString().withMessage('name은 문자열이어야 합니다.')
        .trim(),

    body('description')
        .optional()
        .isString().withMessage('description은 문자열이어야 합니다.')
        .trim(),

    body('code')
        .optional()
        .isString().withMessage('code는 문자열이어야 합니다.')
        .trim(),
    
    body('date')
        .notEmpty().withMessage('date는 필수입니다.')
        .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('날짜 형식이 올바르지 않습니다. (예: 2026-01-01)')
        .custom((value) => {
            const date = dayjs(value, 'YYYY-MM-DD', true); // true: 엄격 모드
            if (!date.isValid()) {
                throw new Error('존재하지 않는 날짜입니다.');
            }
            return true;
        }),


    body('isRecurring')
        .exists().withMessage('isRecurring은 필수입니다.')
        .isBoolean().withMessage('isRecurring는 true 또는 false이어야 합니다.')
        .toBoolean()
];

/**
 * 휴일(Holiday) 수정 유효성 검사
 */
exports.updateHoliday = [
    validateId,

    body('siteId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('name')
        .optional()
        .isString().withMessage('name은 문자열이어야 합니다.')
        .trim(),

    body('description')
        .optional()
        .isString().withMessage('description은 문자열이어야 합니다.')
        .trim(),

    body('code')
        .optional()
        .isString().withMessage('code는 문자열이어야 합니다.')
        .trim(),
    
    body('date')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('날짜 형식이 올바르지 않습니다. (예: 2026-01-01)')
        .custom((value) => {
            const date = dayjs(value, 'YYYY-MM-DD', true); // true: 엄격 모드
            if (!date.isValid()) {
                throw new Error('존재하지 않는 날짜입니다.');
            }
            return true;
        }),

    body('isRecurring')
        .optional()
        .isBoolean().withMessage('isRecurring는 true 또는 false이어야 합니다.')
        .toBoolean()
];


/**
 * 휴일(Holiday) 삭제 유효성 검사
 */
exports.deleteHoliday = [
    validateId
];

