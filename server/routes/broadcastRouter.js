const express = require('express');
const fs = require("fs");
const path = require('path');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const { pool } = require('../db/postgresqlPool');
const { checkReserveBroadcast, checkRegularBroadcast } = require('../worker/broadcast/broadcastPolling');
const { fetchToken, updateTokenPeriodically, ensureValidToken } = require('../worker/broadcast/tokenService');


// const audioFilePath = path.join(__dirname, "../public", "files", "vb_audio");

// if (!fs.existsSync(audioFilePath)) {
//   fs.mkdirSync(audioFilePath, { recursive: true }); 
// }

const audioFilePath = path.join(process.cwd(), 'public', 'files', 'vb_audio');

if (!fs.existsSync(audioFilePath)) {
  fs.mkdirSync(audioFilePath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioFilePath); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});

  
const audioFileUpload = multer({ storage });


updateTokenPeriodically(); 


const syncCheckBroadcasts = () => {
  const now = new Date();
  const delay = (60 - now.getSeconds() + 1) * 1000; 
  setTimeout(() => {
    checkReserveBroadcast();
    checkRegularBroadcast();
    setInterval(() => {
      checkReserveBroadcast();
      checkRegularBroadcast();
    }, 60 * 1000); 
  }, delay);
};

syncCheckBroadcasts();


const outsideController = require('./villageBroadcast/controllers/outsideController');
const speakerController = require('./villageBroadcast/controllers/speakerController');
const eventTypeController = require('./villageBroadcast/controllers/eventTypeController');
const guardianliteController = require('./villageBroadcast/controllers/guardianliteController');
const groupController = require('./villageBroadcast/controllers/groupController');
const audioFileController = require('./villageBroadcast/controllers/audioFileController');
const reserveController = require('./villageBroadcast/controllers/reserveController');
const broadcastController = require('./villageBroadcast/controllers/broadcastController');
const dashboardController = require('./villageBroadcast/controllers/dashboardController');

// Azure AD B2C Token
 router.get('/getAccessToken', async (req, res) => {
 try {
    const now = Math.floor(Date.now() / 1000);
    if (!cachedToken || now >= tokenExpiresAt) {
      await fetchToken(); // 만료되었으면 새로 발급
    }
    res.json({ access_token: cachedToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

// // 메이즈텍 사이트 API
router.get('/getSites', ensureValidToken, async (req, res) => {
  await outsideController.getSites(req.accessToken, req, res); 
});
router.post('/addSite', ensureValidToken, async (req, res) => {
  await outsideController.addSite(req.accessToken, req, res); 
});


// 개소(outside)
router.post('/addOutside', outsideController.addOutside); // 개소 저장
router.post('/getOutsideInfo', outsideController.getOutsideInfo);
router.post('/getOutsideList', outsideController.getOutsideList);
router.delete('/deleteOutside', outsideController.deleteOutside);

// 네트워크 장애 장치, 목록 가져오기
router.post('/getUnLinkDeviceList', outsideController.getUnLinkDeviceList);

// 장치 목록 가져오기(대시보드)
router.post('/getOutsideDeviceList', outsideController.getOutsideDeviceList); // 개소 기준
router.post('/getAllDeviceList', outsideController.getAllDeviceList); // 모든 장비

// 스피커
router.post('/getSpeakerList', speakerController.getSpeakerList);
router.delete('/deleteSpeaker', speakerController.deleteSpeaker);

// 스피커 매크로
router.post('/addSpeakerMacro',  speakerController.addSpeakerMacro);
router.post('/modifySpeakerMacro', speakerController.modifySpeakerMacro);
router.post('/getSpeakerMacroList', speakerController.getSpeakerMacroList);
router.delete('/deleteSpeakerMacro', speakerController.deleteSpeakerMacro);

// 스피커 현황(상단 메뉴)
router.post('/getSpeakerStatusCount', speakerController.getSpeakerStatusCount);


// 가디언라이트
router.post('/modifyGuardianliteChannel', guardianliteController.modifyGuardianliteChannel);
router.post('/modifyGuardianliteChannelLabel', guardianliteController.modifyGuardianliteChannelLabel);

// 그룹
router.post('/addgroup', groupController.addgroup); // 그룹관리, 저장
router.delete('/deleteGroup', groupController.deleteGroup);
router.post('/getGroupOutsideInfo', groupController.getGroupOutsideInfo);
router.post('/getGroupOutsideList', groupController.getGroupOutsideList);

// 설정(이벤트 설정)
router.post('/getEventTypeList', eventTypeController.getEventTypeList);
router.post('/modifyEventType', eventTypeController.modifyEventType);

// 음원 파일
router.post('/addAudioFile', ensureValidToken, audioFileUpload.single('file'), async (req, res) => {
  await audioFileController.addAudioFile(req.accessToken, req, res); 
});
router.post('/modifyAudioFile', audioFileController.modifyAudioFile);
router.get('/getAudioFileList', audioFileController.getAudioFileList);
router.delete('/deleteAudioFile', audioFileController.deleteAudioFile);

// 예약/정기 방송
router.post('/addReserve', reserveController.addReserve);
router.get('/getReserveList', reserveController.getReserveList);
router.delete('/deleteReserve', reserveController.deleteReserve);
router.post('/modifyReserve', reserveController.modifyReserve);

// 방송
router.post('/addBroadcast',  ensureValidToken, audioFileUpload.single('file'), async (req, res) => {
  await broadcastController.addBroadcast(req.accessToken, req, res); 
});

// 로그 -> 방송 로그 리스트
router.post('/getBroadcastLogList', ensureValidToken, async (req, res) => {
  await broadcastController.getBroadcastLogList(req.accessToken, req, res); 
});
// 로그 -> 이벤트
router.post('/getEventLogList', broadcastController.getEventLogList);

// 대시보드
router.get('/getNetworkStatus', dashboardController.getNetworkStatus);
router.post('/getDeviceStatus', ensureValidToken, async (req, res) => {
  await dashboardController.getDeviceStatus(req.accessToken, req, res); 
});
router.post('/getBroadcastTransmissionStatus', ensureValidToken, async (req, res) => {
  await dashboardController.getBroadcastTransmissionStatus(req.accessToken, req, res); 
});

module.exports = router;