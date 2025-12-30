const mssql = require("mssql");
const poolMap = new Map(); 
const logger = require('../logger');

async function getOrCreatePool(config) {
  const key = JSON.stringify(config); // 설정값을 고유 키로 사용
  if (poolMap.has(key)) {
    const pool = poolMap.get(key);
    if (pool.connected) return pool;
  }
  try {
    const pool = await new mssql.ConnectionPool({
      server: config.DB_HOST,
      port: config.DB_PORT,
      pool: {
        max: 10,
        min: 1,
        idleTimeoutMillis: 30000,
      },
      options: {
        encrypt: false,
        database: config.DB_DBNAME,
        trustServerCertificate: true,
      },
      authentication: {
        type: 'default',
        options: {
          userName: config.DB_USER,
          password: config.DB_PASSWORD,
        },
      }
    }).connect();
    poolMap.clear();
    console.log('db/mssqlPool.js, Connected to MSSQL Pool');
    poolMap.set(key, pool);
    return pool;
  } catch(error) {
    logger.info('db/mssqlPool.js, Connection Failed! : ', error);
    console.log('db/mssqlPool.js, Connection Failed! : ', error);
  };
}

module.exports = { getOrCreatePool };