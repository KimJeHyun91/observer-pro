const express = require('express');
const router = express.Router();
const laneController = require('../../controllers/lane.controller');
const laneValidator = require('../../validators/lane.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/lanes
 * @desc    차선(Lane) 목록 조회
 * @access  Public
 */
router.get('/', restrictTo(['admin', 'user']), laneValidator.getLanes, validate, laneController.findAll);

/**
 * @route   GET /api/v1/lanes/:id
 * @desc    차선(Lane) 상세 조회
 * @access  Public
 */
router.get('/:id', restrictTo(['admin', 'user']), laneValidator.getLane, validate, laneController.findDetail);

/**
 * @route   POST /api/v1/lanes
 * @desc    신규 차선(Lane) 생성
 * @access  Admin
 */
router.post('/', restrictTo(['admin']), laneValidator.createLane, validate, laneController.create);

/**
 * @route   PATCH /api/v1/lanes/:id
 * @desc    차선(Lane) 정보 수정
 * @access  Admin
 */
router.patch('/:id', restrictTo(['admin']), laneValidator.updateLane, validate, laneController.update);

/**
 * @route   DELETE /api/v1/lanes/:id
 * @desc    차선(Lane) 삭제 
 * @access  Admin
 */
router.delete('/:id', restrictTo(['admin']), laneValidator.deleteLane, validate, laneController.delete);

module.exports = router;