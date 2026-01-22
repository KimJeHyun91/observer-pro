const express = require('express');
const router = express.Router();
const parkingSessionController = require('../../controllers/parking-session.controller');
const parkingSessionValidator = require('../../validators/parking-session.validator');
const validate = require('../../middlewares/validator');
const { restrictTo } = require('../../middlewares/auth.middleware');

// ==========================================
// 0. 동시성 제어 (Redis Lock & Heartbeat)
// ==========================================

/**
 * @route   POST /api/v1/parking-sessions/:id/lock
 * @desc    [점유 시작] 세션 수정 권한 획득 (TTL: 30초)
 */
router.post('/:id/lock', restrictTo(['admin', 'user']), parkingSessionValidator.validateLock, validate, parkingSessionController.acquireLock);

/**
 * @route   PUT /api/v1/parking-sessions/:id/lock
 * @desc    [점유 연장] Heartbeat (TTL 초기화)
 */
router.put('/:id/lock', restrictTo(['admin', 'user']), parkingSessionValidator.validateLock, validate, parkingSessionController.extendLock);

/**
 * @route   DELETE /api/v1/parking-sessions/:id/lock
 * @desc    [점유 해제] 작업 완료/취소 시 즉시 해제
 */
router.delete('/:id/lock', restrictTo(['admin', 'user']), parkingSessionValidator.validateLock, validate, parkingSessionController.releaseLock);

// ==========================================
// 1. Lock 검증 불필요
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

// ==========================================
// 2. 상태 변경 작업 (Service에서 Lock 소유권 검사 필수)
// ==========================================

/**
 * @route   PATCH /api/v1/parking-sessions/:id
 * @desc    주차 세션(Parking Session) 수정
 */
router.patch('/:id', restrictTo(['admin', 'user']), parkingSessionValidator.validateUpdate, validate, parkingSessionController.updateInfo);

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

module.exports = router;