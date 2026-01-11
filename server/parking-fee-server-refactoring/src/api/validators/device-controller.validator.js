const { body, query, param } = require('express-validator');

/**
 * 장비 제어기 생성 유효성 검사
 */
exports.createDeviceController = [    
    body('type').optional().isString().withMessage('type은 SERVER, EMBEDDED, MIDDELWARE 이어야 합니다.'),
    
    body('siteId').optional().isUUID().withMessage('유효한 siteId(UUID)여야 합니다.'),

    body('name').notEmpty().withMessage('name은 필수입니다.').isString().withMessage('name은 문자열이어야 합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').notEmpty().withMessage('code는 필수입니다.').isString().withMessage('code는 문자열이어야합니다.'),   

    body('ipAddress').notEmpty().withMessage('ipAddress는 필수입니다.').isIP().withMessage('유효한 IP 주소여야 합니다.'),
    body('port').notEmpty().withMessage('port는 필수입니다.').isInt({ min: 1, max: 65535 }).withMessage('Port는 1~65535 사이의 정수여야 합니다.'),
    
    body('config').optional().isObject().withMessage('config는 JSON 객체여야 합니다.')
];

/**
 * 장비 제어기 수정 유효성 검사
 * - ID는 UUID 형식이어야 함
 * - 수정할 필드만 선택적으로 전달
 */
exports.updateDeviceController = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),

    body('siteId').optional().isUUID().withMessage('유효한 siteId(UUID)여야 합니다.'),

    body('type').optional().isIn(['SERVER', 'EMBEDDED', 'MIDDLEWARE']).withMessage('type은 SERVER, EMBEDDED, MIDDLEWARE 중 하나여야 합니다.'),

    body('name').optional().isString().withMessage('name은 문자열이어야 합니다.'),
    body('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    body('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   

    body('ipAddress').optional().isIP().withMessage('유효한 IP 주소여야 합니다.'),
    body('port').optional().isInt({ min: 1, max: 65535 }).withMessage('Port는 1~65535 사이의 정수여야 합니다.'),
    
    body('config').optional().isObject().withMessage('config는 JSON 객체여야 합니다.')
];

/**
 * 장비 제어기 상세 조회 유효성 검사
 */
exports.getDeviceController = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 장비 제어기 삭제 유효성 검사
 */
exports.deleteDeviceController = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 장비 제어기 다중 삭제 유효성 검사
 */
exports.deleteMultipleDeviceController = [
    body('deviceControllerIdList').notEmpty().withMessage('삭제할 ID 목록이 비어있습니다.').isArray({ min: 1, max: 100 }).withMessage('ID 목록은 배열 형태여야 합니다.')
];

/**
 * 장비 제어기 동기화 유효성 검사
 */
exports.syncDeviceController = [
    param('id').notEmpty().withMessage('id는 필수입니다.').isUUID().withMessage('유효한 UUID가 아닙니다.'),
];

/**
 * 장비 제어기 조회 유효성 검사
 * - 페이징, 정렬, 검색
 */
exports.getDeviceControllers = [
    // 페이징
    query('page').optional().isInt({ min: 1 }).withMessage('page는 숫자이어야 합니다.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('limit은 숫자이어야 합니다.'),
    
    // 정렬
    query('sortBy').optional().isString().withMessage('sortBy는 문자열이어야 합니다.'),
    query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage("sortOrder는 'ASC' 또는 'DESC'이어야 합니다."),
    
    // 검색 조건 (모든 컬럼)
    query('siteId').optional().isUUID().withMessage('유효한 UUID가 아닙니다.'),

    query('type').optional().toUpperCase().isIn(['SERVER', 'EMBEDDED', 'MIDDLEWARE']).withMessage('type은 SERVER, EMBEDDED, MIDDLEWARE 중 하나여야 합니다.'),

    query('name').optional().isString().withMessage('name은 문자열이어야합니다.'),
    query('description').optional().isString().withMessage('description은 문자열이어야합니다.'),
    query('code').optional().isString().withMessage('code는 문자열이어야합니다.'),   
    
    query('ipAddress').optional().isString().withMessage('ipAddress는 문자열이어야합니다.'),
    query('port').optional().isInt().withMessage('port는 문자열이어야합니다.'),
    query('status').optional().isString().withMessage('status는 문자열이어야합니다.'),

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
        }),

];