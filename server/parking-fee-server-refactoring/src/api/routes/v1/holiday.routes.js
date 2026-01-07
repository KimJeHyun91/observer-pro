const express = require('express');
const router = express.Router();
const controller = require('../../controllers/holiday.controller');
const validator = require('../../validators/holiday.validator');
const validate = require('../../middlewares/validator');

/**
 * @route   GET /api/v1/holidays
 * @desc    휴일 목록 조회
 * - 모든 컬럼 검색, 정렬, 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', validator.getHolidays, validate, controller.findAll);

/**
 * @route   GET /api/v1/holidays/:id
 * @desc    휴일 상세 조회
 * @access  Public
 */
router.get('/:id', validator.getHoliday, validate, controller.findDetail);

/**
 * @route   POST /api/v1/holidays
 * @desc    신규 휴일 생성
 * @access  Admin
 */
router.post('/', validator.createHoliday, validate, controller.create);

/**
 * @route   PATCH /api/v1/holidays/:id
 * @desc    휴일 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', validator.updateHoliday, validate, controller.update);

/**
 * @route   DELETE /api/v1/holidays/:id
 * @desc    휴일 삭제 (Soft/Hard Delete)
 * - deleteMethod 파라미터('SOFT' | 'HARD')에 따라 동작
 * @access  Admin
 */
router.delete('/:id', validator.deleteHoliday, validate, controller.delete);

module.exports = router;