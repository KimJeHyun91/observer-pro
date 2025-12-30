const fs = require('fs');
const logger = require('../logger');

exports.setImagePath = (uploadDir) => {
  try {
    let destFolder = uploadDir;
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }
    return destFolder;
  } catch(err){
    logger.error(err);
  }
}