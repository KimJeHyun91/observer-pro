const billboardService = require('../services/billboardService');
const logger = require('../../../logger');
const billboardSocketControl = require('../../../worker/inundation/billboardSocketControl');
const net = require('net');

// API 호출 캐시를 위한 변수
let billboardMacroCache = null;
let billboardMacroCacheTime = 0;
const CACHE_DURATION = 1000;

exports.addBillboardMacro = async (req, res) => {

  try {

    let message = 'fail';
    const { billboard_msg: billboardMsg, billboard_color: billboardColor } = req.body;

    const result = await billboardService.addBillboardMacro({ billboardMsg, billboardColor });

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/billboardController.js, addBillboardMacro, error: ', error);
    console.log('inundationControl/billboardController.js, addBillboardMacro, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.modifyBillboardMacro = async (req, res) => {

  try {

    let message = 'fail';
    const { billboard_idx  : idx, billboard_msg : billboardMsg, billboard_color: billboardColor } = req.body;
    const result = await billboardService.modifyBillboardMacro({ idx, billboardMsg, billboardColor });

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/billboardController.js, modifyBillboardMacro, error: ', error);
    console.log('inundationControl/billboardController.js, modifyBillboardMacro, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getBillboardMacroList = async (req, res) => {

  try {

    let message = 'fail';
    const now = Date.now();

    if (billboardMacroCache && (now - billboardMacroCacheTime < CACHE_DURATION)) {
      console.log('getBillboardMacroList: 캐시된 응답 반환');
      return res.status(200).send(billboardMacroCache);
    }

    const result = await billboardService.getBillboardMacroList(req.body);

    if (result) {
      message = 'ok';
    }

    const response = {
      message: message,
      result: result
    };

    billboardMacroCache = response;
    billboardMacroCacheTime = now;

    res.status(200).send(response);

  } catch (error) {
    logger.info('inundationControl/billboardController.js, getBillboardMacroList, error: ', error);
    console.log('inundationControl/billboardController.js, getBillboardMacroList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.deleteBillboardMacro = async (req, res) => {

  try {

    let message = 'fail';
    const { billboard_idx : billboardMessageIdx } = req.body;
    const result = await billboardService.deleteBillboardMacro({ billboardMessageIdx });

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/billboardController.js, deleteBillboardMacro, error: ', error);
    console.log('inundationControl/billboardController.js, deleteBillboardMacro, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.addBillboard = async (req, res) => {

  try {

    let message = 'fail';

    const result = await billboardService.addBillboard(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/billboardController.js, addBillboard, error: ', error);
    console.log('inundationControl/billboardController.js, addBillboard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getBillboardList = async (req, res) => {

  try {

    let message = 'fail';

    const result = await billboardService.getBillboardList(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/billboardController.js, getBillboardList, error: ', error);
    console.log('inundationControl/billboardController.js, getBillboardList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.deleteBillboard = async (req, res) => {

  try {

    let message = 'fail';

    const result = await billboardService.deleteBillboard(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/billboardController.js, deleteBillboard, error: ', error);
    console.log('inundationControl/billboardController.js, deleteBillboard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.updateMessageToBillboard = async (req, res) => {
  try {
    const { billboard_ip, billboard_msg, billboard_color, id, billboard_controller_model  } = req.body;

    if (!billboard_ip || !billboard_msg || !billboard_color) {
      return res.status(400).send({
        message: 'fail',
        result: false,
        error: '전광판 변경 필수값 누락'
      });
    }

    const result = await billboardSocketControl.sendToBillboard(
      billboard_ip,
      billboard_msg,
      billboard_color,
      'singleBillboard',
      id,
      billboard_controller_model
    );

    if (!result.success.length) {
      return res.status(400).send({
        message: 'fail',
        result: false,
        error: '전광판 메시지 변경 실패',
        failedList: result.list
      });
    }

    return res.status(200).send({
      message: 'ok',
      result: true,
      success: result.success
    });

  } catch (error) {
    logger.info('inundationControl/billboardController.js, updateMessageToBillboard, error: ', error);
    console.log('inundationControl/billboardController.js, updateMessageToBillboard, error: ', error);

    return res.status(500).send({
      message: 'error',
      result: false,
      error: error.message
    });
  }
}

exports.updateMessageToAllBillboards = async (req, res) => {
  try {
    const { billboard_msg, billboard_color, id, billboard_controller_model } = req.body;
    if (!billboard_msg || !billboard_color) {
      return res.status(400).send({
        message: 'fail',
        result: false,
        error: '전광판 변경 필수값 누락'
      });
    }

    const result = await billboardSocketControl.sendToBillboard(
      '',
      billboard_msg,
      billboard_color,
      'allBillboards',
      id,
      billboard_controller_model
    );

    if (!result.success.length) {
      return res.status(400).send({
        message: 'fail',
        result: false,
        error: '전광판 메시지 변경 실패',
        failedList: result.list
      });
    }

    return res.status(200).send({
      message: 'ok',
      result: true,
      success: result.success
    });

  } catch (error) {
    logger.info('inundationControl/billboardController.js, updateMessageToAllBillboards, error: ', error);
    console.log('inundationControl/billboardController.js, updateMessageToAllBillboards, error: ', error);
  }
}

exports.updateMessageToGreenParkingBillboard = async (req, res) => {
    try {
        const { billboard_ip, billboard_msg, id, billboard_controller_model } = req.body;

        if (typeof billboard_msg !== 'object' || !billboard_msg.first?.text || !billboard_msg.second?.text) {
            return res.status(400).send({
                message: 'fail',
                result: false,
                error: '그린파킹 메시지 포맷 오류'
            });
        }

        const result = await billboardSocketControl.sendToGreenParkingBillboard(
            billboard_ip,
            billboard_msg,
            id,
            billboard_controller_model
        );

        if (!result.success.length) {
            return res.status(400).send({
                message: 'fail',
                result: false,
                error: '전광판 메시지 변경 실패',
                failedList: result.list
            });
        }

        return res.status(200).send({
            message: 'ok',
            result: true,
            success: result.success
        });

    } catch (error) {
        logger.info('inundationControl/billboardController.js, updateMessageToBillboard, error: ', error);
        console.log('inundationControl/billboardController.js, updateMessageToBillboard, error: ', error);

        return res.status(500).send({
            message: 'error',
            result: false,
            error: error.message
        });
    }
};

exports.updateGroupBillboards= async (req, res) => {
  try {
    const { billboard_ips, billboard_msg, billboard_color, id } = req.body;
    if (!billboard_ips || !billboard_msg || !billboard_color) {
      return res.status(400).send({
        message: 'fail',
        result: false,
        error: '그룹 전광판 변경 필수값 누락'
      });
    }
    const result = await billboardSocketControl.sendToBillboard(
      '',
      billboard_msg,
      billboard_color,
      'groupBillboards',
      id,
      '',
      billboard_ips 
    );

    if (!result.success.length) {
      return res.status(400).send({
        message: 'fail',
        result: false,
        error: '그룹 전광판 메시지 변경 실패',
        failedList: result.list
      });
    }

    return res.status(200).send({
      message: 'ok',
      result: true,
      success: result.success
    });
  } catch (error) {
    logger.info('inundationControl/billboardController.js, updateGroupBillboards, error: ', error);
    console.log('inundationControl/billboardController.js, updateGroupBillboards, error: ', error);
    return res.status(500).send({ message: 'fail', result: false });
  }
}

exports.sendGreenParkingBillboardMessage = async (req, res) => {
    const { host, port, messageData } = req.body;
    function buildDisplayPacket(obj) {
        try {
            return Buffer.from(JSON.stringify(obj), 'utf-8');
        } catch (error) {
            console.error('메시지 생성 오류:', error);
            throw new Error('프로토콜 메시지 생성 실패');
        }
    }
    const client = new net.Socket();
    let buffer = '';
    let isResponded = false;
    client.setEncoding('utf8');
    client.setKeepAlive(true);
    client.connect(port, host, () => {
        const messagePacket = buildDisplayPacket(messageData);
        client.write(messagePacket);
    });
    client.on('data', (data) => {
        buffer += data;
        if (buffer.includes('OK')) {
            isResponded = true;
            res.json({ success: true, message: '전광판 메시지 전송 성공', response: buffer });
            client.destroy();
        } else if (buffer.includes('Error')) {
            isResponded = true;
            res.status(500).json({ success: false, message: '전광판 메시지 전송 실패', response: buffer });
            client.destroy();
        }
        buffer = '';
    });
    client.on('error', (err) => {
        if (!isResponded) {
            res.status(500).json({ success: false, message: '소켓 오류', error: err.message });
        }
        client.destroy();
    });
    client.on('close', () => {
        if (!isResponded) {
            res.status(500).json({ success: false, message: '연결 종료(응답 없음)' });
        }
    });
};