const express = require('express');
const router = express.Router();
const plsController = require('./pls.controller');

/**
 * ==============================================================================
 * PLS (Parking Lot System) 장비 연동 라우터
 * Base URL: /api/parkingFee/receive (메인 앱에서 이 경로로 마운트한다고 가정)
 * ==============================================================================
 */

/**
 * @route   POST /lpr
 * @desc    LPR(번호인식기) 차량 인식 데이터 수신
 * @access  Public (장비 호출)
 */
router.post('/lpr', plsController.receiveLprData);

/**
 * @route   POST /gate_state
 * @desc    차단기 상태 변경 이벤트 수신 (Up/Down)
 * @access  Public (장비 호출)
 */
router.post('/gate_state', plsController.handleGateStateEvent);

/**
 * @route   POST /payment
 * @desc    결제 결과(성공) 및 할인권 투입 이벤트 수신
 * - cmd: PARK_FEE_DONE (결제완료)
 * - cmd: PARK_FEE_RECALC (할인권투입)
 * @access  Public (장비 호출)
 */
router.post('/payment', plsController.handlePaymentResult);

/**
 * @route   POST /park_car_search
 * @desc    사전 무인 정산기 차량 번호(4자리) 검색 요청
 * - 응답: OK만 리턴
 * - 결과: 별도 API(/payment - PARK_SEARCH_RESULT)로 장비에게 전송
 * @access  Public (장비 호출)
 */
router.post('/park_car_search', plsController.handleCarSearchRequest);

// ------------------------------------------------------------------------------
// (선택 사항) 규격서에 따라 추가될 수 있는 라우트들
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