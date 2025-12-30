const { getOrCreatePool } = require('../../db/mssqlPool');
const { pool } = require('../../db/postgresqlPool');
const logger = require('../../logger');
const fs = require('fs');
const path = require('path');
const serviceTypeService = require('../../routes/common/services/serviceTypeService');
const eventTypeService = require('../../routes/common/services/eventTypeService');
const { getLocation } = require('../../utils/getLocation');
const { mssqlConfig } = require('../../config');
const { getAccessCtlPerson, isNowInTimeRange } = require('../../routes/observer/services/accessService');
const dayjs = require('dayjs');
const { sendAligoSMS } = require('../../routes/observer/services/aligoService');
const { getSetting } = require('../../routes/common/services/commonService');
const { formatDateToYYYYMMDD, formatDateToHHmmss } = require('../../utils/formatDateTime');
const { subMonths } = require('date-fns/subMonths');

exports.pollingIstDataPerson = async() => {

  const mssqlClient = await getOrCreatePool(mssqlConfig);
  const client = await pool.connect();

  try {
    
    const query = `
    SELECT * FROM 
      "Data_Person" 
    ORDER BY 
      "PersonID";
    `;

    const resMssql = await mssqlClient.request().query(query);

    if((resMssql) && (resMssql.recordset) && (resMssql.recordset.length > 0)) {    

      const imageDir = path.join(process.cwd(), 'public', 'images', 'access_control_person');

      // 디렉터리 생성 (1회만)
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      resMssql.recordset.map((row) => {
        const personId = row['PersonID'];
        const imageRaw = row['PersonPhoto'];

        const imagePath = path.join(imageDir, `${personId}.png`);
        fs.writeFileSync(imagePath, imageRaw);
      });
      
      if(!process.env.USE_SMS || process.env.USE_SMS === 'false'){
        return;
      }

      const strArr = resMssql.recordset.map((row) => {
        const strValue = `(
          '${row['PersonID']}'
          , '${row['PersonLastName']}'
          , '${row['PersonMobileNo']}'
          , '${row['CompanyID']}'
          , '${row['CompanyName']}'
          , '${row['DepartmentID']}'
          , '${row['DepartmentName']}'
        )`;
        return strValue;
      });
      const queryValues = strArr.join(',');

      const queryString = `
        INSERT INTO ob_access_control_person AS ori (
          student_id
          , student_name
          , student_contact
          , school_id
          , school_name
          , class_id
          , class_name
        ) VALUES ${queryValues}
        ON CONFLICT (student_id) DO
        UPDATE SET
          student_name=EXCLUDED.student_name
        , student_contact=EXCLUDED.student_contact
        , school_id=EXCLUDED.school_id
        , school_name=EXCLUDED.school_name
        , class_id=EXCLUDED.class_id
        , class_name=EXCLUDED.class_name
        , updated_at=NOW()
        WHERE
        ori.student_name!=EXCLUDED.student_name OR
        ori.student_contact!=EXCLUDED.student_contact OR
        ori.school_id!=EXCLUDED.school_id OR
        ori.school_name!=EXCLUDED.school_name OR
        ori.class_id!=EXCLUDED.class_id OR
        ori.class_name!=EXCLUDED.class_name
      `;
      const result = await client.query(queryString);
      console.log(`accesscontrol person data polling: ${result.rowCount} rows`);
      if(result.rowCount > 0 && global.websocket) {
        global.websocket.emit("ob_accessCtl", { person: result.rowCount });
      };
    };

    return true;

  } catch (error) {
    logger.info('worker/pollings/accessControlPolling.js, pollingIstDataPerson, error: ', error);
    console.log('worker/pollings/accessControlPolling.js, pollingIstDataPerson, error: ', error);
    return false;
  }
}

exports.pollingIstSystemDevice = async() => {

  const mssqlClient = await getOrCreatePool(mssqlConfig);
  const client = await pool.connect();

  try {
    
    const querySystemDevice = `
    SELECT * FROM 
      "System_Device"
    `;
    const resMssql = await mssqlClient.request().query(querySystemDevice);

    if((resMssql) && (resMssql.recordset) && (resMssql.recordset.length > 0)) {
      const strArr = resMssql.recordset.map((row) => {
        const strValue = `(
        '${row['DeviceID']}'
        , '${row['DeviceName']}'
        , '${row['DeviceIP']}'
        , 'acu'
        , 'accesscontrol'
        )`;
        return strValue;
      });
      const queryValues = strArr.join(',');

      const queryString = `
      INSERT INTO "ob_device" AS ori (
        "device_id"
        , "device_name"
        , "device_ip"
        , "device_type"
        , "service_type"
      ) VALUES ${queryValues} 
      ON CONFLICT (device_ip) DO 
      UPDATE SET
        device_name=EXCLUDED.device_name
        , updated_at=NOW()
      WHERE 
        ori.device_name != EXCLUDED.device_name;
      `;

      await client.query('BEGIN');
      const resAcu = await client.query(queryString);
      console.log(`accesscontrol acu device polling: ${resAcu.rowCount} rows`);

      await client.query('COMMIT');

      if(resAcu.rowCount > 0 && global.websocket) {
        global.websocket.emit("ob_deviceList", { deviceList: resAcu.rowCount });
      } 
    }

  } catch (error) {
    logger.info('worker/pollings/accessControlPolling.js, pollingIstSystemDevice, error: ', error);
    console.log('worker/pollings/accessControlPolling.js, pollingIstSystemDevice, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.pollingIstSystemDeviceDoor = async() => {

  const mssqlClient = await getOrCreatePool(mssqlConfig);
  const client = await pool.connect();

  try {
    
    const querySystemDeviceDoor = `
    SELECT * FROM 
      "System_Device_Door"
    `;
    const resMssql = await mssqlClient.request().query(querySystemDeviceDoor);
    
    if((resMssql) && (resMssql.recordset) && (resMssql.recordset.length > 0)) {
      const strArr = resMssql.recordset.map((row) => {
        const strValue = `(
        '${(parseInt(row['DeviceID']) * 100) + parseInt(row['DoorID'])}'
        , '${row['DoorName']}'
        , '${'0.0.' + parseInt(row['DeviceID'])+'.'+parseInt(row['DoorID'])}'
        , 'door'
        , '${row['DoorLocationArea']}'
        , 'accesscontrol'
        )`;
        return strValue;
      });

      const queryValues = strArr.join(',');

      const queryString = `
      INSERT INTO "ob_device" AS ori (
        "device_id"
        , "device_name"
        , "device_ip"
        , "device_type"
        , "device_location"
        , "service_type"
      ) VALUES ${queryValues} 
      ON CONFLICT (device_ip) DO 
      UPDATE SET
        device_name=EXCLUDED.device_name
        , updated_at=NOW()
      WHERE 
        ori.device_name != EXCLUDED.device_name;
      `;

      await client.query('BEGIN');
      const resDoor = await client.query(queryString);
      console.log(`accesscontrol door device polling: ${resDoor.rowCount} rows`);

      await client.query('COMMIT');

      if(resDoor.rowCount > 0 && global.websocket) {
        global.websocket.emit("ob_deviceList", { deviceList: resDoor.rowCount });
      }
    }

  } catch (error) {
    logger.info('worker/pollings/accessControlPolling.js, pollingIstSystemDeviceDoor, error: ', error);
    console.log('worker/pollings/accessControlPolling.js, pollingIstSystemDeviceDoor, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

let lastLogDateDeviceNormal = 0;
let lastLogTimeDeviceNormal = 0;
exports.pollingIstLogDeviceNormal = async() => {

  const mssqlClient = await getOrCreatePool(mssqlConfig);
  const client = await pool.connect();
  try {
    
    let query = `
    SELECT * FROM 
      ob_access_control_log 
    ORDER BY 
      "LogDateTime" DESC 
    LIMIT 1;
    `;
    const resAccLog = await client.query(query);

    if ((resAccLog) && (resAccLog.rows) && (resAccLog.rows.length > 0)) {
      lastLogDateDeviceNormal = resAccLog.rows[0].LogDate;
      lastLogTimeDeviceNormal = resAccLog.rows[0].LogTime;
    } else if(resAccLog?.rows?.length === 0){
      const date = subMonths(new Date(), 6);
      lastLogDateDeviceNormal = formatDateToYYYYMMDD(date);
      lastLogTimeDeviceNormal = formatDateToHHmmss(date);
    }

    query = `
    SELECT TOP 10000
      t1.*
      , t2.DoorID AS "LogDoorID2"
    FROM 
      "Log_Device_Normal" t1
    LEFT OUTER JOIN 
      "System_Device_Door" t2 
    ON 
      t1.LogDoorName = t2.DoorName
    WHERE ("LogType"='0' OR "LogType"='1' OR "LogType"='3') 
    AND ("LogDate">=${lastLogDateDeviceNormal} AND "LogTime">${lastLogTimeDeviceNormal}) 
    OR ("LogDate">${lastLogDateDeviceNormal} AND "LogTime"<=${lastLogTimeDeviceNormal}) 
    ORDER BY 
      "LogIDX" ASC;
    `;
    // "LogDate" DESC
    // , "LogTime" DESC
    const resMssql = await mssqlClient.request().query(query);


    if((resMssql) && (resMssql.recordset) && (resMssql.recordset.length > 0)) {

      // 로그중 출입이벤트 로그만 추출
      const accessLogRecordset = resMssql.recordset.filter(row => row['LogType'] === '0');
      // 로그중 시스템 이벤트 로그만 추출
      const systemEventRecordset = resMssql.recordset.filter(row => row['LogType'] === '3');
      // 미등록 출입시도 로그만 추출
      const unRegisteredAccessAttemptRecordSet = resMssql.recordset.filter(row => row['LogType'] === '0' && row['LogStatus'] === '30');
      // 출입불가: 미승인 리더 출입시도
      const unAuthReaderAccessAttemptRecordSet = resMssql.recordset.filter(row => row['LogType'] === '0' && row['LogStatus'] === '33');
      // 출입불가: 출입제한 시간에 출입시도
      const restrictedHoursAccessAttemptRecordSet = resMssql.recordset.filter(row => row['LogType'] === '0' && row['LogStatus'] === '35');
      // 출입불가: 리더 출입제한 시간
      const restrictedHoursReaderRecordSet = resMssql.recordset.filter(row => row['LogType'] === '0' && row['LogStatus'] === '27');
      // 출입불가: 재인증 횟수초과
      const exceedReAuthCountLogRecordset = resMssql.recordset.filter(row => row['LogType'] === '0' && row['LogStatus'] === '7');
      // 강제출입문 열림 로그만 추출
      const forceOpenDoorLogRecordset = resMssql.recordset.filter(row => row['LogType'] === '1' && row['LogStatus'] === '6');
      // Anti-passback 로그만 추출
      const antiPassbackLogRecordset = resMssql.recordset.filter(row => row['LogStatus'] === '37' || row['LogStatus'] === '38' || row['LogStatus'] === '39');
      // 장시간 문 열림 이벤트
      const openLongHoursLogRecordset = resMssql.recordset.filter(row => row['LogStatus'] === '4' || row['LogStatus'] === '5');

      async function getCameraId(doorId) {
        const query = `SELECT camera_id FROM ob_device WHERE device_id='${doorId}' AND device_type='door'`;
        const result = await client.query(query);
        if(!result || !result.rows || result.rows.length === 0) {
          return null;
        }
        return result.rows[0].camera_id;
      }

      for(const acslog of resMssql.recordset){
        if(acslog.LogDeviceID && acslog.LogDoorID2 && (acslog.LogType === '0' || acslog.LogType === '1')){
          const doorId = (parseInt(acslog['LogDeviceID'])*100) + parseInt(acslog['LogDoorID2'])
          acslog.camera_id = await getCameraId(doorId)
        }
      }
    

      // 폴링한 로그 전체 저장
      const strArr = resMssql.recordset.map((row) => {
        const strValue = `(
          ${row['LogIDX']}, 
          '${row['LogDate']}', 
          '${row['LogTime']}',
          '${row['LogDate']}T${row['LogTime']}', 
          '${row['LogType']}', 
          '${row['LogStatus']}',
          '${row['LogStatusName']}', 
          '${row['LogRFID']}', 
          '${row['LogPIN']}', 
          '${row['LogIDType']}', 
          '${row['LogIDCredit']}', 
          '${row['LogAuthType']}', 
          '${row['LogDeviceID']}', 
          '${row['LogDeviceName']}', 
          '${row['LogReaderID']}', 
          '${row['LogReaderName']}', 
          '${(parseInt(row['LogDeviceID'])*100) + parseInt(row['LogDoorID2'])}', 
          '${row['LogDoorName']}', 
          '${row['LogInputMode']}', 
          '${row['LogInputID']}', 
          '${row['LogInputType']}', 
          '${row['LogInputName']}', 
          '${row['LogLocationArea']}', 
          '${row['LogLocationFloor']}', 
          '${row['LogPersonID']}', 
          '${row['LogPersonLastName']}', 
          '${row['LogPersonFirstName']}', 
          ${row['LogCompanyID']}, 
          '${row['LogCompanyName']}', 
          ${row['LogDepartmentID']}, 
          '${row['LogDepartmentName']}', 
          ${row['LogTitleID']}, 
          '${row['LogTitleName']}', 
          '${row['LastUpdateDateTime']}', 
          '${row['LogSystemWorkID']}',
          ${row['camera_id'] ? `'${row['camera_id']}'`: null}
          )
        `;
        return strValue;
      });

      const queryValues = strArr.join(',');

      const queryInsert = `
      INSERT INTO ob_access_control_log (
        "LogIDX", 
        "LogDate", 
        "LogTime",
        "LogDateTime",
        "LogType", 
        "LogStatus", 
        "LogStatusName", 
        "LogRFID", 
        "LogPIN", 
        "LogIDType", 
        "LogIDCredit", 
        "LogAuthType", 
        "LogDeviceID", 
        "LogDeviceName", 
        "LogReaderID", 
        "LogReaderName", 
        "LogDoorID", 
        "LogDoorName", 
        "LogInputMode", 
        "LogInputID", 
        "LogInputType", 
        "LogInputName", 
        "LogLocationArea", 
        "LogLocationFloor", 
        "LogPersonID", 
        "LogPersonLastName", 
        "LogPersonFirstName", 
        "LogCompanyID", 
        "LogCompanyName", 
        "LogDepartmentID", 
        "LogDepartmentName", 
        "LogTitleID", 
        "LogTitleName", 
        "LastUpdateDateTime", 
        "LogSystemWorkID",
        "camera_id"
      ) VALUES ${queryValues} 
      ON CONFLICT ("LogIDX") 
      DO UPDATE SET
        "LogIDX"=EXCLUDED."LogIDX", 
        "LogDate"=EXCLUDED."LogDate",
        "LogTime"=EXCLUDED."LogTime",
        "LogDateTime"=EXCLUDED."LogDateTime",
        "LogType"=EXCLUDED."LogType", 
        "LogStatus"=EXCLUDED."LogStatus", 
        "LogStatusName"=EXCLUDED."LogStatusName", 
        "LogRFID"=EXCLUDED."LogRFID", 
        "LogPIN"=EXCLUDED."LogPIN", 
        "LogIDType"=EXCLUDED."LogIDType", 
        "LogIDCredit"=EXCLUDED."LogIDCredit", 
        "LogAuthType"=EXCLUDED."LogAuthType", 
        "LogDeviceID"=EXCLUDED."LogDeviceID", 
        "LogDeviceName"=EXCLUDED."LogDeviceName", 
        "LogReaderID"=EXCLUDED."LogReaderID", 
        "LogReaderName"=EXCLUDED."LogReaderName", 
        "LogDoorID"=EXCLUDED."LogDoorID", 
        "LogDoorName"=EXCLUDED."LogDoorName", 
        "LogInputMode"=EXCLUDED."LogInputMode", 
        "LogInputID"=EXCLUDED."LogInputID", 
        "LogInputType"=EXCLUDED."LogInputType", 
        "LogInputName"=EXCLUDED."LogInputName", 
        "LogLocationArea"=EXCLUDED."LogLocationArea", 
        "LogLocationFloor"=EXCLUDED."LogLocationFloor", 
        "LogPersonID"=EXCLUDED."LogPersonID", 
        "LogPersonLastName"=EXCLUDED."LogPersonLastName", 
        "LogPersonFirstName"=EXCLUDED."LogPersonFirstName", 
        "LogCompanyID"=EXCLUDED."LogCompanyID", 
        "LogCompanyName"=EXCLUDED."LogCompanyName", 
        "LogDepartmentID"=EXCLUDED."LogDepartmentID", 
        "LogDepartmentName"=EXCLUDED."LogDepartmentName",
        "LogTitleID"=EXCLUDED."LogTitleID", 
        "LogTitleName"=EXCLUDED."LogTitleName", 
        "LastUpdateDateTime"=EXCLUDED."LastUpdateDateTime";
      `;
      const result = await client.query(queryInsert);
      if(result.rowCount > 0){
        this.pollingIstSystemDeviceDoorStatus();
      }
      // 출입이벤트 로그로 웹소켓 데이터 생성
      if (accessLogRecordset && accessLogRecordset.length > 0) {
        const websocketDataArr = [];

        accessLogRecordset.forEach((row) => {
          const websocketData = {
            LogIDX: row['LogIDX'],
            LogStatusName: row['LogStatusName'],
            LogStatus: row['LogStatus'],
            LogDoorID: parseInt(row['LogDeviceID'])*100 + parseInt(row['LogDoorID2']),
            LogDoorName: row['LogDoorName'],
            LogPersonID: row['LogPersonID'],
            LogPersonLastName: row['LogPersonLastName'],
            LogTitleName: row['LogTitleName'],
            LogDateTime: `${row['LogDate']}T${row['LogTime']}`,
          };
          websocketDataArr.push(websocketData);
        });

        if (websocketDataArr.length > 0) {
          if (global.websocket) {
            global.websocket.emit("ob_accessCtlLog", { accessControlLog: websocketDataArr });
          }
          if(process.env.USE_SMS === 'true') {
            const useSMSTime = await getSetting({ settingName: 'SMS 시간 설정' });
            const isRange = isNowInTimeRange(useSMSTime[0].setting_value);
            if(useSMSTime && useSMSTime[0] && useSMSTime[0].setting_value && isRange) {
              websocketDataArr.map(async(accessLog) => {
                const smsAccessLog = await getAccessCtlPerson({ studentId: accessLog.LogPersonID });
                if(!smsAccessLog || 
                  !smsAccessLog.rows || 
                  smsAccessLog.rows.length !== 1 || 
                  smsAccessLog.rows[0].use_sms === false ||
                  (!smsAccessLog.rows[0].next_of_kin_contact1 && !smsAccessLog.rows[0].next_of_kin_contact2)) {
                  return;
                }
                const accessDateTime = dayjs(accessLog.LogDateTime, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD HH:mm:ss');
                const { student_name, next_of_kin_contact1, next_of_kin_contact2 } = smsAccessLog.rows[0];
                try {
                  if(next_of_kin_contact1){
                    const result = await sendAligoSMS({
                      apiKey: process.env.ALIGO_API_KEY,
                      userId: process.env.ALIGO_USER_ID,
                      sender: process.env.ALIGO_SENDER,
                      receiver: next_of_kin_contact1,
                      message: `${student_name} 학생이 ${accessLog.LogDoorName}에 입소하였습니다. 입소시간: ${accessDateTime}`,
                    });
                    if(result && result.result_code !== '1' && global.websocket){
                      global.websocket.emit('ob_accessCtl_sms-fail', {
                        message: `${student_name} 학생 ${accessLog.LogDoorName} 입소 알림 SMS 전송 실패(${result.message})`,
                      });
                    };
                  }
                  if(next_of_kin_contact2){
                    const result = await sendAligoSMS({
                      apiKey: process.env.ALIGO_API_KEY,
                      userId: process.env.ALIGO_USER_ID,
                      sender: process.env.ALIGO_SENDER,
                      receiver: next_of_kin_contact2,
                      message: `${student_name} 학생이 ${accessLog.LogDoorName}에 입소하였습니다. 입소시간: ${accessDateTime}`,
                    });
                    if(result && result.result_code !== '1' && global.websocket){
                      global.websocket.emit('ob_accessCtl_sms-fail', {
                        message: `${student_name} 학생 ${accessLog.LogDoorName} 입소 알림 SMS 전송 실패(${result.message})`,
                      });
                    };
                  }
                } catch (error) {
                  logger.info('worker/pollings/accessControlPolling.js, pollingIstLogDeviceNormal, error: ', error);
                  console.log('worker/pollings/accessControlPolling.js, pollingIstLogDeviceNormal, error: ', error);
                  global.websocket && global.websocket.emit('ob_accessCtl_sms-fail', {
                    message: error.code === 'ENOTFOUND'?  `${student_name} 학생 ${accessLog.LogDoorName} 입소 알림 SMS 전송 실패(SMS 서비스가 연결 끊김)`: `${student_name} 학생 ${accessLog.LogDoorName} 입소 알림 SMS 전송 실패(${error.message})`,
                  });
                }
              })
            }
          }
        }
      }

      // 폴링한 시스템이벤트로그에서 화재신고 이벤트 생성하여 처리
      if (systemEventRecordset && systemEventRecordset.length > 0) {

        for (const row of systemEventRecordset) {
          // LogStatus: 0(로컬 화재), 1(글로벌 화재)
          if (row['LogStatus'] === '0' || row['LogStatus'] === '1') {

            const isActiveService = await serviceTypeService.getServiceTypeInfo({ service_type : 'accesscontrol' });
            const isActiveEvent = await eventTypeService.getEventTypeInfo({ id: 23 });
            
            if((isActiveService) && (isActiveService.length > 0) && (!isActiveService[0].use_service_type)) {
              console.log('출입통제 서비스 비활성화로 인한 화재신고 이벤트 발생하지 않음');
            } else if((isActiveEvent) && (isActiveEvent.length > 0) && (!isActiveEvent[0].use_event_type)) { 
              console.log('화재신고 이벤트 비활성화');
            } else {

              const eventType = isActiveEvent[0].event_type;
              const eventTypeId = isActiveEvent[0].event_type_id;
              const severity = isActiveEvent[0].severity_id;
              const useSOP = isActiveEvent[0].use_sop;
              const SOPIdx = isActiveEvent[0].sop_idx;
              const occurDateTime = `${row['LogDate']}T${row['LogTime']}`;
              const queryDevice = `
              SELECT * FROM 
                ob_device
              WHERE
                device_id = '${row['LogDeviceID']}'
              AND
                device_type = 'acu'
              `;
              const resDevice = await client.query(queryDevice);

              const deviceName = `${row['LogDeviceName']}`;
              let deviceType;
              let deviceIp;
              let deviceIdx;
              if(resDevice && resDevice.rows.length > 0 ) {
                deviceIdx = resDevice.rows[0].idx;
                deviceType = resDevice.rows[0].device_type;
                deviceIp = resDevice.rows[0].device_ip;
              };

              const mainServiceName = 'origin';
              const sqlEvent = `
              INSERT INTO event_log (
                  event_name, 
                  description,
                  event_occurrence_time, 
                  severity_id, 
                  sop_idx, 
                  device_idx,
                  device_type,
                  device_name,
                  device_ip,
                  event_type_id, 
                  main_service_name
              ) VALUES (
                '${eventType}', 
                '${deviceName} ${eventType}',
                '${occurDateTime}', 
                ${severity}, 
                ${SOPIdx},
                ${deviceIdx},
                '${deviceType}', 
                '${deviceName}', 
                '${deviceIp}',
                ${eventTypeId}, 
                '${mainServiceName}'
              ) RETURNING idx;
              `;

              const resEvent = await client.query(sqlEvent);

              const eventIdx = resEvent.rows[0].idx;              
              if(useSOP && SOPIdx){
                global.websocket && global.websocket.emit('ob_events-SOP', {
                  SOPEvent: {
                      SOPIdx,
                      eventIdx,
                      eventName: eventType,
                      eventTypeId,
                      mainServiceName,
                      occurDateTime,
                      severityId: severity,
                  }
                });
                global.websocket.emit('ob_events-update', { eventList: { 'create': eventIdx }});
                global.websocket.emit("cm_event_log-update", { eventLog: { 'update': resEvent.rowCount } });
                return;
              };
              await updateDoorStatus();
            }
          }
        } // for
      }
      
      if (unRegisteredAccessAttemptRecordSet && unRegisteredAccessAttemptRecordSet.length > 0) {
        let count = 0;
        for (const row of unRegisteredAccessAttemptRecordSet){
          count += 1;
          createACSDoorEvent(row, 24, null, count === unRegisteredAccessAttemptRecordSet.length);
        }
      }

      if (forceOpenDoorLogRecordset && forceOpenDoorLogRecordset.length > 0) {
        let count = 0;
        for (const row of forceOpenDoorLogRecordset){
          count += 1;
          createACSDoorEvent(row, 25, null, count === forceOpenDoorLogRecordset.length);
        };
      };

      if (antiPassbackLogRecordset && antiPassbackLogRecordset.length > 0) {
        let count = 0;
        for (const row of antiPassbackLogRecordset){
          count += 1;
          const eventTypeId = row['LogStatus'] === '37' ? 50 : row['LogStatus'] === '39' ? 49 : 48;
          createACSDoorEvent(row, eventTypeId, null, count === antiPassbackLogRecordset.length);
        } 
      }

      if (openLongHoursLogRecordset && openLongHoursLogRecordset.length > 0) {
        let count = 0;
        for (const row of openLongHoursLogRecordset){
          count += 1;
          row['LogStatus'] === '4' ? createACSDoorEvent(row, 51, '장시간 문 열림', count === openLongHoursLogRecordset.length):createACSDoorEvent(row, 52, '장시간 문 열림 종료', count === openLongHoursLogRecordset.length);
        };
      }

      if (exceedReAuthCountLogRecordset && exceedReAuthCountLogRecordset.length > 0) {
        let count = 0;
        for (const row of exceedReAuthCountLogRecordset){
          count += 1;
          createACSDoorEvent(row, 53, null, count === exceedReAuthCountLogRecordset.length);
        };
      };

      if (unAuthReaderAccessAttemptRecordSet && unAuthReaderAccessAttemptRecordSet.length > 0) {
        let count = 0;
        for (const row of unAuthReaderAccessAttemptRecordSet){
          count += 1;
          createACSDoorEvent(row, 54, null, count === unAuthReaderAccessAttemptRecordSet.length);
        };
      };

      if (restrictedHoursAccessAttemptRecordSet && restrictedHoursAccessAttemptRecordSet.length > 0) {
        let count = 0;
        for (const row of restrictedHoursAccessAttemptRecordSet){
          count += 1;
          createACSDoorEvent(row, 55, null, count === restrictedHoursAccessAttemptRecordSet.length);
        };
      };

      if (restrictedHoursReaderRecordSet && restrictedHoursReaderRecordSet.length > 0) {
        let count = 0;
        for (const row of restrictedHoursReaderRecordSet){
          count += 1;
          createACSDoorEvent(row, 56, null, count === restrictedHoursReaderRecordSet.length);
        };
      };

    }
  } catch (error) {
    logger.info('worker/pollings/accessControlPolling.js, pollingIstLogDeviceNormal, error: ', error);
    console.log('worker/pollings/accessControlPolling.js, pollingIstLogDeviceNormal, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }

  async function createACSDoorEvent(row, eventType, eventName = null, deviceUpdate = true) {

    const { LogStatusName, LogDoorName, LogDate, LogTime, LogDeviceID, LogDoorID2 } = row;
    eventName = eventName ? eventName:LogStatusName;
    const isActiveEvent = await eventTypeService.getEventTypeInfo({ id : eventType });
    if((isActiveEvent) && (isActiveEvent.length > 0) && (!isActiveEvent[0].use_event_type)) { 
      console.log(`${eventName} 이벤트 비활성화`);
    } else { 
      const deviceId = (parseInt(LogDeviceID)*100) + parseInt(LogDoorID2);
      const queryDevice = `
        SELECT 
          *
        FROM 
        ob_device
        WHERE 
          device_id='${deviceId}' 
        AND 
          device_type='door';
        `;
      const resDevice = await client.query(queryDevice);
      if(!resDevice || resDevice?.rows?.length === 0){
        console.log(`출입문 ${LogDoorName}이(가) db에 없습니다.(${eventName} 열림)`);
      } else if(!resDevice.rows[0].top_location || !resDevice.rows[0].left_location) {
        console.log(`출입문 ${LogDoorName}이(가) 맵에 등록되어 있지 않아 ${eventName} 이벤트 발생하지 않음.`);
      } else {
        const startDateTime = `${LogDate}T${LogTime}`;
        const { severity_id, sop_idx, use_sop, use_popup, event_type, event_type_id } = isActiveEvent[0];
        const severity = severity_id;
        const SOPIdx = sop_idx;
        const useSOP = use_sop;
        const usePopup = use_popup;
        const eventType = event_type;
        const eventTypeId = event_type_id;
        let mainServiceName = 'origin';
        let vmsName;
        let cameraId; 
        const { 
          idx: deviceIdx,
          device_ip,
          device_type,
          device_name,
          outside_idx,
          inside_idx,
          dimension_type,
          camera_id,
          top_location,
          left_location 
        } = resDevice.rows[0];

        const locationInfo = await getLocation(outside_idx, inside_idx);
        const sqlEvent = `
          INSERT INTO event_log (
            event_name, 
            description, 
            location, 
            event_occurrence_time, 
            severity_id, 
            sop_idx, 
            device_idx,
            device_type,
            device_name,
            device_ip,
            event_type_id, 
            main_service_name,
            outside_idx,
            inside_idx,
            dimension_type,
            camera_id
          )  VALUES (
            '${eventName}', 
            '${eventName} ${LogDoorName}', 
            '${locationInfo.location}', 
            '${startDateTime}', 
            ${severity}, 
            ${SOPIdx}, 
            ${deviceIdx}, 
            '${device_type}',
            '${device_name}',
            '${device_ip}',
            ${eventTypeId}, 
            '${mainServiceName}',
            ${outside_idx},
            ${inside_idx},
            '${dimension_type}',
            ${camera_id ? `'${camera_id}'`:null}
          ) RETURNING idx`;
          const resEvent = await client.query(sqlEvent);
          if(camera_id) {
            mainServiceName = camera_id.split(':')[0];
            vmsName = camera_id.split(':')[1];
            cameraId = camera_id.split(':')[2];
          } 
        const eventIdx = resEvent.rows[0].idx;
        if(useSOP && SOPIdx){
          global.websocket && global.websocket.emit('ob_events-SOP', {
            SOPEvent: {
              SOPIdx,
              eventIdx,
              eventName: eventType,
              locationInfo,
              eventTypeId,
              mainServiceName,
              outsideIdx: outside_idx,
              insideIdx: inside_idx,
              dimensionType: dimension_type,
              occurDateTime: startDateTime,
              severityId: severity,
              eventCameraId: camera_id
            }
          });
        } else if(usePopup){
          global.websocket && global.websocket.emit('ob_events-update', {
            eventPopup: {
              eventIdx,
              eventName: eventType,
              location: locationInfo.location,
              outsideIdx: outside_idx,
              insideIdx: inside_idx,
              dimensionType: dimension_type,
              deviceIdx: deviceIdx,
              deviceType: device_type,
              deviceName: `${deviceId}.${device_name}`,
              ipaddress: device_ip,
              cameraId,
              topLocation: top_location,
              leftLocation: left_location,
              severityId: severity,
              mapImageURL : locationInfo.mapImageURL,
              mainServiceName,
              vmsName,
            }
          });
        };
        if(global.websocket) {
          global.websocket.emit('ob_events-update', { eventList: { 'create': eventIdx } });
          global.websocket.emit("cm_event_log-update", { eventLog: { 'update': resEvent.rowCount } });
        };

        if(deviceUpdate) {
          await updateDoorStatus();
        }
      };
    };
  };
};

const updateDoorStatus = async () => {

  const client = await pool.connect();

  try {
    
    const queryUpdateState = `
    UPDATE ob_device
    SET alarm_status = true
    FROM (
      SELECT DISTINCT device_idx 
      FROM event_log
      WHERE 
        is_acknowledge = FALSE 
      AND 
        device_type='door'
    ) AS findDoor 
    WHERE 
      ob_device.idx = findDoor.device_idx;
    `;
    
    await client.query('BEGIN');
    const resUpdateState = await client.query(queryUpdateState);

    if (resUpdateState && resUpdateState.rowCount > 0) {
      if (global.websocket) {
        global.websocket.emit("ob_deviceList", { deviceList: resUpdateState.rowCount });
      }
    }

    await client.query('COMMIT');

  } catch (error) {
    logger.info('worker/pollings/accessControlPolling.js, updateDoorStatus, error: ', error);
    console.log('worker/pollings/accessControlPolling.js, updateDoorStatus, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  };
};

exports.pollingIstSystemDeviceDoorStatus = async() => {

  const mssqlClient = await getOrCreatePool(mssqlConfig);

  try {
    const querySystemDeviceDoor = `
      SELECT DeviceID, ConnectionStatus, LogOutputStatus 
      FROM Comm_Device_Status
    `;
    const resMssql = await mssqlClient.request().query(querySystemDeviceDoor);

    if (!resMssql?.recordset?.length) {
      console.log('No device status found');
      return;
    }

    for (const row of resMssql.recordset) {
      const acuId = row.DeviceID; // 예: "002"
      const connectionStatus = row.ConnectionStatus === '1' ? true:false; // 예: 1
      const logOutputStatus = row.LogOutputStatus; // 예: "00000010"
      const doorBase = parseInt(acuId, 10) * 100; // 002 → 200
     const doorIds = Array.from({ length: 4 }, (_, i) => doorBase + i + 1); // [201,202,203,204]

      // PostgreSQL 커넥션
      const client = await pool.connect();
      let isUpdateTotalCnt = 0;
      try {
        await client.query('BEGIN');

        // ① 연결 상태 일괄 업데이트
        const resLinkedStatus =         await client.query(
          `UPDATE ob_device 
            SET linked_status = $1 
            WHERE device_id = TEXT($2::int[]) AND linked_status != $1`,
          [connectionStatus, doorIds]
        );
        isUpdateTotalCnt += resLinkedStatus.rowCount;
        // ② 2자리씩 나누어 문 상태 업데이트
        for (let i = 0; i < 4; i++) {
          const pair = logOutputStatus.slice(i * 2, i * 2 + 2); // 2자리씩 추출
          const firstBit = pair.charAt(0); // 첫 번째 자리만 사용
          const lockStatus = firstBit === '1' ? false : true;
          const doorId = doorIds[i];

          const res = await client.query(
            `UPDATE ob_device 
              SET is_lock = $1 
              WHERE device_id = $2 AND is_lock != $1`,
            [lockStatus, doorId]
          );
          isUpdateTotalCnt += res.rowCount
        }
        await client.query('COMMIT');
        if(isUpdateTotalCnt > 0 && global.websocket){
          global.websocket.emit('ob_doors-update', { doorList: {'update':isUpdateTotalCnt} });
        }
      } catch (pgErr) {
        await client.query('ROLLBACK');
        console.error('PostgreSQL update error:', pgErr);
      } finally {
        client.release();
      }
    }
  } catch (err) {
    console.error('MSSQL sync error:', err);
  }
}