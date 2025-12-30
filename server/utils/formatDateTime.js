const { addMinutes, subHours, subSeconds, format, addHours } = require('date-fns');
const logger = require('../logger');

exports.getExportArchiveVideoTime = async (occurDateTime) => {

  try {

    let returnValue = {};

    const formatDateTime = `${occurDateTime.substring(0, 4)}-${occurDateTime.substring(4, 6)}-${occurDateTime.substring(6, 8)} ${occurDateTime.substring(9, 11)}:${occurDateTime.substring(11, 13)}:${occurDateTime.substring(13, 15)}`;
    const syncDateTime = subHours(new Date(formatDateTime), 9);
    let startDateTime = subSeconds(new Date(syncDateTime), 10);
    let endDateTime = addMinutes(new Date(syncDateTime), 1);

    startDateTime = format(startDateTime, 'yyyyMMdd') + 'T' + format(startDateTime, 'HHmmss');
    endDateTime = format(endDateTime, 'yyyyMMdd') + 'T' + format(endDateTime, 'HHmmss');

    if(startDateTime && endDateTime) {
      returnValue = {
        startDateTime, endDateTime
      }
    }
   
    return returnValue;

  } catch(error) {
    logger.info('utils/formatDateTime.js, getExportArchiveVideoTime, error: ', error);
    console.log('utils/formatDateTime.js, getExportArchiveVideoTime, error: ', error);
  }
}

exports.parsingOccurTime = async (occurTime) => {

  try {
    
    const yearStr = occurTime.slice(0, 4);
    const monthStr = occurTime.slice(4, 6);
    const dayStr = occurTime.slice(6, 8);
    const hourStr = occurTime.slice(9, 11);
    const minuteStr = occurTime.slice(11, 13);
    const secondsStr = occurTime.slice(13, 15);

    const dateStr = yearStr + '-' + monthStr + '-' + dayStr + ' ' + hourStr + ':' + minuteStr + ':' + secondsStr;

    const dateOjb = addHours(new Date(dateStr), 9);

    return `${format(dateOjb, 'yyyyMMdd')}T${format(dateOjb, 'HHmmss')}`;
    
  } catch (error) {
    logger.info('utils/formatDateTime.js, parsingOccurTime, error: ', error);
    console.log('utils/formatDateTime.js, parsingOccurTime, error: ', error);
  };
};

exports.formatDateToYYYYMMDD = (date) => {
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${MM}${dd}`;
};

exports.formatDateToHHmmss = (date) => {
  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${HH}${mm}${ss}`;
};