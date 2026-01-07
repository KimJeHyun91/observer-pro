const { body, query, param } = require('express-validator');

/**
 * 정기권 회원 생성 유효성 검사
 * - 필수: site_id, car_number, start_date, end_date
 * - 선택: owner, phone, group_name, note 등
 */
exports.createMember = [
    body('site_id').optional().isUUID().withMessage('유효한 site_id(UUID)여야 합니다.'),
    body('car_number').notEmpty().withMessage('차량 번호는 필수입니다.'),
    body('owner').optional().isString(),
    body('phone').optional().isString(),
    body('group_name').optional().isString(),
    body('start_date').isISO8601().withMessage('시작일은 유효한 날짜 형식(YYYY-MM-DD)이어야 합니다.'),
    body('end_date').isISO8601().withMessage('종료일은 유효한 날짜 형식(YYYY-MM-DD)이어야 합니다.'),
    body('note').optional().isString()
    // is_active는 생성 시 true 고정
];

/**
 * 정기권 회원 수정 유효성 검사
 * - ID는 UUID 형식이어야 함
 * - 수정할 필드만 선택적으로 전달
 */
exports.updateMember = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.'),
    body('site_id').optional().isUUID(),
    body('car_number').optional().notEmpty(),
    body('owner').optional().isString(),
    body('phone').optional().isString(),
    body('group_name').optional().isString(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('note').optional().isString()
    // is_active 수정 불가 (삭제 API 이용)
];

/**
 * 정기권 회원 상세 조회 유효성 검사
 */
exports.getMember = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.')
];

/**
 * 정기권 회원 삭제 유효성 검사
 * - deleteMethod 파라미터 확인
 */
exports.deleteMember = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.'),
    query('deleteMethod').optional().isIn(['SOFT', 'HARD']).withMessage("deleteMethod는 'SOFT' 또는 'HARD'여야 합니다.")
];

/**
 * 정기권 회원 목록 조회 유효성 검사
 * - 페이징, 정렬, 검색
 */
exports.getMembers = [
    // 페이징
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1 }),
    
    // 정렬
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']),
    
    // 검색 조건 (모든 컬럼)
    query('site_id').optional().isUUID(),
    query('car_number').optional().isString(),
    query('owner').optional().isString(), // 암호화 처리 필요 시 주의
    query('phone').optional().isString(),
    query('group_name').optional().isString(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('is_active').optional().isBoolean()
];