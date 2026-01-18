const express = require('express');
const router = express.Router();
const deviceControllerController = require('../../controllers/device-controller.controller');
const deviceControllerValidator = require('../../validators/device-controller.validator');
const validate = require('../../middlewares/validator');
const { verifyToken, restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/device-controllers
 * @desc    장비 제어기(Device Controller) 목록 조회
 * @access  Public (또는 Protected)
 */
router.get('/', verifyToken, restrictTo(['admin', 'user']), deviceControllerValidator.getDeviceControllers, validate, deviceControllerController.findAll);

/**
 * @route   GET /api/v1/device-controllers/:id
 * @desc    장비 제어기(Device Controller) 상세 조회
 * - 상세 정보 및 연결된 장비 목록 반환
 * @access  Public
 */
router.get('/:id', verifyToken, restrictTo(['admin', 'user']), deviceControllerValidator.getDeviceController, validate, deviceControllerController.findDetail);

/**
 * @route   POST /api/v1/device-controllers
 * @desc    신규 장비 제어기(Device Controller) 생성
 * @access  Admin
 */
router.post('/', verifyToken, restrictTo(['admin']), deviceControllerValidator.createDeviceController, validate, deviceControllerController.create);

/**
 * @route   PATCH /api/v1/device-controllers/:id
 * @desc    장비 제어기(Device Controller) 정보 수정 
 * @access  Admin
 */
router.patch('/:id', verifyToken, restrictTo(['admin']), deviceControllerValidator.updateDeviceController, validate, deviceControllerController.update);

/**
 * @route   DELETE /api/v1/device-controllers/:id
 * @desc    장비 제어기(Device Controller) 삭제
 * @access  Admin
 */
router.delete('/:id', verifyToken, restrictTo(['admin']), deviceControllerValidator.deleteDeviceController, validate, deviceControllerController.delete);

/**
 * @route   DELETE /api/v1/device-controllers
 * @desc    장비 제어기(Device Controller) 다중 삭제
 * @access  Admin
 */
router.delete('/', verifyToken, restrictTo(['admin']), deviceControllerValidator.deleteMultipleDeviceController, validate, deviceControllerController.multipleDelete);

/**
 * @route   POST /api/v1/device-controllers/:id/sync
 * @desc    장비 제어기(Device Controller)와 하위 장비(Device) 목록 동기화
 * @access  Admin
 */
router.post('/:id/sync', verifyToken, restrictTo(['admin']), deviceControllerValidator.syncDeviceController, validate, deviceControllerController.sync);

module.exports = router;