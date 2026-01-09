const { body, query, param } = require('express-validator');

/**
 * 정책 생성 유효성 검사
 */
exports.createPolicy = [
    body('siteId').notEmpty().withMessage('siteId는 필수입니다.').isUUID().withMessage('유효한 siteId가 필요합니다.'),

    body('type').notEmpty().withMessage('type은 필수입니다.').toUpperCase().isIn(['FEE', 'DISCOUNT', 'MEMBERSHIP', 'BLACKLIST', 'HOLIDAY']).withMessage('type은 FEE, DISCOUNT, MEMBERSHIP, BLACKLIST, HOLIDAY 중 하나여야 합니다.'),

    body('name').notEmpty().withMessage('name은 필수입니다.').isString().withMessage('name은 문자열이어야 합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),

    body('config').notEmpty().withMessage('config는 필수입니다.').isObject().withMessage('정책 설정(config) 객체가 필요합니다.'),

    // [FEE] 요금 정책 관련 필드
    body('config.baseTimeMinutes').if(body('type').equals('FEE')).optional().isInt({ min: 0 }).withMessage('기본 시간은 0 이상의 정수여야 합니다.'),
    body('config.baseFee').if(body('type').equals('FEE')).optional().isInt({ min: 0 }).withMessage('기본 요금은 0 이상의 정수여야 합니다.'),
    body('config.unitTimeMinutes').if(body('type').equals('FEE')).optional().isInt({ min: 1 }).withMessage('단위 시간은 1 이상의 정수여야 합니다.'),
    body('config.unitFee').if(body('type').equals('FEE')).optional().isInt({ min: 0 }).withMessage('단위 요금은 0 이상의 정수여야 합니다.'),
    body('config.graceTimeMinutes').if(body('type').equals('FEE')).optional().isInt({ min: 0 }).withMessage('유예 시간은 0 이상의 정수여야 합니다.'),
    body('config.dailyMaxFee').if(body('type').equals('FEE')).optional().isInt({ min: 0 }).withMessage('일일 최대 요금은 0 이상의 정수여야 합니다.'),

    // [DISCOUNT] 할인 정책 관련 필드
    body('config.discountType').if(body('type').equals('DISCOUNT')).optional().isIn(['PERCENT', 'FIXED_AMOUNT', 'FREE_TIME']).withMessage('할인 종류가 올바르지 않습니다.'),
    body('config.discountValue').if(body('type').equals('DISCOUNT')).optional().isInt({ min: 0 }).withMessage('할인 값은 0 이상의 정수여야 합니다.'),
    body('config.discountMethod').if(body('type').equals('DISCOUNT')).optional().isIn(['AUTO', 'MANUAL']).withMessage('할인 방식은 AUTO 또는 MANUAL이어야 합니다.'),

    // [HOLIDAY] 휴일 정책 관련 필드
    body('config.holidayId').if(body('type').equals('HOLIDAY')).optional().isUUID().withMessage('유효한 휴일 ID(UUID)가 필요합니다.'),
    body('config.holidayFeePolicyId').if(body('type').equals('HOLIDAY')).optional().isUUID().withMessage('유효한 요금 정책 ID(UUID)가 필요합니다.'),

    // [BLACKLIST] 블랙리스트 정책 관련 필드
    body('config.blacklistAction').if(body('type').equals('BLACKLIST')).optional().isIn(['BLOCK', 'WARN']).withMessage('실행 설정은 BLOCK 또는 WARN이어야 합니다.'),

    // [MEMBERSHIP] 정기권 정책 관련 필드
    body('config.memberPrice').if(body('type').equals('MEMBERSHIP')).optional().isInt({ min: 0 }).withMessage('정기권 요금은 0 이상의 정수여야 합니다.'),
    body('config.memberPeriodDays').if(body('type').equals('MEMBERSHIP')).optional().isInt({ min: 1 }).withMessage('정기권 기간은 1일 이상이어야 합니다.')
];

/**
 * 정책 수정 유효성 검사
 */
exports.updatePolicy = [
    body('siteId').optional().isUUID().withMessage('유효한 siteId가 필요합니다.'),

    body('type').optional().toUpperCase().isIn(['FEE', 'DISCOUNT', 'MEMBERSHIP', 'BLACKLIST', 'HOLIDAY']).withMessage('type은 FEE, DISCOUNT, MEMBERSHIP, BLACKLIST, HOLIDAY 중 하나여야 합니다.'),

    body('name').optional().isString().withMessage('name은 문자열이어야 합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),

    body('config').optional().isObject().withMessage('정책 설정(config) 객체가 필요합니다.'),

    // [FEE] 요금 정책 관련 필드
    body('config.baseTimeMinutes').if(body('type').equals('FEE')).optional().isInt({ min: 0 }).withMessage('기본 시간은 0 이상의 정수여야 합니다.'),
    body('config.baseFee').if(body('type').equals('FEE')).optional().isInt({ min: 0 }).withMessage('기본 요금은 0 이상의 정수여야 합니다.'),
    body('config.unitTimeMinutes').if(body('type').equals('FEE')).optional().isInt({ min: 1 }).withMessage('단위 시간은 1 이상의 정수여야 합니다.'),
    body('config.unitFee').if(body('type').equals('FEE')).optional().isInt({ min: 0 }).withMessage('단위 요금은 0 이상의 정수여야 합니다.'),
    body('config.graceTimeMinutes').if(body('type').equals('FEE')).optional().isInt({ min: 0 }).withMessage('유예 시간은 0 이상의 정수여야 합니다.'),
    body('config.dailyMaxFee').if(body('type').equals('FEE')).optional().isInt({ min: 0 }).withMessage('일일 최대 요금은 0 이상의 정수여야 합니다.'),

    // [DISCOUNT] 할인 정책 관련 필드
    body('config.discountType').if(body('type').equals('DISCOUNT')).optional().isIn(['PERCENT', 'FIXED_AMOUNT', 'FREE_TIME']).withMessage('할인 종류가 올바르지 않습니다.'),
    body('config.discountValue').if(body('type').equals('DISCOUNT')).optional().isInt({ min: 0 }).withMessage('할인 값은 0 이상의 정수여야 합니다.'),
    body('config.discountMethod').if(body('type').equals('DISCOUNT')).optional().isIn(['AUTO', 'MANUAL']).withMessage('할인 방식은 AUTO 또는 MANUAL이어야 합니다.'),

    // [HOLIDAY] 휴일 정책 관련 필드
    body('config.holidayId').if(body('type').equals('HOLIDAY')).optional().isUUID().withMessage('유효한 휴일 ID(UUID)가 필요합니다.'),
    body('config.holidayFeePolicyId').if(body('type').equals('HOLIDAY')).optional().isUUID().withMessage('유효한 요금 정책 ID(UUID)가 필요합니다.'),

    // [BLACKLIST] 블랙리스트 정책 관련 필드
    body('config.blacklistAction').if(body('type').equals('BLACKLIST')).optional().isIn(['BLOCK', 'WARN']).withMessage('실행 설정은 BLOCK 또는 WARN이어야 합니다.'),

    // [MEMBERSHIP] 정기권 정책 관련 필드
    body('config.memberPrice').if(body('type').equals('MEMBERSHIP')).optional().isInt({ min: 0 }).withMessage('정기권 요금은 0 이상의 정수여야 합니다.'),
    body('config.memberPeriodDays').if(body('type').equals('MEMBERSHIP')).optional().isInt({ min: 1 }).withMessage('정기권 기간은 1일 이상이어야 합니다.')
];

/**
 * 정책 상세 조회 유효성 검사
 */
exports.getPolicy = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 정책 삭제 유효성 검사
 */
exports.deletePolicy = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 정책 목록 조회 유효성 검사
 */
exports.getPolicies = [
    // 페이징
    query('page').optional().isInt({ min: 1 }).withMessage('page는 숫자이어야 합니다.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('limit은 숫자이어야 합니다.'),
    
    // 정렬
    query('sortBy').optional().isString().withMessage('sortBy는 문자열이어야 합니다.'),
    query('sortOrder').optional().toUpperCase().isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'이어야 합니다."),

    query('siteId').optional().isUUID().withMessage('유효한 UUID가 아닙니다.'),
    query('type').optional().toUpperCase().isIn(['FEE', 'DISCOUNT', 'MEMBERSHIP', 'BLACKLIST', 'HOLIDAY']).withMessage('type은 FEE, DISCOUNT, MEMBERSHIP, BLACKLIST, HOLIDAY 중 하나여야 합니다.'),
    
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

/**
 * 특정 사이트의 정책 초기화 유효성 검사
 */
exports.initializeDefaults = [
    body('siteId').notEmpty().withMessage('siteId는 필수입니다.').isUUID().withMessage('유효한 siteId가 필요합니다.'),
];


