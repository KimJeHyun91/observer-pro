const { body } = require('express-validator');

exports.modifyRules = [

    body('fieldManagerName')
        .optional()
        .isString().withMessage('fieldManagerName은 문자열이어야 합니다.'),

    body('relatedCompanies')
        .optional()
        .isString().withMessage('relatedCompanies는 문자열이어야 합니다.')    

];