const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const axios = require('axios');
const vmsMapper = require('../mappers/vmsMapper');
const eventMapper = require('../mappers/eventMapper');
const fs = require('fs');
const path = require('path');


exports.getSnapshot = async ({ eventTime, eventIdx }) => {

  const client = await pool.connect();

  let returnValue = {
    status: false,
    message: 'fail'
  };

  try {

    let binds = [];
    let query = await vmsMapper.getVmsList();
    const resVmsList = await client.query(query, binds);

    // vms 가 있으면
    if(resVmsList && resVmsList.rows.length > 0) {

      const vmsId = resVmsList.rows[0].vms_id;
      const vmsPw = resVmsList.rows[0].vms_pw;
      const vmsIp = resVmsList.rows[0].vms_ip;
      const vmsPort = resVmsList.rows[0].vms_port;
      const vmsName = resVmsList.rows[0].vms_name;

      const vmsUrl = `http://${vmsId}:${vmsPw}@${vmsIp}:${vmsPort}`;

      binds = [eventIdx];
      query = await eventMapper.getEventInfo();
      const resEventInfo = await client.query(query, binds);

      // 이벤트 정보가 있으면
      if(resEventInfo && resEventInfo.rows.length > 0) {

        let url = vmsUrl + "/export/archive/" + vmsName + "/" + "DeviceIpint." + resEventInfo.rows[0].camera_id + "/SourceEndpoint.video:0:0/" + eventTime + "/" + eventTime;
        let exportId = "";
        const queryString = {
          "format": "jpg"
        };

        let postData = JSON.stringify(queryString);
        const result = await axios({
          method: "post",
          url: url,
          headers: {
            "Connection": 'keep-alive',
            "Content-Type": 'application/json',
            "Content-Length": Buffer.byteLength(postData)
          },
          "data": postData,
          "accept": "*/*",
          "withCredentials": true,
          "responseType": "json",
        })
        exportId = result.headers.location;

        returnValue.status = true;
        returnValue.message = {
          vmsUrl,
          exportId,
        };

      } else {
        // 이벤트 정보가 없으면
        returnValue.message = '해당 이벤트가 없습니다.';
        console.log('해당 이벤트가 없습니다.');
      }

    } else {
      // vms 가 없으면
      returnValue.message = 'VMS 정보가 없습니다.';
      console.log('VMS 정보가 없습니다.');
    }

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/snapShotService.js, getSnapshot, error: ', error);
    console.log('inundationControl/snapShotService.js, getSnapshot, error: ', error);
    returnValue.message = error;
  } finally {
    await client.release();
  }
}

exports.snapshotLocalPathSave = async ({ url, eventOccurrenceTime, camId, eventIdx }) => {

  const client = await pool.connect();

  let returnValue = {
    status: false,
    message: 'fail'
  };

  try {
    
    if(url) {

      // const imagePath = path.join(__dirname, '../../../', 'public', 'images', 'crowd_density_snapshot', `DeviceIpint.${camId}_${eventOccurrenceTime}_snapshot.jpg`);
      const imagePath = path.join(
        process.cwd(),
        'public',
        'images',
        'crowd_density_snapshot',
        `DeviceIpint.${camId}_${eventOccurrenceTime}_snapshot.jpg`
      );
      const dbSaveSnapshotPath = `/images/event_snapshot/DeviceIpint.${camId}_${eventOccurrenceTime}_snapshot.jpg`;
      
      let binds = [eventIdx, dbSaveSnapshotPath];
      const querySnapShotPathEvent = await eventMapper.modifySnapShotPathEvent();

      await client.query('BEGIN');
      const resSnapShotPathEvent = await client.query(querySnapShotPathEvent, binds);

      if(resSnapShotPathEvent && resSnapShotPathEvent.rows.length > 0) {

        await download_image(url, imagePath);
      }

      returnValue.status = true;
      returnValue.message = 'snapshot save success';

      await client.query('COMMIT');

    } else {
      console.log('snapshotLocalPathSave, url 정보가 없습니다.');
    }

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/snapShotService.js, snapshotLocalPathSave, error: ', error);
    console.log('inundationControl/snapShotService.js, snapshotLocalPathSave, error: ', error);
    await client.query('ROLLBACK');
    returnValue.message = error;
  } finally {
    await client.release();
  }
}

const download_image = async (url, image_path) => {

  try {

    if (url) {

      const res = await axios({
        url,
        responseType: 'stream',
        auth: {
          username: 'root',
          password: 'root',
        },
      });
      if (res && res.data) {
        res.data.pipe(fs.createWriteStream(image_path));
      }
      
    } else {
      console.log('download_image, url 정보가 없습니다.');
    }

  } catch (error) {
    logger.info('inundationControl/snapShotService.js, download_image, error: ', error);
    console.log('inundationControl/snapShotService.js, download_image, error: ', error);
  }
}

exports.delSnapshot = async ({ exportId }) => {

  const client = await pool.connect();

  let returnValue = {
    status: false,
    message: 'fail'
  };

  try {

    let binds = [];
    let query = await vmsMapper.getVmsList();
    const resVmsList = await client.query(query, binds);

    // vms 가 있으면
    if(resVmsList && resVmsList.rows.length > 0) {

      const vmsId = resVmsList.rows[0].vms_id;
      const vmsPw = resVmsList.rows[0].vms_pw;
      const vmsIp = resVmsList.rows[0].vms_ip;
      const vmsPort = resVmsList.rows[0].vms_port;

      const vmsUrl = `http://${vmsId}:${vmsPw}@${vmsIp}:${vmsPort}`;

      const deleteUrl = vmsUrl + exportId;
      
      await axios({
        method: 'delete',
        url: deleteUrl
      })

      returnValue.status = true;
      returnValue.message = 'delete success';

    } else {
      // vms 가 없으면
      returnValue.message = 'VMS 정보가 없습니다.';
      console.log('VMS 정보가 없습니다.');
    }

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/snapShotService.js, delSnapshot, error: ', error);
    console.log('inundationControl/snapShotService.js, delSnapshot, error: ', error);
    returnValue.message = error;
  } finally {
    await client.release();
  }
}

exports.makeDownloadUrl = async ({ serverUrl, exportId }) => {
  
  let returnValue = {
    status: false,
    message: 'fail'
  };

  try {

    let reqUrl = serverUrl + exportId + "/status";

    const res = await axios({
      method: "get",
      url: reqUrl,
      responseType: "json",
    })

    if (res) {

      if (res.data.state === 2) {

        let downloadUrl = serverUrl + exportId + "/file?name=" + res.data.files[0];

        returnValue.status = true;
        returnValue.message = downloadUrl;

      } else {

        returnValue.message = res.data.state;
      }

    } else {
      console.log('이미지 status 호출 실패');
      returnValue.message = '이미지 status 호출 실패';
    }

    return returnValue;
  }
  catch (error) {
    logger.info('inundationControl/snapShotService.js, makeDownloadUrl, error: ', error);
    console.log('inundationControl/snapShotService.js, makeDownloadUrl, error: ', error);
    returnValue.message = error;
  }
}

exports.getSnapshotPath = async ({ eventIdx }) => {

  const client = await pool.connect();

  try {

    let binds = [eventIdx];
    let query = await eventMapper.getEventInfo();
    const resEventInfo = await client.query(query, binds);

    return resEventInfo.rows;

  } catch (error) {
    logger.info('inundationControl/snapShotService.js, getSnapshot, error: ', error);
    console.log('inundationControl/snapShotService.js, getSnapshot, error: ', error);
  } finally {
    await client.release();
  }
}