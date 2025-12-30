const path = require('path');
const fs = require('fs');
const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const commonMapper = require('../mappers/commonMapper');
const { serverConfig, mssqlConfig, ebellConfig } = require('../../../config');

exports.getMainService = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await commonMapper.getMainService();

    let result = await client.query(query, binds);

    return result.rows;

  } catch (error) {
    logger.info('common/commonService.js, getMainService, error: ', error);
    console.log('common/commonService.js, getMainService, error: ', error);
  } finally {
    await client.release();
  }
}

exports.insertLog = async (operatorId, logType, logDescription, reqIp) => {
  const client = await pool.connect();

  try {

    let binds = [operatorId, logType, logDescription, reqIp];

    let query = await commonMapper.insertLogQuery();

    let result = await client.query(query, binds);
    if (result?.rowCount === 1) {
      return {
        success: true
      }
    }
  } catch (error) {
    logger.error('common/commonService.js, insertLog, error: ', error);
    console.error('common/commonService.js, insertLog, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getSeverityList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await commonMapper.getSeverityList();

    let result = await client.query(query, binds);

    return result.rows;

  } catch (error) {
    logger.info('common/commonService.js, getSeverityList, error: ', error);
    console.log('common/commonService.js, getSeverityList, error: ', error);
  } finally {
    await client.release();
  }
}

// exports.createArea = async ({
//   areaName,
//   areaLocation,
//   areaCamera,
//   areaCrossingGate,
//   areaSpeaker,
//   areaBillboard,
//   areaGuardianlite,
//   areaWaterlevelGauge,
//   leftLocation,
//   topLocation,
//   serviceType
// }) => {
//   const client = await pool.connect();

//   try {
//     let binds = [
//       areaName,
//       areaLocation,
//       areaCamera,
//       areaCrossingGate,
//       areaSpeaker,
//       areaBillboard,
//       areaGuardianlite,
//       areaWaterlevelGauge,
//       leftLocation,
//       topLocation,
//       serviceType
//     ];

//     let query = await commonMapper.createArea();

//     console.log(binds);
//     console.log(query);

//     let result = await client.query(query, binds);
//     if(result?.rowCount === 1){
//       return {
//         success: true
//       }
//     }
//   } catch (error) {
//     logger.error('common/commonService.js, createArea, error: ', error);
//     console.error('common/commonService.js, createArea, error: ', error);
//   } finally {
//     await client.release();
//   }
// }

// exports.getArea = async () => {
//   const client = await pool.connect();
//   try {
//     let binds = [];
//     let query = await commonMapper.getArea();
//     let result = await client.query(query, binds);

//     return result.rows;
//   } catch (error) {
//     logger.info('common/commonService.js, getArea, error: ', error);
//     console.log('common/commonService.js, getArea, error: ', error);
//     let binds = [operatorId, logType, logDescription, reqIp];

//     let query = await commonMapper.insertLogQuery();

//     let result = await client.query(query, binds);
//     if(result?.rowCount === 1){
//       return {
//         success: true
//       }
//     }
//   }  finally {
//     await client.release();
//   }
// }

// exports.getOutdoorImage = async () => {
//   try {
//     let result = [];
//     // const imagePath = path.join(__dirname, '..', '..', '..', 'public', 'images', 'outdoor');
//     const imagePath = path.join(process.cwd(), 'public', 'images', 'outdoor');
//     readdirSync(imagePath).forEach(file => {
//       const url = `http://${serverConfig.WEBSOCKET_URL}:${serverConfig.PORT}/images/outdoor/${file}`;
//       result.push({
//         name: file,
//         url
//       });
//     });
//     return result;
//   } catch (error) {
//     logger.error('common/commonService.js, getOutdoorImage, error: ', error);
//     console.error('common/commonService.js, getOutdoorImage, error: ', error);
//     throw new Error(error.message || 'get outdoor image server error');
//   }
// }

exports.getOutdoorImage = async () => {
  try {
    const result = [];
    const imagePath = path.join(process.cwd(), 'public', 'images', 'outdoor');

    // 존재하지 않으면 빈 배열 반환 
    if (!fs.existsSync(imagePath)) {
      return result;
    }

    fs.readdirSync(imagePath).forEach(file => {
      const url = `http://${serverConfig.WEBSOCKET_URL}:${serverConfig.PORT}/images/outdoor/${file}`;
      result.push({ name: file, url });
    });

    return result;
  } catch (error) {
    logger.error('common/commonService.js, getOutdoorImage, error: ', error);
    console.error('common/commonService.js, getOutdoorImage, error: ', error);
    throw new Error(error.message || 'get outdoor image server error');
  }
};

exports.createSOP = async ({ sopName }) => {

  const client = await pool.connect();

  try {

    let binds = [sopName];

    let query = await commonMapper.createSOP();

    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_sop-update",
        {
          SOP: {
            'create': {
              idx: result.rows[0].idx
            }
          }
        }
      );
    }
    return result.rowCount;

  } catch (error) {
    logger.info('common/commonService.js, createSOP, error: ', error);
    console.log('common/commonService.js, createSOP, error: ', error);
  } finally {
    await client.release();
  };
};

exports.getSOPList = async ({ idx }) => {

  const client = await pool.connect();

  try {

    let binds;

    if (idx) {
      binds = [idx];
    } else {
      binds = [];
    }

    let query = await commonMapper.getSOPList(idx);

    let result = await client.query(query, binds);

    return result.rows;

  } catch (error) {
    logger.info('common/commonService.js, getSOPList, error: ', error);
    console.log('common/commonService.js, getSOPList, error: ', error);
  } finally {
    await client.release();
  };
};

exports.createSOPStage = async ({ sopIdx, sopStage, sopStageName, sopStageDescription }) => {

  const client = await pool.connect();

  try {

    let binds = [sopIdx, sopStage, sopStageName, sopStageDescription];

    let query = await commonMapper.createSOPStage();

    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_sop_stage-update", {
        SOPStage: {
          'create': {
            sop_idx: result.rows[0].sop_idx
          }
        }
      });
    }
    return result.rowCount;

  } catch (error) {
    logger.info('common/commonService.js, createSOPStage, error: ', error);
    console.log('common/commonService.js, createSOPStage, error: ', error);
  } finally {
    await client.release();
  };

};

exports.getSOPStageList = async ({ sopIdx }) => {

  const client = await pool.connect();

  try {

    let binds = [sopIdx];

    let query = await commonMapper.getSOPStageList();

    let result = await client.query(query, binds);

    return result.rows;

  } catch (error) {
    logger.info('common/commonService.js, getSOPStageList, error: ', error);
    console.log('common/commonService.js, getSOPStageList, error: ', error);
  } finally {
    await client.release();
  };
};

exports.removeSOP = async ({ idx }) => {

  const client = await pool.connect();

  try {

    let binds = [idx];

    let query = await commonMapper.removeSOP();

    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_sop-update", { SOP: { 'remove': idx } });
    }
    return result.rowCount;

  } catch (error) {
    logger.info('common/commonService.js, removeSOP, error: ', error);
    console.log('common/commonService.js, removeSOP, error: ', error);
  } finally {
    await client.release();
  };
};

exports.removeSOPStage = async ({ idx, sopIdx, sopStage }) => {

  const client = await pool.connect();

  try {
    let binds;
    if (idx) {
      binds = [idx];
    } else {
      binds = [sopIdx, sopStage];
    }

    let query = await commonMapper.removeSOPStage(idx);

    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      console.log(result.rows)
      global.websocket.emit("cm_sop_stage-update", {
        SOPStage: {
          'remove': {
            sop_idx: result.rows[0].sop_idx
          }
        }
      });
    };
    return result.rowCount;

  } catch (error) {
    logger.info('common/commonService.js, removeSOPStage, error: ', error);
    console.log('common/commonService.js, removeSOPStage, error: ', error);
  } finally {
    await client.release();
  };
};

exports.modifySOP = async ({ idx, sopName }) => {

  const client = await pool.connect();

  try {

    let binds = [idx, sopName];

    let query = await commonMapper.modifySOP();

    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_sop-update", {
        SOP: {
          'modify': {
            idx,
            sop_name: sopName
          }
        }
      });
    }
    return result.rowCount;

  } catch (error) {
    logger.info('common/commonService.js, modifySOP, error: ', error);
    console.log('common/commonService.js, modifySOP, error: ', error);
  } finally {
    await client.release();
  };
};

exports.modifySOPStage = async ({ idx, sopStageName, sopStageDescription }) => {

  const client = await pool.connect();

  try {

    let binds = [idx, sopStageName, sopStageDescription];

    let query = await commonMapper.modifySOPStage();

    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_sop_stage-update", {
        SOPStage: {
          'modify': {
            sop_idx: result.rows[0].sop_idx
          }
        }
      });
    };
    return result.rowCount;

  } catch (error) {
    logger.info('common/commonService.js, modifySOPStage, error: ', error);
    console.log('common/commonService.js, modifySOPStage, error: ', error);
  } finally {
    await client.release();
  };
};

exports.createFalseAlarm = async ({ type }) => {

  const client = await pool.connect();

  try {

    let binds = [type];

    let query = await commonMapper.createFalseAlarm();

    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_sop_falseAlarm-update", {
        falseAlarm: {
          'create': {
            idx: result.rows[0].idx
          }
        }
      });
    };
    return result;

  } catch (error) {
    logger.info('common/commonService.js, createFalseAlarm, error: ', error);
    console.log('common/commonService.js, createFalseAlarm, error: ', error);
  } finally {
    await client.release();
  };
};

exports.getFalseAlarmList = async (idx) => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query;
    if (idx == null) {
      query = commonMapper.getFalseAlarmList();
    } else {
      binds = [idx];
      query = commonMapper.getFalseAlarm();
    }

    let result = await client.query(query, binds);

    return result.rows;

  } catch (error) {
    logger.info('common/commonService.js, getFalseAlarmList, error: ', error);
    console.log('common/commonService.js, getFalseAlarmList, error: ', error);
  } finally {
    await client.release();
  };
};

exports.modifyFalseAlarm = async ({ idx, type }) => {

  const client = await pool.connect();

  try {

    let binds = [idx, type];

    let query = await commonMapper.modifyFalseAlarm();

    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_sop_falseAlarm-update", {
        falseAlarm: {
          'modify': {
            idx: result.rows[0].idx
          }
        }
      });
    };
    return result.rowCount;

  } catch (error) {
    logger.info('common/commonService.js, modifyFalseAlarm, error: ', error);
    console.log('common/commonService.js, modifyFalseAlarm, error: ', error);
  } finally {
    await client.release();
  };
};

exports.removeFalseAlarm = async ({ idx }) => {

  const client = await pool.connect();

  try {

    let binds = [idx];

    let query = await commonMapper.removeFalseAlarm();

    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_sop_falseAlarm-update", {
        falseAlarm: {
          'remove': {
            idx: result.rows[0].idx
          }
        }
      });
    };
    return result.rowCount;

  } catch (error) {
    logger.info('common/commonService.js, removeFalseAlarm, error: ', error);
    console.log('common/commonService.js, removeFalseAlarm, error: ', error);
  } finally {
    await client.release();
  };
};

exports.getEventLogList = async (params = {}) => {

  const client = await pool.connect();

  try {
    let binds = [];
    let query = await commonMapper.eventLogList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('common/commonService.js, getEventLogList, error: ', error);
    console.log('common/commonService.js, getEventLogList, error: ', error);
    return [];
  } finally {
    await client.release();
  }
}

exports.addEventLog = async (eventData) => {
  const client = await pool.connect();

  try {

    const {
      use_popup,
      outside_idx,
      outside_name,
      outside_location,
      lat,
      lng,
      outside_ip,
      ...rest
    } = eventData;

    eventData = rest;

    const defaultColumn = {
      is_acknowledge: false,
      event_occurrence_time: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace(/[-:.Z]/g, "").slice(0, 15),
    };

    const mergeData = Object.assign({}, defaultColumn, eventData);

    const filteredData = Object.entries(mergeData)
      .filter(([, value]) => value !== undefined && value !== null);

    if (filteredData.length === 0) {
      return 0;
    }

    const columns = filteredData.map(([key]) => key).join(", ");
    const values = filteredData.map(([,], index) => `$${index + 1}`).join(", ");
    const binds = filteredData.map(([, value]) => value);

    const query = `
      INSERT INTO event_log (${columns}) 
      VALUES (${values}) 
      RETURNING *;
    `;

    const res = await client.query(query, binds);

    if (res.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_event_log-update", { eventLog: { 'update': res.rowCount } });

      if (binds.includes("parking")) {
        global.websocket.emit("pm_event-update", { eventList: { 'update': res.rowCount } });
      } else if (binds.includes("broadcast")) {
        global.websocket.emit("vb_event-update", { eventList: { 'update': res.rowCount } });
      } else if (binds.includes("inundation")) {
        const newEvent = res.rows[0];
        global.websocket.emit("fl_events-update", {
          idx: newEvent.idx,
          event_type_id: newEvent.event_type_id,
          location: newEvent.location,
          description: newEvent.description,
          event_occurrence_time: newEvent.event_occurrence_time,
          main_service_name: newEvent.main_service_name || 'inundation',
        });
      } else if (binds.includes("tunnel")) {
        global.websocket.emit("tm_event-update", {
          use_popup: use_popup,
          outside_idx: outside_idx,
          outside_name: outside_name,
          outside_location: outside_location,
          device_type: eventData.device_type,
          lat: lat,
          lng: lng,
          outside_ip:outside_ip
        });
      }
    }

    return res.rowCount;

  } catch (error) {
    logger.info('common/commonService.js, addEventLog, error: ', error);
    console.log('common/commonService.js, addEventLog, error: ', error);
    return [];
  } finally {
    await client.release();
  }
};

exports.eventLogCheck = async ({ eventIdxArray, user_name }) => {

  const client = await pool.connect();

  try {

    if (!eventIdxArray || eventIdxArray.length === 0) {
      return { message: "이벤트 로거 확인 데이터가 없습니다 : " + eventIdxArray.length };
    }
    const idxList = eventIdxArray.map(event => event.idx);
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const binds = [user_name, kst.toISOString().replace(/[-:.Z]/g, "").slice(0, 15), idxList];
    const query = await commonMapper.eventLogCheck();
    const res = await client.query(query, binds);

    if (res.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_event_log-update", { eventLogCheck: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('common/commonService.js, eventLogCheck, error: ', error);
    console.log('common/commonService.js, eventLogCheck, error: ', error);
  } finally {
    await client.release();
  };
};

exports.updateSetting = async ({ settingName, settingValue }) => {
  const client = await pool.connect();
  try {

    const binds = [settingValue, settingName];
    const query = commonMapper.updateSetting();
    const res = await client.query(query, binds);

    if (res.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_settings-update", { settingName });
    };
    if (res.rowCount === 1) {
      const configValues = settingValue.split(',');
      if (settingName === '출입통제 설정') {
        mssqlConfig.DB_HOST = configValues[0];
        mssqlConfig.DB_PORT = parseInt(configValues[1]);
        mssqlConfig.DB_DBNAME = configValues[2];
        mssqlConfig.DB_USER = configValues[3];
        mssqlConfig.DB_PASSWORD = configValues[4];
      } else if (settingName === '비상벨 설정') {
        ebellConfig.DB_HOST = configValues[0];
        ebellConfig.DB_PORT = parseInt(configValues[1]);
        ebellConfig.DB_DBNAME = configValues[2];
        ebellConfig.DB_USER = configValues[3];
        ebellConfig.DB_PASSWORD = configValues[4];
        ebellConfig.Socket_PORT = configValues[5];
      };
    };

    return {
      success: res.rowCount === 1
    };

  } catch (error) {
    logger.info('common/commonService.js, eventLogCheck, error: ', error);
    console.log('common/commonService.js, eventLogCheck, error: ', error);
  } finally {
    await client.release();
  };
};

exports.getSetting = async ({ settingName }) => {
  const client = await pool.connect();
  try {
    const binds = [settingName];
    const queryText = `
      SELECT
        setting_name,
        setting_value
      FROM
        main_setting
      WHERE
        setting_name=$1
    `;
    const res = await client.query({ text: queryText, values: binds });
    return res.rows;
  } catch (error) {
    logger.info('common/commonService.js, getSetting, error: ', error);
    console.log('common/commonService.js, getSetting, error: ', error);
  } finally {
    await client.release();
  };
};


exports.setInitialPosition = async ({ mainServiceName, lat, lng, zoom }) => {
  const result = { success: false };

  if (!mainServiceName || typeof lat !== 'number' || typeof lng !== 'number' || typeof zoom !== 'number') {
    return result;
  }

  try {
    await pool.query(`
      INSERT INTO initial_map_location (main_service_name, lat, lng, zoom_level)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (main_service_name)
      DO UPDATE SET 
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        zoom_level = EXCLUDED.zoom_level,
        updated_at = CURRENT_TIMESTAMP
    `, [mainServiceName, lat, lng, zoom]);

    result.success = true;
  } catch (error) {
    console.error('commonService.js, setInitialPosition, error:', error);
  }

  return result;
};


exports.getInitialPosition = async ({ mainServiceName }) => {
  if (!mainServiceName) return null;

  try {
    const res = await pool.query(
      `SELECT lat, lng, zoom_level FROM initial_map_location WHERE main_service_name = $1`,
      [mainServiceName]
    );

    if (res.rows.length > 0) return res.rows[0];

    // 초기 위치 반환
    const fallback = await pool.query(
      `SELECT lat, lng, zoom_level FROM initial_map_location WHERE main_service_name = 'default'`
    );

    return fallback.rows[0] || null;

  } catch (error) {
    console.error('commonService.js, getInitialPosition, error:', error);
    return null;
  }
};


exports.getSigunguBoundaryControl = async () => {

  try {
    const res = await pool.query(
      `SELECT sigungu_cd, sigungu_name, sido, selected FROM map_boundary_control;`,
    );

  
    return res.rows;

  } catch (error) {
    console.error('commonService.js, getSigunguBoundaryControl, error:', error);
    return null;
  }
};



exports.setSigunguBoundaryControl = async ({ items }) => {
  const result = { success: false }

  try {
    await pool.query(
      `
      WITH incoming AS (
        SELECT
          (elem->>'sigungu_cd')::text    AS sigungu_cd,
          (elem->>'selected')::boolean   AS selected
        FROM jsonb_array_elements($1::jsonb) AS elem
      )
      UPDATE map_boundary_control AS m
      SET selected   = i.selected,
          updated_at = NOW()
      FROM incoming AS i
      WHERE m.sigungu_cd = i.sigungu_cd;
      `,
      [JSON.stringify(items)] // ← 매개변수로 받은 items를 바로 사용
    )

    result.success = true
  } catch (error) {
    console.error('commonService.js, setSigunguBoundaryControl, error:', error)
  }

  return result
}

