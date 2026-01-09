const crypto = require('crypto');

/**
 * 문자열을 SHA-256으로 해싱합니다.
 * @param {string} data - 해싱할 문자열
 * @returns {string} - hex 방식의 해시 결과값
 */
const createSHA256Hash = (data) => {
  return crypto
    .createHash('sha256') // SHA-256 알고리즘 사용
    .update(data)         // 해싱할 데이터 입력
    .digest('hex');       // 16진수 문자열로 출력
};

module.exports = { createSHA256Hash };