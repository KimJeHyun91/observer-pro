const { body, query, param } = require('express-validator');

/**
 * 장비 생성 유효성 검사
 */
exports.createDevice = [
    body('siteId').optional().isUUID().withMessage('유효한 siteId가 필요합니다.'),
    body('zoneId').optional().isUUID().withMessage('유효한 zoneId여야 합니다.'),
    body('laneId').optional().isUUID().withMessage('유효한 laneId여야 합니다.'),
    body('deviceControllerId').optional().isUUID().withMessage('유효한 deviceControllerId가 필요합니다.'),
    
    body('parentDeviceId').optional().isUUID().withMessage('유효한 parentDeviceId여야 합니다.'),
    
    body('type').notEmpty().withMessage("장비 타입은 필수입니다.").isIn(['INTEGRATED_GATE', 'BARRIER', 'MAIN_LPR', 'SUB_LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA'])
        .withMessage("type은 'INTEGRATED_GATE', 'BARRIER', 'MAIN_LPR', 'SUB_LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA' 중 하나여야 합니다."),    
    body('name').notEmpty().withMessage('name은 필수입니다.').isString().withMessage('name은 문자열이어야 합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    body('vendor').optional().isString().withMessage('vendor 문자열이어야 합니다'),
    body('modelName').optional().isString().withMessage('modelName 문자열이어야 합니다'),
    body('ipAddress').optional().isIP().withMessage('유효한 IP 주소여야 합니다.'),
    body('port').optional().isInt({ min: 1, max: 65535 }).withMessage('port 1~65535 자리의 숫자이어야 합니다'),
    body('macAddress').optional().isMACAddress().withMessage('macAddress 문자열이어야 합니다'),
    body('connectionType').optional().isString().withMessage('connectionType 문자열이어야 합니다'),
    body('serialNumber').optional().isString().withMessage('serialNumber 문자열이어야 합니다'),
    body('firmwareVersion').optional().isString().withMessage('firmwareVersion 문자열이어야 합니다'),
    body('direction').optional().isIn(['IN', 'OUT', 'BOTH']).withMessage("direction은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다."),
    body('location').optional().isString().withMessage('location 문자열이어야 합니다')
];

/**
 * 장비 수정 유효성 검사
 * - ID는 UUID 형식이어야 함
 * - 수정할 필드만 선택적으로 전달
 */
exports.updateDevice = [
    param('id').isUUID().withMessage('유효한 UUID가 아닙니다.'),

    body('siteId').optional().isUUID().withMessage('유효한 siteId가 필요합니다.'),
    body('zoneId').optional().isUUID().withMessage('유효한 zoneId여야 합니다.'),
    body('laneId').optional().isUUID().withMessage('유효한 laneId여야 합니다.'),
    body('deviceControllerId').optional().isUUID().withMessage('유효한 deviceControllerId가 필요합니다.'),
    
    body('parentDeviceId').optional().isUUID().withMessage('유효한 parentDeviceId여야 합니다.'),
    
    body('type').optional().isIn(['INTEGRATED_GATE', 'BARRIER', 'MAIN_LPR', 'SUB_LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA'])
        .withMessage("type은 'INTEGRATED_GATE', 'BARRIER', 'MAIN_LPR', 'SUB_LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA' 중 하나여야 합니다."),    
    body('name').optional().isString().withMessage('name은 문자열이어야 합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    body('vendor').optional().isString().withMessage('vendor 문자열이어야 합니다'),
    body('modelName').optional().isString().withMessage('modelName 문자열이어야 합니다'),
    body('ipAddress').optional().isIP().withMessage('유효한 IP 주소여야 합니다.'),
    body('port').optional().isInt({ min: 1, max: 65535 }).withMessage('port 1~65535 자리의 숫자이어야 합니다'),
    body('macAddress').optional().isMACAddress().withMessage('macAddress 문자열이어야 합니다'),
    body('connectionType').optional().isString().withMessage('connectionType 문자열이어야 합니다'),
    body('serialNumber').optional().isString().withMessage('serialNumber 문자열이어야 합니다'),
    body('firmwareVersion').optional().isString().withMessage('firmwareVersion 문자열이어야 합니다'),
    body('direction').optional().isIn(['IN', 'OUT', 'BOTH']).withMessage("direction은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다."),
    body('location').optional().isString().withMessage('location 문자열이어야 합니다')
];

/**
 * 장비 상세 조회 유효성 검사
 */
exports.getDevice = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 장비 삭제 유효성 검사
 */
exports.deleteDevice = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 장비 목록 조회 유효성 검사
 * - 페이징, 정렬, 검색
 */
exports.getDevices = [
    // 페이징
    query('page').optional().isInt({ min: 1 }).withMessage('page는 숫자이어야 합니다.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('limit은 숫자이어야 합니다.'),
    
    // 정렬
    query('sortBy').optional().isString().withMessage('sortBy는 문자열이어야 합니다.'),
    query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'이어야 합니다."),
    
    // 검색 조건
    query('siteId').optional().isUUID().withMessage('유효한 UUID가 아닙니다.'),

    query('zoneId').optional().isUUID().withMessage('유효한 zoneId여야 합니다.'),
    query('laneId').optional().isUUID().withMessage('유효한 laneId여야 합니다.'),
    query('deviceControllerId').optional().isUUID().withMessage('유효한 deviceControllerId가 필요합니다.'),

    query('isUsedByLane').notEmpty().withMessage('isUsedByLane는 필수입니다.').isBoolean().withMessage('isUsedByLane는 true 또는 false이어야 합니다.').toBoolean(),
    
    query('parentDeviceId').optional().isUUID().withMessage('유효한 parentDeviceId여야 합니다.'),

    query('direction').optional().toUpperCase().isIn(['IN', 'OUT', 'BOTH']).withMessage("direction은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다."),

    query('type').optional().isIn(['INTEGRATED_GATE', 'BARRIER', 'MAIN_LPR', 'SUB_LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA'])
        .withMessage("type은 'INTEGRATED_GATE', 'BARRIER', 'MAIN_LPR', 'SUB_LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA' 중 하나여야 합니다."),
    query('name').optional().isString().withMessage('name은 문자열이어야 합니다.'),
    query('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    query('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    query('vendor').optional().isString().withMessage('vendor 문자열이어야 합니다'),
    query('modelName').optional().isString().withMessage('modelName 문자열이어야 합니다'),
    query('ipAddress').optional().isIP().withMessage('유효한 IP 주소여야 합니다.'),
    query('port').optional().isInt({ min: 1, max: 65535 }).withMessage('port 1~65535 자리의 숫자이어야 합니다'),
    query('macAddress').optional().isMACAddress().withMessage('macAddress 문자열이어야 합니다'),
    query('connectionType').optional().isString().withMessage('connectionType 문자열이어야 합니다'),
    query('serialNumber').optional().isString().withMessage('serialNumber 문자열이어야 합니다'),
    query('firmwareVersion').optional().isString().withMessage('firmwareVersion 문자열이어야 합니다'),
    query('direction').optional().toUpperCase().isIn(['IN, OUT, BOTH']).withMessage("direction은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다."),
    query('location').optional().isString().withMessage('location 문자열이어야 합니다'),

    query('status').optional().isString().withMessage('status는 문자열 이어야 합니다.'),

    query('lastHeartbeat')
        .optional()
        .isISO8601()
        .withMessage('날짜와 시간 형식이 올바르지 않습니다. (예: 2023-10-27T14:30:00)')
        .toDate(), // Date 객체로 변환

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
        })
];