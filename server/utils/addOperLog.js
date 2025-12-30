const path = require('path');
const logger = require('../logger');
const fs = require('fs');
const { format, differenceInDays, parse } = require('date-fns');
const { insertLog } = require('../routes/common/services/commonService');


// const logPaths = {
//   'signInOut': path.join(__dirname, '../logs/signInOut.log'),
//   'addoper': path.join(__dirname, '../logs/operation.log')
// };
const logPaths = {
  'signInOut': path.join(process.cwd(), 'logs', 'signInOut.log'),
  'addoper': path.join(process.cwd(), 'logs', 'operation.log'),
  'contentsUpdate': path.join(process.cwd(), 'logs', 'operation.log')
};

function ensureLogFile(logFilePath) {
  const logFolder = path.dirname(logFilePath);
  if (!fs.existsSync(logFolder)) {
    fs.mkdirSync(logFolder, { recursive: true });
  }
  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '');
  }
}

async function readFromLogFile(logFilePath) {
  ensureLogFile(logFilePath);
  return fs.promises.readFile(logFilePath, 'utf8');
}

exports.addOperLog = async ({ logAction, operatorId, logType, logDescription, reqIp }) => {
  try {
    const logFilePath = logPaths[logAction];
    if (!logFilePath) {
      throw new Error(`log type error: ${logAction}`);
    }

    const beforeLog = await readFromLogFile(logFilePath);
    let dateTime = new Date();
    const now = format(dateTime, 'yyyy-MM-dd HH:mm:ss');
    const newLog = `[operator: ${operatorId} || log type: ${logType} || log description: ${logDescription} || datetime: ${now}]`;
    await fs.promises.writeFile(logFilePath, `${beforeLog}\n${newLog}`);
    await insertLog(operatorId, logType, logDescription, reqIp);
  } catch (error) {
    logger.info('utils/addOperLog.js, addOperLog, error: ', error);
    console.log('utils/addOperLog.js, addOperLog, error: ', error);
  }
}


exports.cleanupOldLogs = async () => {
  const retentionPeriod = 180; // 180일 (6개월)

  for (const [logAction, logFilePath] of Object.entries(this.logPaths)) {
    this.ensureLogFile(logFilePath); // 로그 파일이 존재하는지 확인하고 없으면 생성
    
    try {
      const data = await this.readFromLogFile(logFilePath);
      const lines = data.split('\n');

      // 오래된 로그 필터링
      const filteredLines = lines.filter(line => {
        const dateMatch = line.match(/datetime:\s*([^\]]+)/);
        if (dateMatch) {
          const logDate = parse(dateMatch[1], 'yyyy-MM-dd HH:mm:ss', new Date());
          return differenceInDays(new Date(), logDate) <= retentionPeriod;
        }
        return true; // 날짜 형식이 없으면 필터링하지 않음
      });
      await fs.promises.writeFile(logFilePath, filteredLines.join('\n'));
      console.log(`${logAction} 로그 정리 완료.`);
    } catch (error) {
      console.error(`${logAction} 로그 파일 정리 중 오류 발생:`, error);
    }
  }
}