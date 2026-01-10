const { body, param, query } = require('express-validator');

/**
 * 주차 세션 유효성 검사 (Validator)
 * - CRU(Create, Read, Update) 구조에 맞춘 통합 검증 로직
 */

// 1. 생성 (Create) - 사실상 '입차(Entry)' 시점
exports.validateCreate = [
    // [필수] 사이트 및 차량 정보
    body('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

    body('siteName')
        .optional()
        .isString()
        .withMessage('사이트 이름(siteName)은 문자열이어야 합니다.'),

    body('carNumber')
        .notEmpty().withMessage('차량 번호(carNumber)는 필수입니다.')
        .trim()
        .isLength({ min: 4 }).withMessage('차량 번호가 너무 짧습니다.'),

    // [선택] 입차 관련 정보 (게이트, 시간, 차량유형)
    body('entryZoneId').optional().isUUID().withMessage('entryZoneId는 UUID여야 합니다.'),
    body('entryLaneId').optional().isUUID().withMessage('entryLaneId는 UUID여야 합니다.'),
    
    body('entryTime')
        .optional()
        .isISO8601().withMessage('입차 시간(entryTime)은 ISO8601 형식(YYYY-MM-DDTHH:mm:ssZ)이어야 합니다.'),

    body('vehicleType')
        .optional()
        .toUpperCase()
        .isIn(['NORMAL', 'MEMBER', 'COMPACT', 'ELECTRIC', 'DISABLED'])
        .withMessage('유효하지 않은 차량 타입입니다.'),

    body('entryImageUrl').optional().isString()
];

/**
 * 회원 상세 조회 유효성 검사
 */
exports.getOne = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];


// 2. 수정 (Update) - '출차(Exit)', '정산(Settlement)', '오타 수정' 통합
exports.validateUpdate = [
    // Path Parameter 확인
    param('id')
        .notEmpty().withMessage('Session ID는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.'),

    // --- [출차 관련 필드] ---
    // 출차 시간이 들어오면 Service에서 자동으로 '출차 처리' 로직이 수행됨
    body('exitTime')
        .optional()
        .isISO8601()
        .custom((exitTime, { req }) => {
            const entryTime = req.body.entryTime; 
            // 만약 body에 entryTime이 같이 들어왔다면 비교
            if (entryTime && new Date(exitTime) <= new Date(entryTime)) {
                throw new Error('출차 시간(exitTime)은 입차 시간(entryTime)보다 늦어야 합니다.');
            }
            return true;
        }),
    
    body('exitZoneId').optional().isUUID().withMessage('exitZoneId는 UUID여야 합니다.'),
    body('exitLaneId').optional().isUUID().withMessage('exitLaneId는 UUID여야 합니다.'),
    body('exitImageUrl').optional().isString(),

    // --- [정산 관련 필드] ---
    // 금액은 음수가 될 수 없음
    body('totalFee')
        .optional()
        .isInt({ min: 0 }).withMessage('전체 요금은 0원 이상이어야 합니다.'),
    
    body('discountFee')
        .optional()
        .isInt({ min: 0 }).withMessage('할인 요금은 0원 이상이어야 합니다.'),

    body('paidFee')
        .optional()
        .isInt({ min: 0 }).withMessage('결제 요금은 0원 이상이어야 합니다.'),

    // JSONB 필드: 배열 형태인지 확인
    body('appliedDiscounts')
        .optional()
        .isArray().withMessage('적용된 할인 내역(appliedDiscounts)은 배열(Array) 형태여야 합니다.'),

    // --- [정보 수정 관련 필드] ---
    // 입차 시간이나 차량 번호 오인식 수정 대응
    body('entryTime')
        .optional()
        .isISO8601().withMessage('수정할 입차 시간은 ISO8601 형식이어야 합니다.'),
    
    body('carNumber')
        .optional()
        .trim()
        .isLength({ min: 4 }).withMessage('차량 번호가 너무 짧습니다.'),

    // 상태 강제 변경 (관리자 기능 등)
    body('status')
        .optional()
        .toUpperCase()
        .isIn(['PENDING', 'PRE_SETTLED', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'RUNAWAY', 'UNRECOGNIZED'])
        .withMessage('유효하지 않은 상태값입니다.'),

    body('preSettledAt')
        .optional()
        .isISO8601()
        .custom((preSettledAt, { req }) => {
            const entryTime = req.body.entryTime;
            const exitTime = req.body.exitTime;
            const psTime = new Date(preSettledAt);

            if (entryTime && psTime < new Date(entryTime)) {
                throw new Error('사전 정산 시간은 입차 시간보다 빠를 수 없습니다.');
            }
            if (exitTime && psTime > new Date(exitTime)) {
                throw new Error('사전 정산 시간은 출차 시간보다 늦을 수 없습니다.');
            }
            return true;
        }),
];

// 3. 목록 조회 (List)
exports.validateList = [
    query('siteId').optional().isUUID().withMessage('siteId는 UUID여야 합니다.'),
    
    query('carNumber').optional().trim(),
    
    // 기간 검색 (입차 기준, 출차 기준)
    query('entryTimeStart').optional().isISO8601(),
    query('entryTimeEnd').optional().isISO8601(),
    query('exitTimeStart').optional().isISO8601(),
    query('exitTimeEnd').optional().isISO8601(),

    query('status')
        .optional()
        .toUpperCase()
        .isIn(['PENDING', 'PRE_SETTLED', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'RUNAWAY'])
        .withMessage('유효하지 않은 상태값입니다.'),

    // 페이징
    query('page').optional().isInt({ min: 1 }).withMessage('page는 1 이상이어야 합니다.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('limit은 1 이상이어야 합니다.')
];

// 4. 상세 조회 (Detail)
exports.validateDetail = [
    param('id')
        .notEmpty().withMessage('ID는 필수입니다.')
        .isUUID().withMessage('유효한 UUID 형식이 아닙니다.')
];