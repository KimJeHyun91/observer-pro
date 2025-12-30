const { mssqlPool, getOrCreatePool } = require('../../../db/mssqlPool');
const logger = require('../../../logger');
const doorMapper = require('../mappers/doorMapper');
const deviceMappper = require('../mappers/deviceMapper');
const { serverConfig, mssqlConfig } = require('../../../config');
const { pool } = require('../../../db/postgresqlPool');


// 출통 출입문 제어
// MSSQL의 Comm_Send_Packet 테이블에 insert 해주면 문열림/닫힘 처리됨
// 입력값은
// SenderIpAddress : Insert 하는 PC의 IP 정보
// DestIPAddress: 출입문 제어를 하려는 ACU의 IP 주소(ACU의 IP 정보는 System_Device 테이블 참고)
// SystemWorkID: 1로 고정
// DeviceID: 출입문 제어를 하려는 ACU의 DeviceID(ACU의 DeviceID 정보는 System_Device 테이블 참고)
// PacketCommand: OPC0로 고정
// PacketData1: 출입문 1번은 1, 2번은 3, 3번은 5, 4번은 7을 입력
// PacketData2: 문을 열기 1로, 닫기 0
// PacketData3: 5초 개방인 경우 50을 입력(10초면 100)
// PacketData4: 0 고정
// PacketData5는 0 고정
// PacketStatus는 SW로 고정(정상적으로 전송이 완료되면, 이 부분이 자동으로 SC로 변경됨)
exports.doorLockControl = async ({ acuId, acuIpaddress, doorId, command, cmdSec }) => {
  
  const pool = await getOrCreatePool(mssqlConfig);
  const transaction = pool.transaction(pool);

  try {

    let is_returnValue = true;

    const doorIdNew = doorId.substring(doorId.length - 1);
    let doorNum;
    if (doorIdNew === '1') {
      doorNum = '1';
    } else if (doorIdNew === '2') {
      doorNum = '3';
    } else if (doorIdNew === '3') {
      doorNum = '5';
    } else if (doorIdNew === '4') {
      doorNum = '7';
    } else {
      is_returnValue = false;
    }

    if(is_returnValue) { 
      let setSeconds = 50;
      if (cmdSec && parseInt(cmdSec) > 5) {
        setSeconds = parseInt(cmdSec) * 10;
      }
      if ((command === '1' || command === 1) && cmdSec === undefined) {
        setSeconds = 65535;
      }
      if (command === 0 || command === '0') {
        setSeconds = 0;
      }

      let querySendPacket = await doorMapper.doorSendPacket();
      let queryControl = await doorMapper.doorControl();

      await transaction.begin();
      await pool.request()
      .input('SenderIPAddress', serverConfig.WEBSOCKET_URL)
      .input('DestIPAddress', acuIpaddress)
      .input('SystemWorkID', '1')
      .input('DeviceID', acuId)
      .input('PacketCommand', 'OPC0')
      .input('PacketData1', doorNum)
      .input('PacketData2', command)
      .input('PacketData3', setSeconds)
      .input('PacketData4', '0')
      .input('PacketData5', '0')
      .input('PacketStatus', 'SW')
      .query(querySendPacket);
      await pool.request()
      .input('SenderIPAddress', serverConfig.WEBSOCKET_URL)
      .input('DestIPAddress', acuIpaddress)
      .input('CommCommand', 'RSTART')
      .input('SystemWorkID', '1')
      .input('DeviceID', acuId)
      .query(queryControl);
      await transaction.commit();
    }
    
    return is_returnValue;

  } catch (error) {
    logger.info('observer/doorService.js, doorControl, error: ', error);
    console.log('observer/doorService.js, doorControl, error: ', error);
    await transaction.rollback();
  }
}

exports.getDoors = async ({ inside_idx, dimension_type }) => { 
  
  const client = await pool.connect();
  try {
  
    let binds;
    binds = inside_idx ? [inside_idx]:[];
    let query = await doorMapper.getDoors(inside_idx, dimension_type);
    const res = await client.query(query, binds);
    
    if(!res || !res.rows){
      return {
        success: false
      }
    }
    return {
      success: true,
      result: res.rows
    }
  } catch(error) {
    logger.info('observer/doorService.js, doorControl, error: ', error);
    console.log('observer/doorService.js, doorControl, error: ', error);
    throw new Error(error.message || 'observer/doorService.js getDoors server error');
  } finally {
    await client.release();
  }

}

exports.updateDoor = async ({ idx, inside_idx, outside_idx, dimension_type, top_location, left_location, camera_id }) => {
  const client = await pool.connect();
  try {
    let binds;
    let query;
    if(camera_id !== undefined) {
      // 카메라 설정
      binds = [idx, camera_id];
      query = await doorMapper.updateDoorCamera();
    } else {
      // 위치 수정
      binds = [idx, inside_idx, outside_idx, top_location, left_location, dimension_type]
      query = await doorMapper.updateDoorLocation();
    }
    const res = await client.query(query, binds);
    
    if(!res || res.rowCount !== 1){
      return {
        success: false
      }
    }
    if(res.rowCount === 1){
      global.websocket.emit('ob_doors-update', { doorList: {'update':res.rowCount} });
      return {
        success: true
      }
    }
  } catch(error){
    logger.info('observer/doorService.js, updateDoor, error: ', error);
    console.log('observer/doorService.js, updateDoor, error: ', error);
    throw new Error(error.message || 'observer/doorService.js updateDoor server error');
  } finally {
    await client.release();
  }
}

exports.getAcus = async () => { 
  
  const client = await pool.connect();
  try {
  
    const query = await doorMapper.getAcus();
    const res = await client.query(query);
    
    if(!res || !res.rows){
      return {
        success: false
      }
    }
    return {
      success: true,
      result: res.rows
    }
  } catch(error) {
    logger.info('observer/doorService.js, doorControl, error: ', error);
    console.log('observer/doorService.js, doorControl, error: ', error);
    throw new Error(error.message || 'observer/doorService.js getAcus server error')
  } finally {
    await client.release();
  };
};

exports.removeDoorLocation = async ({ outsideIdx, insideIdx }) => {
  const client = await pool.connect();

  try {

    let binds = [];
    let query;
    if(outsideIdx != null){
      binds = [outsideIdx, 'door'];
      query = await deviceMappper.removeDeviceLocationInBuilding();
    } else if(insideIdx != null) {
      binds = [insideIdx, 'door']
      query = await deviceMappper.removeDeviceLocationInFloor();
    }
    const res = await client.query(query, binds);

    return {
      success: res.rowCount === 1
    };

  } catch (error) {
    logger.info('observer/doorService.js, removeDoorLocation, error: ', error);
    console.log('observer/doorService.js, removeDoorLocation, error: ', error);
  } finally {
    await client.release();
  };
};