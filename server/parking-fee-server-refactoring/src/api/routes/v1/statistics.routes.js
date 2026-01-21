const express = require('express');
const router = express.Router();
const statisticsController = require('../../controllers/statistics.controller');
const statisticsValidator = require('../../validators/statistics.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/parking-fee/v1/sites/:id/statistics/dashboard
 * @desc    주차 세션(Parking Session) 대시보드(Dashboard) 조회
 * @access  Admin
 */
router.get('/dashboard', restrictTo(['admin']), statisticsValidator.validateGetDashboard, validate, statisticsController.getDashboard);

module.exports = router;