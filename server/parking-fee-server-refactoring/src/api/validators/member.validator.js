const { body, query, param } = require('express-validator');

const validateId = param('id')
    .notEmpty().withMessage('id는 필수입니다.')
    .isUUID().withMessage('유효하지 않은 UUID 형식입니다.');

/**
 * 회원(Member) 목록 조회 유효성 검사
 */
exports.getMembers = [
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
        .isIn(['name', 'carNumber', 'siteId', 'createdAt', 'updatedAt'])
        .withMessage('정렬 기준이 올바르지 않습니다. (허용: name, carNumber, siteId, createdAt, updatedAt)'),

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

    query('name')
        .optional()
        .isString().withMessage('name은 문자열이어야합니다.')
        .trim(),

    query('code')
        .optional()
        .isString().withMessage('code는 문자열이어야합니다.')
        .trim(),
    
    query('phone')
        .optional()
        .isString().isNumeric().withMessage('phone는 숫자만 포함해야 합니다.').isLength({ min: 10, max: 11 }).withMessage('phone 길이를 확인해주세요.'),
    
    query('phoneLastDigits')
        .optional()
        .trim()
        .isString().withMessage('phoneLastDigits는 문자열이어야 합니다.')
        .isNumeric().withMessage('phoneLastDigits는 숫자만 포함해야 합니다.')
        .isLength({ min: 1, max: 4 }).withMessage('phoneLastDigits는 1자에서 4자 사이여야 합니다.'),

    query('groupName')
        .optional()
        .isString().withMessage('groupName는 문자열이어야합니다.')
        .trim(),

    query('status')
        .optional()
        .toUpperCase().isIn(['UPCOMING', 'ACTIVE', 'EXPIRING', 'EXPIRED']).withMessage("status는 'UPCOMING', 'ACTIVE', 'EXPIRING', 'EXPIRED' 이어야 합니다.")
];

/**
 * 회원(Member) 생성 유효성 검사
 */
exports.createMember = [
    body('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('carNumber')
        .notEmpty().withMessage('carNumber는 필수입니다.')
        .isString().withMessage('carNumber는 문자열이어야 합니다.')
        .trim()
        .customSanitizer(value => value.replace(/\s+/g, '')),

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

    body('phone')
        .optional()
        .customSanitizer(value => String(value))
        .isNumeric().withMessage('phone는 숫자만 포함해야 합니다.')
        .isLength({ min: 10, max: 11 }).withMessage('phone 길이는 10~11자여야 합니다.'),
    
    body('groupName')
        .optional()
        .isString().withMessage('name은 문자열이어야 합니다.')
        .trim(),

    body('note')
        .optional()
        .isString().withMessage('note는 문자열이어야 합니다.')
        .trim()
];

/**
 * 회원(Member) 수정 유효성 검사
 */
exports.updateMember = [
    validateId,

    body('siteId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('carNumber')
        .optional()
        .isString().withMessage('carNumber는 문자열이어야 합니다.')
        .trim()
        .customSanitizer(value => value.replace(/\s+/g, '')),

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

    body('phone')
        .optional()
        .isString().isNumeric().withMessage('phone는 숫자만 포함해야 합니다.').isLength({ min: 10, max: 11 }).withMessage('phone 길이를 확인해주세요.'),
    
    body('groupName')
        .optional()
        .isString().withMessage('name은 문자열이어야 합니다.')
        .trim(),

    body('note')
        .optional()
        .isString().withMessage('note는 문자열이어야 합니다.')
        .trim()
];

/**
 * 회원(Member) 상세 조회 유효성 검사
 */
exports.getMember = [
    validateId
];

/**
 * 회원(Member) 삭제 유효성 검사
 */
exports.deleteMember = [
    validateId
];
