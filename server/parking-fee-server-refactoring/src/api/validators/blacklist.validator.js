const { body, query, param } = require('express-validator');

const validateId = param('id')
    .notEmpty().withMessage('id는 필수입니다.')
    .isUUID().withMessage('유효하지 않은 UUID 형식입니다.');

/**
 * 블랙리스트(Blacklist) 목록 조회 유효성 검사
 */
exports.getBlacklists = [
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
        .isIn(['carNumber', 'siteId', 'createdAt', 'updatedAt'])
        .withMessage('정렬 기준이 올바르지 않습니다. (허용: carNumber, siteId, createdAt, updatedAt)'),

    query('sortOrder')
        .optional()
        .toUpperCase()
        .isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'여야 합니다."),
    
    // 기본 검색
    query('siteId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    query('carNumber')
        .optional()
        .isString().withMessage('carNumber는 문자열이어야 합니다.')
        .trim()
        .customSanitizer(value => value.replace(/\s+/g, '')),

    query('reason')
        .optional()
        .isString().withMessage('reason은 문자열이어야 합니다.')
        .trim()
];

/**
 * 블랙리스트(Blacklist) 상세 조회 유효성 검사
 */
exports.getBlacklist = [
    validateId
];

/**
 * 블랙리스트(Blacklist) 생성 유효성 검사
 */
exports.createBlacklist = [
    body('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('carNumber')
        .notEmpty().withMessage('carNumber는 필수입니다.')
        .isString().withMessage('carNumber는 문자열이어야 합니다.')
        .trim()
        .customSanitizer(value => value.replace(/\s+/g, '')),

    body('reason')
        .optional()
        .isString().withMessage('reason은 문자열이어야 합니다.')
        .trim()
];

/**
 * 블랙리스트(Blacklist) 수정 유효성 검사
 */
exports.updateBlacklist = [
    validateId,

    body('siteId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('carNumber')
        .optional()
        .isString().withMessage('carNumber는 문자열이어야 합니다.')
        .trim()
        .customSanitizer(value => value.replace(/\s+/g, '')),

    body('reason')
        .optional()
        .isString().withMessage('reason은 문자열이어야 합니다.')
        .trim()
];

/**
 * 블랙리스트(Blacklist) 삭제 유효성 검사
 */
exports.deleteBlacklist = [
    validateId
];