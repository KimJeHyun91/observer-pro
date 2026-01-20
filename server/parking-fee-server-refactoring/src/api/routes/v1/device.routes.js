const express = require('express');
const router = express.Router();
const deviceController = require('../../controllers/device.controller');
const deviceValidator = require('../../validators/device.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/devices
 * @desc    장비(Device) 목록 조회
 * @access  Public
 */
router.get('/', restrictTo(['admin', 'user']), deviceValidator.getDevices, validate, deviceController.findAll);

/**
 * @route   GET /api/v1/devices/:id
 * @desc    장비(Device) 상세 조회
 * @access  Public
 */
router.get('/:id', restrictTo(['admin', 'user']), deviceValidator.getDevice, validate, deviceController.findDetail);

/**
 * @route   POST /api/v1/devices
 * @desc    신규 장비(Device) 생성
 * @access  Admin
 */
router.post('/', restrictTo(['admin']), deviceValidator.createDevice, validate, deviceController.create);

/**
 * @route   PATCH /api/v1/devices/:id
 * @desc    장비(Device) 정보 수정
 * @access  Admin
 */
router.patch('/:id', restrictTo(['admin']), deviceValidator.updateDevice, validate, deviceController.update);

/**
 * @route   DELETE /api/v1/devices/:id
 * @desc    장비(Device) 삭제
 * @access  Admin
 */
router.delete('/:id', restrictTo(['admin']), deviceValidator.deleteDevice, validate, deviceController.delete);

module.exports = router;