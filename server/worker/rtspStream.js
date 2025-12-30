const { pool } = require('../db/postgresqlPool');
const logger = require('../logger');

exports.requestFindVms = async (mainServiceName, vmsName) => {
  const client = await pool.connect();
  try {
      let binds = [mainServiceName, vmsName];
      const queryVms = `
        SELECT * FROM 
          ob_vms
        WHERE
          main_service_name = $1
        AND
          vms_name = $2;
        `;
      const resVms = await client.query(queryVms, binds);
      if(!resVms || !resVms.rows || resVms.rows.length !== 1){
        console.log(`해당 vms(${vmsName})가 없습니다.`);
        return;
      }
      const vms = resVms.rows[0];
      return {
        vms_id: vms.vms_id,
        vms_pw: vms.vms_pw,
        vms_ip: vms.vms_ip,
        vms_port: vms.vms_port
      };
  } catch(error){
    console.error(error);
  } finally {
    client.release();
  }
};

/**
 * VMS 요청 연결 실패 시 다른 VMS에 요청
 * *전제: VMS List가 같은 도메인이어야 함
 */

exports.requestDomainVmsList = async (mainServiceName, vmsName, cameraId, callback) => {
  let result = {
    success: false
  }
  let binds = [mainServiceName, vmsName];
  const query = `
  SELECT * FROM 
    ob_vms
  WHERE
    main_service_name = $1
    AND
    vms_name != $2;
  `;
  const client = await pool.connect();
  try {
    const resVmsList = await client.query(query, binds);
    if (resVmsList && resVmsList.rows.length > 0) {
      for(let vms of resVmsList.rows) {
          const callbackRes = await callback({ 
            username: vms.vms_id, 
            password: vms.vms_pw, 
            mgist_ip: vms.vms_ip, 
            mgist_port: vms.vms_port, 
            vms_name: vmsName, 
            cameraId
          })
          .catch((error) => {
            if(error.code === 'ECONNABORTED'){
              console.log(`${vms.vms_ip}:${vms.vms_port} is ECONNABORTED)`);
          }});
          if(callbackRes?.status === 200){
            result.success = true;
            result.data = callbackRes;
            break; // 영상 찾으면 반복문 탈출
          }
      }
      return result;
    };
  } catch (error) {
    logger.info('worker/rtspStream.js, function requestDomainVmsList, error: ', error);
    console.log('worker/rtspStream.js, function requestDomainVmsList, error: ', error);
    result.message = error.message;
    return {
      success: false,
      message: error.message
    }
  } finally {
    client.release();
  };
}