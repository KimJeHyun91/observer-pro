const { body } = require('express-validator');

exports.downloadReportsRules = [

    body('idx')
        .notEmpty().withMessage('idx는 필수값입니다.')
        .isInt().withMessage('idx는 숫자이어야 합니다.'),
    body('form')
        .notEmpty().withMessage('form은 필수값입니다.')
        .isIn(['pdf', 'xlsx']).withMessage(`form은 'pdf' 또는 'xlsx'이어야 합니다.`),

];