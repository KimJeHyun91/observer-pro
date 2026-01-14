const express = require('express');
const router = express.Router();
const plsController = require('./pls.controller');

/**
 * ==============================================================================
 * PLS (Parking Lot System) 장비 연동 라우터
 * ------------------------------------------------------------------------------
 * 역할: 장비(LPR, 정산기, 차단기 등)에서 서버로 보내는 HTTP 요청을 수신하여
 * 적절한 Controller 메서드로 라우팅합니다.
 * * Base URL 예시: /api/parkingFee/receive (app.js 설정에 따름)
 * ==============================================================================
 */


/**
 * @route   POST /lpr
 * @desc    [LPR] 차량 번호 인식 데이터 수신
 * - 입차/출차 시 카메라가 차량 번호를 인식하면 호출됩니다.
 * - { lp, location, image_url, ... }
 * @access  Public (장비 호출)
 */
router.post('/lpr', plsController.receiveLprData);

/**
 * @route   POST /gate_state
 * @desc    [Gate] 차단기 상태 변경 이벤트 수신
 * - 차단기가 동작(Up/Down)할 때 호출됩니다.
 * - 주로 'Down' 신호를 감지하여 입출차 세션 상태를 확정(COMPLETED)하는 데 사용됩니다.
 * @access  Public (장비 호출)
 */
router.post('/gate_state', plsController.handleGateStateEvent);

/**
 * @route   POST /payment
 * @desc    [Payment] 결제 및 정산 관련 이벤트 통합 수신
 * - cmd: PARK_FEE_DONE (결제 완료 통보)
 * - cmd: PARK_FEE_RECALC (할인권 투입에 따른 재계산 요청)
 * - cmd: PARK_SEARCH_RESULT (서버 -> 장비 전송 후의 응답일 수 있음)
 * @access  Public (장비 호출)
 */
router.post('/payment', plsController.handlePaymentResult);

/**
 * @route   POST /park_car_search
 * @desc    [Search] 사전 무인 정산기 차량 번호(4자리) 검색 요청
 * - 키오스크에서 고객이 차량번호 뒷자리를 입력했을 때 호출됩니다.
 * - 서버는 즉시 200 OK 응답 후, 비동기로 검색 결과(/payment)를 장비로 전송합니다.
 * @access  Public (장비 호출)
 */
router.post('/park_car_search', plsController.handleCarSearchRequest);

// ------------------------------------------------------------------------------
// (확장 고려) 추후 규격서에 따라 추가될 수 있는 라우트 (주석 처리)
// ------------------------------------------------------------------------------

// /**
//  * @route   POST /vehicle_det
//  * @desc    루프 코일(Loop Coil) 차량 감지 신호 수신
//  */
// router.post('/vehicle_det', plsController.handleVehicleDetection);

// /**
//  * @route   POST /gate_state_res
//  * @desc    서버가 차단기 상태를 조회(Polling)했을 때의 응답 수신
//  */
// router.post('/gate_state_res', plsController.handleGateStateResult);

module.exports = router;