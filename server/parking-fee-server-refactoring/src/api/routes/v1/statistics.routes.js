const express = require('express');
const router = express.Router({ mergeParams: true });
const statisticsController = require('../../controllers/statistics.controller');
const statisticsValidator = require('../../validators/statistics.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/parking-fee/v1/sites/:siteId/statistics/dashboard
 * @desc    주차 세션(Parking Session) 대시보드(Dashboard) 조회
 * @access  Admin
 */
router.get('/dashboard', restrictTo(['admin']), statisticsValidator.validateGetDashboard, validate, statisticsController.getDashboard);

/**
 * @route   GET /api/parking-fee/v1/sites/:siteId/statistics/summary
 * @desc    특정 기간(startTime ~ endTime) 통계 요약 조회
 * @access  Admin
 */
router.get('/summary', restrictTo(['admin', 'user']), statisticsValidator.validateGetSummary, validate, statisticsController.getSummary);

module.exports = router;