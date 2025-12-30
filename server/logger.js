const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');
const fs = require("fs");
const path = require('path');
const os = require('os');
const { combine, timestamp, printf } = winston.format;

/**
 * @description : winston 로그 함수 
 * @description : logger.info(message) , logger.error(message)    
 * @param
 */
 
// if(!fs.existsSync(logDirectory)) {
//     fs.mkdirSync(logDirectory);
// }


const logDirectory = path.join(os.homedir(), 'ObserverProLogs');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const logger = winston.createLogger({
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    printf(info => {
      const splat = info[Symbol.for('splat')];
      let metaStr = '';
      if (splat) {
        metaStr = JSON.stringify(splat[0]);
      }
      return `[${info.timestamp}] [${info.level}] ${info.message}${metaStr}`;
    }),
  ),
  transports: [
    new winstonDaily({
      level: 'info',
      datePattern: 'YYYY-MM-DD',
      dirname: logDirectory,
      filename: `%DATE%.log`,
      maxFiles: 30,
      zippedArchive: true,
    })
  ],
});

if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
