const axios = require('axios');
const qs = require('qs');

/**
 * 알리고 SMS 문자 전송 함수
 * @param {Object} options
 * @param {string} options.apiKey - 알리고 API 키
 * @param {string} options.userId - 알리고 계정 아이디
 * @param {string} options.sender - 발신번호 (사전 등록 필요)
 * @param {string} options.receiver - 수신번호 (다중 전송 시 ,로 구분)
 * @param {string} options.message - 메시지 본문
 * @param {'SMS'|'LMS'} [options.msgType] - 기본 SMS
 * @returns {Promise<Object>}
 */
exports.sendAligoSMS = async ({
  apiKey,
  userId,
  sender,
  receiver,
  message,
  msgType = 'SMS'
}) => {
  const url = 'https://apis.aligo.in/send/';

  const data = {
    key: apiKey,
    user_id: userId,
    sender,
    receiver,
    msg: message,
    msg_type: msgType
  };

  try {
    const response = await axios.post(url, qs.stringify(data), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.result_code === '1') {
      console.log('[알리고 문자 전송 성공]', response.data);
    } else {
      console.warn('[알리고 문자 전송 실패]', response.data);
    }

    return response.data;
  } catch (error) {
    console.error('[알리고 문자 전송 오류]', error.message);
    throw error;
  }
};