const express = require('express');
const router = express.Router();
const parkingSessionController = require('../../controllers/parking-session.controller');
const validator = require('../../validators/parking-session.validator');
const validate = require('../../middlewares/validator');

// ==========================================
// 1. 기본 조회 및 생성 (Basic CRUD)
// ==========================================

/**
 * @route   GET /api/v1/parking-sessions
 * @desc    주차 세션 목록 조회 (검색/필터링)
 */
router.get(
    '/', 
    validator.validateList,
    validate, 
    parkingSessionController.findAll
);

/**
 * @route   GET /api/v1/parking-sessions/:id
 * @desc    주차 세션 상세 조회
 */
router.get(
    '/:id', 
    validator.validateDetail,
    validate, 
    parkingSessionController.findDetail
);

/**
 * @route   POST /api/v1/parking-sessions
 * @desc    [수동 입차] 관리자 강제 입차 포함 (entrySource='ADMIN')
 */
router.post(
    '/', 
    validator.validateCreate, 
    validate, 
    parkingSessionController.create
);

// ==========================================
// 2. 기능별 세분화된 액션 (Actions)
// ==========================================

/**
 * @route   POST /api/v1/parking-sessions/:id/exit
 * @desc    [수동 출차] 정산 후 출차 처리 또는 강제 출차(forceExit)
 * @note    단순 정보 수정이 아니라 '출차'라는 이벤트를 발생시키므로 POST가 적합
 */
router.post(
    '/:id/exit',
    validator.validateExit, 
    validate,
    parkingSessionController.exit
);

/**
 * @route   POST /api/v1/parking-sessions/:id/discount
 * @desc    [할인 적용] 특정 정책(Policy)을 세션에 적용
 */
router.post(
    '/:id/discount',
    validator.validateDiscount,
    validate,
    parkingSessionController.applyDiscount
);

/**
 * @route   PATCH /api/v1/parking-sessions/:id
 * @desc    [정보 수정] 차량번호 오타 수정, 메모 수정 등 (상태/요금 변경 불가)
 */
router.patch(
    '/:id', 
    validator.validateUpdateInfo, 
    validate, 
    parkingSessionController.updateInfo
);

module.exports = router;