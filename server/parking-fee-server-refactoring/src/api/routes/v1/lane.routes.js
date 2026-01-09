const express = require('express');
const router = express.Router();
const laneController = require('../../controllers/lane.controller');
const laneValidator = require('../../validators/lane.validator');
const validate = require('../../middlewares/validator');
const errorHandler = require('../../middlewares/error-handler');

/**
 * @route   GET /api/v1/lanes
 * @desc    차선(Lane) 목록 조회
 * - 모든 컬럼 검색, 정렬, 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', laneValidator.getLanes, validate, laneController.findAll);

/**
 * @route   GET /api/v1/lanes/:id
 * @desc    차선(Lane) 상세 조회
 * - 차선 상세 정보 및 연결된 장비 목록 반환
 * @access  Public
 */
router.get('/:id', laneValidator.getLane, validate, laneController.findDetail);

/**
 * @route   POST /api/v1/lanes
 * @desc    신규 차선(Lane) 생성
 * @access  Admin
 */
router.post('/', laneValidator.createLane, validate, laneController.create);

/**
 * @route   PATCH /api/v1/lanes/:id
 * @desc    차선(Lane) 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', laneValidator.updateLane, validate, laneController.update);

/**
 * @route   DELETE /api/v1/lanes/:id
 * @desc    차선(Lane) 삭제 (Delete)
 * @access  Admin
 */
router.delete('/:id', laneValidator.deleteLane, validate, laneController.delete);

router.use(errorHandler);

module.exports = router;