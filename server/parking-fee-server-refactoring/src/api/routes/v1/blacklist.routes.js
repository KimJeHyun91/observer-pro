const express = require('express');
const router = express.Router();
const controller = require('../../controllers/blacklist.controller');
const validator = require('../../validators/blacklist.validator');
const validate = require('../../middlewares/validator');

/**
 * @route   GET /api/v1/blacklists
 * @desc    블랙리스트 목록 조회
 * - 모든 컬럼 검색, 정렬, 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', validator.getBlacklists, validate, controller.findAll);

/**
 * @route   GET /api/v1/blacklists/:id
 * @desc    블랙리스트 상세 조회
 * @access  Public
 */
router.get('/:id', validator.getBlacklist, validate, controller.findDetail);

/**
 * @route   POST /api/v1/blacklists
 * @desc    신규 블랙리스트 등록
 * @access  Admin
 */
router.post('/', validator.createBlacklist, validate, controller.create);

/**
 * @route   PATCH /api/v1/blacklists/:id
 * @desc    블랙리스트 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', validator.updateBlacklist, validate, controller.update);

/**
 * @route   DELETE /api/v1/blacklists/:id
 * @desc    블랙리스트 삭제 (Soft/Hard Delete)
 * - deleteMethod 파라미터('SOFT' | 'HARD')에 따라 동작
 * @access  Admin
 */
router.delete('/:id', validator.deleteBlacklist, validate, controller.delete);

module.exports = router;