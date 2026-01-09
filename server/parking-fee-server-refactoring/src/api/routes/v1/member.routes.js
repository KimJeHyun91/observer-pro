const express = require('express');
const router = express.Router();
const controller = require('../../controllers/member.controller');
const validator = require('../../validators/member.validator');
const validate = require('../../middlewares/validator');

/**
 * @route   GET /api/v1/members
 * @desc    회원(Member) 목록 조회
 * - 모든 컬럼에 대한 검색 지원
 * - 정렬 및 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', validator.getMembers, validate, controller.findAll);

/**
 * @route   GET /api/v1/members/:id
 * @desc    회원(Member) 상세 조회
 * @access  Public
 */
router.get('/:id', validator.getMember, validate, controller.findDetail);

/**
 * @route   POST /api/v1/members
 * @desc    신규 회원(Member) 생성
 * @access  Admin
 */
router.post('/', validator.createMember, validate, controller.create);

/**
 * @route   PATCH /api/v1/members/:id
 * @desc    회원(Member) 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', validator.updateMember, validate, controller.update);

/**
 * @route   DELETE /api/v1/members/:id
 * @desc    회원(Member) 삭제 (Delete)
 * @access  Admin
 */
router.delete('/:id', validator.deleteMember, validate, controller.delete);

module.exports = router;