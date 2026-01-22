const { body, param, query } = require('express-validator');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const validateId = param('id')
    .notEmpty().withMessage('id는 필수입니다.')
    .isUUID().withMessage('유효하지 않은 UUID 형식입니다.');

/**
 * 주차 세션(Parking Session) 목록 조회 유효성 검사
 */
exports.getParkingSessions = [
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
        .customSanitizer(value => value.replace(/\s+/g, ''))
        .isLength({ min: 1 }).withMessage('carNumber에 공백만 입력할 수 없습니다.'),
    
    query('startTime')
            .notEmpty().withMessage('시작 시간(startTime)은 필수입니다.')
            // YYYY-MM-DD 형식 검사 (예: 2025-04-01)
            .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('YYYY-MM-DD 형식이어야 합니다. (예: 2025-04-01)')
            .custom((value) => {
                // 실제 달력에 존재하는 날짜인지 검사 (예: 2025-02-30 방지)
                const isValidDate = dayjs(value, 'YYYY-MM-DD', true).isValid();
                if (!isValidDate) {
                    throw new Error('존재하지 않는 날짜입니다.');
                }
                return true;
            }),
    
    query('endTime')
        .notEmpty().withMessage('종료 시간(endTime)은 필수입니다.')
        // YYYY-MM-DD 형식 검사
        .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('YYYY-MM-DD 형식이어야 합니다. (예: 2025-04-30)')
        .custom((value, { req }) => {
            const isValidDate = dayjs(value, 'YYYY-MM-DD', true).isValid();
            if (!isValidDate) {
                throw new Error('존재하지 않는 날짜입니다.');
            }
            
            // 종료일이 시작일보다 앞서면 안 됨
            if (dayjs(value).isBefore(dayjs(req.query.startTime))) {
                throw new Error('종료 날짜는 시작 날짜보다 이후여야 합니다.');
            }
            return true;
        }),

    query('entrySource')
        .optional()
        .isIn(['ADMIN', 'SYSTEM']).withMessage("entrySource는 'ADMIN' 또는 'SYSTEM'이어야 합니다."),

    query('exitSource')
        .optional()
        .isIn(['ADMIN', 'SYSTEM']).withMessage("entrySource는 'ADMIN' 또는 'SYSTEM'이어야 합니다."),
    
    query('statuses')
        .optional()
        .customSanitizer((value) => {
            // 1. 이미 배열인 경우 (?statuses=A&statuses=B)
            if (Array.isArray(value)) {
                return value.map(v => v.trim().toUpperCase());
            }
            // 2. 콤마로 구분된 문자열인 경우 (?statuses=A,B)
            if (typeof value === 'string') {
                return value.split(',').map(v => v.trim().toUpperCase());
            }
            // 3. 단일 값인 경우
            return [value.trim().toUpperCase()];
        })
        .custom((value) => {
            const allowedStatuses = [
                'PENDING', 'PRE_SETTLED', 'PAYMENT_PENDING', 
                'COMPLETED', 'CANCELED', 'RUNAWAY', 
                'PENDING_ENTRY', 'PENDING_EXIT', 
                'FORCE_COMPLETED', 'UNRECOGNIZED'
            ];
            
            // 배열 내 모든 값이 유효한지 검사
            const isValid = value.every(s => allowedStatuses.includes(s));
            
            if (!isValid) {
                throw new Error(`유효하지 않은 상태값이 포함되어 있습니다. 허용값: ${allowedStatuses.join(', ')}`);
            }
            return true;
        }),

    query('entryLaneId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),
    
    query('exitLaneId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.')
];

/**
 * 주차 세션(Parking Session) 상세 조회 유효성 검사
 */
exports.validateDetail = [
    validateId
];

/**
 * 주차 세션(Parking Session) 생성 유효성 검사
 */
exports.validateCreate = [
    body('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

    body('carNumber')
        .notEmpty().withMessage('carNumber는 필수입니다.')
        .isString().withMessage('carNumber는 문자열이어야 합니다.')
        .trim()
        .customSanitizer(value => value.replace(/\s+/g, ''))
        .isLength({ min: 1 }).withMessage('carNumber에 공백만 입력할 수 없습니다.'),

    body('entryZoneId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('entryLaneId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),
    
    body('entryTime')
        .notEmpty().withMessage('entryTime은 필수입니다.')
        .isISO8601().withMessage('날짜 형식이 올바르지 않습니다.')
        .custom((value) => {
            const entryDate = new Date(value);
            const now = new Date();
            
            // 현재 시간에서 1분(60,000ms)을 더한 허용 오차 범위를 설정
            const bufferTime = new Date(now.getTime() + 60000);

            if (entryDate > bufferTime) {
                throw new Error('입차 시간은 현재 시간보다 1분 이상 미래일 수 없습니다.');
            }
            return true;
        }),

    body('vehicleType')
        .optional()
        .toUpperCase()
        .isIn(['NORMAL', 'COMPACT', 'ELECTRIC', 'DISABLED'])
        .withMessage('유효하지 않은 차량 타입입니다.'),

    body('force')
        .optional()
        .isBoolean().withMessage('force는 true 또는 false 값이어야 합니다.')
        .toBoolean(),

    body('entryImageUrl')
        .optional()
        .isString().withMessage('entryImageUrl은 문자열이어야 합니다.'),

    body('note')
        .optional()
        .isString().withMessage('note는 문자열이어야 합니다.')
];

/**
 * 주차 세션(Parking Session) 수정 유효성 검사
 */
exports.validateUpdate = [
    validateId,

    body('carNumber')
        .notEmpty().withMessage('carNumber는 필수입니다.')
        .isString().withMessage('carNumber는 문자열이어야 합니다.')
        .trim()
        .customSanitizer(value => value.replace(/\s+/g, ''))
        .isLength({ min: 1 }).withMessage('carNumber에 공백만 입력할 수 없습니다.'),

    body('vehicleType')
        .optional()
        .toUpperCase()
        .isIn(['NORMAL', 'COMPACT', 'ELECTRIC', 'DISABLED'])
        .withMessage('유효하지 않은 차량 타입입니다.'),

    body('entryTime')
        .optional()
        .isISO8601().withMessage('날짜 형식이 올바르지 않습니다.')
        .custom((value) => {
            const entryDate = new Date(value);
            const now = new Date();
            
            if (entryDate > now) {
                throw new Error('수정하려는 입차 시간이 미래일 수 없습니다.');
            }
            return true;
        }),

    body('status')
        .optional()
        .isIn(['RUNAWAY', 'CANCELED']).withMessage("status는 'RUNAWAY', 'CANCELED' 중 하나여야 합니다."),

    body('note')
        .optional()
        .isString().withMessage('note는 문자열이어야 합니다.')
];

/**
 * 수동 입차 유효성 검사
 */
exports.validateEntry = [
    body('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

    body('carNumber')
        .notEmpty().withMessage('carNumber는 필수입니다.')
        .isString().withMessage('carNumber는 문자열이어야 합니다.')
        .trim()
        .customSanitizer(value => value.replace(/\s+/g, ''))
        .isLength({ min: 1 }).withMessage('carNumber에 공백만 입력할 수 없습니다.'),

    body('entryLaneId')
        .notEmpty().withMessage('entryLaneId는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),
    
    body('entryTime')
        .notEmpty().withMessage('entryTime은 필수입니다.')
        .isISO8601().withMessage('날짜 형식이 올바르지 않습니다.')
        .custom((value) => {
            const entryDate = new Date(value);
            const now = new Date();
            
            // 현재 시간에서 1분(60,000ms)을 더한 허용 오차 범위를 설정
            const bufferTime = new Date(now.getTime() + 60000);

            if (entryDate > bufferTime) {
                throw new Error('입차 시간은 현재 시간보다 1분 이상 미래일 수 없습니다.');
            }
            return true;
        }),

    body('vehicleType')
        .optional()
        .toUpperCase()
        .isIn(['NORMAL', 'COMPACT', 'ELECTRIC', 'DISABLED'])
        .withMessage('유효하지 않은 차량 타입입니다.'),

    body('force')
        .optional()
        .isBoolean().withMessage('force는 true 또는 false 값이어야 합니다.')
        .toBoolean(),

    body('entryImageUrl')
        .optional()
        .isString().withMessage('entryImageUrl은 문자열이어야 합니다.'),

    body('note')
        .optional()
        .isString().withMessage('note는 문자열이어야 합니다.')
];

/**
 * 수동 출차 유효성 검사
 */
exports.validateExit = [
    validateId,
    
    body('exitLaneId')
        .notEmpty().withMessage('exitLaneId는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

    body('force')
        .optional()
        .isBoolean().withMessage('force는 true 또는 false 값이어야 합니다.')
        .toBoolean(),

    body('exitImageUrl')
        .optional()
        .isString().withMessage('exitImageUrl은 문자열이어야 합니다.'),

    body('note')
        .optional()
        .isString().withMessage('note는 문자열이어야 합니다.')
];

/**
 * 할인 적용 유효성 검사
 */
exports.validateDiscount = [
    validateId,

    body('policyId')
        .notEmpty().withMessage('policyId는 필수입니다.')
        .isUUID().withMessage('유효한 정책 ID(UUID)여야 합니다.')   
];

/**
 * Lock 유효성 검사
 */
exports.validateLock = [
    validateId
];