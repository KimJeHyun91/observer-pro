const { body, query, param } = require('express-validator');

const validateId = param('id')
    .notEmpty().withMessage('id는 필수입니다.')
    .isUUID().withMessage('유효하지 않은 UUID 형식입니다.');

/**
 * 회원 결제 기록(Member Payment History)(Member Payment History) 목록 조회 유효성 검사
 */
exports.getMemberPaymentHistories = [
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
        .isIn(['paidAt', 'amount', 'createdAt', 'updatedAt'])
        .withMessage('정렬 기준이 올바르지 않습니다. (허용: paidAt, amount, createdAt, updatedAt)'),

    query('sortOrder')
        .optional()
        .toUpperCase()
        .isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'여야 합니다."),
    
    // 기본 검색
    query('memberId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    query('membershipPolicyId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    query('amount')
        .optional()
        .isInt({ min: 0 }).withMessage('amount 0 이상의 정수여야 합니다.'),

    query('paymentMethod')
        .optional()
        .toUpperCase()
        .isIn(['CARD', 'CASH', 'TRANSFER']).withMessage("paymentMethod는 'CARD', 'CASH', 'TRANSFER'이어야 합니다."),

    query('status')
        .optional()
        .toUpperCase().isIn(['SUCCESS', 'CANCELED', 'FAILED']).withMessage("status는 'SUCCESS', 'CANCELED', 'FAILED'이어야 합니다."),
    
    query('paidAtStart')
        .optional()
        .isISO8601().withMessage('날짜와 시간 형식이 올바르지 않습니다. (예: 2023-10-27T14:30:00)')
        .toDate(),

    query('paidAtEnd')
        .optional()
        .isISO8601().withMessage('날짜와 시간 형식이 올바르지 않습니다. (예: 2023-10-27T14:30:00)')
        .toDate()
        .custom((value, { req }) => {
            // 시작일이 종료일보다 늦은지 체크
            if (req.query.paidAtStart && value < new Date(req.query.paidAtStart)) {
                throw new Error('종료일은 시작일보다 빠를 수 없습니다.');
            }
            return true;
        }),
    
    query('code')
        .optional()
        .isString().withMessage('code는 문자열이어야 합니다.')
        .trim()
];

/**
 * 회원 결제 기록(Member Payment History) 상세 조회 유효성 검사
 */
exports.getMemberPaymentHistory = [
    validateId
];

/**
 * 회원 결제 기록(Member Payment History) 생성 유효성 검사
 */
exports.createMemberPaymentHistory = [
    body('memberId')
        .notEmpty().withMessage("memberId는 필수입니다.")
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('membershipPolicyId')
        .notEmpty().withMessage("membershipPolicyId는 필수입니다.")
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('amount')
        .notEmpty().withMessage("amount는 필수입니다.")
        .isInt({ min: 0 }).withMessage('amount 0 이상의 정수여야 합니다.'),

    body('paymentMethod')
        .notEmpty().withMessage('paymentMethod는 필수입니다.')
        .toUpperCase()
        .isIn(['CARD', 'CASH', 'TRANSFER']).withMessage("paymentMethod는 'CARD', 'CASH', 'TRANSFER'이어야 합니다."),
    
    body('note')
        .optional()
        .isString().withMessage('note은 문자열이어야합니다.'),

    body('startDate')
        .optional()
        .isISO8601()
        .withMessage('날짜와 시간 형식이 올바르지 않습니다. (예: 2023-10-27T14:30:00)')
        .toDate()
];

/**
 * 회원 결제 기록(Member Payment History) 수정 유효성 검사
 */
exports.updateMemberPaymentHistory = [
    validateId,

    body('status')
        .optional()
        .toUpperCase().isIn(['CANCELED']).withMessage("status는 'CANCELED'이어야 합니다."),
    
    body('note')
        .notEmpty().withMessage('note는 필수입니다.')
        .isString().withMessage('note는 문자열이어야 합니다.')
        .trim()
];



