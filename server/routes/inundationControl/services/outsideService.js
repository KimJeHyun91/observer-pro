const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const outsideMapper = require('../mappers/outsideMapper');
const speakerMapper = require('../mappers/speakerMapper');
const billboardMapper = require('../mappers/billboardMapper');
const signboardMapper = require('../mappers/signboardMapper');
const waterLevelMapper = require('../mappers/waterLevelMapper');
const guardianliteMapper = require('../mappers/guardianliteMapper');
const cameraMapper = require('../../observer/mappers/cameraMapper');
const severityMapper = require('../mappers/severityMapper');
const mainServiceName = 'inundation';
const { addOperLog } = require('../../../utils/addOperLog');
const { collectGuardianliteInfo } = require('../../../worker/inundation/guardianlitePolling')

exports.addOutside = async (
  {
    areaName, areaLocation, leftLocation, topLocation, serviceType,
    areaCrossingGate, areaCamera,
    areaSpeaker, areaBillboard, areaGuardianlite, areaWaterlevelGauge, id, controllerModel, areaBillboardPort, areaSpeakerPort, camera_ip,
    areaSpeakerId, areaSpeakerPassword, billboardControllerModel, speakerType,
    areaSignboard, areaSignboardPort, signboardControllerModel
  }
) => {

  const client = await pool.connect();
  const [serviceTypeName, vmsName, areaCameraIdx] = areaCamera.split(':');
  try {

    let returnValue = {
      status: false,
      message: 'success'
    };

    let resCamera = { rows: [] };
    let resSpeaker = { rows: [] };
    let resBillboard = { rows: [] };
    let resSignboard = { rows: [] };
    let resWaterLevel = { rows: [] };
    let resGuardianlite = { rows: [] };

    await client.query('BEGIN');

    // 차단기 ip 검색
    let binds = [areaCrossingGate];
    let queryCrossingGateIpInfo = await outsideMapper.getCrossingGateIpInfo();
    const resCrossingGateIpInfo = await client.query(queryCrossingGateIpInfo, binds);

    // 전광판 ip 검색
    binds = [areaBillboard];
    let queryBillboardIpInfo = await billboardMapper.getBillboardIpInfo();
    const resBillboardIpInfo = await client.query(queryBillboardIpInfo, binds);

    // 스피커 ip 검색
    binds = [areaSpeaker];
    let querySpeakerIpInfo = await speakerMapper.getSpeakerIpInfo();
    const resSpeakerIpInfo = await client.query(querySpeakerIpInfo, binds);

    // 가디언 라이트 ip 검색
    binds = [areaGuardianlite];
    let queryGuardianliteInfo = await guardianliteMapper.getGuardianliteInfo();
    const resGuardianliteInfo = await client.query(queryGuardianliteInfo, binds);

    // crossing_gate_ip(차단기 ip) 있으면 중복 등록 불가
    if (resCrossingGateIpInfo && resCrossingGateIpInfo.rows.length > 0) {

      returnValue.message = '차단기 ip 가 이미 등록되어 있습니다.';

    } else if (resBillboardIpInfo && resBillboardIpInfo.rows.length > 0) {

      returnValue.message = '전광판 ip 가 이미 등록되어 있습니다.';

    } else if (resSpeakerIpInfo && resSpeakerIpInfo.rows.length > 0) {

      returnValue.message = '스피커 ip 가 이미 등록되어 있습니다.';

    } else if (resGuardianliteInfo && resGuardianliteInfo.rows.length > 0) {

      returnValue.message = '가디언라이트 ip 가 이미 등록되어 있습니다.';

    } else {
      // 정상등록 가능
      returnValue.status = true;

      binds = [areaName, areaLocation, areaCrossingGate, leftLocation, topLocation, serviceType, controllerModel];

      let queryOutside = await outsideMapper.addOutside();
      const resOutside = await client.query(queryOutside, binds);

      let outsideIdx = 0;

      if (resOutside && resOutside.rows.length > 0) {
        outsideIdx = resOutside.rows[0].idx;
      }

      if (outsideIdx > 0) {

        // 스피커 저장
        if (areaSpeaker) {
          const speakerStatus = 'ON';
          binds = [outsideIdx, areaSpeaker, null, speakerStatus, areaSpeakerPort, areaSpeakerId, areaSpeakerPassword, speakerType];
          let querySpeaker = await speakerMapper.addSpeaker();
          resSpeaker = await client.query(querySpeaker, binds);
        }

        // 전광판 저장
        if (areaBillboard) {
          const billboardStatus = 'ON';
          binds = [outsideIdx, areaBillboard, null, billboardStatus, areaBillboardPort, billboardControllerModel];
          let queryBillboard = await billboardMapper.addBillboard();
          resBillboard = await client.query(queryBillboard, binds);
        }

        // 안내판 저장 (에이엘테크 군위 향)
        if (areaSignboard) {
          const signboardStatus = 'ON';
          binds = [outsideIdx, areaSignboard, null, signboardStatus, areaSignboardPort, signboardControllerModel];
          let querySignboard = await signboardMapper.addSignboard();
          resSignboard = await client.query(querySignboard, binds);
        }

        // 수위계 outside(개소) 저장
        if (areaWaterlevelGauge) {

          binds = [areaWaterlevelGauge];
          let queryWaterLevelDeviceInfo = await waterLevelMapper.getWaterLevelDeviceInfo();
          let resWaterLevelDeviceInfo = await client.query(queryWaterLevelDeviceInfo, binds);

          if (resWaterLevelDeviceInfo && resWaterLevelDeviceInfo.rows.length > 0) {
            binds = [outsideIdx, areaWaterlevelGauge];
            let queryOutsideWaterLevel = await waterLevelMapper.addOutsideWaterLevel();
            resWaterLevel = await client.query(queryOutsideWaterLevel, binds);
          }
        } else {
          areaWaterlevelGauge = null;
        }

        // 카메라 수정
        if (areaCameraIdx) {
          binds = [areaCameraIdx, null, outsideIdx, null, areaWaterlevelGauge, null, null, vmsName, mainServiceName, true];
          let queryCamera = await cameraMapper.updateOutsideCamera();
          resCamera = await client.query(queryCamera, [camera_ip, outsideIdx]);
        }

        // 가디언라이트 저장
        if (areaGuardianlite) {
          binds = [outsideIdx, areaGuardianlite];
          let queryGuardianlite = await guardianliteMapper.addGuardianlite();
          resGuardianlite = await client.query(queryGuardianlite, binds);

          await client.query('COMMIT');

          if (resGuardianlite && resGuardianlite.rows.length > 0) {
            const { guardianlite_ip, user_id, user_pw } = resGuardianlite.rows[0];
            const syncResult = await collectGuardianliteInfo(guardianlite_ip, user_id, user_pw);
            if (!syncResult) {
              console.log(`가디언라이트(${guardianlite_ip}) 초기 동기화 실패`);
            }
          }
        } else {
          await client.query('COMMIT');
        }
      }

      if (global.websocket) {
        global.websocket.emit("fl_areaList-update", { areaList: { 'add': resOutside.rows.length } });
        global.websocket.emit('fl_camera-update', { camera: resCamera.rowCount });
        global.websocket.emit('fl_speaker-update', { speaker: resSpeaker.rows.length });
        global.websocket.emit('fl_billboard-update', { billboard: resBillboard.rows.length });
        global.websocket.emit('fl_signboard-update', { signboard: resSignboard.rows.length });
        global.websocket.emit('fl_waterLevel-update', { waterLevel: resWaterLevel.rowCount });
        global.websocket.emit("fl_guardianlites-update", { guardianlites: resGuardianlite.rows.length });
      }
    }

    await client.query('COMMIT');

    addOperLog({
      logAction: 'addoper',
      operatorId: id,
      logType: '개소 추가',
      logDescription: `개소(${areaName}) 추가에 성공 했습니다.`,
      reqIp: ''
    });

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, addOutside, error: ', error);
    console.log('inundationControl/outsideService.js, addOutside, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.getOutSideInfo = async ({ idx }) => {

  const client = await pool.connect();

  try {

    const outsideIdx = idx;

    let binds = [outsideIdx];

    let query = await outsideMapper.getOutSideInfo();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, getOutSideInfo, error: ', error);
    console.log('inundationControl/outsideService.js, getOutSideInfo, error: ', error);
  } finally {
    await client.release();
  }
};

exports.getOutSideList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await outsideMapper.getOutSideList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, getOutSideList, error: ', error);
    console.log('inundationControl/outsideService.js, getOutSideList, error: ', error);
  } finally {
    await client.release();
  }
};

exports.modifyArea = async ({
  outside_idx,
  outside_name,
  outside_location,
  camera_ip,
  crossing_gate_ip,
  speaker_ip,
  speaker_port,
  billboard_ip,
  billboard_port,
  guardianlite_ip,
  water_level_idx,
  service_type,
  id,
  controller_model,
  speaker_id,
  speaker_password,
  speaker_type,
  billboard_controller_model,
  signboard_ip, signboard_port, signboard_controller_model
}) => {
  const client = await pool.connect();

  try {
    if (!outside_idx || !outside_name || !crossing_gate_ip) {
      throw new Error('Required fields are missing');
    }

    await client.query('BEGIN');

    let binds = [
      outside_name,
      outside_location,
      crossing_gate_ip,
      service_type,
      outside_idx,
      controller_model
    ];
    const queryUpdateOutside = await outsideMapper.updateOutside();
    const resOutside = await client.query(queryUpdateOutside, binds);

    const queryDeletePrevCamera = await cameraMapper.deleteOutsidePrevCamera();
    await client.query(queryDeletePrevCamera, [outside_idx]);

    if (camera_ip && camera_ip.trim() !== '') {
      if (camera_ip.includes(':')) {
        const parts = camera_ip.split(':');
        if (parts.length >= 3) {
          const [camera_id_value, vms_name_value, main_service_name_value] = parts;
          const queryUpdateCameraById = await cameraMapper.updateOutsideCameraById();
          const result = await client.query(queryUpdateCameraById, [
            camera_id_value,
            vms_name_value || '',
            main_service_name_value,
            outside_idx
          ]);

        }
      } else {
        const isUUID = camera_ip.length >= 32 && camera_ip.includes('-');
        if (isUUID) {
          const queryFindCamera = `
            SELECT camera_id, vms_name, main_service_name, service_type
            FROM ob_camera 
            WHERE camera_id = $1 
              AND main_service_name = 'inundation'
          `;
          const resCamera = await client.query(queryFindCamera, [camera_ip]);

          if (resCamera.rows.length > 0) {
            const cameraData = resCamera.rows[0];
            const queryUpdateCameraById = await cameraMapper.updateOutsideCameraById();
            const result = await client.query(queryUpdateCameraById, [
              cameraData.camera_id,
              cameraData.vms_name || '',
              cameraData.main_service_name,
              outside_idx
            ]);
          } else {
            console.log('카메라를 찾을 수 없음:', camera_ip);
            logger.warn(`UUID를 찾을 수 없음: ${camera_ip}`);
          }
        } else {
          const queryUpdateCamera = await cameraMapper.updateOutsideCamera();
          await client.query(queryUpdateCamera, [camera_ip, outside_idx]);
        }
      }
    } else {
      console.log('camera_ip가 없음');
    }

    if (speaker_ip) {
      const checkSpeakerQuery = `
        SELECT * FROM fl_speaker WHERE outside_idx = $1
      `;
      const speakerResult = await client.query(checkSpeakerQuery, [outside_idx]);

      if (speakerResult.rows.length === 0) {
        const insertSpeakerQuery = await speakerMapper.addSpeaker();
        await client.query(insertSpeakerQuery, [outside_idx, speaker_ip, null, 'ON', speaker_port, speaker_id, speaker_password, speaker_type]);
      } else {
        const updateSpeakerQuery = await speakerMapper.updateOutsideSpeaker();
        await client.query(updateSpeakerQuery, [speaker_ip, outside_idx, speaker_port, speaker_id, speaker_password, speaker_type]);
      }
    }

    if (billboard_ip) {
      const checkBillboardQuery = `
        SELECT * FROM fl_billboard WHERE outside_idx = $1
      `;
      const billboardResult = await client.query(checkBillboardQuery, [outside_idx]);

      if (billboardResult.rows.length === 0) {
        const insertBillboardQuery = await billboardMapper.addBillboard();
        await client.query(insertBillboardQuery, [outside_idx, billboard_ip, null, 'ON', billboard_port, billboard_controller_model]);
      } else {
        const updateBillboardQuery = await billboardMapper.updateOutsideBillboard();
        await client.query(updateBillboardQuery, [billboard_ip, outside_idx, billboard_port, billboard_controller_model]);
      }
    }

    if (signboard_ip) {
      binds = [outside_idx];
      let queryCheckSignboard = await signboardMapper.getSignboardByOutsideIdx();
      const resCheckSignboard = await client.query(queryCheckSignboard, binds);

      if (resCheckSignboard.rows.length > 0) {
        // 업데이트
        binds = [outside_idx, signboard_ip, null, 'ON', signboard_port, signboard_controller_model];
        let queryUpdateSignboard = await signboardMapper.updateSignboard();
        await client.query(queryUpdateSignboard, binds);

        logger.info(`[안내판 수정] outside_idx: ${outside_idx}, IP: ${signboard_ip}`);
      } else {
        // 추가
        binds = [outside_idx, signboard_ip, null, 'ON', signboard_port, signboard_controller_model];
        let queryAddSignboard = await signboardMapper.addSignboard();
        await client.query(queryAddSignboard, binds);

        logger.info(`[안내판 추가] outside_idx: ${outside_idx}, IP: ${signboard_ip}`);
      }
    } else {
      // 안내판 삭제
      binds = [outside_idx];
      let queryDeleteSignboard = await signboardMapper.deleteSignboardByOutsideIdx();
      const resDeleteSignboard = await client.query(queryDeleteSignboard, binds);

      if (resDeleteSignboard.rowCount > 0) {
        logger.info(`[안내판 삭제] outside_idx: ${outside_idx}`);
      }
    }

    if (guardianlite_ip) {
      const checkGuardianliteQuery = `
    SELECT * FROM fl_guardianlite WHERE outside_idx = $1
  `;
      const guardianliteResult = await client.query(checkGuardianliteQuery, [outside_idx]);

      if (guardianliteResult.rows.length === 0) {
        const insertGuardianliteQuery = await guardianliteMapper.addGuardianlite();
        const resGuardianlite = await client.query(insertGuardianliteQuery, [outside_idx, guardianlite_ip]);

        await client.query('COMMIT');

        if (resGuardianlite && resGuardianlite.rows.length > 0) {
          const { guardianlite_ip, user_id, user_pw } = resGuardianlite.rows[0];

          try {
            const syncResult = await collectGuardianliteInfo(guardianlite_ip, user_id, user_pw);

            if (syncResult) {
              const verifyQuery = `
            SELECT ch1, ch2, ch3, ch4, ch5, temper 
            FROM fl_guardianlite 
            WHERE guardianlite_ip = $1
          `;
              const verifyResult = await client.query(verifyQuery, [guardianlite_ip]);

              if (verifyResult.rows.length > 0) {
                const saved = verifyResult.rows[0];
                console.log(`1CH: RESET버튼, 2CH: ${saved.ch2}, 3CH: ${saved.ch3}, 4CH: ${saved.ch4}, 5CH: ${saved.ch5} / 온도: ${saved.temper}°C`);
              }
            } else {
              console.log(`가디언라이트(${guardianlite_ip}) 초기 동기화 실패`);
            }
          } catch (err) {
            console.error(`가디언라이트(${guardianlite_ip}) 동기화 오류:`, err.message);
          }
        }

      } else {
        const updateGuardianliteQuery = await guardianliteMapper.updateOutsideGuardianlite();
        await client.query(updateGuardianliteQuery, [guardianlite_ip, outside_idx]);
      }
    }

    if (water_level_idx) {
      const currentWaterLevelQuery = `
        SELECT water_level_idx 
        FROM fl_outside_water_level 
        WHERE outside_idx = $1
      `;
      const currentWaterLevel = await client.query(currentWaterLevelQuery, [outside_idx]);

      if (currentWaterLevel.rows.length > 0) {
        const deleteQuery = `
          DELETE FROM fl_outside_water_level 
          WHERE outside_idx = $1
        `;
        await client.query(deleteQuery, [outside_idx]);
      }

      const insertQuery = `
        INSERT INTO fl_outside_water_level 
        (outside_idx, water_level_idx)
        VALUES ($1, $2)
      `;
      await client.query(insertQuery, [outside_idx, water_level_idx]);
    }

    await client.query('COMMIT');

    if (resOutside.rowCount > 0 && global.websocket) {
      global.websocket.emit("fl_areaList-update", { areaList: { 'update': resOutside.rowCount } });

      if (speaker_ip) {
        global.websocket.emit('fl_speakers-update', { speaker: 1 });
      }
      if (billboard_ip) {
        global.websocket.emit('fl_billboards-update', { billboard: 1 });
      }
      if (signboard_ip) {
        global.websocket.emit('fl_signboards-update', { signboard: 1 });
      }
      if (guardianlite_ip) {
        global.websocket.emit("fl_guardianlites-update", { guardianlites: 1 });
      }
      if (water_level_idx) {
        global.websocket.emit("fl_waterlevels-update", { waterlevels: 1 });
      }
    }

    addOperLog({
      logAction: 'addoper',
      operatorId: id,
      logType: '개소 수정',
      logDescription: `개소(${outside_name}) 수정에 성공 했습니다.`,
      reqIp: ''
    });

    return resOutside.rowCount;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, modifyArea, error: ', error);
    console.log('inundationControl/outsideService.js, modifyArea, error: ', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
};

exports.getAllAreaGroup = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const query = await outsideMapper.getAllAreaGroup();
    const result = await client.query(query);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('inundationControl/outsideService.js, getAllAreaGroup, error:', error);
    throw error;
  } finally {
    await client.release();
  }
};

exports.updateAreaGroup = async ({ id, name, areas }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');


    const updateGroupQuery = `
      UPDATE fl_area_group 
      SET name = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING id, name, created_at, updated_at
    `;
    const groupResult = await client.query(updateGroupQuery, [name, id]);
    if (groupResult.rows.length === 0) {
      throw new Error(`Group with id ${id} not found`);
    }
    const updatedGroup = groupResult.rows[0];

    const deleteMappingQuery = `
      DELETE FROM fl_area_group_mapping 
      WHERE group_id = $1
    `;
    await client.query(deleteMappingQuery, [id]);

    const insertMappingQuery = `
      INSERT INTO fl_area_group_mapping (group_id, area_idx) 
      VALUES ($1, $2)
    `;
    for (const areaIdx of areas) {
      const actualAreaIdx = typeof areaIdx === 'object' && areaIdx !== null ? areaIdx.outside_idx : areaIdx;

      if (!actualAreaIdx) {
        throw new Error(`Invalid area_idx: ${areaIdx}`);
      }

      await client.query(insertMappingQuery, [id, actualAreaIdx]);
    }

    const fetchQuery = `
      SELECT 
        g.id,
        g.name,
        g.created_at,
        g.updated_at,
        json_agg(
          json_build_object(
            'area_idx', m.area_idx,
            'outside_name', o.outside_name
          )
        ) AS areas
      FROM fl_area_group g
      LEFT JOIN fl_area_group_mapping m ON g.id = m.group_id
      LEFT JOIN fl_outside o ON m.area_idx = o.idx
      WHERE g.id = $1
      GROUP BY g.id, g.name, g.created_at, g.updated_at
    `;
    const result = await client.query(fetchQuery, [id]);

    await client.query('COMMIT');

    if (global.websocket) {
      global.websocket.emit("fl_areaGroup-update", {
        groupId: id,
        groupName: name,
        areas: areas.length
      });

      global.websocket.emit("fl_areaList-update", {
        areaList: { 'update': areas.length }
      });
    }
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('areaGroupService.js, updateAreaGroup, error:', error);
    throw error;
  } finally {
    await client.release();
  }
};


exports.deleteAreaGroup = async ({ groupId }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const deleteMappingQuery = `
      DELETE FROM fl_area_group_mapping 
      WHERE group_id = $1
    `;
    await client.query(deleteMappingQuery, [groupId]);

    const deleteGroupQuery = `
      DELETE FROM fl_area_group 
      WHERE id = $1 
      RETURNING id
    `;
    const result = await client.query(deleteGroupQuery, [groupId]);

    if (result.rows.length === 0) {
      throw new Error(`Group with id ${groupId} not found`);
    }

    await client.query('COMMIT');
    return { message: 'ok' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('areaGroupService.js, deleteAreaGroup, error:', error);
    throw error;
  } finally {
    await client.release();
  }
};

exports.createAreaGroup = async ({ id, name, areas }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let groupId;
    if (id) {
      const updateResult = await client.query(
        'UPDATE fl_area_group SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [name, id]
      );
      if (updateResult.rows.length === 0) {
        throw new Error(`Group with id ${id} not found`);
      }
      groupId = updateResult.rows[0].id;

      await client.query('DELETE FROM fl_area_group_mapping WHERE group_id = $1', [groupId]);
    } else {
      const insertResult = await client.query(
        'INSERT INTO fl_area_group (name) VALUES ($1) RETURNING id',
        [name]
      );
      groupId = insertResult.rows[0].id;
    }

    const insertMappingQuery = 'INSERT INTO fl_area_group_mapping (group_id, area_idx) VALUES ($1, $2)';
    for (const areaIdx of areas) {
      await client.query(insertMappingQuery, [groupId, areaIdx]);
    }

    const fetchQuery = `
      SELECT 
        g.id,
        g.name,
        g.created_at,
        g.updated_at,
        json_agg(
          json_build_object(
            'area_idx', m.area_idx,
            'outside_name', o.outside_name
          )
        ) AS areas
      FROM fl_area_group g
      LEFT JOIN fl_area_group_mapping m ON g.id = m.group_id
      LEFT JOIN fl_outside o ON m.area_idx = o.idx
      WHERE g.id = $1
      GROUP BY g.id, g.name, g.created_at, g.updated_at
    `;
    const result = await client.query(fetchQuery, [groupId]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('areaGroupService.js, createAreaGroup, error:', error);
    throw error;
  } finally {
    await client.release();
  }
};

exports.deleteOutsideInfo = async ({ idx, camera_ip, id }) => {

  const client = await pool.connect();

  try {
    let checkOutsideIdx = idx;
    if (!Number.isInteger(checkOutsideIdx)) {
      checkOutsideIdx = parseInt(checkOutsideIdx);
    }

    await client.query('BEGIN');
    const serviceType = 'inundation';

    let binds = [checkOutsideIdx];
    let queryDeleteOutsideInfo = await outsideMapper.deleteOutsideInfo();
    const res = await client.query(queryDeleteOutsideInfo, binds);

    let queryDeleteOutsideBillboard = await billboardMapper.deleteOutsideBillboard();
    const resDeleteOutsideBillboard = await client.query(queryDeleteOutsideBillboard, binds);

    let queryDeleteOutsideSpeaker = await speakerMapper.deleteOutsideSpeaker();
    const resDeleteOutsideSpeaker = await client.query(queryDeleteOutsideSpeaker, binds);

    let queryDeleteOutsideIdxWaterLevel = await waterLevelMapper.deleteOutsideIdxWaterLevel();
    const resDeleteOutsideIdxWaterLevel = await client.query(queryDeleteOutsideIdxWaterLevel, binds);

    let queryDeleteOutsideGuardianlite = await guardianliteMapper.deleteOutsideGuardianlite();
    const resDeleteOutsideGuardianlite = await client.query(queryDeleteOutsideGuardianlite, binds);

    let queryDeleteOutsideCamera = await cameraMapper.deleteOutsideCamera();
    const resDeleteOutsideCamera = await client.query(queryDeleteOutsideCamera, [serviceType, camera_ip]);


    await client.query('COMMIT');

    if ((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("fl_areaList-update", { areaList: { 'remove': res.rowCount } });
      global.websocket.emit('fl_speaker-update', { speaker: resDeleteOutsideSpeaker.rowCount });
      global.websocket.emit('fl_billboard-update', { billboard: resDeleteOutsideBillboard.rowCount });
      global.websocket.emit('fl_waterLevel-update', { waterLevel: resDeleteOutsideIdxWaterLevel.rowCount });
      global.websocket.emit("fl_guardianlites-update", { guardianlites: resDeleteOutsideGuardianlite.rowCount });
      global.websocket.emit("fl_cameras-update", { cameras: resDeleteOutsideCamera.rowCount });
    }

    addOperLog({
      logAction: 'addoper',
      operatorId: id,
      logType: '개소 삭제',
      logDescription: `개소 삭제에 성공 했습니다.`,
      reqIp: ''
    });

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, deleteOutsideInfo, error: ', error);
    console.log('inundationControl/outsideService.js, deleteOutsideInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.getLinkedStatusCount = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await outsideMapper.getLinkedStatusCount();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, getLinkedStatusCount, error: ', error);
    console.log('inundationControl/outsideService.js, getLinkedStatusCount, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getWaterLevelOutsideList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await outsideMapper.getWaterLevelOutsideList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, getWaterLevelOutsideList, error: ', error);
    console.log('inundationControl/outsideService.js, getWaterLevelOutsideList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getUnLinkDeviceList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await outsideMapper.getUnLinkDeviceList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, getUnLinkDeviceList, error: ', error);
    console.log('inundationControl/outsideService.js, getUnLinkDeviceList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getCompactOutSideList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await outsideMapper.getCompactOutSideList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, getCompactOutSideList, error: ', error);
    console.log('inundationControl/outsideService.js, getCompactOutSideList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getWaterLevelOutsideInfo = async ({ idx }) => {

  const client = await pool.connect();

  try {
    const outsideIdx = idx;

    let binds = [];
    let query = await severityMapper.getSeverityList();
    const resSeverityList = await client.query(query, binds);

    binds = [outsideIdx];
    query = await outsideMapper.getWaterLevelOutsideInfo();
    const resWaterLevelOutsideInfo = await client.query(query, binds);

    if (resWaterLevelOutsideInfo && resWaterLevelOutsideInfo.rows.length > 0) {

      for (let i in resWaterLevelOutsideInfo.rows) {

        const currWaterLevel = resWaterLevelOutsideInfo.rows[i].curr_water_level; // 수위계별 현재 수위
        const threshold = resWaterLevelOutsideInfo.rows[i].threshold; // 수위계별 임계치

        for (let j in resSeverityList.rows) {

          const classify = resSeverityList.rows[j].classify; // 수위별 분류 기준

          if ((currWaterLevel != 0) && (currWaterLevel >= (threshold * classify))) {
            resWaterLevelOutsideInfo.rows[i].curr_status = resSeverityList.rows[j].severity;
            resWaterLevelOutsideInfo.rows[i].curr_color = resSeverityList.rows[j].severity_color;
            break;
          }

        } // for j

        resWaterLevelOutsideInfo.rows[i].severity = resSeverityList.rows;

      } // for i
    }

    return resWaterLevelOutsideInfo.rows;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, getWaterLevelOutsideInfo, error: ', error);
    console.log('inundationControl/outsideService.js, getWaterLevelOutsideInfo, error: ', error);
    throw error;
  } finally {
    await client.release();
  }
}

exports.getAllWaterLevelOutsideInfo = async () => {
  const client = await pool.connect();

  try {
    let binds = [];
    let query = await severityMapper.getSeverityList();
    const resSeverityList = await client.query(query, binds);

    query = await outsideMapper.getAllWaterLevelOutsideInfo();
    const resWaterLevelOutsideInfo = await client.query(query, binds);

    if (resWaterLevelOutsideInfo && resWaterLevelOutsideInfo.rows.length > 0) {
      // severity 계산 (한 번에 모든 데이터 처리)
      for (let i in resWaterLevelOutsideInfo.rows) {
        const currWaterLevel = resWaterLevelOutsideInfo.rows[i].curr_water_level;
        const threshold = resWaterLevelOutsideInfo.rows[i].threshold;

        for (let j in resSeverityList.rows) {
          const classify = resSeverityList.rows[j].classify;

          if ((currWaterLevel != 0) && (currWaterLevel >= (threshold * classify))) {
            resWaterLevelOutsideInfo.rows[i].curr_status = resSeverityList.rows[j].severity;
            resWaterLevelOutsideInfo.rows[i].curr_color = resSeverityList.rows[j].severity_color;
            break;
          }
        }

        resWaterLevelOutsideInfo.rows[i].severity = resSeverityList.rows;
      }
    }

    return resWaterLevelOutsideInfo.rows;

  } catch (error) {
    logger.info('outsideService.js, getAllWaterLevelOutsideInfo, error: ', error);
    throw error;
  } finally {
    await client.release();
  }
}


exports.getWaterLevelCameraInfo = async ({ waterlevelIdx }) => {
  const client = await pool.connect();

  try {
    const query = await outsideMapper.getWaterLevelCameraInfo();
    const res = await client.query(query, [waterlevelIdx]);
    return res.rows;
  } catch (error) {
    logger.info('inundationControl/outsideService.js, getWaterLevelCameraInfo, error: ', error);
    console.log('inundationControl/outsideService.js, getWaterLevelCameraInfo, error: ', error);
    throw error;
  } finally {
    await client.release();
  }
};

exports.getOutsideDeviceList = async () => {

  const client = await pool.connect();

  try {

    let returnValue = [];

    let binds = [];
    let query = await outsideMapper.getCompactOutSideList();
    const resOutSideList = await client.query(query, binds);

    if ((resOutSideList) && (resOutSideList.rows) && (resOutSideList.rows.length > 0)) {

      let outsideTemp = {};

      for (let i in resOutSideList.rows) {

        const outsideIdx = resOutSideList.rows[i].idx;

        outsideTemp = {
          outside_idx: resOutSideList.rows[i].idx
          , outside_name: resOutSideList.rows[i].outside_name
          , location: resOutSideList.rows[i].location
          , crossing_gate_ip: resOutSideList.rows[i].crossing_gate_ip
          , crossing_gate_status: resOutSideList.rows[i].crossing_gate_status
          , service_type: resOutSideList.rows[i].service_type
          , linked_status: resOutSideList.rows[i].linked_status
        };

        binds = [outsideIdx];

        // 수위계 검색 후 저장
        query = await waterLevelMapper.getOutsideWaterLevel();
        const resOutsideWaterLevel = await client.query(query, binds);

        outsideTemp.water_level = resOutsideWaterLevel.rows;

        // 스피커 검색 후 저장
        query = await speakerMapper.getOutsideSpeaker();
        const resOutsideSpeaker = await client.query(query, binds);

        outsideTemp.speaker = resOutsideSpeaker.rows;

        // 전광판 검색 후 저장
        query = await billboardMapper.getOutsideBillboard();
        const resOutsideBillboard = await client.query(query, binds);

        outsideTemp.billboard = resOutsideBillboard.rows;

        // 가디언라이트 검색 후 저장
        query = await guardianliteMapper.getOutsideGuardianlite();
        const resOutsideGuardianlite = await client.query(query, binds);

        outsideTemp.guardianlite = resOutsideGuardianlite.rows;

        // 카메라 검색 후 저장
        binds = [outsideIdx, mainServiceName, mainServiceName];
        query = await cameraMapper.getOutsideCamera();
        const resOutsideCamera = await client.query(query, binds);

        outsideTemp.camera = resOutsideCamera.rows;

        returnValue.push(outsideTemp);

      } // for
    }

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, getOutsideDeviceList, error: ', error);
    console.log('inundationControl/outsideService.js, getOutsideDeviceList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getAllDeviceList = async () => {

  const client = await pool.connect();

  try {

    let returnValue = [];

    let outterTemp = {
      outside: []
      , water_level: []
      , speaker: []
      , billboard: []
      , guardianlite: []
      , camera: []
    };

    // 개소(차단기) 검색 후 저장
    let binds = [];
    let query = await outsideMapper.getCompactOutSideList();
    const resOutSideList = await client.query(query, binds);

    for (let i in resOutSideList.rows) {

      let innerTemp = {
        outside_idx: resOutSideList.rows[i].idx
        , outside_name: resOutSideList.rows[i].outside_name
        , location: resOutSideList.rows[i].location
        , crossing_gate_ip: resOutSideList.rows[i].crossing_gate_ip
        , crossing_gate_status: resOutSideList.rows[i].crossing_gate_status
        , service_type: resOutSideList.rows[i].service_type
        , linked_status: resOutSideList.rows[i].linked_status
      };

      outterTemp.outside.push(innerTemp);
    }

    // 수위계 검색 후 저장
    query = await waterLevelMapper.getWaterLevelDeviceList();
    const resWaterLevelDeviceList = await client.query(query, binds);

    for (let i in resWaterLevelDeviceList.rows) {

      let innerTemp = {
        water_level_idx: resWaterLevelDeviceList.rows[i].water_level_idx
        , water_level_name: resWaterLevelDeviceList.rows[i].water_level_name
        , water_level_location: resWaterLevelDeviceList.rows[i].water_level_location
        , water_level_ip: resWaterLevelDeviceList.rows[i].water_level_ip
        , water_level_port: resWaterLevelDeviceList.rows[i].water_level_port
        , linked_status: resWaterLevelDeviceList.rows[i].linked_status
        , use_status: resWaterLevelDeviceList.rows[i].use_status
      };

      outterTemp.water_level.push(innerTemp);
    }

    // 스피커 검색 후 저장
    query = await speakerMapper.getSpeakerList();
    const resSpeakerList = await client.query(query, binds);

    for (let i in resSpeakerList.rows) {

      let innerTemp = {
        speaker_idx: resSpeakerList.rows[i].speaker_idx
        , speaker_name: resSpeakerList.rows[i].speaker_name
        , speaker_ip: resSpeakerList.rows[i].speaker_ip
        , speaker_status: resSpeakerList.rows[i].speaker_status
        , linked_status: resSpeakerList.rows[i].linked_status
        , alarm_status: resSpeakerList.rows[i].alarm_status
      };

      outterTemp.speaker.push(innerTemp);
    }

    // 전광판 검색 후 저장
    query = await billboardMapper.getBillboardList();
    const resBillboardList = await client.query(query, binds);

    for (let i in resBillboardList.rows) {

      let innerTemp = {
        billboard_idx: resBillboardList.rows[i].billboard_idx
        , billboard_name: resBillboardList.rows[i].billboard_name
        , billboard_ip: resBillboardList.rows[i].billboard_ip
        , billboard_status: resBillboardList.rows[i].billboard_status
        , linked_status: resBillboardList.rows[i].linked_status
        , alarm_status: resBillboardList.rows[i].alarm_status
      };

      outterTemp.billboard.push(innerTemp);
    }

    // 가디언라이트 검색 후 저장
    query = await guardianliteMapper.getGuardianliteList();
    const resGuardianliteList = await client.query(query, binds);

    for (let i in resGuardianliteList.rows) {

      let innerTemp = {
        guardianlite_ip: resGuardianliteList.rows[i].guardianlite_ip
        , guardianlite_name: resGuardianliteList.rows[i].guardianlite_name
        , status: resGuardianliteList.rows[i].status
      };

      outterTemp.guardianlite.push(innerTemp);
    }

    // 카메라 검색 후 저장
    binds = ['inundation'];
    query = await cameraMapper.getAllCameraList();
    const resAllCameraList = await client.query(query, binds);

    for (let i in resAllCameraList.rows) {

      let innerTemp = {
        camera_idx: resAllCameraList.rows[i].camera_idx
        , camera_id: resAllCameraList.rows[i].camera_id
        , vms_name: resAllCameraList.rows[i].vms_name
        , main_service_name: resAllCameraList.rows[i].main_service_name
        , camera_name: resAllCameraList.rows[i].camera_name
        , camera_ip: resAllCameraList.rows[i].camera_ip
        , use_status: resAllCameraList.rows[i].use_status
        , service_type: resAllCameraList.rows[i].service_type
        , linked_status: resAllCameraList.rows[i].linked_status
      };

      outterTemp.camera.push(innerTemp);
    }

    returnValue.push(outterTemp);

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, getAllDeviceList, error: ', error);
    console.log('inundationControl/outsideService.js, getAllDeviceList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.syncCrossingGate = async ({ ipaddress, cmd }) => {
  const client = await pool.connect();

  try {
    let returnValue = null;
    let binds = [ipaddress];

    let query = "";
    if (cmd === 'open') {
      query = `UPDATE fl_outside SET crossing_gate_status='1' WHERE ipaddress=$1 AND (crossing_gate_status='0' OR crossing_gate_status IS NULL)`;
    } else if (cmd === 'close') {
      query = `UPDATE fl_outside SET crossing_gate_status='0' WHERE ipaddress=$1 AND (crossing_gate_status='1' OR crossing_gate_status IS NULL)`;
    } else if (cmd === 'disconnect') {
      query = `UPDATE fl_outside SET crossing_gate_status=NULL WHERE ipaddress=$1 AND crossing_gate_status IS NOT NULL`;
    }

    const res = await client.query(query, binds);

    if (res && res.rowCount === 1) {
      global.websocket.emit('fl_areaList-update', { areaList: res.rowCount });
      global.websocket.emit('fl_crossingGates-update', { crossingGates: res.rowCount });
    }

    returnValue = res;
    return returnValue;
  } catch (error) {
    logger.info('inundationControl/outsideService.js, syncCrossingGate, error: ', error);
    console.error('inundationControl/outsideService.js, syncCrossingGate, error: ', error);
  } finally {
    await client.release();
  }
};

exports.updateAreaPosition = async ({ idx, topLocation, leftLocation }) => {

  const client = await pool.connect();

  try {
    let checkOutsideIdx = idx;
    if (!Number.isInteger(checkOutsideIdx)) {
      checkOutsideIdx = parseInt(checkOutsideIdx);
    }

    let binds = [checkOutsideIdx, topLocation, leftLocation];

    let query = await outsideMapper.updateAreaPosition();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, updateAreaPosition, error: ', error);
    console.log('inundationControl/outsideService.js, updateAreaPosition, error: ', error);
  } finally {
    await client.release();
  }
};

exports.getEventList = async ({
  type,
  startTime,
  endTime,
  start,
  end,
  deviceType,
  eventLocation,
  mainServiceName
}) => {
  const client = await pool.connect();

  try {
    let query = `
      SELECT 
        idx,
        event_name,
        event_type_id,
        description,
        location,
        event_occurrence_time,
        event_end_time,
        severity_id,
        device_idx,
        created_at
      FROM event_log
    `;

    const conditions = [];
    const binds = [];
    let paramIndex = 1;

    if (type && type !== 'allevents') {
      let eventTypeId;
      switch (type) {
        case 'flooddetection': eventTypeId = 40; break;
        case 'gatecontrol': eventTypeId = 47; break;
        default: eventTypeId = null;
      }
      if (eventTypeId) {
        conditions.push(`event_type_id = $${paramIndex}`);
        binds.push(eventTypeId);
        paramIndex++;
      }
    }

    if (start && end) {
      conditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      binds.push(start, `${end} 23:59:59`);
      paramIndex += 2;
    }

    if (startTime && endTime) {
      conditions.push(`event_occurrence_time::time BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      binds.push(startTime, endTime);
      paramIndex += 2;
    }

    if (deviceType && deviceType !== 'all') {
      if (deviceType === 'waterlevel') {
        conditions.push(`location IN (SELECT water_level_location FROM fl_water_level)`);
      } else if (deviceType === 'crossinggate') {
        conditions.push(`location IN (SELECT location FROM fl_outside)`);
      }
    }

    if (eventLocation) {
      conditions.push(`location = $${paramIndex}`);
      binds.push(eventLocation);
      paramIndex++;
    }

    if (mainServiceName && mainServiceName === 'inundation') {
      conditions.push(`main_service_name = $${paramIndex}`);
      binds.push(mainServiceName);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const res = await client.query(query, binds);

    const result = res.rows.map(row => ({
      idx: row.idx,
      event_name: row.event_name,
      event_type_id: row.event_type_id,
      description: row.description,
      location: row.location,
      event_occurrence_time: row.event_occurrence_time,
      event_end_time: row.event_end_time,
      severity_id: row.severity_id,
      device_idx: row.device_idx,
      created_at: row.created_at
    }));

    return {
      message: 'ok',
      result: result
    };

  } catch (error) {
    logger.info('inundationControl/outsideService.js, getEventList, error: ', error);
    console.log('inundationControl/outsideService.js, getEventList, error: ', error);
    return {
      message: `이벤트 조회 중 오류 발생: ${error.message}`,
      result: []
    };
  } finally {
    await client.release();
  }
};

exports.getOperationLogList = async ({
  logType,
  startTime,
  endTime,
  start,
  end,
  deviceType
}) => {
  const client = await pool.connect();

  try {
    let query = `
      SELECT 
        idx,
        user_id,
        log_type,
        log_description,
        created_at
      FROM operation_log
    `;

    const conditions = [];
    const binds = [];
    let paramIndex = 1;

    if (logType && logType !== 'all') {
      conditions.push(`log_type LIKE $${paramIndex}`);
      binds.push(`%${logType}%`);
      paramIndex++;
    }

    if (start && end) {
      conditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      binds.push(start, `${end} 23:59:59`);
      paramIndex += 2;
    }

    if (startTime && endTime) {
      conditions.push(`created_at::time BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      binds.push(startTime, endTime);
      paramIndex += 2;
    }

    if (deviceType && deviceType !== 'all') {
      if (deviceType === 'waterlevel') {
        conditions.push(`log_description LIKE '%수위계%'`);
      } else if (deviceType === 'crossinggate') {
        conditions.push(`log_description LIKE '%차단기%'`);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const res = await client.query(query, binds);

    const result = res.rows.map(row => ({
      idx: row.idx,
      user_id: row.user_id,
      log_type: row.log_type,
      log_description: row.log_description,
      created_at: row.created_at
    }));

    return {
      message: 'ok',
      result: result
    };
  } catch (error) {
    logger.info('inundationControl/outsideService.js, getOperationLogList, error: ', error);
    console.log('inundationControl/outsideService.js, getOperationLogList, error: ', error);
    return { message: 'error', result: [] };
  } finally {
    await client.release();
  }
};

exports.getWaterLevelLocations = async () => {
  const client = await pool.connect();
  try {
    const query = `SELECT water_level_location FROM fl_water_level;`;
    const res = await client.query(query);
    return { message: 'ok', result: res.rows };
  } catch (error) {
    logger.error('inundationControl/waterLevelService.js, getWaterLevelLocations, error:', error);
    return { message: 'error', result: [] };
  } finally {
    await client.release();
  }
};

exports.getOutsideLocations = async () => {
  const client = await pool.connect();
  try {
    const query = `SELECT location FROM fl_outside ORDER BY location;`;
    const res = await client.query(query);
    return { message: 'ok', result: res.rows };
  } catch (error) {
    logger.error('inundationControl/outsideService.js, getOutsideLocations, error:', error);
    return { message: 'error', result: [] };
  } finally {
    await client.release();
  }
};

exports.getDashboardDevices = async () => {
  const client = await pool.connect();
  try {
    let query = await outsideMapper.getDashboardDevices();
    const res = await client.query(query);

    return { message: 'ok', result: res.rows };
  } catch (error) {
    logger.error('inundationControl/outsideService.js, getDashboardDevices, error:', error);
    return { message: 'error', result: [] };
  } finally {
    await client.release();
  }
};
