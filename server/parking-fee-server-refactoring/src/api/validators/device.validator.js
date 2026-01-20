const { body, query, param } = require('express-validator');

const validateId = param('id')
    .notEmpty().withMessage('id는 필수입니다.')
    .isUUID().withMessage('유효하지 않은 UUID 형식입니다.');

/**
 * 장비(Device) 목록 조회 유효성 검사
 */
exports.getDevices = [   
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
        .isIn(['name', 'code', 'siteId', 'createdAt', 'updatedAt'])
        .withMessage('정렬 기준이 올바르지 않습니다. (허용: name, code, siteId, createdAt, updatedAt)'),

    query('sortOrder')
        .optional()
        .toUpperCase()
        .isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'여야 합니다."),
    
    // 기본 검색
    query('name')
        .optional()
        .isString().withMessage('name은 문자열이어야 합니다.')
        .trim(),

    query('code')
        .optional()
        .isString().withMessage('code는 문자열이어야 합니다.')
        .trim(),

    query('siteId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    query('isUsedByLane')
        .optional()
        .isBoolean().withMessage('isUsedByLane는 true 또는 false여야 합니다.')
        .toBoolean(),

    query('direction')
        .optional()
        .toUpperCase().isIn(['IN', 'OUT', 'BOTH'])
        .withMessage("direction은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다."),

    query('type')
        .optional()
        .isIn(['INTEGRATED_GATE', 'BARRIER', 'LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA']).withMessage("type은 'INTEGRATED_GATE', 'BARRIER', 'LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA' 중 하나여야 합니다."),

    
];

/**
 * 장비(Device) 상세 조회 유효성 검사
 */
exports.getDevice = [
    validateId
];

/**
 * 장비(Device) 생성 유효성 검사
 */
exports.createDevice = [
    body('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('zoneId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('laneId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('deviceControllerId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('parentDeviceId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('type')
        .notEmpty().withMessage("장비 타입은 필수입니다.")
        .isIn(['INTEGRATED_GATE', 'BARRIER', 'LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA']).withMessage("type은 'INTEGRATED_GATE', 'BARRIER', 'LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA' 중 하나여야 합니다."),

    body('name')
        .notEmpty().withMessage('name은 필수입니다.')
        .isString().withMessage('name은 문자열이어야 합니다.')
        .trim(),

    body('description')
        .optional()
        .isString().withMessage('description은 문자열이어야 합니다.')
        .trim(),

    body('code')
        .optional()
        .isString().withMessage('code는 문자열이어야 합니다.')
        .trim(),

    body('vendor')
        .optional()
        .isString().withMessage('vendor 문자열이어야 합니다'),

    body('modelName')
        .optional()
        .isString().withMessage('modelName 문자열이어야 합니다'),

    body('ipAddress')
        .optional()
        .isIP().withMessage('유효한 IP 주소여야 합니다.'),

    body('port')
        .optional()
        .isInt({ min: 1, max: 65535 }).withMessage('port 1~65535 자리의 숫자이어야 합니다'),
        
    body('macAddress')
        .optional()
        .isMACAddress().withMessage('macAddress 문자열이어야 합니다'),

    body('connectionType')
        .optional()
        .isString().withMessage('connectionType 문자열이어야 합니다'),

    body('serialNumber')
        .optional()
        .isString().withMessage('serialNumber 문자열이어야 합니다'),

    body('firmwareVersion')
        .optional()
        .isString().withMessage('firmwareVersion 문자열이어야 합니다'),

    body('direction')
        .optional()
        .isIn(['IN', 'OUT', 'BOTH']).withMessage("direction은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다.")
];

/**
 * 장비(Device) 수정 유효성 검사
 */
exports.updateDevice = [
    validateId,
    
    body('siteId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('zoneId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('laneId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('deviceControllerId')
        .optional()
        .isUUID().withMessage('유효하지 않은 UUID 형식입니다.'),

    body('type')
        .optional()
        .isIn(['INTEGRATED_GATE', 'BARRIER', 'LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA']).withMessage("type은 'INTEGRATED_GATE', 'BARRIER', 'LPR', 'LED', 'KIOSK', 'LOOP', 'PINHOLE_CAMERA' 중 하나여야 합니다."),

    body('name')
        .optional()
        .isString().withMessage('name은 문자열이어야 합니다.')
        .trim(),

    body('description')
        .optional()
        .isString().withMessage('description은 문자열이어야 합니다.')
        .trim(),

    body('code')
        .optional()
        .isString().withMessage('code는 문자열이어야 합니다.')
        .trim(),

    body('vendor')
        .optional()
        .isString().withMessage('vendor 문자열이어야 합니다'),

    body('modelName')
        .optional()
        .isString().withMessage('modelName 문자열이어야 합니다'),

    body('ipAddress')
        .optional()
        .isIP().withMessage('유효한 IP 주소여야 합니다.'),

    body('port')
        .optional()
        .isInt({ min: 1, max: 65535 }).withMessage('port 1~65535 자리의 숫자이어야 합니다'),
        
    body('macAddress')
        .optional()
        .isMACAddress().withMessage('macAddress 문자열이어야 합니다'),

    body('connectionType')
        .optional()
        .isString().withMessage('connectionType 문자열이어야 합니다'),

    body('serialNumber')
        .optional()
        .isString().withMessage('serialNumber 문자열이어야 합니다'),

    body('firmwareVersion')
        .optional()
        .isString().withMessage('firmwareVersion 문자열이어야 합니다'),

    body('direction')
        .optional()
        .isIn(['IN', 'OUT', 'BOTH']).withMessage("direction은 'IN', 'OUT', 'BOTH' 중 하나이어야 합니다.")
];

/**
 * 장비(Device) 삭제 유효성 검사
 */
exports.deleteDevice = [
    validateId
];