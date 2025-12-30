const { buildingFloorAlarmStatus } = require('./buildingFloorPolling');
const { getSocket, subscribeSocket  } = require('./sensorEvent');

let timerId;
const pollingIntervalAcss = 1000 * 5;

// 주차 센서, 구독 신청 이후 통신 상태 확인을 위해 120초 간격으로 get 요청으로 확인
let sensorDeviceTimerId;
let statusCheck = 1000 * 120;

exports.startDbPolling = async () => {
  await subscribeSocket();
  await getSocket();

  timerId = setInterval(() => {

    buildingFloorAlarmStatus();

  }, pollingIntervalAcss);

  // 센서 연결 상태 확인 (120초)
  sensorDeviceTimerId = setInterval(() => {
    getSocket();
  }, statusCheck);
}

exports.stopDbPolling = () => {
  clearInterval(timerId);
  clearInterval(sensorDeviceTimerId);
}