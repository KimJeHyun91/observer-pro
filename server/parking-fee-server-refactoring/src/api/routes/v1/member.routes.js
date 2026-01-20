const express = require('express');
const router = express.Router();
const memberController = require('../../controllers/member.controller');
const memberValidator = require('../../validators/member.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/members
 * @desc    회원(Member) 목록 조회
 * @access  Public
 */
router.get('/', restrictTo(['admin', 'user']), memberValidator.getMembers, validate, memberController.findAll);

/**
 * @route   GET /api/v1/members/:id
 * @desc    회원(Member) 상세 조회
 * @access  Public
 */
router.get('/:id', restrictTo(['admin', 'user']), memberValidator.getMember, validate, memberController.findDetail);

/**
 * @route   POST /api/v1/members
 * @desc    신규 회원(Member) 생성
 * @access  Admin
 */
router.post('/', restrictTo(['admin']), memberValidator.createMember, validate, memberController.create);

/**
 * @route   PATCH /api/v1/members/:id
 * @desc    회원(Member) 정보 수정
 * @access  Admin
 */
router.patch('/:id', restrictTo(['admin']), memberValidator.updateMember, validate, memberController.update);

/**
 * @route   DELETE /api/v1/members/:id
 * @desc    회원(Member) 삭제
 * @access  Admin
 */
router.delete('/:id', restrictTo(['admin']), memberValidator.deleteMember, validate, memberController.delete);

module.exports = router;