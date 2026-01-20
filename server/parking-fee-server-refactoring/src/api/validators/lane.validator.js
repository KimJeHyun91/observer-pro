const { body, query, param } = require('express-validator');

const validateId = param('id')
    .notEmpty().withMessage('id는 필수입니다.')
    .isUUID().withMessage('유효하지 않은 UUID 형식입니다.');

/**
 * 차선(Lane) 목록 조회 유효성 검사
 */
exports.getLanes = [
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
        .isIn(['name', 'code', 'siteId', 'zoneId', 'createdAt', 'updatedAt'])
        .withMessage('정렬 기준이 올바르지 않습니다. (허용: name, code, siteId, zoneId, createdAt, updatedAt)'),

    query('sortOrder')
        .optional()
        .toUpperCase()
        .isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'여야 합니다."),

    // 기본 검색
    query('name')
        .optional()
        .isString().withMessage('name은 문자열이어야 합니다.')
        .trim(),

    query('code')
        .optional()
        .isString().withMessage('code는 문자열이어야 합니다.')
        .trim(),

    query('zoneId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    query('type')
        .optional()
        .isIn(['IN', 'OUT', 'BOTH']).withMessage("type은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다.")
];

/**
 * 차선(Lane) 상세 조회 유효성 검사
 */
exports.getLane = [
    validateId
];

/**
 * 차선(Lane) 생성 유효성 검사
 */
exports.createLane = [
    body('zoneId')
        .notEmpty().withMessage('zoneId는 필수입니다.')
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

    body('type')
        .optional()
        .isIn(['IN', 'OUT', 'BOTH']).withMessage("type은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다."),

    body('inIntegratedGateId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('outIntegratedGateId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.')
];

/**
 * 차선(Lane) 수정 유효성 검사
 */
exports.updateLane = [
    validateId,

    body('zoneId')
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

    body('type')
        .optional()
        .isIn(['IN', 'OUT', 'BOTH']).withMessage("type은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다."),

    body('inIntegratedGateId')
        .optional({ nullable: true })
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('outIntegratedGateId')
        .optional({ nullable: true })
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.')
];

/**
 * 차선(Lane) 상세 조회 유효성 검사
 */
exports.getLane = [
    validateId
];

/**
 * 차선(Lane) 삭제 유효성 검사
 */
exports.deleteLane = [
    validateId
];