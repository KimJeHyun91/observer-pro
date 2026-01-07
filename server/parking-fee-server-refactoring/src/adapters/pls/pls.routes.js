const express = require('express');
const router = express.Router();
const plsController = require('./pls.controller');

// PLS -> Observer 요청 라우팅
router.post('/vehicle_det', plsController.handleVehicleDetection);  // 차량 입출차 감지
router.post('/lpr_data', plsController.handleLprData);              // 차량 입출차 시도

router.post('/device_status', plsController.handleDeviceStatus);    // ?

module.exports = router;