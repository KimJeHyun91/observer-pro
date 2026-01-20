const { body, query, param } = require('express-validator');

const validateId = param('id')
    .notEmpty().withMessage('id는 필수입니다.')
    .isUUID().withMessage('유효하지 않은 UUID 형식입니다.');

/**
 * 사이트(Site) 목록 조회 유효성 검사
 */
exports.getSites = [
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
        .isIn(['name', 'code', 'createdAt', 'updatedAt'])
        .withMessage('정렬 기준이 올바르지 않습니다. (허용: name, code, createdAt, updatedAt)'),

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
        
    query('status')
        .optional()
        .toUpperCase()
        .isIn(['NORMAL', 'ERROR', 'LOCK', 'UNLOCK']).withMessage("status는 'NORMAL', 'ERROR', 'LOCK', 'UNLOCK' 중 하나여야 합니다.")
];

/**
 * 사이트(Site) 상세 조회 유효성 검사
 */
exports.getSite = [
    validateId
];

/**
 * 사이트(Site) 생성 유효성 검사
 */
exports.createSite = [
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

    body('deviceControllerIds')
        .notEmpty().withMessage('deviceControllerIds은 필수입니다.')
        .isArray({ min: 1 }).withMessage('deviceControllerIds은 1개 이상의 배열이어야 합니다.'),
    body('deviceControllerIds.*')
        .isUUID().withMessage('deviceControllerIds의 요소는 UUID 형식이어야 합니다.')
];

/**
 * 사이트(Site) 수정 유효성 검사
 */
exports.updateSite = [

    validateId,

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
        
    body('deviceControllerId')
        .optional()
        .isUUID().withMessage('deviceControllerId는 UUID 형식이어야 합니다.'),

    body('status')
        .optional()
        .toUpperCase()
        .isIn(['LOCK', 'UNLOCK']).withMessage("status는 'LOCK', 'UNLOCK' 중 하나여야 합니다.")
];

/**
 * 사이트(Site) 삭제 유효성 검사
 */
exports.deleteSite = [
    validateId
];

/**
 * 사이트(Site) 트리 조회 유효성 검사
 */
exports.getSiteTree = [
    validateId
];