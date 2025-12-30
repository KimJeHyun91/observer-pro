const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const outsideMapper = require('../mappers/outsideMapper');
const billboardMapper = require('../mappers/billboardMapper');
const waterGaugeMapper = require('../mappers/waterGaugeMapper');
const guardianliteMapper = require("../mappers/guardianliteMapper");
const cameraMapper = require('../../observer/mappers/cameraMapper');
const warningBoardService = require('../../common/services/warningBoardService');
const mainServiceName = 'tunnel';
const { barrierStatusCache } = require('../../../worker/tunnel/barrierControl');

exports.addOutside = async ({
  outsideName,
  outsideLocation = '',
  barrierIp,
  leftLocation,
  topLocation,
  direction,
  billboardLCSIds = [],
  billboardVMSIds = [],
  guardianLightIp
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 터널 추가
    const res = await client.query(
      outsideMapper.addOutside(),
      [outsideName, outsideLocation, barrierIp, false, leftLocation, topLocation, direction]
    );
    const tunnelIdx = res.rows[0]?.idx;
    if (!tunnelIdx) throw new Error('터널 추가 실패');

    // 2. 터널과 전광판 매핑 (LCS + VMS)
    const billboardMappingQuery = billboardMapper.addBillboardMapping();
    const allBillboardIds = [...billboardVMSIds, ...billboardLCSIds];

    for (const billboardId of allBillboardIds) {
      await client.query(billboardMappingQuery, [tunnelIdx, billboardId]);
    }

    // 3. 가디언 라이트 등록
    if (guardianLightIp != '') {
      const guardianliteQuery = guardianliteMapper.addGuardianlite();
      await client.query(guardianliteQuery, [tunnelIdx, guardianLightIp]);
    }

    // 4. WebSocket 알림
    if (res.rowCount > 0 && global.websocket) {
      global.websocket.emit('tm_areaList-update', { areaList: { add: res.rowCount } });
    }

    await client.query('COMMIT');
    return res.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.info('tunnel/outsideService.js, addOutside, error: ', error);
    console.error('tunnel/outsideService.js, addOutside, error: ', error);
    throw error;
  } finally {
    client.release();
  }
};

exports.getOutsideList = async () => {
  const client = await pool.connect();
  try {
    const query = outsideMapper.getOutsideList();
    const res = await client.query(query);

    const withStatus = res.rows.map(row => {
      const cache = barrierStatusCache.get(row.barrier_ip);

      return {
        ...row,
        barrier_status_text: cache?.statusText || '미확인',
        barrier_status_time: cache?.timestamp || null
      };
    });

    return {
      status: true,
      data: withStatus
    };
  } catch (error) {
    logger.info('tunnel/outsideService.js, getOutsideList, error: ', error);
    console.log('tunnel/outsideService.js, getOutsideList, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};

exports.updateOutside = async ({
  idx,
  outsideName,
  location,
  direction,
  barrierIp,
  billboardLCSIds = [],
  billboardVMSIds = [],
  guardianLightIp
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 터널 정보 업데이트
    const binds = [idx, outsideName, location, barrierIp, direction];
    const updateQuery = await outsideMapper.updateOutside();
    const res = await client.query(updateQuery, binds);

    // 2. 기존 전광판 매핑 삭제
    const deleteMappingQuery = billboardMapper.deleteBillboardMapping();
    await client.query(deleteMappingQuery, [idx]);

    // 3. 새로운 전광판 매핑 추가 (LCS + VMS)
    const addMappingQuery = billboardMapper.addBillboardMapping();
    const allBillboardIds = [...billboardLCSIds, ...billboardVMSIds];

    for (const billboardId of allBillboardIds) {
      if (billboardId) {
        await client.query(addMappingQuery, [idx, billboardId]);
      }
    }

    // 4. 터널과 매핑된 제어반 수위계 IP 수정
    const updateWaterLevelIpQuery = waterGaugeMapper.modifyWaterLevelControlInIp();
    await client.query(updateWaterLevelIpQuery, [barrierIp, idx, location]);

    // 5. 가디언라이트 ip 삭제 후 등록
    const deleteGaugeQueryuardianliteQuery = guardianliteMapper.deleteGuardianlite();
    await client.query(deleteGaugeQueryuardianliteQuery, [idx]);

    if (guardianLightIp != '') {
      const guardianliteQuery = guardianliteMapper.addGuardianlite();
      await client.query(guardianliteQuery, [idx, guardianLightIp]);
    }


    await client.query('COMMIT');

    // 6. WebSocket 알림
    if (res && res.rowCount > 0 && global.websocket) {
      global.websocket.emit('tm_areaList-update', { areaList: { update: res.rows[0] } });
    }

    return res.rows[0];
  } catch (error) {
    logger.info('tunnel/outsideService.js, updateOutside, error: ', error);
    console.error('tunnel/outsideService.js, updateOutside, error: ', error);
    await client.query('ROLLBACK');
    return null;
  } finally {
    client.release();
  }
};

exports.deleteOutside = async ({ idx }) => {

  const client = await pool.connect();

  try {

    const outsideIdx = idx;


    // 수위계 삭제
    const deleteGaugeQuery = `DELETE FROM tm_water_level
                                WHERE idx IN (
                                  SELECT water_level_idx
                                  FROM tm_mapping_tunnel_water_level
                                  WHERE outside_idx = $1
                                )
                                AND communication_type = 'control_in';`;
    await client.query(deleteGaugeQuery, [outsideIdx]);


    // 차단막 삭제
    let binds = [outsideIdx];
    let query = await outsideMapper.deleteOutside();

    await client.query('BEGIN');
    const res = await client.query(query, binds);

    // 삭제 성공하면
    if (res && res.rowCount > 0) {

      // 카메라 초기화
      binds = [outsideIdx, mainServiceName, null, null, null, null, null, null];
      let queryResetCamera = await cameraMapper.deleteOutsideCameraLocation();
      await client.query(queryResetCamera, binds);
    }

    await client.query('COMMIT');

    // binds = [outsideIdx];
    // let queryLatestEventOutsideInfo = await eventMapper.getLatestEventOutsideInfo();
    // let resLatestEventOutsideInfo = await client.query(queryLatestEventOutsideInfo, binds);

    // if(resLatestEventOutsideInfo && resLatestEventOutsideInfo.rows.length > 0) {
    //   // 워닝보드 삭제
    //   await warningBoardService.deleteWarningBoard({ 
    //     mainService : 'tunnel'
    //     , eventIdx: resLatestEventOutsideInfo.rows[0].event_idx 
    //   });
    // }

    if ((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("tm_areaList-update", { areaList: { 'remove': res.rowCount } });
      global.websocket.emit("tm_cameras-update", { cameraList: { 'update': res.rowCount } });
      global.websocket.emit("tm_waterLevel-update", { areaList: { 'remove': res.rowCount } });
      global.websocket.emit("tm_guardianlites-update", { guardianlites: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('tunnel/outsideService.js, deleteOutSide, error: ', error);
    console.log('tunnel/outsideService.js, deleteOutSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getUnLinkBarrierList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await outsideMapper.getUnLinkBarrierList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('tunnel/outsideService.js, getUnLinkBarrierList, error: ', error);
    console.log('tunnel/outsideService.js, getUnLinkBarrierList, error: ', error);
  } finally {
    await client.release();
  }
}

// 대시보드 장비 정보 가져오기
exports.getDashboardDeviceList = async () => {
  const client = await pool.connect();

  try {
    const query = await outsideMapper.getDeviceList();
    const res = await client.query(query);

    return {
      status: true,
      data: res.rows
    };
  } catch (error) {
    logger.info('tunnel/outsideService.js, getDashboardDeviceList, error: ', error);
    console.log('tunnel/outsideService.js, getDashboardDeviceList, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};

// 차단막 자동화 유무값 전달
exports.getOutsideAutomatic = async () => {
  const client = await pool.connect();
  try {
    const query = await outsideMapper.getOutsideAutomatic();
    const res = await client.query(query);
    let data;
    if (res.rowCount > 0) {
      data = res.rows[0].automatic;
    } else {
      data = false
    }
    return {
      status: true,
      data: data
    };
  } catch (error) {
    logger.info('tunnel/outsideService.js, getOutsideAutomatic, error: ', error);
    console.log('tunnel/outsideService.js, getOutsideAutomatic, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};


// 차단막 자동화 유무값 수정
exports.updateOutsideAutomatic = async ({ automatic }) => {
  const client = await pool.connect();
  try {
    const query = await outsideMapper.updateOutsideAutomatic();
    const res = await client.query(query, [automatic]);
    let result
    if (res.rowCount == 0) {
      result = false;
    } else {
      result = true
    }

    await client.query('COMMIT');
    return {
      status: result,
    };
  } catch (error) {
    logger.info('tunnel/outsideService.js, updateOutsideAutomatic, error: ', error);
    console.log('tunnel/outsideService.js, updateOutsideAutomatic, error: ', error);
    await client.query('ROLLBACK');
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};