const { body, query, param } = require('express-validator');

const validateId = param('id')
    .notEmpty().withMessage('id는 필수입니다.')
    .isUUID().withMessage('유효하지 않은 UUID 형식입니다.');

/**
 * 장비 제어기(Device Controller) 조회 유효성 검사
 */
exports.getDeviceControllers = [
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
        .isIn(['name', 'code', 'createdAt', 'updatedAt'])
        .withMessage('정렬 기준이 올바르지 않습니다. (허용: name, code, createdAt, updatedAt)'),

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
        .isString().withMessage('code은 문자열이어야 합니다.')
        .trim(),

    query('siteId')
        .optional()
        .isUUID().withMessage('siteId는 UUID 형식이어야 합니다.'),

    body('ipAddress')
        .optional()
        .isIP().withMessage('유효한 IP 주소여야 합니다.'),
    
    body('port')
        .optional()
        .isInt({ min: 1, max: 65535 }).withMessage('Port는 1~65535 사이의 정수여야 합니다.'),

    query('status')
        .optional()
        .isIn(['ONLINE', 'OFFLINE', 'ERROR']).withMessage("status은 'ONLINE', 'OFFLINE', 'ERROR' 중 하나여야 합니다."),

    query('type')
        .optional()
        .isIn(['SERVER', 'EMBEDDED', 'MIDDLEWARE']).withMessage("type은 'SERVER', 'EMBEDDED', 'MIDDLEWARE' 중 하나여야 합니다.")
];

/**
 * 장비 제어기(Device Controller) 상세 조회 유효성 검사
 */
exports.getDeviceController = [
    validateId
];


/**
 * 장비 제어기(Device Controller) 생성 유효성 검사
 */
exports.createDeviceController = [
    body('siteId')
        .notEmpty().withMessage('siteId는 필수입니다.')
        .isUUID().withMessage('siteId는 UUID 형식이어야 합니다.'),

    body('type')
        .optional()
        .isIn(['SERVER', 'EMBEDDED', 'MIDDLEWARE']).withMessage("type은 'SERVER', 'EMBEDDED', 'MIDDLEWARE' 중 하나여야 합니다."),

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
        .isString().withMessage('code은 문자열이어야 합니다.')
        .trim(),    

    body('ipAddress')
        .notEmpty().withMessage('ipAddress는 필수입니다')
        .isIP().withMessage('유효한 IP 주소여야 합니다.'),
    
    body('port')
        .notEmpty().withMessage('port는 필수입니다.')
        .isInt({ min: 1, max: 65535 }).withMessage('Port는 1~65535 사이의 정수여야 합니다.'),
    
    body('config')
        .optional()
        .isObject().withMessage('config는 JSON 객체여야 합니다.')
];

/**
 * 장비 제어기(Device Controller) 수정 유효성 검사
 */
exports.updateDeviceController = [
    validateId,

    body('siteId')
        .optional()
        .isUUID().withMessage('siteId는 UUID 형식이어야 합니다.'),

    body('type')
        .optional()
        .isIn(['SERVER', 'EMBEDDED', 'MIDDLEWARE']).withMessage("type은 'SERVER', 'EMBEDDED', 'MIDDLEWARE' 중 하나여야 합니다."),

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
        .isString().withMessage('code은 문자열이어야 합니다.')
        .trim(),    

    body('ipAddress')
        .optional()
        .isIP().withMessage('유효한 IP 주소여야 합니다.'),
    
    body('port')
        .optional()
        .isInt({ min: 1, max: 65535 }).withMessage('Port는 1~65535 사이의 정수여야 합니다.'),
    
    body('config')
        .optional()
        .isObject().withMessage('config는 JSON 객체여야 합니다.')
];



/**
 * 장비 제어기(Device Controller) 삭제 유효성 검사
 */
exports.deleteDeviceController = [
    validateId
];

/**
 * 장비 제어기(Device Controller) 다중 삭제 유효성 검사
 */
exports.deleteMultipleDeviceController = [
    body('ids')
        .notEmpty().withMessage('ids은 필수입니다.')
        .isArray({ min: 1 }).withMessage('ids은 1개 이상의 배열이어야 합니다.'),
    body('ids.*')
        .isUUID().withMessage('ids의 요소는 UUID 형식이어야 합니다.')
];

/**
 * 장비 제어기(Device Controller) 동기화 유효성 검사
 */
exports.syncDeviceController = [
    validateId
];
