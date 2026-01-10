const express = require('express');
const router = express.Router();
const parkingSessionController = require('../../controllers/parking-session.controller');
const validator = require('../../validators/parking-session.validator');
const validate = require('../../middlewares/validator');

// 1. 목록 조회
router.get(
    '/', 
    validator.validateList,
    validate, 
    parkingSessionController.findAll
);

// 2. 생성 (입차)
router.post(
    '/', 
    validator.validateCreate, 
    validate, 
    parkingSessionController.create
);

// 3. 상세 조회
router.get(
    '/:id', 
    validator.getOne,
    validate, 
    parkingSessionController.findDetail
);

// 4. 수정 (출차, 정산, 단순수정 통합)
// validateUpdate 하나로 통합하거나, body 내용에 따라 유연하게 처리
router.patch(
    '/:id', 
    validator.validateUpdate, // 기존 UpdatePayment용 검증 로직 재사용 (유연함)
    validate, 
    parkingSessionController.update
);

module.exports = router;