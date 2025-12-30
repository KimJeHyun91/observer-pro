const userService = require('../services/userService');
const { addOperLog } = require('../../../utils/addOperLog');
const logger = require('../../../logger');
const { serverConfig  } = require('../../../config');
const requestIp = require("request-ip");

exports.login = async (req, res) => {

  const { id, password, hostname } = req.body;
  const reqIp = requestIp.getClientIp(req);

  try {

    const result = await userService.login(id, password);
    
    // 정상 접속
    if(result.status) {

      result.websocket_url = hostname + ':' + serverConfig.PORT;

      addOperLog({  logAction: 'signInOut', operatorId: id, logType: '로그인', logDescription: `사용자 로그인 성공`, reqIp });
      req.session.user_id = result.user.userId;
      req.session.user_role = result.user.userRole;
      req.session.isLogined = true;
      req.session.reqIP = reqIp;
    }
    
    res.send(result);

  } catch (error) {
    logger.info('common/userController.js, login, error: ', error);
    console.log('common/userController.js, login, error: ', error);
  }
}

exports.logout = async (req, res) => {
  try {
    const reqIp = requestIp.getClientIp(req);
    
    if(req.session.user_id) {
      addOperLog({  logAction: 'signInOut', operatorId: req.session.user_id, logType: '로그아웃', logDescription: `사용자 로그아웃 성공`, reqIp });

      req.session.destroy();
    }
    res.redirect('/login');

  } catch(error) {
    logger.info('common/userController.js, logout, error: ', error);
    console.log('common/userController.js, logout, error: ', error);
  }
}

exports.checkSession = async (req, res) => {
  
  try {

    let token;
    const bearerHeader = req.headers['authorization'];
  
    if (bearerHeader) {
      const bearer = bearerHeader.split(' ');
      token = bearer[1];
    }

    const result = await userService.checkSession(token);

    res.send(result);

  } catch (error) {
    logger.info('common/userController.js, checkSession, error: ', error);
    console.log('common/userController.js, checkSession, error: ', error);
  }
}

exports.getWebsocketUrl = async (req, res) => {

  res.send({
    websocket_url: serverConfig.WEBSOCKET_URL + ':' + serverConfig.PORT,
    // mapserver_url: serverConfig.MAP_SERVER_URL
  });
}

exports.changePassword = async (req, res) => {

  const { id, prev_password, new_password } = req.body;

  try {

    const result = await userService.changePassword(id, prev_password, new_password);

    res.send(result);

  } catch (error) {
    logger.info('common/userController.js, changePassword, error: ', error);
    console.log('common/userController.js, changePassword, error: ', error);
  }
}

exports.getUser = async (req, res) => {

  const { id } = req.body;

  try {
    
    const result = await userService.getUser(id);

    res.send(result);

  } catch (error) {
    logger.info('common/userController.js, getUser, error: ', error);
    console.log('common/userController.js, getUser, error: ', error);
  }
}

exports.addUser = async (req, res) => {

  const { id, password, user_name, enable, operatorId, user_role } = req.body;

  const reqIp = requestIp.getClientIp(req);

  try {
    
    const result = await userService.addUser(id, password, user_name, enable, user_role);

    res.send({ result });

    addOperLog('addoper', operatorId, '사용자 관리', `사용자 아이디 ${id} 추가 성공`, reqIp);

  } catch (error) { 
    logger.info('common/userController.js, addUser, error: ', error);
    console.log('common/userController.js, addUser, error: ', error);
    addOperLog('addoper', operatorId, '사용자 관리', `사용자 아이디 ${id} 추가 실패`, reqIp);
  }
}

exports.deleteUser = async (req, res) => {

  const { id, operatorId } = req.body;

  const reqIp = requestIp.getClientIp(req);

  try {

    const result = await userService.deleteUser(id);

    res.send(result);

    addOperLog('addoper', operatorId, '사용자 관리', `사용자 아이디 ${id} 삭제 성공`, reqIp);

  } catch (error) { 
    logger.info('common/userController.js, deleteUser, error: ', error);
    console.log('common/userController.js, deleteUser, error: ', error);
    addOperLog('addoper', operatorId, '사용자 관리', `사용자 아이디 ${id} 삭제 실패`, reqIp);
  }
}

exports.modifyUser = async (req, res) => {

  const { id, prev_password, new_password, new_user_name, new_enable, operatorId, changes } = req.body;

  const reqIp = requestIp.getClientIp(req);

  try {
    
    const result = await userService.modifyUser(id, prev_password, new_password, new_user_name, new_enable, changes);

    // 수정 성공
    if(result.status) {
      
      addOperLog('addoper', operatorId, '사용자 관리', `사용자 아이디 ${id} 수정 성공`, reqIp);

    } else {
      // 수정 실패
      addOperLog('addoper', operatorId, '사용자 관리', `사용자 아이디 ${id} 수정 실패`, reqIp);
    }

    res.send(result);

  } catch(error) {
    logger.info('common/userController.js, modifyUser, error: ', error);
    console.log('common/userController.js, modifyUser, error: ', error);
  }
}
