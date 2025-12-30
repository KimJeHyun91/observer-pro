const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiboxWaterLevelControl = require('../worker/inundation/waterlevel/aiboxWaterlevelApiControl');
const { pool } = require('../db/postgresqlPool');

const outsideController = require('./inundationControl/controllers/outsideController');
const billboardController = require('./inundationControl/controllers/billboardController');
const speakerController = require('./inundationControl/controllers/speakerController');
const waterLevelController = require('./inundationControl/controllers/waterLevelController');
// const vmsController = require('./inundationControl/controllers/vmsController');
const cameraController = require('./observer/controllers/cameraController');
// const vmsEventController = require('./inundationControl/controllers/vmsEventController');
const guardianliteController = require('./inundationControl/controllers/guardianliteController');
const snapShotController = require('./inundationControl/controllers/snapShotController');
const eventTypeController = require('./inundationControl/controllers/eventTypeController');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // uploads 폴더에 저장
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB 제한
    }
});

const handleAiboxData = async (data, ip, res) => {
    try {
        const result = await aiboxWaterLevelControl.processAiboxWaterLevelData(data, ip);
        
        if (result.success) {
            res.status(200).json({ 
                success: true, 
                message: 'AIBOX 수위 데이터 처리 완료',
                processedData: result,
                receivedData: data 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: result.message,
                receivedData: data 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: '서버 내부 오류',
            error: error.message,
            receivedData: data 
        });
    }
};

// AI Box 수위계 데이터 수신 (파일 업로드)
router.post('/receiveDataPostB', upload.single('file'), async (req, res) => {
    await handleAiboxData(req.body, req.ip, res);
});

// AI Box 수위계 데이터 수신 (쿼리 파라미터)
router.get('/receiveDataPostB', async (req, res) => {
    await handleAiboxData(req.query, req.ip, res);
});

// 에이엘테크 안내판과 연동된 차단기 상태 조회값 회신
router.get('/signboardStatus', async (req, res) => {
    try {
        const signboardId = req.query.signboardId;
        if (!signboardId) {
            return res.status(400).json({ error: 'Missing required query parameter: signboardId' });
        }

        const billboardResult = await pool.query(`
            SELECT outside_idx, idx AS billboard_idx
            FROM fl_billboard 
            WHERE idx = $1
        `, [signboardId]);

        if (billboardResult.rowCount === 0) {
            return res.status(404).json({ error: 'Signboard not found' });
        }

        const outsideIdx = billboardResult.rows[0].outside_idx;

        const statusResult = await pool.query(`
            SELECT crossing_gate_status, idx as outside_idx
            FROM fl_outside
            WHERE idx = $1
        `, [outsideIdx]);

        if (statusResult.rowCount === 0) {
            return res.status(404).json({ error: 'Outside (차단기) 정보가 없습니다' });
        }

        const gateStatus = statusResult.rows[0].crossing_gate_status ? 'open' : 'close';

        res.json({
            signboardId: signboardId,
            status: gateStatus
        });

    } catch (error) {
        console.error('Error handling signboardStatus:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 개소(== 차단기)
router.post('/createArea', outsideController.createArea); // 개소(차단기) 생성
router.post('/getArea', outsideController.getArea); // 개소(차단기) 목록 가져오기(카메라, 전광판, 스피커, 수위계, 가디언라이트 포함)
router.delete('/deleteArea', outsideController.deleteArea); // 개소(차단기) 삭제 (카메라, 전광판, 스피커, 수위계, 가디언라이트 연결 삭제)
router.post('/getCompactOutSideList', outsideController.getCompactOutSideList); // 개소(차단기) 간략한 정보만 목록 가져오기
router.post('/getWaterLevelOutsideInfo', outsideController.getWaterLevelOutsideInfo); // 개소(차단기)에 연결된 수위계 가져오기
router.post('/getAllWaterLevelOutsideInfo', outsideController.getAllWaterLevelOutsideInfo); // 개소(차단기)에 연결된 수위계 가져오기
router.post('/getWaterLevelCameraInfo', outsideController.getWaterLevelCameraInfo); // 수위계에 연결된 카메라 정보 가져오기
router.post('/modifyArea', outsideController.modifyArea); 
router.post('/getAllAreaGroup', outsideController.getAllAreaGroup); 
router.post('/createAreaGroup', outsideController.createAreaGroup);
router.post('/updateAreaGroup', outsideController.updateAreaGroup);
router.post('/deleteAreaGroup', outsideController.deleteAreaGroup);

// 마커 이동
router.post('/updateAreaPosition', outsideController.updateAreaPosition);  // 개소

// ptz 제어
router.post('/ptzCameraControl', cameraController.ptzCameraControl);
// preset list
router.post('/getPresetList', cameraController.getPresetList);
// preset 이동
router.post('/setPresetPosition', cameraController.setPresetPosition);

// 현황, 모든 장비 연결 상태
router.post('/getLinkedStatusCount', outsideController.getLinkedStatusCount);

// 장치 목록 가져오기(대시보드)
router.post('/getOutsideDeviceList', outsideController.getOutsideDeviceList); // 개소(차단기) 기준
router.post('/getAllDeviceList', outsideController.getAllDeviceList); // 모든 장비

// 네트워크 장애 장치 목록 가져오기
router.post('/getUnLinkDeviceList', outsideController.getUnLinkDeviceList);

// 전광판 매크로
router.post('/addBillboardMacro', billboardController.addBillboardMacro);
router.post('/modifyBillboardMacro', billboardController.modifyBillboardMacro);
router.post('/getBillboardMacroList', billboardController.getBillboardMacroList);
router.delete('/deleteBillboardMacro', billboardController.deleteBillboardMacro);

// 전광판
router.post('/addBillboard', billboardController.addBillboard);
router.post('/getBillboardList', billboardController.getBillboardList);
router.delete('/deleteBillboard', billboardController.deleteBillboard);
// 전광판 제어
router.post('/updateMessageToBillboard', billboardController.updateMessageToBillboard);
router.post('/updateMessageToAllBillboards', billboardController.updateMessageToAllBillboards);
router.post('/updateMessageToGreenParkingBillboard', billboardController.updateMessageToGreenParkingBillboard);
router.post('/updateGroupBillboards', billboardController.updateGroupBillboards);


// 스피커 매크로
router.post('/addSpeakerMacro', speakerController.addSpeakerMacro);
router.post('/modifySpeakerMacro', speakerController.modifySpeakerMacro);
router.post('/getSpeakerMacroList', speakerController.getSpeakerMacroList);
router.delete('/deleteSpeakerMacro', speakerController.deleteSpeakerMacro);

// 스피커 (DB 자체관리)
router.post('/addSpeaker', speakerController.addSpeaker);
router.post('/getSpeakerList', speakerController.getSpeakerList);
router.delete('/deleteSpeaker', speakerController.deleteSpeaker);
// 스피커 (장치 제어 관련)
router.get('/clicksound', speakerController.clicksound); // 경고음 송출
router.get('/controlgate', speakerController.controlgate); // 안내메시지 송출
router.get('/tts', speakerController.generateTTS); // TTS 생성
router.post('/upload', speakerController.uploadAudio); // 스피커에 오디오 업로드
router.post('/getClipMetadata', speakerController.getClipMetadata); // 클립 ID 조회
router.use('/speakers', speakerController.controlSpeaker); // 스피커 직접 제어
router.post('/playtts', speakerController.playTTS); // TTS 생성 및 재생 
router.post('/broadcastAll', speakerController.broadcastAll); // 스피커 전체 제어
router.post('/broadcastGroup', speakerController.broadcastToGroup); 
router.post('/clicksoundGroup', speakerController.clickSoundToGroup); 
router.post('/setVolume', speakerController.setVolume);

// 수위계
router.post('/addWaterLevelDevice', waterLevelController.addWaterLevelDevice);
router.post('/addWaterLevelToMap', waterLevelController.addWaterLevelToMap); // 수위계 맵에 추가하기
router.delete('/removeWaterlevelToMap', waterLevelController.removeWaterlevelToMap); // 수위계 맵에서 삭제
router.post('/modifyWaterLevelDevice', waterLevelController.modifyWaterLevelDevice);
router.post('/getWaterLevelDeviceList', waterLevelController.getWaterLevelDeviceList);  // 수위계 설정. 수위계 목록 가져오기
router.post('/getTargetWaterlevelLog', waterLevelController.getTargetWaterlevelLog);  // 타겟 수위계 수위 조회
router.post('/getAllWaterlevelLog', waterLevelController.getAllWaterlevelLog);  // 전체 수위계 수위 조회
router.delete('/deleteWaterLevel', waterLevelController.deleteWaterLevel);
router.post('/modifyThresholdWaterLevel', waterLevelController.modifyThresholdWaterLevel); // 수위계 임계치 설정
router.post('/getOutsideWaterLevelList', waterLevelController.getOutsideWaterLevelList); // 수위계 기준, 개소(차단기) 연동 목록 가져오기
router.post('/addOutsideWaterLevel', waterLevelController.addOutsideWaterLevel); // 수위계 개소(차단기) 연동하기
router.post('/updateOutsideWaterLevel', waterLevelController.updateOutsideWaterLevel); // 수위계 개소(차단기) 수정

// 자동제어 관련 엔드포인트
router.post('/addWaterLevelAutoControl', waterLevelController.addWaterLevelAutoControl); // 수위계 자동제어 설정
router.get('/getWaterLevelAutoControl', waterLevelController.getWaterLevelAutoControl); // 수위계 자동제어 목록 조회
router.post('/changeUseStatus', waterLevelController.changeUseStatus); // 수위계 사용여부
router.delete('/deleteOutsideIdxWaterLevelIdx', waterLevelController.deleteOutsideIdxWaterLevelIdx); // 개소(차단기) 수위계 연동 삭제
router.post('/getWaterLevelSeverityList', waterLevelController.getWaterLevelSeverityList); // 수위계 (위험도) 상태 구분 갯수
// 마커이동
router.post('/updateWaterlevelPosition', waterLevelController.updateWaterlevelPosition);  // 수위계

// 로그조회
router.post('/getEventList', outsideController.getEventList);
// operation log
router.post('/getOperationLogList', outsideController.getOperationLogList);
// 개소 위치 리스트 조회
router.post('/getWaterLevelLocations', outsideController.getWaterLevelLocations);
// 수위계 위치 리스트 조회
router.post('/getOutsideLocations', outsideController.getOutsideLocations);

// 대시보드 장치리스트
router.post('/getDashboardDevices', outsideController.getDashboardDevices);

// 가디언라이트
router.post('/getGuardianliteInfo', guardianliteController.getGuardianliteInfo); // 가디언라이트 개별 정보
router.post('/getGuardianliteList', guardianliteController.getGuardianliteList); // 가디언라이트 리스트
router.post('/addGuardianlite', guardianliteController.addGuardianlite);
router.post('/modifyGuardianliteChannel', guardianliteController.modifyGuardianliteChannel); // 가디언라이트 전원 제어
router.post('/modifyGuardianliteChannelLabel', guardianliteController.modifyGuardianliteChannelLabel); // 가디언라이트 채널명 수정
router.post('/modifyOutsideGuardianlite', guardianliteController.modifyOutsideGuardianlite); // 개소(차단기) 가디언라이트 연동/해제
router.delete('/deleteGuardianlite', guardianliteController.deleteGuardianlite);

// 스냅샷, 사용안함
router.post('/getSnapshot', snapShotController.getSnapshot); // vms 스냅샷 정보 가져오기
router.post('/snapshotLocalPathSave', snapShotController.snapshotLocalPathSave); // 스냅샷 저장, 로컬 저장
router.post('/delSnapshot', snapShotController.delSnapshot);
router.post('/makeDownloadUrl', snapShotController.makeDownloadUrl); // 스냅샷 url 
router.post('/getSnapshotPath', snapShotController.getSnapshotPath); // 스냅샷 path 조회

// 설정(이벤트 설정)
router.post('/getEventTypeList', eventTypeController.getEventTypeList);
router.post('/modifyEventType', eventTypeController.modifyEventType);


module.exports = router;