const { body, query, param } = require('express-validator');

/**
 * 정책 생성 유효성 검사
 * - 필수: name, config
 * - 선택: site_id, description, code 등
 */
exports.createPolicy = [
    body('site_id').optional().isUUID().withMessage('유효한 site_id(UUID)여야 합니다.'),
    body('name').notEmpty().withMessage('정책 이름은 필수입니다.'),
    body('code').optional().isString(),
    body('description').optional().isString(),
    body('config').isObject().withMessage('config는 JSON 객체여야 합니다.')
    // is_active는 생성 시 true 고정
];

/**
 * 정책 수정 유효성 검사
 * - ID는 UUID 형식이어야 함
 * - 수정할 필드만 선택적으로 전달
 */
exports.updatePolicy = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.'),
    body('site_id').optional().isUUID().withMessage('유효한 site_id(UUID)여야 합니다.'),
    body('name').optional().notEmpty(),
    body('code').optional().isString(),
    body('description').optional().isString(),
    body('config').optional().isObject().withMessage('config는 JSON 객체여야 합니다.')
    // is_active 수정 불가 (삭제 API 이용)
];

/**
 * 정책 상세 조회 유효성 검사
 */
exports.getPolicy = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.')
];

/**
 * 정책 삭제 유효성 검사
 * - deleteMethod 파라미터 확인
 */
exports.deletePolicy = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.'),
    query('deleteMethod').optional().isIn(['SOFT', 'HARD']).withMessage("deleteMethod는 'SOFT' 또는 'HARD'여야 합니다.")
];

/**
 * 정책 목록 조회 유효성 검사
 * - 페이징, 정렬, 검색
 */
exports.getPolicies = [
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
    query('is_active').optional().isBoolean()
];