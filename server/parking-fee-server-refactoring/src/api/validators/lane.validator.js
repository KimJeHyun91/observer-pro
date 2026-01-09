const { body, query, param } = require('express-validator');

/**
 * 차선 생성 유효성 검사
 */
exports.createLane = [
    body('zoneId').notEmpty().withMessage('zoneId는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),

    body('type').optional().isIn(['IN', 'OUT', 'BOTH']).withMessage("type은 'IN', 'OUT', 'BOTH' 중 하나여야 합니다."),

    body('name').notEmpty().withMessage('name은 필수입니다.').isString().withMessage('name은 문자열이어야 합니다.'),

    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   
];

/**
 * 차선 수정 유효성 검사
 * - ID는 UUID 형식이어야 함
 * - 수정할 필드만 선택적으로 전달
 */
exports.updateLane = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),

    body('zoneId').optional().isUUID().withMessage('유효한 siteId(UUID)여야 합니다.'),

    body('type').optional().isIn(['IN', 'OUT', 'BOTH']).withMessage("type은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다."),
    
    body('name').optional().isString().withMessage('name은 문자열이어야합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   
];

/**
 * 차선 상세 조회 유효성 검사
 */
exports.getLane = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 차선 삭제 유효성 검사
 */
exports.deleteLane = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 차선 목록 조회 유효성 검사
 * - 페이징, 정렬, 검색
 */
exports.getLanes = [
    // 페이징
    query('page').optional().isInt({ min: 1 }).withMessage('page는 숫자이어야 합니다.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('limit은 숫자이어야 합니다.'),
    
    // 정렬
    query('sortBy').optional().isString().withMessage('sortBy는 문자열이어야 합니다.'),
    query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage("sortOrder는 'ASC' 또는 'DESC'이어야 합니다."),
    
    // 검색 조건 (모든 컬럼)
    query('zoneId').optional().isUUID().withMessage('유효한 UUID가 아닙니다.'),
    
    query('type').optional().isIn(['IN', 'OUT', 'BOTH']).withMessage("type은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다."),
    
    query('name').optional().isString().withMessage('name은 문자열이어야합니다.'),
    query('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    query('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    query('createdAtStart')
        .optional()
        .isISO8601()
        .withMessage('날짜와 시간 형식이 올바르지 않습니다. (예: 2023-10-27T14:30:00)')
        .toDate(), // Date 객체로 변환

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
        .toDate(), // Date 객체로 변환

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