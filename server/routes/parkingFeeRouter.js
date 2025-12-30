const express = require('express');
const router = express.Router();

const outsideController = require('./parkingFee/controllers/outsideController'); // 주차장 관리
const insideController = require('./parkingFee/controllers/insideController'); // 층 관리
const lineController = require('./parkingFee/controllers/lineController'); // 라인(차단기) 관리
const crossingGateController = require('./parkingFee/controllers/crossingGateController'); // 차단기

const regVehicleController = require('./parkingFee/controllers/regVehicleController'); // 등록 차량 관리
const accessLogsController = require('./parkingFee/controllers/accessLogsController'); // 차량 출입 기록
const settlementLogsController = require('./parkingFee/controllers/settlementLogsController'); // 정산기록
const kioskLogsController = require('./parkingFee/controllers/kioskLogsController'); // 주차요금 무인정산기 이용 기록
const idManagementController = require('./parkingFee/controllers/idManagementController'); // 입주사 관리
const ptController = require('./parkingFee/controllers/ptController'); // 출구 정산기 주차요금 계산
const paymentResultController = require('./parkingFee/controllers/paymentResultController'); // 입주자에 의한 방문자 할인에 대한 처리
const reductionController = require('./parkingFee/controllers/reductionController'); // 주차요금 감면정책 관리
const feePolicyController = require('./parkingFee/controllers/feePolicyController'); // 주차요금 정책 관리
const holidayController = require('./parkingFee/controllers/holidayController'); // 공휴일 관리
const webDiscountController = require('./parkingFee/controllers/webDiscountController'); // 웹할인권 그룹관리
const couponSalesController = require('./parkingFee/controllers/couponSalesController'); // 웹할인권 판매 관리

// 2025-12-05 추가
const receiveController = require('./parkingFee/controllers/receiveController'); // PLS => 옵저버

const vehicleController = require('./parkingFee/controllers/vehicleController');
////////////////////////////////////////////////////////////////////////////////////////////////////


// 주차장(outside)
router.post('/get/parkingList', outsideController.getParkingList); // 검색
router.post('/set/parkingInfo', outsideController.setParkingInfo); // 저장
router.post('/update/parkingInfo', outsideController.updateParkingInfo); // 수정
router.post('/delete/parkingInfo', outsideController.deleteParkingInfo); // 삭제

// 층(inside)
router.post('/get/floorList', insideController.getFloorList); // 검색
router.post('/get/floorLineList', insideController.getFloorLineList); // 검색
router.post('/set/floorInfo', insideController.setFloorInfo); // 저장
router.post('/update/floorInfo', insideController.updateFloorInfo); // 수정
router.post('/delete/floorInfo', insideController.deleteFloorInfo); // 삭제

// 라인
router.post('/get/lineList', lineController.getLineList); // 검색
router.post('/set/lineInfo', lineController.setLineInfo); // 저장
router.post('/update/lineInfo', lineController.updateLineInfo); // 수정
router.post('/delete/lineInfo', lineController.deleteLineInfo); // 삭제
router.post('/get/lineLPRInfo', lineController.getLineLPRInfo); // GTL 에서 받은 차량출입 데이터 저장된게 있는지 검색

// 차단기
router.post('/controlMsg', crossingGateController.control); // 제어(GTL)
router.post('/get/crossingGateDirectionList', crossingGateController.getCrossingGateDirectionList); // 검색
router.post('/set/crossingGateInfo', crossingGateController.setCrossingGateInfo); // 저장
router.post('/update/crossingGateInfo', crossingGateController.updateCrossingGateInfo); // 수정
router.post('/delete/crossingGateInfo', crossingGateController.deleteCrossingGateInfo); // 삭제

// 주차장 라인 차단기 매핑
router.post('/update/crossingGateMappingInfo', crossingGateController.updateCrossingGateMappingInfo); // 수정

/**
 * 초기 UI : GTL, 주석처리함(2025-12-30)
 */
// // 등록차량
// router.post('/get/manage_sales_list', regVehicleController.getManageSalesList); // 검색(GTL)
// router.post('/set/manage_sales_list', regVehicleController.setManageSalesList); // 저장(GTL)
// router.post('/update/manage_sales_list', regVehicleController.updateManageSalesList); // 수정(GTL)
// router.post('/delete/manage_sales_list', regVehicleController.deleteManageSalesList); // 삭제(GTL)
// router.post('/get/manage_sales_list/loadConfig', regVehicleController.getManageSalesListLoadConfig); // 요금정책, 정기권 그룹 검색(GTL)

// // 차량출입기록
// router.post('/get/vehicle_obj_list/update_vehicle_obj_list', accessLogsController.getVehicleObjList); // 검색(GTL)
// router.post('/update/vehicle_obj_list/update_vehicle_obj_list', accessLogsController.updateVehicleObjList); // 수정(GTL)
// router.post('/set/vehicle_obj_list/update_vehicle_obj_list', accessLogsController.setVehicleObjList); // 수동 입차 등록(GTL)
// router.post('/vehicle/lpr', accessLogsController.vehicleLpr); // 주차관제=>옵저버: 차량 입차, 출차(GTL)
// router.post('/vehicle/fee_calculation_result', accessLogsController.vehicleFeeCalculationResult); // 주차관제=>옵저버: 차량 출차(요금 계산, 요금 정산)(GTL)

// // 정산기록
// router.post('/get/vehicle_obj_list/update_fee_list', settlementLogsController.getVehicleObjFeeList); // 검색(GTL)
// router.post('/update/vehicle_obj_list/update_fee_list', settlementLogsController.updateVehicleObjFeeList); // 수정(GTL)

// // 주차요금 무인정산기 이용기록
// router.post('/get/vehicle_obj_list/payment_result_list', kioskLogsController.paymentResultList); // 검색(GTL)

// // 입주사 관리
// router.post('/get/manage_list', idManagementController.getManagePersonList); // 검색(GTL)
// router.post('/set/manage_list', idManagementController.setManagePersonList); // 저장(GTL)
// router.post('/update/manage_list', idManagementController.updateManagePersonList); // 수정(GTL)
// router.post('/delete/manage_list', idManagementController.deleteManagePersonList); // 삭제(GTL)

// // 출구 정산기 주차요금 계산
// router.post('/indexParkingFee', ptController.indexParkingFee); // 출구 정산기 주차요금 계산(GTL)

// // 입주사 방문차량 할인
// router.post('/get/paymentResult/coupon_search', paymentResultController.getPaymentResultForVisitorCouponSearch); // 입주사 정보 불러오기(GTL)
// router.post('/get/paymentResult/vehicle_search', paymentResultController.getPaymentResultForVisitorVehicleSearch); // 방문차량 검색(GTL)
// router.post('/get/paymentResult/how_much', paymentResultController.getPaymentResultForVisitorHowMuch); // 웹할인권 선택(GTL)

// // 주차요금 감면정책 관리
// router.post('/get/manage_reduction_list', reductionController.getReductionList); // 주차요금 감면정책 관리 조회(GTL)
// router.post('/set/manage_reduction_list', reductionController.setReductionList); // 주차요금 감면정책 관리 등록(GTL)
// router.post('/update/manage_reduction_list', reductionController.updateReductionList); // 주차요금 감면정책 관리 수정(GTL)
// router.post('/delete/manage_reduction_list', reductionController.deleteReductionList); // 주차요금 감면정책 관리 삭제(GTL)

// // 주차요금 정책 관리
// router.post('/get/fee_policy_list', feePolicyController.getFeePolicyList); // 주차요금 정책 관리 조회(GTL)
// router.post('/set/fee_policy_list', feePolicyController.setFeePolicyList); // 주차요금 정책 관리 등록(GTL)
// router.post('/update/fee_policy_list', feePolicyController.updateFeePolicyList); // 주차요금 정책 관리 수정(GTL)
// router.post('/delete/fee_policy_list', feePolicyController.deleteFeePolicyList); // 주차요금 정책 관리 삭제(GTL)

// // 공휴일 관리
// router.post('/get/holiday_list', holidayController.getHolidayList); // 공휴일 관리 조회(GTL)
// router.post('/set/holiday_list', holidayController.setHolidayList); // 공휴일 관리 등록(GTL)
// router.post('/update/holiday_list', holidayController.updateHolidayList); // 공휴일 관리 수정(GTL)
// router.post('/delete/holiday_list', holidayController.deleteHolidayList); // 공휴일 관리 삭제(GTL)

// // 웹할인권 그룹관리
// router.post('/get/webDiscount_list', webDiscountController.getWebDiscountList); // 웹할인권 그룹관리 조회(GTL)
// router.post('/set/webDiscount_list', webDiscountController.setWebDiscountList); // 웹할인권 그룹관리 등록(GTL)
// router.post('/delete/webDiscount_list', webDiscountController.deleteWebDiscountList); // 웹할인권 그룹관리 삭제(GTL)

// // 웹할인권 판매 관리
// router.post('/get/coupon_sales_list', couponSalesController.getCouponSalesList); // 웹할인권 판매 관리 조회(GTL)
// router.post('/set/coupon_sales_list', couponSalesController.setCouponSalesList); // 웹할인권 판매 관리 등록GTL)

/**
 * 2025-12-05 이후 추가, UI: 플러스파크
 */
// PLS => 옵저버
// router.post('/receive/vehicle_det', receiveController.getVehicleDetInfo); // loop 정보, // 현재사용 안함.
router.post('/receive/lpr', receiveController.getLprInfo); // 차량번호 인식 정보
router.post('/receive/gate_state', receiveController.getGateState); // 차단기 상태정보(이벤트)
router.post('/receive/park_car_search', receiveController.getParkCarSearch); // 사전 정산기 차량번호 검색

// 옵저버 => PLS
router.post('/get/gate_state/check', crossingGateController.getGateStateCheck); // 주차 차단기 상태 조회
router.post('/paymentRequest', ptController.paymentRequest); // 출구 정산기 요금 정산, 결제 요청

// 모니터링
router.post('/get/reduction/policyList', reductionController.getReductionPolicyList); // 감면정책 조회
router.post('/get/reFeeCalculation', ptController.getReFeeCalculation); // 요금재계산
router.post('/set/manual/lprInLog', vehicleController.setManualLprInLogInfo); // 수동 입차
router.post('/set/manual/lprOutLog', vehicleController.setManualLprOutLogInfo); // 수동 출차

// 차량관리
router.post('/get/VehicleList', vehicleController.getVehicleList); // 입출차 목록
router.post('/get/current/situation', vehicleController.getLpCurrentSituation); // 주차현황, 정산현황
router.post('/update/lpTypeInfo', vehicleController.updateReceiveLprLpTypeInfo); // 차량번호, 차량종류 변경
router.post('/get/paymentDetailList', vehicleController.getLpPaymentDetailList); // 해당 차량 총 결제내역
router.post('/get/paymentDetailInfo', vehicleController.getLpPaymentDetailInfo); // 할인내역, 정산내역

// 운영현황
router.post('/get/daily/revenue', vehicleController.getDailyRevenue); // 일일 종합 수익
router.post('/get/total/revenue', vehicleController.getTotalRevenue); // 종합 수익 보고
router.post('/get/daily/lptype/ratio', vehicleController.getDailyLpTypeRatio); // 차량 종류 비율
router.post('/get/daily/time/flow', vehicleController.getDailyTimeFlow); // 시간대별 입출차 흐름
router.post('/get/floating/vehicle', vehicleController.getFloatingVehicle); // 유동 차량
router.post('/get/month/usage/vehicle', vehicleController.getCurrentMonthUsageRate); // 당월 이용률



module.exports = router;