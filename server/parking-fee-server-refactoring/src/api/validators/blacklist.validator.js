const { body, query, param } = require('express-validator');

/**
 * 블랙리스트 생성 유효성 검사
 * - 필수: car_number
 * - 선택: site_id, reason
 */
exports.createBlacklist = [
    body('site_id').optional().isUUID().withMessage('유효한 site_id(UUID)여야 합니다.'),
    body('car_number').notEmpty().withMessage('차량 번호는 필수입니다.'),
    body('reason').optional().isString()
    // is_active는 생성 시 true 고정
];

/**
 * 블랙리스트 수정 유효성 검사
 * - ID는 UUID 형식이어야 함
 * - 수정할 필드만 선택적으로 전달
 */
exports.updateBlacklist = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.'),
    body('site_id').optional().isUUID().withMessage('유효한 site_id(UUID)여야 합니다.'),
    body('car_number').optional().notEmpty(),
    body('reason').optional().isString()
    // is_active 수정 불가 (삭제 API 이용)
];

/**
 * 블랙리스트 상세 조회 유효성 검사
 */
exports.getBlacklist = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.')
];

/**
 * 블랙리스트 삭제 유효성 검사
 * - deleteMethod 파라미터 확인
 */
exports.deleteBlacklist = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.'),
    query('deleteMethod').optional().isIn(['SOFT', 'HARD']).withMessage("deleteMethod는 'SOFT' 또는 'HARD'여야 합니다.")
];

/**
 * 블랙리스트 목록 조회 유효성 검사
 * - 페이징, 정렬, 검색
 */
exports.getBlacklists = [
    // 페이징
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1 }),
    
    // 정렬
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']),
    
    // 검색 조건 (모든 컬럼)
    query('site_id').optional().isUUID(),
    query('car_number').optional().isString(),
    query('reason').optional().isString(),
    query('is_active').optional().isBoolean()
];