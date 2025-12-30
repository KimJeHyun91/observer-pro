const express = require('express');
const router = express.Router();

const userController = require('./common/controllers/userController');
const commonController = require('./common/controllers/commonController');
const eventTypeController = require('./common/controllers/eventTypeController');
const serviceTypeController = require('./common/controllers/serviceTypeController');
const warningBoardController = require('./common/controllers/warningBoardController');

// user
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.post('/checksession', userController.checkSession);
router.post('/websocketurl', userController.getWebsocketUrl);
router.post('/changePassword', userController.changePassword);

router.post('/getUser', userController.getUser);
router.post('/addUser', userController.addUser);
router.delete('/deleteUser', userController.deleteUser);
router.post('/modifyUser', userController.modifyUser);

// main service
router.post('/service', commonController.getMainService);

// mapImage
router.get('/outdoor', commonController.getOutdoorImage);

// event type
router.post('/getEventTypeList', eventTypeController.getEventTypeList);
router.post('/modifyEventTypes', eventTypeController.modifyEventTypes);
router.post('/getEventTypeInfo', eventTypeController.getEventTypeInfo);

// service type
router.post('/getServiceTypeList', serviceTypeController.getServiceTypeList);
router.post('/modifyServiceTypes', serviceTypeController.modifyServiceTypes);
router.post('/getServiceTypeInfo', serviceTypeController.getServiceTypeInfo);

// warning board
router.delete('/deleteWarningBoard', warningBoardController.deleteWarningBoard);
router.post('/getWarningBoard', warningBoardController.getWarningBoard);
router.delete('/warningDelete', warningBoardController.warningDelete);
router.post('/checkUseWarningBoard', warningBoardController.checkUseWarningBoard);
router.post('/insertWarningBoard', warningBoardController.insertWarningBoard);

// SOP
router.post('/SOP', commonController.createSOP);
router.put('/SOP', commonController.modifySOP);
router.delete('/SOP', commonController.removeSOP);
router.post('/SOPList', commonController.getSOPList);

router.post('/SOPStage', commonController.createSOPStage);
router.post('/SOPStageList', commonController.getSOPStageList);
router.delete('/SOPStage', commonController.removeSOPStage);
router.put('/SOPStage', commonController.modifySOPStage);

// 오탐
router.post('/falseAlarm', commonController.createFalseAlarm);
router.put('/falseAlarm', commonController.modifyFalseAlarm);
router.delete('/falseAlarm', commonController.removeFalseAlarm);
router.post('/getFalseAlarmList', commonController.getFalseAlarmList);

// 이벤트 로그
router.post('/getEventLogList', commonController.getEventLogList);
router.post('/addEventLog', commonController.addEventLog);
router.post('/eventLogCheck', commonController.eventLogCheck);

// 설정
router.put('/setting', commonController.updateSetting);
router.post('/getSetting', commonController.getSetting);

// map 위,경도 설정
router.post('/getInitialPosition', commonController.getInitialPosition);
router.put('/setInitialPosition', commonController.setInitialPosition);

// map 시군구 영역 체크
router.post('/getSigunguBoundaryControl', commonController.getSigunguBoundaryControl);
router.post('/setSigunguBoundaryControl', commonController.setSigunguBoundaryControl);
module.exports = router;