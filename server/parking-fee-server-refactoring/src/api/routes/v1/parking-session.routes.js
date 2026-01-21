const express = require('express');
const router = express.Router();
const parkingSessionController = require('../../controllers/parking-session.controller');
const parkingSessionValidator = require('../../validators/parking-session.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');


// ==========================================
// 1. 기본 조회 및 생성 (Basic CRUD)
// ==========================================

/**
 * @route   GET /api/v1/parking-sessions
 * @desc    주차 세션(Parking Session) 목록 조회
 */
router.get('/', restrictTo(['admin', 'user']), parkingSessionValidator.getParkingSessions, validate, parkingSessionController.findAll);

/**
 * @route   GET /api/v1/parking-sessions/:id
 * @desc    주차 세션(Parking Session) 상세 조회
 */
router.get('/:id', restrictTo(['admin', 'user']), parkingSessionValidator.validateDetail, validate, parkingSessionController.findDetail);

/**
 * @route   POST /api/v1/parking-sessions
 * @desc    주차 세션(Parking Session) 생성
 */
router.post('/', restrictTo(['admin', 'user']), parkingSessionValidator.validateCreate, validate, parkingSessionController.create);

/**
 * @route   POST /api/v1/parking-sessions/entry
 * @desc    [수동 입차] 관리자 강제 입차 포함
 */
router.post('/entry', restrictTo(['admin', 'user']), parkingSessionValidator.validateEntry, validate, parkingSessionController.entry);
/**
 * @route   POST /api/v1/parking-sessions/:id/exit
 * @desc    [수동 출차] 정산 후 출차 처리 또는 강제 출차
 */
router.post('/:id/exit', restrictTo(['admin', 'user']), parkingSessionValidator.validateExit, validate, parkingSessionController.exit);

/**
 * @route   POST /api/v1/parking-sessions/:id/discount
 * @desc    [할인 적용] 특정 정책(Policy)을 세션에 적용
 */
router.post('/:id/discount', restrictTo(['admin', 'user']), parkingSessionValidator.validateDiscount, validate, parkingSessionController.applyDiscount);

/**
 * @route   PATCH /api/v1/parking-sessions/:id
 * @desc    [정보 수정] 차량번호 오타 수정, 메모 수정 등 (상태/요금 변경 불가)
 */
router.patch('/:id', restrictTo(['admin', 'user']), parkingSessionValidator.validateUpdateInfo, validate, parkingSessionController.updateInfo);

module.exports = router;