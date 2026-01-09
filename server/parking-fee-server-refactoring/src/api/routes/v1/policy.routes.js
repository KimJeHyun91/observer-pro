const express = require('express');
const router = express.Router();
const policyController = require('../../controllers/policy.controller');
const policyValidator = require('../../validators/policy.validator');
const validate = require('../../middlewares/validator');
const errorHandler = require('../../middlewares/error-handler');

/**
 * @route   GET /api/v1/policies
 * @desc    정책(Policy) 목록 조회
 * - 모든 컬럼에 대한 검색 지원
 * - 정렬 및 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', policyValidator.getPolicies, validate, policyController.findAll);

/**
 * @route   GET /api/v1/policies/:id
 * @desc    정책(Policy) 상세 조회
 * @access  Public
 */
router.get('/:id', policyValidator.getPolicy, validate, policyController.findDetail);

/**
 * @route   POST /api/v1/policies
 * @desc    신규 정책(Policy) 생성
 * @access  Admin
 */
router.post('/', policyValidator.createPolicy, validate, policyController.create);

/**
 * @route   PATCH /api/v1/policies/:id
 * @desc    정책(Policy) 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', policyValidator.updatePolicy, validate, policyController.update);

/**
 * @route   DELETE /api/v1/policies/:id
 * @desc    정책(Policy) 삭제 (Delete)
 * @access  Admin
 */
router.delete('/:id', policyValidator.deletePolicy, validate, policyController.delete);

/**
 * @route   POST /api/v1/policies/initialize-defaults
 * @desc    특정 사이트의 정책 초기화 (기존 정책 삭제 후 기본값 생성)
 * @access  Admin
 * @body    { siteId: "UUID" }
 */
router.post('/initialize-defaults', policyValidator.initializeDefaults, validate, policyController.initializeDefaults);

router.use(errorHandler);

module.exports = router;