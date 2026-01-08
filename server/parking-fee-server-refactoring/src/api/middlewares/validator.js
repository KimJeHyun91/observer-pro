const { validationResult } = require('express-validator');

/**
 * express-validator 유효성 검사 결과를 확인하고,
 * 에러가 있을 경우 400 Bad Request 응답을 반환하는 미들웨어
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'fail',
      // errors: errors.array().map(err => ({
      //   field: err.path,
      //   message: err.msg,
      //   value: err.value  
      // }))
      message: errors.array()[0].msg,
    });
  }
  next();
};

module.exports = validate;