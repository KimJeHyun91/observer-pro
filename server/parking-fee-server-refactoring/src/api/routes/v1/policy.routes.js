const express = require('express');
const router = express.Router();
const controller = require('../../controllers/policy.controller');
const validator = require('../../validators/policy.validator');
const validate = require('../../middlewares/validator');

/**
 * @route   GET /api/v1/policies
 * @desc    정책 목록 조회
 * - 모든 컬럼 검색, 정렬, 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', validator.getPolicies, validate, controller.findAll);

/**
 * @route   GET /api/v1/policies/:id
 * @desc    정책 상세 조회
 * @access  Public
 */
router.get('/:id', validator.getPolicy, validate, controller.findDetail);

/**
 * @route   POST /api/v1/policies
 * @desc    신규 정책 생성
 * @access  Admin
 */
router.post('/', validator.createPolicy, validate, controller.create);

/**
 * @route   PATCH /api/v1/policies/:id
 * @desc    정책 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', validator.updatePolicy, validate, controller.update);

/**
 * @route   DELETE /api/v1/policies/:id
 * @desc    정책 삭제 (Soft/Hard Delete)
 * - deleteMethod 파라미터('SOFT' | 'HARD')에 따라 동작
 * @access  Admin
 */
router.delete('/:id', validator.deletePolicy, validate, controller.delete);

module.exports = router;