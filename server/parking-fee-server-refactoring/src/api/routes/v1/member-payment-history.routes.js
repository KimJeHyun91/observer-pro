const express = require('express');
const router = express.Router();
const memberPaymentHistoryController = require('../../controllers/member-payment-history.controller');
const memberPaymentHistoryValidator = require('../../validators/member-payment-history.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/member-payment-histories
 * @desc    회원 결제 기록(Member Payment History) 목록 조회
 * @access  Public (또는 Protected)
 */
router.get('/', restrictTo(['admin', 'user']), memberPaymentHistoryValidator.getMemberPaymentHistories, validate, memberPaymentHistoryController.findAll);

/**
 * @route   GET /api/v1/member-payment-histories/:id
 * @desc    회원 결제 기록(Member Payment History) 상세 조회
 * @access  Public
 */
router.get('/:id', restrictTo(['admin', 'user']), memberPaymentHistoryValidator.getMemberPaymentHistory, validate, memberPaymentHistoryController.findDetail);

/**
 * @route   POST /api/v1/member-payment-histories
 * @desc    신규 회원 결제 기록(Member Payment History) 생성
 * @access  Public
 */
router.post('/', restrictTo(['admin', 'user']), memberPaymentHistoryValidator.createMemberPaymentHistory, validate, memberPaymentHistoryController.create);

/**
 * @route   PATCH /api/v1/member-payment-histories/:id
 * @desc    회원 결제 기록(Member Payment History) 정보 수정
 * @access  Public
 */
router.patch('/:id', restrictTo(['admin', 'user']), memberPaymentHistoryValidator.updateMemberPaymentHistory, validate, memberPaymentHistoryController.update);

module.exports = router;