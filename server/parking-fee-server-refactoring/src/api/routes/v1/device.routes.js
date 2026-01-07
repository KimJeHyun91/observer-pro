const express = require('express');
const router = express.Router();
const controller = require('../../controllers/device.controller');
const validator = require('../../validators/device.validator');
const validate = require('../../middlewares/validator');
const errorHandler = require('../../middlewares/error-handler');

/**
 * @route   GET /api/v1/devices
 * @desc    장비(Device) 목록 조회
 * - 모든 컬럼 검색, 정렬, 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', validator.getDevices, validate, controller.findAll);

/**
 * @route   GET /api/v1/devices/:id
 * @desc    장비(Device) 상세 조회
 * @access  Public
 */
router.get('/:id', validator.getDevice, validate, controller.findDetail);

/**
 * @route   POST /api/v1/devices
 * @desc    신규 장비(Device) 생성
 * @access  Admin
 */
router.post('/', validator.createDevice, validate, controller.create);

/**
 * @route   PATCH /api/v1/devices/:id
 * @desc    장비(Device) 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', validator.updateDevice, validate, controller.update);

/**
 * @route   DELETE /api/v1/devices/:id
 * @desc    장비(Device) 삭제 (Soft/Hard Delete)
 * - deleteMethod 파라미터('SOFT' | 'HARD')에 따라 동작
 * @access  Admin
 */
router.delete('/:id', validator.deleteDevice, validate, controller.delete);

router.use(errorHandler);

module.exports = router;