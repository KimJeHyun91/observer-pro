const logger = require('../../logger');
const { syncGuardianlites } = require('./guardianlitePolling');
const { checkSpeaker, checkCamera, checkDevice } = require('./checkPingDevices');


let guardianliteTimerId;
let deviceTimerId;

let guardianlitesInterval = 1000 * 60 * 1;
let deviceInterval = 1000 * 60 * 60; // 장비 ping 체크


exports.startDevicePolling = () => {

  guardianliteTimerId = setInterval(() => {
    try {

      syncGuardianlites();

    } catch(error) {
      logger.info('worker/broadcast/broadcastPolling.js, startDevicePolling, guardianliteTimerId : ', error);
      console.error('worker/broadcast/broadcastPolling.js, startDevicePolling, guardianliteTimerId : ', error);
    }
  }, guardianlitesInterval);

  deviceTimerId = setInterval(() => {
    try {

      checkSpeaker();
      checkCamera();
      checkDevice();

    } catch(error) {
      logger.info('worker/broadcast/broadcastPolling.js, startDevicePolling, deviceTimerId : ', error);
      console.error('worker/broadcast/broadcastPolling.js, startDevicePolling, deviceTimerId : ', error);
    }
  }, deviceInterval);
}

exports.stopDevicePolling = () => {
  clearInterval(guardianliteTimerId);
  clearInterval(deviceTimerId);
}