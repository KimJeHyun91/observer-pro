const { body, query, param } = require('express-validator');

/**
 * 회원 생성 유효성 검사
 */
exports.createMember = [
    body('siteId').notEmpty().isUUID().withMessage('유효한 siteId(UUID)여야 합니다.'),

    body('carNumber').notEmpty().withMessage('carNumber는 필수입니다.'),

    body('name').notEmpty().withMessage('name은 필수입니다.').isString().withMessage('name은 문자열이어야 합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    body('phone').optional().isString().withMessage('phone은 문자열이어야 합니다.'),
    body('groupName').optional().isString().withMessage('name은 문자열이어야 합니다.'),

    body('note').optional().isString().withMessage('note는 문자열이어야 합니다.')
];

/**
 * 회원 수정 유효성 검사
 */
exports.updateMember = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
    
    body('siteId').optional().isUUID().withMessage('유효한 siteId(UUID)여야 합니다.'),

    body('carNumber').notEmpty().withMessage('carNumber는 필수입니다.'),

    body('name').optional().isString().withMessage('name은 문자열이어야 합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    body('phone').optional().isString().withMessage('phone은 문자열이어야 합니다.'),
    body('groupName').optional().isString().withMessage('name은 문자열이어야 합니다.'),

    body('note').optional().isString().withMessage('note는 문자열이어야 합니다.')
];

/**
 * 회원 상세 조회 유효성 검사
 */
exports.getMember = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 회원 삭제 유효성 검사
 */
exports.deleteMember = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 회원 목록 조회 유효성 검사
 */
exports.getMembers = [
    // 페이징
    query('page').optional().isInt({ min: 1 }).withMessage('page는 숫자이어야 합니다.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('limit은 숫자이어야 합니다.'),
    
    // 정렬
    query('sortBy').optional().isString().withMessage('sortBy는 문자열이어야 합니다.'),
    query('sortOrder').optional().toUpperCase().isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'이어야 합니다."),
    
    // 검색 조건 (모든 컬럼)
    query('siteId').optional().isUUID().withMessage('유효한 UUID가 아닙니다.'),
    query('carNumber').optional().isString().withMessage('carNumber는 문자열이어야 합니다.'),

    query('name').optional().isString().withMessage('name은 문자열이어야합니다.'),
    query('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    query('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    query('phone').optional().isString().withMessage('phone는 문자열이어야합니다.'),
    query('groupName').optional().isString().withMessage('groupName는 문자열이어야합니다.'),

    query('status').optional().toUpperCase().isIn(['UPCOMING', 'ACTIVE', 'EXPIRING', 'EXPIRED']).withMessage("status는 'UPCOMING', 'ACTIVE', 'EXPIRING', 'EXPIRED' 이어야 합니다."),
    query('note').optional().isString().withMessage('note는 문자열이어야합니다.'),
    
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