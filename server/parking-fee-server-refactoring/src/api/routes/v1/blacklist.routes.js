const express = require('express');
const router = express.Router();
const blacklistController = require('../../controllers/blacklist.controller');
const blacklistValidator = require('../../validators/blacklist.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/blacklists
 * @desc    블랙리스트(Black List) 목록 조회
 * @access  Public
 */
router.get('/', restrictTo(['admin', 'user']), blacklistValidator.getBlacklists, validate, blacklistController.findAll);

/**
 * @route   GET /api/v1/blacklists/:id
 * @desc    블랙리스트(Black List) 상세 조회
 * @access  Public
 */
router.get('/:id', restrictTo(['admin', 'user']), blacklistValidator.getBlacklist, validate, blacklistController.findDetail);

/**
 * @route   POST /api/v1/blacklists
 * @desc    신규 블랙리스트(Black List) 등록
 * @access  Admin
 */
router.post('/', restrictTo(['admin', 'user']), blacklistValidator.createBlacklist, validate, blacklistController.create);

/**
 * @route   PATCH /api/v1/blacklists/:id
 * @desc    블랙리스트(Black List) 정보 수정
 * @access  Admin
 */
router.patch('/:id', restrictTo(['admin']), blacklistValidator.updateBlacklist, validate, blacklistController.update);

/**
 * @route   DELETE /api/v1/blacklists/:id
 * @desc    블랙리스트(Black List) 삭제
 * @access  Admin
 */
router.delete('/:id', restrictTo(['admin']), blacklistValidator.deleteBlacklist, validate, blacklistController.delete);

module.exports = router;