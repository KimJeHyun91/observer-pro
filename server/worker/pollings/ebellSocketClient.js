const { io } = require('socket.io-client');
const { ebellDevice, ebellEvent } = require('./ebellPolling');
const { ebellConfig } = require('../../config');
const logger = require('../../logger');
const { getSetting } = require('../../routes/common/services/commonService');

exports.connectEbellServer = async () => {
  try {
    if(global.ebellWebsocket) {
      global.ebellWebsocket.close();
    };
    if(ebellConfig.DB_HOST && ebellConfig.Socket_PORT) {
      const socket = io(`http://${ebellConfig.DB_HOST}:${ebellConfig.Socket_PORT}`);
      socket.on('connect', () => { // (vSocket) => {
        console.log('ebellSocket Connected');
        ebellEvent();
        ebellDevice();
      });
    
      socket.on('disconnect', () => {
        console.log('ebellSocket Disconnected');
      });
    
      socket.on('ebell', () => { // (data) => {
        ebellEvent();
        ebellDevice();
      });
  
      global.ebellWebsocket = socket;
  
    } else {
      await setEBellConfig();
      this.connectEbellServer();
    }  

  } catch (error) {
    logger.info('worker/ebellSocketClient.js, connectEbellServer, error: ', error);
    console.log('worker/ebellSocketClient.js, connectEbellServer, error: ', error);
  };
};

async function setEBellConfig() {
  const result = await getSetting({ settingName: '비상벨 설정'});
  if(!result || !result[0] || !result[0].setting_value){
    return;
  };
  const settingValue = result[0].setting_value;
  const configValues = settingValue.split(',');
  if(configValues[0] === '' || configValues[1] === '' || configValues[2] === '' || configValues[3] === '' || configValues[4] === '' || configValues[5] === ''){
    return;
  }
  ebellConfig.DB_HOST = configValues[0];
  ebellConfig.DB_PORT = parseInt(configValues[1]);
  ebellConfig.DB_DBNAME = configValues[2];
  ebellConfig.DB_USER = configValues[3];
  ebellConfig.DB_PASSWORD = configValues[4];
  ebellConfig.Socket_PORT = configValues[5];
};