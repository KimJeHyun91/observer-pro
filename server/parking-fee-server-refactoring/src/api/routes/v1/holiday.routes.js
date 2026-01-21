const express = require('express');
const router = express.Router();
const holidayController = require('../../controllers/holiday.controller');
const holidayValidator = require('../../validators/holiday.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/holidays
 * @desc    휴일(Holiday) 목록 조회
 * @access  Public
 */
router.get('/', restrictTo(['admin', 'user']), holidayValidator.getHolidays, validate, holidayController.findAll);

/**
 * @route   GET /api/v1/holidays/:id
 * @desc    휴일(Holiday) 상세 조회
 * @access  Public
 */
router.get('/:id', restrictTo(['admin', 'user']), holidayValidator.getHoliday, validate, holidayController.findDetail);

/**
 * @route   POST /api/v1/holidays
 * @desc    신규 휴일(Holiday) 생성
 * @access  Admin
 */
router.post('/', restrictTo(['admin']), holidayValidator.createHoliday, validate, holidayController.create);

/**
 * @route   PATCH /api/v1/holidays/:id
 * @desc    휴일(Holiday) 정보 수정
 * @access  Admin
 */
router.patch('/:id', restrictTo(['admin']), holidayValidator.updateHoliday, validate, holidayController.update);

/**
 * @route   DELETE /api/v1/holidays/:id
 * @desc    휴일(Holiday) 삭제
 * @access  Admin
 */
router.delete('/:id', restrictTo(['admin']), holidayValidator.deleteHoliday, validate, holidayController.delete);

module.exports = router;