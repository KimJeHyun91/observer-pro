const { query } = require('express-validator');

const commonLogFilters = [
    // 페이징
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1 }),
    
    // 정렬
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']),
    
    // 공통 필터
    query('site_id').optional().isUUID(),
    query('start_date').optional().isISO8601().withMessage('YYYY-MM-DD 또는 ISO8601 형식이어야 합니다.'),
    query('end_date').optional().isISO8601().withMessage('YYYY-MM-DD 또는 ISO8601 형식이어야 합니다.')
];

/**
 * 차량 감지 로그 조회 검증
 */
exports.getVehicleDetectionLogs = [
    ...commonLogFilters,
    query('lane_id').optional().isUUID(),
    query('direction').optional().isIn(['in', 'out']),
    query('status').optional().isIn(['on', 'off'])
];

/**
 * 결제 로그 조회 검증
 */
exports.getSettlementLogs = [
    ...commonLogFilters,
    query('parking_session_id').optional().isUUID(),
    query('card_no_hash').optional().isString(),
    query('transaction_id').optional().isString(),
    query('status').optional().isString()
];

/**
 * 장비 이벤트 로그 조회 검증
 */
exports.getDeviceEventLogs = [
    ...commonLogFilters,
    query('device_id').optional().isUUID(),
    query('type').optional().isString(),
    query('message').optional().isString()
];

/**
 * 통신 로그 조회 검증
 */
exports.getLinkLogs = [
    ...commonLogFilters,
    query('device_controller_id').optional().isUUID(),
    query('direction').optional().isIn(['SEND', 'RECV']),
    query('path').optional().isString()
];