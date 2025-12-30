const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs');

const multer = require('multer');
// glb 모델 업로드
const glbModelsPath = path.join(process.cwd(), 'public', 'images', 'glb_models');
if (!fs.existsSync(glbModelsPath)) {
  fs.mkdirSync(glbModelsPath, { recursive: true });
}

const glbModelsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, glbModelsPath); //파일 저장 경로
  },
  filename: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${file.originalname}`); //파일 이름
  }
});

const glbModelsUpload = multer({ 
  dest: glbModelsPath, 
  storage : glbModelsStorage, 
  limits: { fileSize: 200 * 1024 * 1024 }
}); 

// glb 장비 업로드
const glbDevicesPath = path.join(process.cwd(), 'public', 'images', 'glb_devices');
if (!fs.existsSync(glbDevicesPath)) {
  fs.mkdirSync(glbDevicesPath, { recursive: true });
}

const glbDevicesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, glbDevicesPath); //파일 저장 경로
  },
  filename: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${file.originalname}`); //파일 이름
  }
});

const glbDevicesUpload = multer({ 
  dest: glbDevicesPath, 
  storage : glbDevicesStorage, 
  limits: { fileSize: 200 * 1024 * 1024 }
}); 

const modelsController = require('./threeD/controllers/modelsController');

// 3D 모델 관리
router.post('/glbModels/upload', glbModelsUpload.single('glb_models'), modelsController.modelsModelUpload); // GLB 모델 업로드
router.post('/glbDevices/upload', glbDevicesUpload.single('glb_devices'), modelsController.modelsDevicesUpload); // GLB 장비 업로드
router.post('/getGlbModels', modelsController.getGlbModels); // 3D 모델 목록 조회
router.post('/saveDefaultModel', modelsController.saveDefaultModel); // 기본 모델 저장
router.post('/savePositionModel', modelsController.savePositionModel); // 모델 카메라 위치 저장
router.post('/deleteModel', modelsController.deleteModel); // 3D 모델 삭제
router.post('/deleteDevice', modelsController.deleteDevice); // 3D 장비 삭제

// 장비 매핑 관리 
router.post('/threedDeviceList', modelsController.threedDeviceList); // 등록 가능한 장비 목록 조회
router.post('/addDeviceMapping', modelsController.addDeviceMapping); // 모델에 장비 매핑 등록
router.post('/getDeviceMappings', modelsController.getDeviceMappings); // 선택된 모델의 장비 매핑 조회
router.post('/getAllDeviceMappings', modelsController.getAllDeviceMappings); // 전체 장비 매핑 조회
router.post('/deleteDeviceMapping', modelsController.deleteDeviceMapping); // 선택된 장비 매핑 삭제

router.post('/addModelFloors', modelsController.addModelFloors); // 자동 층 저장


module.exports = router;