const express = require('express');
const router = express.Router();
const alertController = require('../../controllers/alert.controller');
const alertValidator = require('../../validators/alert.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/alerts
 * @desc    알림(Alert) 목록 조회
 */
router.get('/', restrictTo(['admin', 'user']), alertValidator.getAlerts, validate, alertController.findAll);

/**
 * @route   GET /api/v1/alerts/:id
 * @desc    알림(Alert) 상세 조회
 */
router.get('/:id', restrictTo(['admin', 'user']), alertValidator.getAlert, validate, alertController.findDetail);

/**
 * @route   PATCH /api/v1/alerts/:id
 * @desc    알림(Alert) 수정
 */
router.patch('/:id', restrictTo(['admin', 'user']), alertValidator.updateAlert, validate, alertController.update);

module.exports = router;