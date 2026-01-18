const express = require('express');
const router = express.Router();
const siteController = require('../../controllers/site.controller');
const siteValidator = require('../../validators/site.validator');
const validate = require('../../middlewares/validator');
const { verifyToken, restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/sites
 * @desc    사이트(Site) 목록 조회
 * @access  Public
 */
router.get('/', verifyToken, restrictTo(['admin', 'user']), siteValidator.getSites, validate, siteController.findAll);

/**
 * @route   GET /api/v1/sites/:id
 * @desc    사이트(Site) 상세 조회
 * @access  Public
 */
router.get('/:id', verifyToken, restrictTo(['admin', 'user']), siteValidator.getSite, validate, siteController.findDetail);

/**
 * @route   POST /api/v1/sites
 * @desc    신규 사이트(Site) 생성
 * @access  Admin
 */
router.post('/', verifyToken, restrictTo(['admin']), siteValidator.createSite, validate, siteController.create);

/**
 * @route   PATCH /api/v1/sites/:id
 * @desc    사이트(Site) 정보 수정
 * @access  Admin
 */
router.patch('/:id', verifyToken, restrictTo(['admin']), siteValidator.updateSite, validate, siteController.update);

/**
 * @route   DELETE /api/v1/sites/:id
 * @desc    사이트(Site) 삭제
 * @access  Admin
 */
router.delete('/:id', verifyToken, restrictTo(['admin']), siteValidator.deleteSite, validate, siteController.delete);

/**
 * @route   GET /api/v1/sites/:id/tree
 * @desc    사이트(Site) 트리 조회
 * @access  Public
 */
router.get('/:id/tree', verifyToken, restrictTo(['admin']), siteValidator.getSiteTree, validate, siteController.findTree);

module.exports = router;