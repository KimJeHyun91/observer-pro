const { body, query, param } = require('express-validator');

/**
 * 휴일 생성 유효성 검사
 * - 필수: name, date
 * - 선택: site_id, description, code, is_recurring 등
 */
exports.createHoliday = [
    body('site_id').optional().isUUID().withMessage('유효한 site_id(UUID)여야 합니다.'),
    body('name').notEmpty().withMessage('휴일 명칭은 필수입니다.'),
    body('date').isISO8601().withMessage('유효한 날짜 형식(YYYY-MM-DD)이어야 합니다.'),
    body('description').optional().isString(),
    body('code').optional().isString(),
    body('is_recurring').optional().isBoolean().withMessage('is_recurring은 boolean 값이어야 합니다.')
    // is_active는 생성 시 true 고정
];

/**
 * 휴일 수정 유효성 검사
 * - ID는 UUID 형식이어야 함
 * - 수정할 필드만 선택적으로 전달
 */
exports.updateHoliday = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.'),
    body('site_id').optional().isUUID().withMessage('유효한 site_id(UUID)여야 합니다.'),
    body('name').optional().notEmpty(),
    body('date').optional().isISO8601(),
    body('description').optional().isString(),
    body('code').optional().isString(),
    body('is_recurring').optional().isBoolean()
    // is_active 수정 불가 (삭제 API 이용)
];

/**
 * 휴일 상세 조회 유효성 검사
 */
exports.getHoliday = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.')
];

/**
 * 휴일 삭제 유효성 검사
 * - deleteMethod 파라미터 확인
 */
exports.deleteHoliday = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.'),
    query('deleteMethod').optional().isIn(['SOFT', 'HARD']).withMessage("deleteMethod는 'SOFT' 또는 'HARD'여야 합니다.")
];

/**
 * 휴일 목록 조회 유효성 검사
 * - 페이징, 정렬, 검색
 */
exports.getHolidays = [
    // 페이징
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1 }),
    
    // 정렬
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']),
    
    // 검색 조건 (모든 컬럼)
    query('site_id').optional().isUUID(),
    query('name').optional().isString(),
    query('code').optional().isString(),
    query('description').optional().isString(),
    query('date').optional().isISO8601(),
    query('is_recurring').optional().isBoolean(),
    query('is_active').optional().isBoolean()
];