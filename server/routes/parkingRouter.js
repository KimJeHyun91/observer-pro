const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs');
const { setImagePath } = require('../utils/setImagePath');

const multer = require('multer');
// 층 이미지 업로드
// const floorplanPath = path.join(__dirname, "../public", "images", "pm_floorplan");
// if(!fs.existsSync(floorplanPath)) {
//   fs.mkdirSync(floorplanPath);
// }
const floorplanPath = path.join(process.cwd(), 'public', 'images', 'pm_floorplan');
if (!fs.existsSync(floorplanPath)) {
  fs.mkdirSync(floorplanPath, { recursive: true });
}

const floorStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, floorplanPath); //파일 저장 경로
  },
  filename: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${file.originalname}`); //파일 이름
  }
});
const floorUpload = multer({ 
  dest: floorplanPath, 
  storage : floorStorage, 
  limits: { 
    fileSize: 10 * 1024 * 1024 
  } 
}); 

// 건물 이미지 업로드
// const buildingplanPath = path.join(__dirname, "../public", "images", "pm_buildingplan");
// if(!fs.existsSync(buildingplanPath)) {
//   fs.mkdirSync(buildingplanPath);
// }
const buildingplanPath = path.join(process.cwd(), 'public', 'images', 'pm_buildingplan');
if (!fs.existsSync(buildingplanPath)) {
  fs.mkdirSync(buildingplanPath, { recursive: true });
}

const buildingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = setImagePath(buildingplanPath)
    cb(null, uploadDir); //파일 저장 경로
  },
  filename: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${file.originalname}`); //파일 이름
  }
});
const buildingupload = multer({ 
  storage : buildingStorage, 
  limits: { 
    fileSize: 10 * 1024 * 1024 
  } 
}); 

const outsideController = require('./parkingManagement/controllers/outsideController');
const insideController = require('./parkingManagement/controllers/insideController');
const parkingTypeController = require('./parkingManagement/controllers/parkingTypeController');
const areaController = require('./parkingManagement/controllers/areaController');
const accessLogController = require('./parkingManagement/controllers/accessLogController');
const deviceController = require('./parkingManagement/controllers/deviceController');
const eventTypeController = require('./parkingManagement/controllers/eventTypeController');


// outside(건물) 
router.post('/getBuildingInfo', outsideController.getBuildingInfo);
router.post('/getBuildingList', outsideController.getBuildingList);
router.post('/addBuilding', outsideController.addBuilding);
router.delete('/deleteBuilding', outsideController.deleteBuilding);
router.post('/modifyBuilding', outsideController.modifyBuilding);
router.post('/modifyBuildingAlarmStatus', outsideController.modifyBuildingAlarmStatus);
router.post('/getOutsideInsideList', outsideController.getOutsideInsideList); // 건물, 층 계층구조 목록 가져오기
router.post('/buildingplan/upload', buildingupload.single('pm_buildingplan'), outsideController.buildingplanUpload); // 빌딩 파일 업로드
router.post('/getBuildingPlan', outsideController.getBuildingPlan); // 빌딩 파일 목록 가져오기

// inside(층) 
router.post('/getFloorInfo', insideController.getFloorInfo);
router.post('/getFloorList', insideController.getFloorList);
router.post('/floorplan/upload', floorUpload.single('pm_floorplan'), insideController.floorplanUpload); // 층 파일 업로드
router.post('/getFloorPlan', insideController.getFloorPlan); // 층 파일 목록 가져오기
router.post('/addFloor', insideController.addFloor);
router.delete('/deleteInSide', insideController.deleteInSide);
router.post('/modifyFloor', insideController.modifyFloor);
router.post('/modifyFloorAlarmStatus', insideController.modifyFloorAlarmStatus);

// parking type (일반, 경차 등등)
router.post('/getParkingTypeList', parkingTypeController.getParkingTypeList);

// area(주차구역)
router.post('/getAreaList', areaController.getAreaList);
router.post('/addArea', areaController.addArea);
router.post('/getParkingTypeCountUsedArea', areaController.getParkingTypeCountUsedArea); // 현황, 주차관리 상단메뉴
router.post('/getParkingTypeCountAreaInfo', areaController.getParkingTypeCountAreaInfo); // 층, 주차 카운트
router.post('/getParkingTypeCountAreaList', areaController.getParkingTypeCountAreaList); // 건물 층별, 주차 카운트
router.post('/getParkingTypeSumAreaList', areaController.getParkingTypeSumAreaList); // 건물 층별, 주차 합(그래프)
router.post('/modifyAreaInfo', areaController.modifyAreaInfo); // 주차면 수정
router.delete('/deleteAreaInfo', areaController.deleteAreaInfo); // 주차면 삭제
router.post('/getAreaInfo', areaController.getAreaInfo);
router.post('/getTreeList', areaController.getTreeList); // 대시보드 트리 데이터

// 주차 출입 기록
router.post('/getVehicleNumberSearchPreview', accessLogController.getVehicleNumberSearchPreview); // 차량번호 검색어 자동완성?
router.post('/getVehicleNumberSearch', accessLogController.getVehicleNumberSearch); // 차량번호 검색
router.post('/getAccessTimeZone', accessLogController.getAccessTimeZone); // 시간별 출입 그래프
// router.post('/getOutTimeZone', accessLogController.getOutTimeZone); // 출차, 시간별 출입 그래프, 사용안함
router.post('/getAccessLogList', accessLogController.getAccessLogList); // 차량 출입 기록(전체)
router.post('/getBuildingAccessLogList', accessLogController.getBuildingAccessLogList); // 차량 출입 기록(빌딩, outside)

// 주차센서(device)
router.post('/getDeviceIpList', deviceController.getDeviceIpList); // device 리스트
router.post('/getUnUseDeviceList', deviceController.getUnUseDeviceList); // 사용 하지 않는 device
router.post('/addDevice', deviceController.addDevice); // device 추가
router.post('/modifyDevice', deviceController.modifyDevice); // device 수정
router.post('/deleteDevice', deviceController.deleteDevice); // device 삭제

// 설정(이벤트 설정)
router.post('/getEventTypeList', eventTypeController.getEventTypeList);
router.post('/modifyEventType', eventTypeController.modifyEventType);
router.post('/getEventLogList', eventTypeController.getEventLogList);
router.post('/parkingEventLogSearchList', eventTypeController.parkingEventLogSearchList);

module.exports = router;