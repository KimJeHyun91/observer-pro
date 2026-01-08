const { body, query, param } = require('express-validator');

/**
 * 사이트 생성 유효성 검사
 */
exports.createSite = [
    body('name').notEmpty().withMessage('name은 필수입니다.').isString().withMessage('name은 문자열이어야 합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    body('status').optional().isString().withMessage('status는 문자열이어야합니다.'),   

    body('managerName').optional().isString().withMessage('managerName은 문자열이어야합니다.'),
    body('managerPhone').optional().isString().withMessage('managerPhone는 문자열이어야합니다.'),

    body('phone').optional().isString().withMessage('phone는 문자열이어야합니다.'),
    body('zipCode').optional().isString().withMessage('zipCode는 문자열이어야합니다.'),
    body('addressBase').optional().isString().withMessage('addressBase는 문자열이어야합니다.'),
    body('addressDetail').optional().isString().withMessage('addressDetail는 문자열이어야합니다.'),

    body('deviceControllerIdList').notEmpty().withMessage('deviceControllerIdList는 필수입니다.'),
    
    // 주차 면수 정보 검증
    body('totalCapacity').optional().isInt({ min: 0 }).withMessage('totalCapacity는 0 이상의 정수여야 합니다.'),
    body('capacityDetail').optional().isObject().withMessage('capacityDetail은 JSON 객체여야 합니다.'),
    
    // capacityDetail 내부 필드 검증
    body('capacityDetail.general').optional().isInt({ min: 0 }).withMessage('capacityDetail.general는 0 이상의 정수여야 합니다.'),
    body('capacityDetail.disabled').optional().isInt({ min: 0 }).withMessage('capacityDetail.disabled는 0 이상의 정수여야 합니다.'),
    body('capacityDetail.compact').optional().isInt({ min: 0 }).withMessage('capacityDetail.compact는 0 이상의 정수여야 합니다.'),
    body('capacityDetail.ev_slow').optional().isInt({ min: 0 }).withMessage('capacityDetail.ev_slow는 0 이상의 정수여야 합니다.'),
    body('capacityDetail.ev_fast').optional().isInt({ min: 0 }).withMessage('capacityDetail.ev_fast는 0 이상의 정수여야 합니다.'),
    body('capacityDetail.women').optional().isInt({ min: 0 }).withMessage('capacityDetail.women는 0 이상의 정수여야 합니다.')
];

/**
 * 사이트 수정 유효성 검사
 */
exports.updateSite = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),

    body('name').optional().isString().withMessage('name은 문자열이어야 합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    body('status').optional().isString().withMessage('status는 문자열이어야합니다.'),   

    body('managerName').optional().isString().withMessage('managerName은 문자열이어야합니다.'),
    body('managerPhone').optional().isString().withMessage('managerPhone는 문자열이어야합니다.'),

    body('phone').optional().isString().withMessage('phone는 문자열이어야합니다.'),
    body('zipCode').optional().isString().withMessage('zipCode는 문자열이어야합니다.'),
    body('addressBase').optional().isString().withMessage('addressBase는 문자열이어야합니다.'),
    body('addressDetail').optional().isString().withMessage('addressDetail는 문자열이어야합니다.'),
    
    // 주차 면수 정보 검증
    body('totalCapacity').optional().isInt({ min: 0 }).withMessage('totalCapacity는 0 이상의 정수여야 합니다.'),
    body('capacityDetail').optional().isObject().withMessage('capacityDetail은 JSON 객체여야 합니다.'),
    
    // capacityDetail 내부 필드 검증
    body('capacityDetail.general').optional().isInt({ min: 0 }).withMessage('capacityDetail.general는 0 이상의 정수여야 합니다.'),
    body('capacityDetail.disabled').optional().isInt({ min: 0 }).withMessage('capacityDetail.disabled는 0 이상의 정수여야 합니다.'),
    body('capacityDetail.compact').optional().isInt({ min: 0 }).withMessage('capacityDetail.compact는 0 이상의 정수여야 합니다.'),
    body('capacityDetail.ev_slow').optional().isInt({ min: 0 }).withMessage('capacityDetail.ev_slow는 0 이상의 정수여야 합니다.'),
    body('capacityDetail.ev_fast').optional().isInt({ min: 0 }).withMessage('capacityDetail.ev_fast는 0 이상의 정수여야 합니다.'),
    body('capacityDetail.women').optional().isInt({ min: 0 }).withMessage('capacityDetail.women는 0 이상의 정수여야 합니다.')
];

/**
 * 사이트 상세 조회 유효성 검사
 */
exports.getSite = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 사이트 트리 조회 유효성 검사
 */
exports.getSiteTree = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 사이트 삭제 유효성 검사
 */
exports.deleteSite = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
    query('method').optional().isIn(['SOFT', 'HARD']).withMessage("method는 'SOFT' 또는 'HARD'여야 합니다.")
];

/**
 * 사이트 목록 조회 유효성 검사
 */
exports.getSites = [
    // 페이징
    query('page').optional().isInt({ min: 1 }).withMessage('page는 숫자이어야 합니다.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('limit은 숫자이어야 합니다.'),
    
    // 정렬
    query('sortBy').optional().isString().withMessage('sortBy는 문자열이어야 합니다.'),
    query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage("sortOrder는 'ASC' 또는 'DESC'이어야 합니다."),
    
    // 기본 검색
    query('name').optional().isString().withMessage('name은 문자열이어야합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    query('managerName').optional().isString().withMessage('managerName은 문자열이어야합니다.'),
    query('managerPhone').optional().isString().withMessage('managerPhone는 문자열이어야합니다.'),

    query('phone').optional().isString().withMessage('phone는 문자열이어야합니다.'),
    query('zipCode').optional().isString().withMessage('zipCode는 문자열이어야합니다.'),
    query('addressBase').optional().isString().withMessage('addressBase는 문자열이어야합니다.'),
    query('addressDetail').optional().isString().withMessage('addressDetail는 문자열이어야합니다.'),
    
    // totalCapacity 범위 검색
    query('totalCapacityMin').optional().isInt({ min: 0 }).withMessage('totalCapacityMin는 0 이상의 정수여야 합니다.'),
    query('totalCapacityMax').optional().isInt({ min: 0 }).withMessage('totalCapacityMax는 0 이상의 정수여야 합니다.'),

    // capacityDetail 내부 필드 범위 검색
    // general (일반)
    query('capacityDetailGeneralMin').optional().isInt({ min: 0 }).withMessage('capacityDetailGeneralMin는 0 이상의 정수여야 합니다.'),
    query('capacityDetailGeneralMax').optional().isInt({ min: 0 }).withMessage('capacityDetailGeneralMax는 0 이상의 정수여야 합니다.'),
    // disabled (장애인)
    query('capacityDetailDisabledMin').optional().isInt({ min: 0 }).withMessage('capacityDetailDisabledMin는 0 이상의 정수여야 합니다.'),
    query('capacityDetailDisabledMax').optional().isInt({ min: 0 }).withMessage('capacityDetailDisabledMax는 0 이상의 정수여야 합니다.'),
    // compact (경차)
    query('capacityDetailCompactMin').optional().isInt({ min: 0 }).withMessage('capacityDetailCompactMin는 0 이상의 정수여야 합니다.'),
    query('capacityDetailCompactMax').optional().isInt({ min: 0 }).withMessage('capacityDetailCompactMax는 0 이상의 정수여야 합니다.'),
    // evSlow (전기차 완속 충전)
    query('capacityDetailEvSlowMin').optional().isInt({ min: 0 }).withMessage('capacityDetailEvSlowMin는 0 이상의 정수여야 합니다.'),
    query('capacityDetailEvSlowMax').optional().isInt({ min: 0 }).withMessage('capacityDetailEvSlowMax는 0 이상의 정수여야 합니다.'),
    // evFast (전기차 고속 충전)
    query('capacityDetailEvFastMin').optional().isInt({ min: 0 }).withMessage('capacityDetailEvFastMin는 0 이상의 정수여야 합니다.'),
    query('capacityDetailEvFastMax').optional().isInt({ min: 0 }).withMessage('capacityDetailEvFastMax는 0 이상의 정수여야 합니다.'),
    // women (여성)
    query('capacityDetailWomenMin').optional().isInt({ min: 0 }).withMessage('capacityDetailWomenMin는 0 이상의 정수여야 합니다.'),
    query('capacityDetailWomenMax').optional().isInt({ min: 0 }).withMessage('capacityDetailWomenMax는 0 이상의 정수여야 합니다.'),

    query('createdAtStart')
        .optional()
        .isISO8601()
        .withMessage('날짜와 시간 형식이 올바르지 않습니다. (예: 2023-10-27T14:30:00)')
        .toDate(),

    query('createdAtEnd')
        .optional()
        .isISO8601()
        .withMessage('날짜와 시간 형식이 올바르지 않습니다. (예: 2023-10-27T14:30:00)')
        .toDate()
        .custom((value, { req }) => {
            // 시작일이 종료일보다 늦은지 체크
            if (req.query.createdAtStart && value < new Date(req.query.createdAtStart)) {
                throw new Error('종료일은 시작일보다 빠를 수 없습니다.');
            }
            return true;
        }),
    query('updatedAtStart')
        .optional()
        .isISO8601()
        .withMessage('날짜와 시간 형식이 올바르지 않습니다. (예: 2023-10-27T14:30:00)')
        .toDate(),

    query('updatedAtEnd')
        .optional()
        .isISO8601()
        .withMessage('날짜와 시간 형식이 올바르지 않습니다. (예: 2023-10-27T14:30:00)')
        .toDate()
        .custom((value, { req }) => {
            // 시작일이 종료일보다 늦은지 체크
            if (req.query.updatedAtStart && value < new Date(req.query.updatedAtStart)) {
                throw new Error('종료일은 시작일보다 빠를 수 없습니다.');
            }
            return true;
        }),
];