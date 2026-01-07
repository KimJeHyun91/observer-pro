const express = require('express');
const router = express.Router();
const controller = require('../../controllers/log.controller');
const validator = require('../../validators/log.validator');
const validate = require('../../middlewares/validator');

/**
 * @route   GET /api/v1/logs/vehicle-detection
 * @desc    차량 감지(루프) 로그 조회
 * @access  Public (또는 Protected)
 */
router.get('/vehicle-detection', validator.getVehicleDetectionLogs, validate, controller.findVehicleDetectionLogs);

/**
 * @route   GET /api/v1/logs/settlement
 * @desc    결제 로그 조회
 * @access  Public
 */
router.get('/settlement', validator.getSettlementLogs, validate, controller.findSettlementLogs);

/**
 * @route   GET /api/v1/logs/device-event
 * @desc    장비 이벤트 로그 조회
 * @access  Public
 */
router.get('/device-event', validator.getDeviceEventLogs, validate, controller.findDeviceEventLogs);

/**
 * @route   GET /api/v1/logs/link-communication
 * @desc    통신 로그 조회
 * @access  Public
 */
router.get('/link-communication', validator.getLinkLogs, validate, controller.findLinkLogs);

module.exports = router;