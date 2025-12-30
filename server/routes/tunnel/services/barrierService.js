const { controlBarrier } = require('../../../worker/tunnel/barrierControl');
const { sendCurtainCommand } = require('../../../worker/tunnel/outsideConnect');
const logger = require('../../../logger');

exports.executeBarrierControl = async ({ ip, action }) => {
  // ajy 코드 변경으로 인한 삭제
  // if (!ip || !['상승', '하강', '정지'].includes(action)) {
  //   throw new Error(`잘못된 요청: IP(${ip}), action(${action})`);
  // }

  try {
    // ajy 코드 변경으로 인한 삭제
    // await controlBarrier(ip, action);
    const res = await sendCurtainCommand(ip, action);
    return {
      status: res,
      message: `${action} 명령 전송 완료`,
    };
  } catch (error) {
    logger.error(`executeBarrierControl 실패: ${error.message}`);
    throw error;
  }
};
