const { pool } = require('../../../db/postgresqlPool');
const axios = require("axios");
const logger = require('../../../logger');
const audioFileMapper = require('../mappers/audioFileMapper');
const FormData = require('form-data');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');


exports.addAudioFile = async (token, req) => {

  const client = await pool.connect();

  try {
    const file = req.file;
    const audioFileName = file.originalname;  
    const audioFile = file.filename;  

    const outputFilePath = 'output.wav'; 

    await new Promise((resolve, reject) => {
        ffmpeg(file.path)
            .outputOptions('-ar', '16000') 
            .toFormat('wav') 
            .on('end', resolve)
            .on('error', reject)
            .save(outputFilePath); 
    });


    const formData = new FormData();
    formData.append('file', fs.createReadStream(outputFilePath)); 
    formData.append('fileName', file.originalname); 

    // const formData = new FormData();
    // formData.append('file', fs.createReadStream(file.path)); 
    // formData.append('fileName', file.originalname); 

    const response = await axios.post('https://greenitkr.towncast.kr/api/file', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(), 
      },
    });

  
    const encodedAudioFileName = Buffer.from(audioFileName, 'latin1').toString('utf8');

    const query = await audioFileMapper.addAudioFile();
    const binds = [encodedAudioFileName, audioFile, response.data.url];
    
    await client.query('BEGIN');
    await client.query(query, binds);
    await client.query('COMMIT');

  } catch (error) {
    logger.info('villageBroadcast/audioFileService.js, addAudioFile, error: ', error);
    console.log('villageBroadcast/audioFileService.js, addAudioFile, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}




exports.getAudioFileList = async () => {

  const client = await pool.connect();

  try {

    const query = await audioFileMapper.getAudioFileList();
    const res = await client.query(query);

    return res.rows;

  } catch (error) {
    logger.info('villageBroadcast/audioFileService.js, getAudioFileList, error: ', error);
    console.log('villageBroadcast/audioFileService.js, getAudioFileList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.deleteAudioFile = async (idx) => {

  const client = await pool.connect();

  try {

    const query = await audioFileMapper.deleteAudioFile();
    const binds = [idx]; 

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    return res.rowCount;

  } catch (error) {
    logger.info('villageBroadcast/audioFileService.js, deleteAudioFile, error: ', error);
    console.log('villageBroadcast/audioFileService.js, deleteAudioFile, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.modifyAudioFile = async ({ idx, audioFileName }) => {

  const client = await pool.connect();

  try {

    const query = await audioFileMapper.modifyAudioFile();
    const binds = [audioFileName, idx];

    await client.query('BEGIN');
    await client.query(query, binds);
    await client.query('COMMIT');

  } catch (error) {
    logger.info('villageBroadcast/audioFileService.js, modifyAudioFile, error: ', error);
    console.log('villageBroadcast/audioFileService.js, modifyAudioFile, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}


  