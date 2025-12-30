const express = require("express");
const fieldController = require('./productManager/controllers/fieldController');
const fieldValidator = require('./productManager/validators/fieldValidator');
const productController = require('./productManager/controllers/productController');
const productValidator = require('./productManager/validators/productValidator');
const maintenanceHistoryController = require('./productManager/controllers/maintenanceHistoryController');
const maintenanceHistoryValidator = require('./productManager/validators/maintenanceHistoryValidator');
const validate = require('./productManager/validators/validator');
const maintenanceNotification = require('../worker/productManager/maintenanceNotification');

const router = express.Router();

// 제품 수정
router.put('/product/modify', productValidator.modifyRules, validate, productController.modify);
// 제품 일괄 수정
router.put('/product/bulkModify', productValidator.bulkModifyRules, validate, productController.bulkModify);
// 제품 삭제
router.post('/product/delete', productValidator.deleteRules, validate, productController.delete);
// 제품 조회(최신순)
router.post('/product/find', productValidator.findRules, validate, productController.find);
// 제품 조회(제품 요약 정보)(최신순)
router.post('/product/findAllWithSummuries', productValidator.findAllWithSummuriesRules, productController.findAllWithSummuries);
// 제품 타입 조회(서비스, 기기)
router.post('/product/findTypes', productValidator.findTypesRules, validate, productController.findTypes);
// 제품 유지보수 기간 알림 라벨 조회
router.get('/product/findNotificationLabel', productController.findNotificationLabel);

// 유지보수 만료일 알림 요청
router.get('/product/requestMaintenanceNotification', maintenanceNotification.sendMaintenanceNotification);

// 현장 수정
router.put('/field/modify', fieldValidator.modifyRules, validate, fieldController.modify);
// 현장 조회
router.get('/field/find', fieldController.find);

// 유지보수 내역 등록
router.post('/maintenanceHistory/enroll', maintenanceHistoryValidator.enrollRules, validate, maintenanceHistoryController.enroll);
// 유지보수 내역 수정
router.put('/maintenanceHistory/modify', maintenanceHistoryValidator.modifyRules, validate, maintenanceHistoryController.modify);
// 유지보수 내역 삭제(Soft Deletion)
router.post('/maintenanceHistory/delete', maintenanceHistoryValidator.deleteRules, validate, maintenanceHistoryController.delete);
// 유지보수 내역 조회(최신순)
router.post('/maintenanceHistory/find', maintenanceHistoryValidator.findRules, validate, maintenanceHistoryController.find);
// 유지보수 내역 PDF 또는 엑셀 보고서 다운로드
router.post('/maintenanceHistory/downloadReports', maintenanceHistoryValidator.downloadReportsRules, validate, maintenanceHistoryController.downloadReports);

module.exports = router;