const express = require('express');
const router = express.Router();
const controller = require('../../controllers/member-payment-history.controller');
const validator = require('../../validators/member-payment-history.validator');
const validate = require('../../middlewares/validator');

/**
 * @route   GET /api/v1/member-payment-histories
 * @desc    회원 결제 기록(Member Payment History) 목록 조회
 * - 모든 컬럼에 대한 검색 지원
 * - 정렬 및 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', validator.getMemberPaymentHistories, validate, controller.findAll);

/**
 * @route   GET /api/v1/members/:id
 * @desc    회원 결제 기록(Member Payment History) 상세 조회
 * @access  Public
 */
router.get('/:id', validator.getMemberPaymentHistory, validate, controller.findDetail);

/**
 * @route   POST /api/v1/members
 * @desc    신규 회원 결제 기록(Member Payment History) 생성
 * @access  Admin
 */
router.post('/', validator.createMemberPaymentHistory, validate, controller.create);

/**
 * @route   PATCH /api/v1/members/:id
 * @desc    회원 결제 기록(Member Payment History) 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', validator.updateMemberPaymentHistory, validate, controller.update);

module.exports = router;