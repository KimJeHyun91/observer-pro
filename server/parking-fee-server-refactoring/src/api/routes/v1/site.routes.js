const express = require('express');
const router = express.Router();
const siteController = require('../../controllers/site.controller');
const siteValidator = require('../../validators/site.validator');
const validate = require('../../middlewares/validator');
const errorHandler = require('../../middlewares/error-handler');

/**
 * @route   GET /api/v1/sites
 * @desc    사이트(Site) 목록 조회
 * - 모든 컬럼에 대한 검색 지원
 * - 정렬 및 페이지네이션 지원
 * @access  Public (또는 Protected)
 */
router.get('/', siteValidator.getSites, validate, siteController.findAll);

/**
 * @route   GET /api/v1/sites/:id
 * @desc    사이트(Site) 상세 조회
 * - 해당 사이트의 상세 정보 및 구역(Zone), 장비 제어기(Device Controller) 목록 반환
 * @access  Public
 */
router.get('/:id', siteValidator.getSite, validate, siteController.findDetail);

/**
 * @route   POST /api/v1/sites
 * @desc    신규 사이트(Site) 생성
 * @access  Admin
 */
router.post('/', siteValidator.createSite, validate, siteController.create);

/**
 * @route   PATCH /api/v1/sites/:id
 * @desc    사이트(Site) 정보 수정 (Partial Update)
 * @access  Admin
 */
router.patch('/:id', siteValidator.updateSite, validate, siteController.update);

/**
 * @route   DELETE /api/v1/sites/:id
 * @desc    사이트(Site) 삭제 (Delete)
 * @access  Admin
 */
router.delete('/:id', siteValidator.deleteSite, validate, siteController.delete);

/**
 * @route   GET /api/v1/sites/:id/tree
 * @desc    사이트(Site) 트리 조회
 * @access  Public (또는 Protected)
 */
router.get('/:id/tree', siteValidator.getSiteTree, validate, siteController.findTree);

router.use(errorHandler);

module.exports = router;