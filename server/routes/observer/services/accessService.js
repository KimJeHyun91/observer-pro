const dayjs = require('dayjs');
const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const accessControlPolling = require("../../../worker/pollings/accessControlPolling");
const accessCtlMapper = require('../mappers/accessCtlMapper');

exports.getAccessControlLog = async ({ 
  status, 
  doorId, 
  startDateTime, 
  endDateTime, 
  startDate, 
  endDate, 
  startTime, 
  endTime, 
  personId, 
  personName, 
  limit
}) => {
  
  const client = await pool.connect();

  try {
      
    let condition1 = '';
    let condition2 = '';
    let limitCondition = ''

    if (status) {
      condition2 += `AND "LogStatus"='${status}'`;
    }

    if (doorId) {
      condition2 += `AND "LogDoorID"='${doorId}'`;
    }

    if (startDateTime && endDateTime) {
      condition1 += `AND "LogDateTime" BETWEEN '${startDateTime}' AND '${endDateTime}'`;
    } else if (startDateTime) {
      condition1 += `AND "LogDateTime" >= '${startDateTime}'`;
    } else if (endDateTime) {
      condition1 += `AND "LogDateTime" <= '${endDateTime}'`;
    };

    if (startDate && endDate) {
      condition1 += `AND "LogDate" BETWEEN '${startDate}' AND '${endDate}'`;
    } else if (startDate) {
      condition1 += `AND "LogDate" >= '${startDate}'`;
    } else if (endDate) {
      condition1 += `AND "LogDate" <= '${endDate}'`;
    };

    if (startTime && endTime) {
      condition1 += `AND "LogTime" BETWEEN '${startTime}' AND '${endTime}'`;
    } else if (startTime) {
      condition1 += `AND "LogTime" >= '${startTime}'`;
    } else if (endTime) {
      condition1 += `AND "LogTime" <= '${endTime}'`;
    };

    if (personId) {
      condition2 += `AND "LogPersonID"='${personId}'`;
    }

    if (personName) {
      condition2 += `AND "LogPersonLastName"='${personName}'`;
    }

    if (!status && !doorId && !startDateTime && !endDateTime && !personId && !personName && limit) {
      limitCondition = `LIMIT ${limit}`;
    }

    const query = `SELECT * FROM "ob_access_control_log" WHERE "LogType"='0' AND "LogStatus"='0' ${condition2} ${condition1} ORDER BY "LogDateTime" DESC ${limitCondition}`;
    const results = await client.query(query);

    return results.rows;

  } catch(error) {
    logger.info('accessService.js, getAccessControlLog, error: ', error);
    console.log('accessService.js, getAccessControlLog, error: ', error);
  } finally {
    await client.release();
  }
}

exports.reloadAccessControlPerson = async () => {
  try {
    return accessControlPolling.pollingIstDataPerson();
  } catch (error) {
    logger.info('accessService.js, reloadAccessControlPerson, error: ', error);
    console.log('accessService.js, reloadAccessControlPerson, error: ', error);
  }
}

exports.accessEventRec = async (deviceInfo, device_type) => {

  const client = await pool.connect();

  try {

    let query;

    if (device_type === 'camera' || device_type === 'door' || device_type === 'zone') {
      query = `
      SELECT E.*, T.name AS event_type_name 
      FROM event_log E 
      LEFT JOIN ob_event_type T 
      ON E.event_type=T.idx 
      WHERE id='${deviceInfo}' 
      AND device_type='${device_type}' 
      ORDER BY 
        event_occurrence_time DESC;
      `;
    } else if (device_type === 'vitalsensor' || device_type === 'guardianlite' || device_type === 'ebell') {
      query = `
      SELECT E.*, T.name AS event_type_name 
      FROM event_log E 
      LEFT JOIN ob_event_type T 
      ON E.event_type=T.idx 
      WHERE ipaddress='${deviceInfo}' 
      ORDER BY 
        event_occurrence_time DESC;
      `;
    }

    const res = await client.query(query);

    return res.rows;
    
  } catch (error) {
    logger.info('accessService.js, accessEventRec, error: ', error);
    console.log('accessService.js, accessEventRec, error: ', error);
  } finally {
    await client.release();
  };
};

exports.modifyAccessCtlPerson = async ({ idx, next_of_kin_name, next_of_kin_contact1, next_of_kin_contact2, use_sms }) => {
  
  const client = await pool.connect();

  try {

    let binds = [idx, next_of_kin_name, next_of_kin_contact1, next_of_kin_contact2, use_sms];

    let query = await accessCtlMapper.modifyAccessCtlPerson();
    
    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      global.websocket.emit("accessCtl", { 
        person: result.rowCount
      });
    };
    return result;

  } catch (error) {
    logger.info('observer/services/accessService.js, modifyAccessCtlPerson, error: ', error);
    console.log('observer/services/accessService.js, modifyAccessCtlPerson, error: ', error);
  } finally {
    await client.release();
  };
};

exports.removeAccessCtlPerson = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    let binds = [idx];

    let query = await accessCtlMapper.removeAccessCtlPerson();
    
    let result = await client.query(query, binds);
    if (result.rowCount > 0 && global.websocket) {
      global.websocket.emit("accessCtl", { 
        person: result.rowCount
      });
    };
    return result;

  } catch (error) {
    logger.info('observer/services/accessService.js, removeAccessCtlPerson, error: ', error);
    console.log('observer/services/accessService.js, removeAccessCtlPerson, error: ', error);
  } finally {
    await client.release();
  };
};

exports.getAccessCtlPerson = async ({ studentId, studentName, className }) => {
  const client = await pool.connect();

  try {
    let { query, binds } = accessCtlMapper.getAccessCtlPerson({ studentId, studentName, className });
    
    return await client.query(query, binds);

  } catch (error) {
    logger.info('observer/services/accessService.js, getAccessCtlPerson, error: ', error);
    console.log('observer/services/accessService.js, getAccessCtlPerson, error: ', error);
  } finally {
    await client.release();
  };
};

/**
 * 현재 시간이 여러 시간 범위 중 적어도 하나에 포함되고, 제외(!) 범위에는 속하지 않는지 확인
 * @param {string} timeRanges 예: "!08:30:00~17:30:00,18:00:56~23:30:56"
 * @returns {boolean}
 */
exports.isNowInTimeRange = (timeRanges) => {
  const now = dayjs();
  const today = now.format('YYYY-MM-DD');

  const ranges = timeRanges.split(',');

  let isIncluded = false;

  for (let range of ranges) {

    // !로 시작하면 제외 범위
    if (range.startsWith('!')) {
      continue;
    }

    const [startStr, endStr] = range.split('~');
    let start = dayjs(`${today} ${startStr}`);
    let end = dayjs(`${today} ${endStr}`);

    // 자정을 넘는 경우 처리
    if (start.isAfter(end)) {
      end = end.add(1, 'day');
    }

    const inRange = now.isAfter(start) && now.isBefore(end);

    if (inRange) {
      isIncluded = true; // 포함 조건에 들어감
    }
  }
  return isIncluded;
};