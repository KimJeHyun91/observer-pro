const jwt = require('jsonwebtoken');
const logger = require('../logger');

exports.signJsonWebToken = async (id, role) => {

  const payLoad = {
    id: id,
    role: role,
    logindatetime: new Date().getTime()
  };
  const secret = 'observer';
  const signOption = {
    issuer: 'GreenITKorea',
    subject: 'greenitkr000@gmail.com',
    audience: 'http://greenitkr.com',
    expiresIn: '24h',
    // algorithm: 'RS256'
  }

  return new Promise((resolve, reject) => {
    jwt.sign(payLoad, secret, signOption, (error, token) => {
      if(error) {
        logger.info('middlewares/auth.js, signJsonWebToken, jwt sign, error: ', error);
        console.log('middlewares/auth.js, signJsonWebToken, jwt sign, error: ', error);
        return reject(error);
      }
      return resolve(token);
    })
  });
}

const veryfyJsonWebToken = async (token) => {

  const secret = 'observer';

  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (error, decoded) => {
      if (error) {
        logger.info('middleware/auth.js, veryfyJsonWebToken, error: ', error);
        console.log('middleware/auth.js, veryfyJsonWebToken, error: ', error);
        reject(error);
      }
      resolve(decoded);
    })  
  });  
}

exports.checkToken = async (token) => {

  try {

    const res = await veryfyJsonWebToken(token);

    return res;

  } catch (error) {
    logger.info('middlewares/auth.js, checkToken, error: ', error);
    console.log('middlewares/auth.js, checkToken, error: ', error);
  }
}
