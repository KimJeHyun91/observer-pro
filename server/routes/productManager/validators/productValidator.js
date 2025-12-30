const { body } = require('express-validator');

exports.modifyRules = [

    body('idx')
        .notEmpty().withMessage('idx는 필수값입니다.')
        .isInt().withMessage('idx는 숫자이어야 합니다.'),

    body('vendor')
        .optional()
        .isString().withMessage('vendor는 문자열이어야 합니다.'),
    
    body('modelName')
        .optional()
        .isString().withMessage('modelName은 문자열이어야 합니다.'),

    body('modelNumber')
        .optional()
        .isString().withMessage('modelNumber는 문자열이어야 합니다.'),

    body('firmwareVersion')
        .optional()
        .isString().withMessage('firmwareVersion은 문자열이어야 합니다.'),

    body('notes')
        .optional()
        .isArray().withMessage('notes는 배열이어야 합니다.'),

    body('notes.*.time')
        .notEmpty().withMessage('notes 항목의 time은 필수값입니다.')
        .matches(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})$/).withMessage('notes 항목의 time은 YYYY-MM-DD HH:mm 형식이어야 합니다. ')
        .custom((value) => {
            const date = new Date(value);
            if(isNaN(date.getTime())) {
                throw new Error('유효하지 않은 날짜 또는 시간입니다.');
            }
            return value;
        }),

    body('notes.*.content')
        .notEmpty().withMessage('notes 항목의 content는 필수값입니다.')
        .isString().withMessage('notes 항목의 content는 문자열이어야 합니다.')

];

exports.bulkModifyRules = [

    body('idxList')
        .isArray().withMessage('idxList는 배열이어야 합니다.')
        .isLength({ min: 1 }).withMessage('idxList는 1개 이상의 요소를 가진 배열이어야 합니다.'),

    body('idxList.*')
        .notEmpty().withMessage('idx는 필수값입니다.')
        .isInt().withMessage('idx는 숫자이어야 합니다.'),

    body('vendor')
        .optional()
        .isString().withMessage('vendor는 문자열이어야 합니다.'),

    body('firmwareVersion')
        .optional()
        .isString().withMessage('firmwareVersion은 문자열이어야 합니다.')

]

exports.deleteRules = [

    body('idx')
        .notEmpty().withMessage('idx는 필수값입니다.')
        .isInt().withMessage('idx는 숫자이어야 합니다.')

];

exports.findRules = [

    body('deviceName')
        .optional()
        .isString().withMessage('deviceName은 문자열이어야 합니다.'),

    body('location')
        .optional()
        .isString().withMessage('location은 문자열이어야 합니다.'),

    body('serviceType')
        .optional()
        .isString().withMessage('serviceType은 문자열이어야 합니다.'),

    body('deviceType')
        .optional()
        .isString().withMessage('deviceType은 문자열이어야 합니다.'),
    
    body('idx')
        .optional()
        .isInt().withMessage('idx는 숫자이어야 합니다.')
    
]

exports.findTypesRules = [

    body('requestType')
        .notEmpty().withMessage('requestType은 필수값입니다.')
        .isIn(['service', 'device']).withMessage(`requestType은 'service' 또는 'device' 만 입력가능합니다.`),

];

exports.findAllWithSummuriesRules = [

    body('sortColum')
        .optional()
        .isIn().withMessage(`sortColumn은 'installationDate' 또는 'remainingDays' 이어야 합니다.`),

    body('deviceName')
        .optional()
        .isString().withMessage('deviceName은 문자열이어야 합니다.'),

    body('serviceType')
        .optional()
        .isString().withMessage('serviceType은 문자열이어야 합니다.'),

    body('deviceType')
        .optional()
        .isString().withMessage('deviceType은 문자열이어야 합니다.'),

    body('notificationLabel')
        .optional()
        .isString().withMessage('notificationLabel은 문자열이어야 합니다.')

];
