const { body, param, query } = require('express-validator');

/**
 * 1. [목록 조회] validateList
 * - 검색 필터 및 페이징 검증 (ID 파라미터 없음)
 */
exports.validateList = [
    query('siteId').optional().isUUID().withMessage('siteId는 UUID여야 합니다.'),
    
    query('carNumber').optional().trim(),
    
    // 기간 검색
    query('startTime').optional().isISO8601().withMessage('날짜 형식이 올바르지 않습니다.'),
    query('endTime').optional().isISO8601().withMessage('날짜 형식이 올바르지 않습니다.'),

    query('entrySource').optional().trim(),
    query('exitSource').optional().trim(),
    
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
            // value는 위 로직에 의해 무조건 배열([])입니다.
            const allowedStatuses = [
                'PENDING', 'PRE_SETTLED', 'PAYMENT_PENDING', 
                'COMPLETED', 'CANCELLED', 'RUNAWAY', 
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
        .isUUID().withMessage('entryLaneId는 UUID여야 합니다.'),
    
    query('exitLaneId')
        .optional()
        .isUUID().withMessage('exitLaneId는 UUID여야 합니다.'),

    // 페이징
    query('page').optional().isInt({ min: 1 }).withMessage('page는 1 이상이어야 합니다.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('limit은 1 이상이어야 합니다.')
];

/**
 * 2. [상세 조회] validateDetail
 */
exports.validateDetail = [
    param('id')
        .notEmpty().withMessage('Session ID는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

    // [추가] isMain
    query('isMain')
        .notEmpty().withMessage('isMain은 필수값입니다.')
        .isBoolean().withMessage('isMain은 true/false 값이어야 합니다.')
        .toBoolean(),

    // [추가] direction (상세 조회 시점 선택)
    query('direction')
        .notEmpty().withMessage('direction은 필수값입니다.')
        .toUpperCase() // 소문자로 들어와도 대문자로 변환
        .isIn(['IN', 'OUT']).withMessage('direction은 IN 또는 OUT이어야 합니다.')
];

/**
 * 생성 validateCreate
 * - ID 파라미터 없음 (신규 생성)
 */
exports.validateCreate = [

        // [추가] isMain
    body('isMain')
        .notEmpty().withMessage('isMain은 필수입니다.')
        .isBoolean().withMessage('isMain은 true/false 값이어야 합니다.')
        .toBoolean(),

    // [추가] direction (상세 조회 시점 선택)
    body('direction')
        .notEmpty().withMessage('direction은 필수입니다.')
        .toUpperCase() // 소문자로 들어와도 대문자로 변환
        .isIn(['IN', 'OUT']).withMessage('direction은 IN 또는 OUT이어야 합니다.'),

    // [필수] 사이트 및 차량 정보
    body('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

    body('carNumber')
        .notEmpty().withMessage('차량 번호(carNumber)는 필수입니다.')
        .trim()
        .isLength({ min: 4 }).withMessage('차량 번호가 너무 짧습니다.'),

    body('entryZoneId').optional().isUUID(),
    body('entryLaneId').optional().isUUID(),
    
    // [선택] 입차 시간
    body('entryTime')
        .optional() // 입력 안 하면 Controller/Repository에서 'NOW()' 처리
        .isISO8601().withMessage('날짜 형식이 올바르지 않습니다.')
        .custom((value) => {
            const entryDate = new Date(value);
            const now = new Date();
            // 약간의 네트워크 지연 등을 고려해 1분 정도의 오차는 허용할 수도 있으나, 
            // 기본적으로 미래 시간은 차단
            if (entryDate > now) {
                throw new Error('입차 시간은 미래일 수 없습니다.');
            }
            return true;
        }),

    body('force')
        .optional()
        .isBoolean().withMessage('force는 true/false boolean 값이어야 합니다.'),

    // [선택] 차량 타입
    body('vehicleType')
        .optional()
        .toUpperCase()
        .isIn(['NORMAL', 'MEMBER', 'COMPACT', 'ELECTRIC', 'DISABLED'])
        .withMessage('유효하지 않은 차량 타입입니다.'),

    body('entryImageUrl').optional().isString(),

    body('note').optional().isString()
];

/**
 * 3. [수동 입차] validateEntry
 * - ID 파라미터 없음 (신규 생성)
 */
exports.validateEntry = [

        // [추가] isMain
    body('isMain')
        .notEmpty().withMessage('isMain은 필수입니다.')
        .isBoolean().withMessage('isMain은 true/false 값이어야 합니다.')
        .toBoolean(),

    // [추가] direction (상세 조회 시점 선택)
    body('direction')
        .notEmpty().withMessage('direction은 필수입니다.')
        .toUpperCase() // 소문자로 들어와도 대문자로 변환
        .isIn(['IN', 'OUT']).withMessage('direction은 IN 또는 OUT이어야 합니다.'),

    // [필수] 사이트 및 차량 정보
    body('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

    body('carNumber')
        .notEmpty().withMessage('차량 번호(carNumber)는 필수입니다.')
        .trim()
        .isLength({ min: 4 }).withMessage('차량 번호가 너무 짧습니다.'),

    // [선택] 입차 구역/차선 정보
    body('entryZoneId').optional().isUUID().withMessage('entryZoneId는 UUID여야 합니다.'),
    body('entryLaneId').notEmpty().withMessage().isUUID().withMessage('entryLaneId는 UUID여야 합니다.'),
    
    // [선택] 입차 시간
    body('entryTime')
        .optional() // 입력 안 하면 Controller/Repository에서 'NOW()' 처리
        .isISO8601().withMessage('날짜 형식이 올바르지 않습니다.')
        .custom((value) => {
            const entryDate = new Date(value);
            const now = new Date();
            // 약간의 네트워크 지연 등을 고려해 1분 정도의 오차는 허용할 수도 있으나, 
            // 기본적으로 미래 시간은 차단
            if (entryDate > now) {
                throw new Error('입차 시간은 미래일 수 없습니다.');
            }
            return true;
        }),

    // [선택] 차량 타입
    body('vehicleType')
        .optional()
        .toUpperCase()
        .isIn(['NORMAL', 'MEMBER', 'COMPACT', 'ELECTRIC', 'DISABLED'])
        .withMessage('유효하지 않은 차량 타입입니다.'),

    body('entryImageUrl').optional().isString(),

    // [중요] 강제 입차 여부
    body('force')
        .optional()
        .isBoolean().withMessage('force는 true/false boolean 값이어야 합니다.'),

    body('note').optional().isString()
];

/**
 * 4. [수동 출차] validateExit
 * - 정산 후 출차 처리 또는 강제 출차
 */
exports.validateExit = [
    // ID 파라미터 검증
    param('id')
        .notEmpty().withMessage('Session ID는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

        // [추가] isMain
    body('isMain')
        .notEmpty().withMessage('isMain은 필수입니다.')
        .isBoolean().withMessage('isMain은 true/false 값이어야 합니다.')
        .toBoolean(),

    // [추가] direction (상세 조회 시점 선택)
    body('direction')
        .notEmpty().withMessage('direction은 필수입니다.')
        .toUpperCase() // 소문자로 들어와도 대문자로 변환
        .isIn(['IN', 'OUT']).withMessage('direction은 IN 또는 OUT이어야 합니다.'),

    // [필수] 출차 시간
    body('exitTime')
        .optional()
        .isISO8601().withMessage('출차 시간 형식이 올바르지 않습니다.'),

    // [선택] 출차 위치 및 이미지
    body('exitZoneId').optional().isUUID(),
    body('exitLaneId').optional().isUUID(),
    body('exitImageUrl').optional().isString(),

    // [선택] 강제 출차 여부
    body('force')
        .optional()
        .isBoolean().withMessage('force는 boolean 값이어야 합니다.'),
    
    // [선택] 사유
    body('note').optional().isString(),

    // [차단] 계산된 필드 전송 방지
    body('totalFee').not().exists().withMessage('요금은 서버에서 계산되므로 전송할 수 없습니다.'),
    body('status').not().exists().withMessage('상태값은 서버에서 판단하므로 전송할 수 없습니다.')
];

/**
 * 5. [할인 적용] validateDiscount
 * - 특정 정책을 적용하여 요금 감면
 */
exports.validateDiscount = [
    param('id').notEmpty().isUUID(),

        // [추가] isMain
    body('isMain')
        .notEmpty().withMessage('isMain은 필수입니다.')
        .isBoolean().withMessage('isMain은 true/false 값이어야 합니다.')
        .toBoolean(),

    // [추가] direction (상세 조회 시점 선택)
    body('direction')
        .notEmpty().withMessage('direction은 필수입니다.')
        .toUpperCase() // 소문자로 들어와도 대문자로 변환
        .isIn(['IN', 'OUT']).withMessage('direction은 IN 또는 OUT이어야 합니다.'),

    // [변경] 단일 ID -> ID 배열
    body('policyId')
        .notEmpty().withMessage('policyId는 필수입니다.')
        .isUUID().withMessage('유효한 정책 ID(UUID)여야 합니다.'),   

    body('note').optional().isString()
];

/**
 * 6. [정보 수정] validateUpdateInfo
 * - 제한된 정보만 수정
 */
exports.validateUpdateInfo = [
    // ID 파라미터 검증
    param('id')
        .notEmpty().withMessage('Session ID는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

        // [추가] isMain
    body('isMain')
        .notEmpty().withMessage('isMain은 필수입니다.')
        .isBoolean().withMessage('isMain은 true/false 값이어야 합니다.')
        .toBoolean(),

    // [추가] direction (상세 조회 시점 선택)
    body('direction')
        .notEmpty().withMessage('direction은 필수입니다.')
        .toUpperCase() // 소문자로 들어와도 대문자로 변환
        .isIn(['IN', 'OUT']).withMessage('direction은 IN 또는 OUT이어야 합니다.'),

    // 수정 가능한 필드들
    body('carNumber')
        .optional()
        .trim()
        .isLength({ min: 4 }).withMessage('차량 번호가 너무 짧습니다.'),

    body('vehicleType')
        .optional()
        .toUpperCase()
        .isIn(['NORMAL', 'MEMBER', 'COMPACT', 'ELECTRIC', 'DISABLED'])
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

    body('note').optional().isString(),

    // [보안] 수정 불가능한 핵심 필드 차단
    body('status').not().exists().withMessage('상태(status)는 정보 수정 API로 변경할 수 없습니다.'),
    body('exitTime').not().exists().withMessage('출차 시간은 정보 수정 API로 변경할 수 없습니다.'),
    body('totalFee').not().exists().withMessage('요금은 직접 수정할 수 없습니다.'),
    body('paidFee').not().exists().withMessage('결제 금액은 수정할 수 없습니다.'),
    body('discountFee').not().exists().withMessage('할인 금액은 수정할 수 없습니다.')
];