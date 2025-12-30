const { addHours } = require('date-fns/addHours');
const { addSeconds } = require('date-fns/addSeconds');
const { format } = require('date-fns/format');
const logger = require('../logger');

exports.updateStartDateTime = (startDateTime, calcVal) => {
  try {
    const formatStartDateTime = `${startDateTime.substring(0, 4)}-${startDateTime.substring(4, 6)}-${startDateTime.substring(6, 8)} ${startDateTime.substring(9, 11)}:${startDateTime.substring(11, 13)}:${startDateTime.substring(13, 15)}`;
    let calculateStartDateTime = addHours(new Date(formatStartDateTime), -9);
    calculateStartDateTime = addSeconds(calculateStartDateTime, calcVal);
    return `${format(calculateStartDateTime, 'yyyyMMdd')}T${format(calculateStartDateTime, 'HHmmss')}`;
  } catch (error) {
    logger.info('utils/calcDateTime.js, function updateStartDateTime, error: ', error);
    console.log('utils/calcDateTime.js, function updateStartDateTime, error: ', error);
  };
};