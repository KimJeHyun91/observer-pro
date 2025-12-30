const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs');

const multer = require('multer');
// 층 이미지 업로드
// const floorplanPath = path.join(__dirname, "../public", "images", "floorplan");
// if(!fs.existsSync(floorplanPath)) {
//   fs.mkdirSync(floorplanPath);
// }

const floorplanPath = path.join(process.cwd(), 'public', 'images', 'floorplan');
if (!fs.existsSync(floorplanPath)) {
  fs.mkdirSync(floorplanPath, { recursive: true });
}

const floorStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = setImagePath(floorplanPath)
    cb(null, uploadDir); //파일 저장 경로
  },
  filename: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${file.originalname}`); //파일 이름
  }
});
const floorUpload = multer({ 
  storage : floorStorage, 
  limits: { 
    fileSize: 10 * 10 * 1024 * 1024 * 10
  } 
}); 

// 건물 이미지 업로드
// const buildingplanPath = path.join(__dirname, "../public", "images", "buildingplan");
// if(!fs.existsSync(buildingplanPath)) {
//   fs.mkdirSync(buildingplanPath);
// }
const buildingplanPath = path.join(process.cwd(), 'public', 'images', 'buildingplan');
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

const outdoorplanPath = path.join(process.cwd(), 'public', 'images', 'outdoorplan');
if (!fs.existsSync(outdoorplanPath)) {
  fs.mkdirSync(outdoorplanPath, { recursive: true });
};

const outdoorStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = setImagePath(outdoorplanPath)
    cb(null, uploadDir); //파일 저장 경로
  },
  filename: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    // 확장자 추출
    const ext = path.extname(file.originalname);
    
    // 파일명 고정
    cb(null, `outdoor${ext}`);
  }
});
const outdoorUpload = multer({ 
  storage : outdoorStorage, 
  limits: { 
    fileSize: 10 * 1024 * 1024 
  }
});

const accessController = require('./observer/controllers/accessController');
const outsideController = require('./observer/controllers/outsideController');
const insideController = require('./observer/controllers/insideController');
const vmsController = require('./observer/controllers/vmsController');
const cameraController = require('./observer/controllers/cameraController');
const doorController = require('./observer/controllers/doorController');
const vmsEventController = require('./observer/controllers/vmsEventController');
const guardianliteController = require('./observer/controllers/guardianliteController');
const pidsController = require('./observer/controllers/pidsController');
const mdetController = require('./observer/controllers/mdetController');
const eventController = require('./observer/controllers/eventController');
const outdoorController = require('./observer/controllers/outdoorController');

const { setImagePath } = require('../utils/setImagePath');
const { getEbells, updateEbell } = require('./observer/controllers/ebellController');

// 출입통제
router.post('/accesscontrollog', accessController.getAccessControlLog);
router.get('/accesscontrolperson', accessController.reloadAccessControlPerson);
router.post('/accesscontrolperson', accessController.getAccessCtlPerson);
router.put('/accesscontrolperson', accessController.modifyAccessCtlPerson);
router.delete('/accesscontrolperson', accessController.removeAccessCtlPerson);
router.post('/accessEventRec', accessController.accessEventRec);

// 출입문 제어
router.post('/doorLockControl', doorController.doorLockControl);
// 출입문
router.post('/accesscontrolDoors', doorController.getAccessControlDoors);
router.put('/accesscontrolDoor', doorController.updateAccessControlDoor);
// acu
router.post('/accesscontrolAcus', doorController.getAccessControlAcus);

// outside(건물) 
router.post('/getBuilding', outsideController.getBuilding);
router.post('/getBuilding3D', outsideController.getBuilding3D);
router.post('/addBuilding', outsideController.addBuilding);
router.delete('/deleteBuilding', outsideController.deleteBuilding);
router.post('/modifyBuilding', outsideController.modifyBuilding);
router.post('/modifyBuildingAlarmStatus', outsideController.modifyBuildingAlarmStatus);
router.post('/buildingplan/upload', buildingupload.single('buildingplan'), outsideController.buildingplanUpload);
router.post('/getBuildingPlan', outsideController.getBuildingPlan);

// inside(층) 
router.post('/getFloor', insideController.getFloor);
router.post('/addFloor', insideController.addFloor);
router.delete('/deleteFloor', insideController.deleteFloor);
router.post('/modifyFloor', insideController.modifyFloor);
router.post('/modifyFloorAlarmStatus', insideController.modifyFloorAlarmStatus);
router.post('/floorplan/upload', floorUpload.single('floorplan'), insideController.floorplanUpload);
router.post('/getFloorPlan', insideController.getFloorPlan);

router.post('/outdoorplan/upload', outdoorUpload.single('outdoorplan'), outdoorController.outdoorplanUpload);

// 비상벨
router.post('/ebell', getEbells);
router.put('/ebell', updateEbell);

// 가디언라이트
router.post('/getGuardianliteInfo', guardianliteController.getGuardianliteInfo); // 가디언라이트 개별 정보
router.post('/getGuardianliteList', guardianliteController.getGuardianliteList); // 가디언라이트 리스트
router.post('/addGuardianlite', guardianliteController.addGuardianlite);

router.put('/guardianlite', guardianliteController.modifyGuardianlite);
router.put('/guardianlite/channel', guardianliteController.modifyGuardianliteChannel);
router.put('/guardianlite/location', guardianliteController.modifyGuardianliteLocation);
router.delete('/deleteGuardianlite', guardianliteController.deleteGuardianlite);

// MDET
router.post('/mdet', mdetController.createMDET);
router.get('/mdet', mdetController.getMDETs);

// PIDS
router.post('/pids', pidsController.createPIDS);
router.delete('/pids', pidsController.removePIDS);
router.put('/pids', pidsController.updatePIDS);
router.post('/pidsList', pidsController.getPIDS);
router.get('/pids/root', pidsController.getPIDSRoot);
router.post('/pids/event', pidsController.addPIDSEvent);

// MGIST 지능형 이벤트 생성
router.post('/vms/event/fire', vmsEventController.detectFire);
router.post('/vms/event/smoke', vmsEventController.detectSmoke);
router.post('/vms/event/motion', vmsEventController.detectMotion);
router.post('/vms/event/loiter', vmsEventController.detectLoiter);
router.post('/vms/event/abandonment', vmsEventController.detectAbandonment);
router.post('/vms/event/trespass', vmsEventController.detectTrespass);
router.post('/vms/event/leave', vmsEventController.detectLeave);
router.post('/vms/event/linecross', vmsEventController.detectLinecross);
router.post('/vms/event/queue', vmsEventController.detectQueue);
router.post('/vms/event/fall', vmsEventController.detectFalldown);
router.post('/vms/event/sittingposture', vmsEventController.detectSittingPosture);
router.post('/vms/event/stop', vmsEventController.detectStop);
router.post('/vms/event/move', vmsEventController.detectMove);
router.post('/vms/event/peoplecount', vmsEventController.detectPeopleCount);
router.post('/vms/event/shortdistance', vmsEventController.detectShortDistance);
router.post('/vms/event/handrail', vmsEventController.detectHandrail);
router.post('/vms/event/handsup', vmsEventController.detectHandsUp);
router.post('/vms/event/face', vmsEventController.detectFace);
router.post('/vms/event/person', vmsEventController.detectPerson);
router.post('/vms/event/car', vmsEventController.detectCar);
router.post('/vms/event/safetyhelmet', vmsEventController.detectSafetyHelmet);
router.post('/vms/event/lostrecord', vmsEventController.detectLostRecord);
router.post('/vms/event/lostcamera', vmsEventController.detectLostCamera);
router.post('/vms/event/lostserver', vmsEventController.detectLostServer);
router.post('/vms/event/lostarchive', vmsEventController.detectLostArchive);
router.post('/vms/anpr/detect-vehicle-number', vmsEventController.detectVehicleNumber);

// vms 정보
router.post('/getVmsList', vmsController.getVmsList);
router.post('/addVms', vmsController.addVms);
router.post('/modifyVms', vmsController.modifyVms);
router.delete('/deleteVms', vmsController.deleteVms);
router.post('/syncVms', vmsController.synchronizeVms);

// vms 녹화 영상 다운로드
router.post('/vms/export/archive', vmsController.exportArchive); 

// camera
router.post('/getUnUseCameraList', cameraController.getUnUseCameraList);
router.post('/getCameraLiveStream', cameraController.getCameraLiveStream);
router.post('/modifyCamera', cameraController.modifyCamera);
router.delete('/deleteCameraLocation', cameraController.deleteCameraLocation);
router.post('/getAllCameraList', cameraController.getAllCameraList);
router.post('/cameraList/independent', cameraController.getIndependentCameraList);
router.post('/camera', cameraController.addCamera);
router.delete('/camera', cameraController.removeCamera);
router.put('/camera', cameraController.updateCamera);

// events
router.post('/events/importance', eventController.getEventsGroupByImportance);
router.post('/events/device', eventController.getEventsGroupByDevice);
router.post('/events/name', eventController.getEventsGroupByEventName);
router.post('/events/byAck', eventController.getEventsGroupByAck);
router.post('/events/bySOP', eventController.getEventsGroupBySOP);
router.post('/events/list', eventController.getEventList);
router.put('/events/ack', eventController.ackEvents);
router.post('/events/search', eventController.searchEvents);
router.post('/events/search/SOP', eventController.searchEventsBySOP);

// export SOP 처리 내역 보고서 다운로드
const exportSOPEventController = require('./observer/controllers/exportSOPEventController');
const exportSOPEventValidator = require('./observer/validators/exportSOP');
const validate = require('./observer/validators/validator');
router.post('/events/export/sop', exportSOPEventValidator.downloadReportsRules, validate, exportSOPEventController.downloadReports);

module.exports = router;