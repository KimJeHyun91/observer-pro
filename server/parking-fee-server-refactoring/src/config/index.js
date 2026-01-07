/**
 * @file config/index.js
 * @description 제공된 .env 환경 변수 구조 및 pool.js, logger.js의 참조 방식에 맞춘 설정 관리 파일
 */

const dotenv = require('dotenv');
const path = require('path');

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
  // 서비스 기본 설정
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  // 게이트웨이(Gateway) 설정
  gatewayIp: process.env.GATEWAY_IP,
  gatewayPort: process.env.GATEWAY_PORT,
  corsOrigin: process.env.CORS_ORIGIN,

  // 데이터베이스(PostgreSQL) 설정 - pool.js의 config.database.PROPERTY 참조 방식에 맞춤
  database: {
    HOST: process.env.PGHOST || 'localhost',
    PORT: parseInt(process.env.PGPORT, 10) || 5432,
    DATABASE: process.env.PGDATABASE,
    USER: process.env.PGUSER,
    PASSWORD: process.env.PGPASSWORD,
    // pool.js 내부에서 직접 설정하지 않는 추가 옵션들
    MAX: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    IDLE_TIMEOUT: 30000,
    CONNECTION_TIMEOUT: 10000,
  },

  socketUrl: process.env.SOCKET_URL || `http://${process.env.GATEWAY_IP}:${process.env.GATEWAY_PORT}`,
  socketOptions: {
        reconnection: true,
        reconnectionAttempts: 10
    },

  // 소켓 서비스 설정
  socket: {
    clientUrl: process.env.SOCKET_CLIENT_URL || `http://${process.env.GATEWAY_IP}:${process.env.GATEWAY_PORT}`,
  },

  // 로깅 설정 - logger.js에서 config.log.LEVEL을 참조함
  log: {
    LEVEL: process.env.LOG_LEVEL || 'info',
  }
};

module.exports = config;