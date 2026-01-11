const express = require('express');
const router = express.Router();
const statisticsController = require('../../controllers/statistics.controller');
const validator = require('../../validators/statistics.validator');
const validate = require('../../middlewares/validator');

/**
 * @route   GET /api/v1/sites/:siteId/statistics
 * @desc    특정 사이트의 통계 요약 조회
 * @query   scope (today | week | month) - 기본값: today
 * @access  Admin
 */
router.get(
    '/sites/:siteId/statistics',
    validator.validateGetStatistics,
    validate,
    statisticsController.getStatistics
);

module.exports = router;