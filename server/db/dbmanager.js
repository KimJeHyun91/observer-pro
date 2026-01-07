const os = require('os');
const { Client } = require('pg');
const logger = require('../logger');
const { postgresqlConfig } = require('../config');


const createDatabase = async () => {

  try {

    const clientInit = new Client({
      host: postgresqlConfig.DB_HOST,
      port: postgresqlConfig.DB_PORT,
      database: "postgres",
      user: postgresqlConfig.DB_USER,
      password: postgresqlConfig.DB_PASSWORD
    });

    await clientInit.connect();

    const res = await clientInit.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname='${postgresqlConfig.DB_DBNAME}'`);
    
    if (res.rows.length === 0) {
      // DB 생성
      // postgresql create database 에서 db이름은 쌍따옴표(")로 묶는게 좋음(공식문서 참조)
      // 템플릿 데이터베이스의 로케일(정렬/문자분류)을 그대로 상속받도록 LC_COLLATE/LC_CTYPE 지정 제거
      const queryCreateDb = `CREATE DATABASE "${postgresqlConfig.DB_DBNAME}" WITH OWNER = postgres ENCODING = 'UTF8' TABLESPACE = pg_default CONNECTION LIMIT = -1;`;

      await clientInit.query(queryCreateDb);
      console.log('DB Check: observer database created');
      
    } else {
      console.log('DB Check: observer database exist');
    }
    await clientInit.end();

  } catch (error) {
    logger.info('db/dbmanager.js, createDatabase, error: ', error);
    console.log('db/dbmanager.js, createDatabase, error: ', error);
  }
}

const commonDBmanager = require('./query/commonDBmanager');
const observerDBmanager = require('./query/observerDBmanager');
const inundationControlDBmanager = require('./query/inundationControlDBmanager');

const broadcastDBmanager = require('./query/broadcastDBmanager');
const tunnelDBmanager = require('./query/tunnelDBmanager');
const productManagerDBmanager = require('./query/productManagerDBmanager');
const threedDBmanager = require('./query/threedDBmanager');

// 주차 요금 DB 스키마
// const parkingDBmanager = require('./query/parkingDBmanager');
const { initParkingFeeDbSchema } = require('../parking-fee-server-refactoring/parking-fee.dbmanger');

exports.initMainDb = async () => {

  try {

    await createDatabase();
    await commonDBmanager.createTables();
    await observerDBmanager.createTables();
    await inundationControlDBmanager.createTables();
    await broadcastDBmanager.createTables();
    await tunnelDBmanager.createTables();
    
    await productManagerDBmanager.createTables();
    await threedDBmanager.createTables();

    // 주차 요금 DB 스키마
    // await parkingDBmanager.createTables();
    await initParkingFeeDbSchema();

    // DB 생성 완료 후 폴링 시작
    require('../worker/dbPolling').startDbPolling(); // 옵저버 폴링
    // require('../worker/inundation/inundationPolling').startDevicePolling(); // 침수 폴링
    // require('../worker/parking/parkingPolling').startDbPolling(); // 주차유도 폴링
    // require('../worker/broadcast/broadcastPolling').startDevicePolling(); // 마을방송 폴링
    // require('../worker/tunnel/barrierStatusPolling')
    // require('../worker/tunnel/tunnelPolling').startDevicePolling(); // 터널 폴링

  } catch (error) {
    logger.info('db/commonDBmanager.js, initMainDb, error: ', error);
    console.log('db/commonDBmanager.js, initMainDb, error: ', error);
  }
}