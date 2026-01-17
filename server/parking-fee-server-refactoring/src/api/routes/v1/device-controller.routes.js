const express = require('express');
const router = express.Router();
const controller = require('../../controllers/device-controller.controller');
const validator = require('../../validators/device-controller.validator');
const validate = require('../../middlewares/validator');
const errorHandler = require('../../middlewares/error-handler');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/device-controllers
 * @desc    장비 제어기(Device Controller) 목록 조회
 * - 모든 컬럼 검색, 정렬, 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', verifyToken, validator.getDeviceControllers, validate, controller.findAll);

/**
 * @route   GET /api/v1/device-controllers/:id
 * @desc    장비 제어기(Device Controller) 상세 조회
 * - 상세 정보 및 연결된 장비 목록 반환
 * @access  Public
 */
router.get('/:id', verifyToken, validator.getDeviceController, validate, controller.findDetail);

/**
 * @route   POST /api/v1/device-controllers
 * @desc    신규 장비 제어기(Device Controller) 생성
 * @access  Admin
 */
router.post('/', verifyToken, isAdmin, validator.createDeviceController, validate, controller.create);

/**
 * @route   PATCH /api/v1/device-controllers/:id
 * @desc    장비 제어기(Device Controller) 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', verifyToken, isAdmin, validator.updateDeviceController, validate, controller.update);

/**
 * @route   DELETE /api/v1/device-controllers/:id
 * @desc    장비 제어기(Device Controller) 삭제 (Delete)
 * @access  Admin
 */
router.delete('/:id', verifyToken, isAdmin, validator.deleteDeviceController, validate, controller.delete);

/**
 * @route   DELETE /api/v1/device-controllers
 * @desc    장비 제어기(Device Controller) 다중 삭제 (Delete Multiple)
 * @access  Admin
 */
router.delete('/', verifyToken, isAdmin, validator.deleteMultipleDeviceController, validate, controller.deleteMultiple);

/**
 * @route   POST /api/v1/device-controllers/:id/sync
 * @desc    장비 제어기(Device Controller)와 하위 장비(Device) 목록 동기화 (Sync)
 * @access  Admin
 */
router.post('/:id/sync', verifyToken, isAdmin, validator.syncDeviceController, validate, controller.sync);

router.use(errorHandler);

module.exports = router;