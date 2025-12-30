const path = require("path");
// require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(process.cwd(), ".env") }); 

// 서버 정보
const serverConfig = {
  WEB_PROTOCOL  : 'http',
  WEBSOCKET_URL : 'localhost',
  PORT          : '4200',
  IPv4          : ''
}

// 옵저버: 출입통제 DB
const mssqlConfig = {
  // DB_HOST     : '192.168.0.252', 
  // DB_PORT     : 1433,
  // DB_DBNAME   : 'ISTDB',
  // DB_USER     : 'sa', 
  // DB_PASSWORD : 'admin1234',
  DB_HOST     : '', 
  DB_PORT     : '',
  DB_DBNAME   : '',
  DB_USER     : '', 
  DB_PASSWORD : '', 
}

// Base DB
const postgresqlConfig = {
  DB_HOST      : "localhost",
  DB_PORT      : 5432,
  DB_DBNAME   : "observer_pro",
  DB_USER      : "postgres",
  DB_PASSWORD  : "admin1234",
}

// 옵저버: 비상벨
const ebellConfig = {
  // DB_HOST     : "192.168.5.51",
  // DB_PORT     : 5432,
  // DB_DBNAME   : "ebell",
  // DB_USER     : "postgres",
  // DB_PASSWORD : "admin1234",
  // Socket_PORT : 4100,
  DB_HOST     : '',
  DB_PORT     : '',
  DB_DBNAME   : '',
  DB_USER     : '',
  DB_PASSWORD : '',
  Socket_PORT : '',
}

const mySqlConfig = {
  WATER_DB_HOST:"localhost",
  WATER_DB_PORT:3306,
  WATER_DB_DBNAME:"waterlv",
  WATER_DB_USER:"root",
  WATER_DB_PASSWORD:"edscorp1!"
}

// 침수: 스피커 ID/PW
const speakerConfig = {
  USER_NAME     : "root",
  USER_PASSWORD : "git123123@"
}

const waterLevelModel = {
  AIBOX : "AI BOX", // PCT 수위계 모델
  CP100 : 'Mago CP100', // 마고 수위계 모델
  WOORITECH: 'Wooritech'  // 우리기술 수위계 모델
}

const CONTROL_CONFIG = {
  GROUP_PRIORITY: true,        // 그룹 제어 우선
  ALLOW_FALLBACK: false,       // 개별 제어 폴백 허용
  LOG_DETAILED: true          // 상세 로깅
};

const mainServiceName = {
  observer    : "observer", // 옵저버
  inundation  : "inundation", // 침수차단
  vehicle     : "vehicle", // 차량관리
  parking     : "parking", // 주차관리
  tunnel      : "tunnel", // 터널관리
  broadcast   : "broadcast", // 마을방송
}

const mapConfig = {
  initialLat: process.env.INITIAL_POSITION_LAT, 
  initialLng: process.env.INITIAL_POSITION_LNG,
};

const failOverConfig = {
  // prod Failover 정보 적용
  ip: '192.168.7.202',
  port: 11104
};

// 유지보수 만료일 알림일
const DAYS_TO_NOTIFY = [1, 7, 30, 90, 180];

module.exports = {
  serverConfig,
  mapConfig,
  mssqlConfig,
  postgresqlConfig,
  ebellConfig,
  speakerConfig,
  mainServiceName,
  failOverConfig,
  waterLevelModel,
  DAYS_TO_NOTIFY,
  mySqlConfig
};