const { body } = require('express-validator');

exports.enrollRules = [

    body('title')
        .notEmpty().withMessage('title은 필수값입니다.')
        .isString().withMessage('title은 문자열이어야 합니다.'),

    body('visitDate')
        .notEmpty().withMessage('visitDate는 필수값입니다.')
        .isString().withMessage(`visitDate는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: '2025-09-01', '20250909')`)
        .isISO8601().withMessage(`visitDate는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: '2025-09-01', '20250909')`),

    body('workerName')
        .notEmpty().withMessage('workerName은 필수값입니다.')
        .isString().withMessage('workerName은 문자열이어야 합니다.'),

    body('department')
        .notEmpty().withMessage('department은 필수값입니다.')
        .isString().withMessage('department은 문자열이어야 합니다.'),

    body('workDetail')
        .notEmpty().withMessage('workDetail은 필수값입니다.')
        .isString().withMessage('workDetail은 문자열이어야 합니다.'),

    body('notes')
        .optional()
        .isString().withMessage('notes는 문자열이어야합니다.')

];

exports.modifyRules = [
    
    body('idx')
        .notEmpty().withMessage('idx는 필수값입니다.')
        .isInt().withMessage('idx는 숫자이어야 합니다.'),

    body('title')
        .optional()
        .trim()
        .notEmpty().withMessage(`title은 공백은 허용되지 않습니다.`)
        .isString().withMessage('title은 문자열이어야 합니다.'),

    body('visitDate')
        .optional()
        .isString().withMessage(`visitDate는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: '2025-09-01', '20250909')`)
        .isISO8601().withMessage(`visitDate는 유효한 날짜 형식이 아닙니다. (유효한 날짜 형식 예: '2025-09-01', '20250909')`),

    body('workerName')
        .optional()
        .trim()
        .notEmpty().withMessage(`workerName은 공백은 허용되지 않습니다.`)
        .isString().withMessage('workerName은 문자열이어야 합니다.'),

    body('department')
        .optional()
        .trim()
        .notEmpty().withMessage(`department는 공백은 허용되지 않습니다.`)
        .isString().withMessage('department은 문자열이어야 합니다.'),

    body('workDetail')
        .optional()
        .trim()
        .notEmpty().withMessage(`workDetail는 공백은 허용되지 않습니다.`)
        .isString().withMessage('workDetail은 문자열이어야 합니다.'),

    body('notes')
        .optional()
        .isString().withMessage('notes는 문자열이어야합니다.')

];

exports.deleteRules = [

    body('idx')
        .notEmpty().withMessage('idx는 필수값입니다.')
        .isInt().withMessage('idx는 숫자이어야 합니다.')

];

exports.findRules = [

    body('idx')
        .optional()
        .isInt().withMessage('idx는 숫자이어야 합니다.'),

    body('title')
        .optional()
        .isString().withMessage('title은 문자열이어야 합니다.'),

    body('workerName')
        .optional()
        .isString().withMessage('workerName은 문자열이어야 합니다.'),

    body('department')
        .optional()
        .isString().withMessage('department은 문자열이어야 합니다.'),
        
];

exports.downloadReportsRules = [

    body('idx')
        .notEmpty().withMessage('idx는 필수값입니다.')
        .isInt().withMessage('idx는 숫자이어야 합니다.'),
        
    body('form')
        .notEmpty().withMessage('form은 필수값입니다.')
        .isIn(['pdf', 'xlsx']).withMessage(`form은 'pdf' 또는 'xlsx'이어야 합니다.`),

];