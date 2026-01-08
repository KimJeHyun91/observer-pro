const express = require('express');
const router = express.Router();
const zoneController = require('../../controllers/zone.controller');
const zoneValidator = require('../../validators/zone.validator');
const validate = require('../../middlewares/validator');
const errorHandler = require('../../middlewares/error-handler');

/**
 * @route   GET /api/v1/zones
 * @desc    구역(Zone) 목록 조회
 * - 모든 컬럼 검색, 정렬, 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', zoneValidator.getZones, validate, zoneController.findAll);

/**
 * @route   GET /api/v1/zones/:id
 * @desc    구역(Zone) 상세 조회
 * - 구역 상세 정보 및 차선(Lane) 목록 반환
 * @access  Public
 */
router.get('/:id', zoneValidator.getZone, validate, zoneController.findDetail);

/**
 * @route   POST /api/v1/zones
 * @desc    신규 구역(Zone) 생성
 * @access  Admin
 */
router.post('/', zoneValidator.createZone, validate, zoneController.create);

/**
 * @route   PATCH /api/v1/zones/:id
 * @desc    구역(Zone) 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', zoneValidator.updateZone, validate, zoneController.update);

/**
 * @route   DELETE /api/v1/zones/:id
 * @desc    구역(Zone) 삭제 (Delete)
 * @access  Admin
 */
router.delete('/:id', zoneValidator.deleteZone, validate, zoneController.delete);

router.use(errorHandler);

module.exports = router;