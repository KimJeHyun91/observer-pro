const { Pool, types } = require('pg');
const { postgresqlConfig, ebellConfig } = require("../config");
const poolMap = new Map(); 

// postgresql bigint 값을 number 형식으로 출력하기 위해 적용
// parkingFee 에서 사용
types.setTypeParser(20, val => parseInt(val, 10));

// base DB
const pool = new Pool({
    host: postgresqlConfig.DB_HOST,
    port: postgresqlConfig.DB_PORT,
    database: postgresqlConfig.DB_DBNAME,
    user: postgresqlConfig.DB_USER,
    password: postgresqlConfig.DB_PASSWORD,
    min: 5,                          
    max: 30,                         
    idleTimeoutMillis: 30000,  
    allowExitOnIdle: true,     
    connectionTimeoutMillis: 8000,   
    query_timeout: 30000,            
    statement_timeout: 30000,       
    application_name: 'observer-server',
    keepalive: true,
    keepaliveInitialDelayMillis: 10000,
});

function getKey(config) {
  return `${config.DB_HOST}:${config.DB_PORT}:${config.DB_DBNAME}:${config.DB_USER}:${config.Socket_PORT}`;
};

function getOrCreatePoolEBell(config) {
  const key = getKey(config); // 설정값을 고유 키로 사용
  if (poolMap.has(key)) {
    const pool = poolMap.get(key);
    try {
      // 연결 확인
      checkPoolConnection(pool);
      return pool;
    } catch (e) {
      console.warn('기존 pool 연결 실패. 새로 생성');
    }
  }
  try {
    const pool = new Pool({
      host: ebellConfig.DB_HOST,
      port: ebellConfig.DB_PORT,
      database: ebellConfig.DB_DBNAME,
      user: ebellConfig.DB_USER,
      password: ebellConfig.DB_PASSWORD,
      
      min: 1,
      max: 30,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      allowExitOnIdle: false,
    });
    poolMap.clear();
    console.log('db/postgresqlPool.js, Connected to EBell Connection Pool');
    poolMap.set(key, pool);
    return pool;
  } catch(error) {
    console.log('db/postgresqlPool.js, EBell DB Connection Failed! : ', error);
  };

  async function checkPoolConnection(pool) {
    await pool.query('SELECT 1'); 
  }
}

pool.on('error', (err, client) => {
  console.error('예상치 못한 Pool 에러:', {
    message: err.message,
    code: err.code,
    timestamp: new Date().toISOString()
  });
});

module.exports = { getOrCreatePoolEBell, pool };

