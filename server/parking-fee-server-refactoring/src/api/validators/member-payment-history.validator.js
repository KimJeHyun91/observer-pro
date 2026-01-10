const { body, query, param } = require('express-validator');

/**
 * 회원 결제 기록 생성 유효성 검사
 */
exports.createMemberPaymentHistory = [
    body('memberId').notEmpty().withMessage("memberId는 필수입니다.").isUUID().withMessage('유효한 UUID여야 합니다.'),
    body('membershipPolicyId').notEmpty().withMessage("membershipPolicyId는 필수입니다.").isUUID().withMessage('유효한 UUID여야 합니다.'),

    body('amount').notEmpty().withMessage("amount는 필수입니다.").isInt({ min: 0 }).withMessage('amount 0 이상의 정수여야 합니다.'),

    body('paymentMethod').notEmpty().withMessage('paymentMethod는 필수입니다.').toUpperCase().isIn(['CARD', 'CASH', 'TRANSFER']).withMessage("paymentMethod는 'CARD', 'CASH', 'TRANSFER'이어야 합니다."),
    
    body('note').optional().isString().withMessage('note은 문자열이어야합니다.'),

    body('startDate').optional().isISO8601().withMessage('올바른 날짜 형식(YYYY-MM-DD)이어야 합니다.')    
];

/**
 * 회원 결제 기록 수정 유효성 검사
 */
exports.updateMemberPaymentHistory = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.')
];

/**
 * 회원 결제 기록 상세 조회 유효성 검사
 */
exports.getMemberPaymentHistory = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 회원 결제 기록 목록 조회 유효성 검사
 */
exports.getMemberPaymentHistories = [
    // 페이징
    query('page').optional().isInt({ min: 1 }).withMessage('page는 숫자이어야 합니다.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('limit은 숫자이어야 합니다.'),
    
    // 정렬
    query('sortBy').optional().isString().withMessage('sortBy는 문자열이어야 합니다.'),
    query('sortOrder').optional().toUpperCase().isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'이어야 합니다."),
    
    // 기본 검색
    query('memberId').optional().isUUID().withMessage('유효한 UUID여야 합니다.'),
    query('membershipPolicyId').optional().isUUID().withMessage('유효한 UUID여야 합니다.'),

    query('amount').optional().isInt({ min: 0 }).withMessage('amount 0 이상의 정수여야 합니다.'),

    query('paymentMethod').optional().toUpperCase().isIn(['CARD', 'CASH', 'TRANSFER']).withMessage("paymentMethod는 'CARD', 'CASH', 'TRANSFER'이어야 합니다."),
    query('paymentStatus').optional().toUpperCase().isIn(['SUCCESS', 'CANCLED', 'FAILED']).withMessage("paymentStatus는 'SUCCESS', 'CANCLED', 'FAILED'이어야 합니다."),
    
    query('note').optional().isString().withMessage('note은 문자열이어야합니다.'),

    query('paidAtStart')
        .optional()
        .isISO8601()
        .withMessage('날짜와 시간 형식이 올바르지 않습니다. (예: 2023-10-27T14:30:00)')
        .toDate(),

    query('paidAtEnd')
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