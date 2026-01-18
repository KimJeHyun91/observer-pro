const express = require('express');
const router = express.Router();
const zoneController = require('../../controllers/zone.controller');
const zoneValidator = require('../../validators/zone.validator');
const validate = require('../../middlewares/validator');
const { verifyToken, restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/zones
 * @desc    구역(Zone) 목록 조회
 * @access  Public
 */
router.get('/', verifyToken, restrictTo(['admin', 'user']), zoneValidator.getZones, validate, zoneController.findAll);

/**
 * @route   GET /api/v1/zones/:id
 * @desc    구역(Zone) 상세 조회
 * @access  Public
 */
router.get('/:id', verifyToken, restrictTo(['admin', 'user']), zoneValidator.getZone, validate, zoneController.findDetail);

/**
 * @route   POST /api/v1/zones
 * @desc    신규 구역(Zone) 생성
 * @access  Admin
 */
router.post('/', verifyToken, restrictTo(['admin']), zoneValidator.createZone, validate, zoneController.create);

/**
 * @route   PATCH /api/v1/zones/:id
 * @desc    구역(Zone) 정보 수정 
 * @access  Admin
 */
router.patch('/:id', verifyToken, restrictTo(['admin']), zoneValidator.updateZone, validate, zoneController.update);

/**
 * @route   DELETE /api/v1/zones/:id
 * @desc    구역(Zone) 삭제
 * @access  Admin
 */
router.delete('/:id', verifyToken, restrictTo(['admin']), zoneValidator.deleteZone, validate, zoneController.delete);

module.exports = router;