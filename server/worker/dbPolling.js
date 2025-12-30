const { format } = require('date-fns');
const { pollingIstDataPerson, pollingIstSystemDevice, pollingIstSystemDeviceDoor, pollingIstLogDeviceNormal, pollingIstSystemDeviceDoorStatus } = require('./pollings/accessControlPolling');
const { buildingFloorAlarmStatus } = require('./pollings/observerPolling');
const { mssqlConfig } = require('../config');
const { getSetting } = require('../routes/common/services/commonService');

let timerId;
const pollingIntervalAcss = 1000 * 1 * 3;

exports.startDbPolling = async () => {
  if(!mssqlConfig.DB_HOST || !mssqlConfig.DB_PORT || !mssqlConfig.DB_DBNAME || !mssqlConfig.DB_USER || !mssqlConfig.DB_PASSWORD) {
    const result = await setMssqlConfig();
    if(!result) return;
  }
  if(timerId) clearInterval(timerId);
  pollingIstDataPerson();

  timerId = setInterval(async () => {
    const date = new Date();
    console.log('========================================================');
    console.log(`[${format(date, 'yyyy-MM-dd HH:mm:ss')}] 출통 서비스DB Polling`);
    
    //출입통제 로그데이터 폴링
    pollingIstSystemDevice();
    pollingIstSystemDeviceDoor();
    pollingIstLogDeviceNormal();
    pollingIstSystemDeviceDoorStatus();

    // 이벤트 폴링 후 각 카메라/장비의 이벤트 발생상태 업데이트 및 각 건물/층의 이벤트 발생상태 업데이트
    buildingFloorAlarmStatus();

  }, pollingIntervalAcss);
};

exports.stopDbPolling = () => {
  clearInterval(timerId);
};

async function setMssqlConfig() {
  const result = await getSetting({ settingName: '출입통제 설정'});
  if(!result || !result[0] || !result[0].setting_value){
    return false;
  };
  const settingValue = result[0].setting_value;
  const configValues = settingValue.split(',');
  if(configValues[0] === '' || configValues[1] === '' || configValues[2] === '' || configValues[3] === '' || configValues[4] === ''){
    return false;
  }
  mssqlConfig.DB_HOST = configValues[0];
  mssqlConfig.DB_PORT = parseInt(configValues[1]);
  mssqlConfig.DB_DBNAME = configValues[2];
  mssqlConfig.DB_USER = configValues[3];
  mssqlConfig.DB_PASSWORD = configValues[4];
  return true;
};
