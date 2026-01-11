const express = require('express');
const router = express.Router();
const controller = require('../../controllers/alert.controller');
const validator = require('../../validators/alert.validator');
const validate = require('../../middlewares/validator'); // 기존에 사용하시던 검증 미들웨어
const errorHandler = require('../../middlewares/error-handler');

/**
 * @route   GET /api/v1/alerts
 * @desc    알림 이력 목록 조회
 * @access  Admin / Manager
 */
router.get('/', validator.getAlerts, validate, controller.findAll);

/**
 * @route   PATCH /api/v1/alerts/:id/read
 * @desc    특정 알림 읽음 처리
 * @access  Admin / Manager
 */
router.patch('/:id/read', validator.markAsRead, validate, controller.markAsRead);

router.use(errorHandler);

module.exports = router;