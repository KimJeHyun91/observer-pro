const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs');
const { setImagePath } = require('../utils/setImagePath');

const outsideController = require('./tunnel/controllers/outsideController');
const waterGaugeController = require('./tunnel/controllers/waterGaugeController');
const barrierController = require('./tunnel/controllers/barrierController');
const billboardController = require('./tunnel/controllers/billboardController');
const guardianliteController = require('./tunnel/controllers/guardianliteController')
const eventTypeController = require('./tunnel/controllers/eventTypeController');
const cameraController = require('./tunnel/controllers/cameraController');

// outside(터널) 
router.post('/addOutside', outsideController.addOutside);
router.get('/getOutsideList', outsideController.getOutsideList);
router.delete('/deleteOutside', outsideController.deleteOutside);
router.put('/updateOutside', outsideController.updateOutside);

// 차단막 자동화
router.get('/getOutsideAutomatic', outsideController.getOutsideAutomatic);
router.put('/updateOutsideAutomatic', outsideController.updateOutsideAutomatic);

// 네트워크 장애 장치, 목록 가져오기
router.get('/getUnLinkBarrierList', outsideController.getUnLinkBarrierList);

// 수위계
router.post('/addWaterLevel', waterGaugeController.addWaterLevel);
router.get('/getWaterLevelList', waterGaugeController.getWaterLevelList);
router.put('/modifyWaterLevel', waterGaugeController.modifyWaterLevel);
router.delete('/removeWaterLevel', waterGaugeController.removeWaterLevel);
router.post('/getWaterLevelListSearch', waterGaugeController.getWaterLevelListSearch);
router.post('/addWaterLevelMappingCountrolOut', waterGaugeController.addWaterLevelMappingCountrolOut);
router.post('/getWaterLevelMappingList', waterGaugeController.getWaterLevelMappingList);
router.put('/modifyWaterLevelPosition', waterGaugeController.modifyWaterLevelPosition);
router.put('/modifyWaterLevelThreshold', waterGaugeController.modifyWaterLevelThreshold);
router.delete('/removeWaterLevelMapping', waterGaugeController.removeWaterLevelMapping);
router.post('/addWaterLevelCountrolIn', waterGaugeController.addWaterLevelCountrolIn);
router.post('/getWaterLevelMappingOutsideList', waterGaugeController.getWaterLevelMappingOutsideList);
router.post('/getWaterLevelLog', waterGaugeController.getWaterLevelLog);
// <--------------------------------------------------------------------
// 차단막 제어
router.post('/controlBarrier', barrierController.executeBarrierControl);

// ajy add 전광판 추가
router.post('/addBillboard', billboardController.addBillboard);
router.get('/getBillboardList', billboardController.getBillboardList);
router.put('/modifyBillboard', billboardController.modifyBillboard);
router.delete('/removeBillboard', billboardController.removeBillboard);
router.post('/getBillboardInfo', billboardController.getBillboardInfo);
router.put('/modifyVMSBillboard', billboardController.modifyVMSBillboard);
router.put('/modifyLCSBillboard', billboardController.modifyLCSBillboard);

// 가디언라이트
router.post('/getGuardianliteInfo', guardianliteController.getGuardianliteInfo);
router.put('/modifyGuardianliteLabel', guardianliteController.modifyGuardianliteLabel);
router.put('/modifyGuardianliteChannel', guardianliteController.modifyGuardianliteChannel);

// 설정(이벤트 설정)
router.post('/getEventTypeList', eventTypeController.getEventTypeList);
router.post('/modifyEventType', eventTypeController.modifyEventType);
// 로그조회
router.post('/getEventList', eventTypeController.getEventList);

// 대시보드
router.post('/getDashboardDeviceList', outsideController.getDashboardDeviceList);

// 카메라 컨트롤
router.post('/ptzCameraControl', cameraController.ptzCameraControl);

module.exports = router;