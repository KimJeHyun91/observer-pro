const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const speakerMapper = require('../mappers/speakerMapper');
const TTSControl = require('../../../worker/inundation/ttsControl');
const { SpeakerControl, AepelSpeaker, AxisSpeaker } = require('../../../worker/inundation/speakerControl');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');

// const textToSpeech = new TTSControl(path.join(__dirname, '../../../public', 'tts-output'));
const textToSpeech = new TTSControl(path.join(process.cwd(), 'public', 'tts-output'));

exports.addSpeakerMacro = async ({ speakerMsg }) => {

  const client = await pool.connect();

  try {

    let binds = [speakerMsg];

    await client.query('BEGIN');
    let query = await speakerMapper.addSpeakerMacro();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if ((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_speakers-update", { speakerList: { 'add': res.rowCount } });
    }

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/speakerService.js, addSpeakerMacro, error: ', error);
    console.log('inundationControl/speakerService.js, addSpeakerMacro, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.modifySpeakerMacro = async ({ idx, speakerMsg }) => {

  const client = await pool.connect();

  try {

    const speakerIdx = idx;

    await client.query('BEGIN');
    let binds = [speakerIdx, speakerMsg];
    let query = await speakerMapper.modifySpeakerMacro();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if ((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_speakers-update", { speakerList: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/speakerService.js, modifySpeakerMacro, error: ', error);
    console.log('inundationControl/speakerService.js, modifySpeakerMacro, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.getSpeakerMacroList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await speakerMapper.getSpeakerMacroList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/speakerService.js, getSpeakerMacroList, error: ', error);
    console.log('inundationControl/speakerService.js, getSpeakerMacroList, error: ', error);
  } finally {
    await client.release();
  }
};

exports.deleteSpeakerMacro = async ({ idx }) => {

  const client = await pool.connect();

  try {

    const speakerIdx = idx;

    await client.query('BEGIN');
    let binds = [speakerIdx];
    let query = await speakerMapper.deleteSpeakerMacro();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if ((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_speakers-update", { speakerList: { 'delete': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/speakerService.js, deleteSpeakerMacro, error: ', error);
    console.log('inundationControl/speakerService.js, deleteSpeakerMacro, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.addSpeaker = async ({ outsideIdx, speakerIp, speakerName }) => {

  const client = await pool.connect();

  let returnValue = {
    status: false,
    message: 'fail'
  };

  try {

    let binds = [speakerIp];
    let query = await speakerMapper.getSpeakerIpInfo();
    const resSpeakerIpInfo = await client.query(query, binds);

    // speaker ip 가 이미 등록되어 있으면
    if (resSpeakerIpInfo && resSpeakerIpInfo.rows.length > 0) {

      returnValue.message = '스피커 ip 가 이미 등록되어 있습니다.';

    } else {
      // speaker ip 가 없으면 등록
      await client.query('BEGIN');
      const speakerStatus = 'ON';
      binds = [outsideIdx, speakerIp, speakerName, speakerStatus];
      let queryAddSpeaker = await speakerMapper.addSpeaker();
      const resAddSpeaker = await client.query(queryAddSpeaker, binds);
      await client.query('COMMIT');

      if (resAddSpeaker && resAddSpeaker.rows.length > 0) {
        returnValue.status = true;
        returnValue.message = 'success';

        if (global.websocket) {
          global.websocket.emit("fl_speakers-update", { speakerList: { 'add': resAddSpeaker.rowCount } });
        }
      }
    }

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/speakerService.js, addSpeaker, error: ', error);
    console.log('inundationControl/speakerService.js, addSpeaker, error: ', error);
    await client.query('ROLLBACK');
    return returnValue;
  } finally {
    await client.release();
  }
}

exports.getSpeakerList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await speakerMapper.getSpeakerList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/speakerService.js, getSpeakerList, error: ', error);
    console.log('inundationControl/speakerService.js, getSpeakerList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.deleteSpeaker = async ({ idx }) => {

  const client = await pool.connect();

  try {

    const speakerIdx = idx;

    await client.query('BEGIN');
    let binds = [speakerIdx];
    let query = await speakerMapper.deleteSpeaker();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if ((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_speakers-update", { speakerList: { 'delete': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/speakerService.js, deleteSpeaker, error: ', error);
    console.log('inundationControl/speakerService.js, deleteSpeaker, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.generateTTS = async ({ text }) => {
  try {
    const speechAvailable = await textToSpeech.checkSystemSpeech();
    if (!speechAvailable) {
      return {
        success: false,
        message: 'System.Speech is unavailable',
      };
    }

    const result = await textToSpeech.generateTTS(text);
    return result;
  } catch (error) {
    logger.info('inundationControl/speakerService.js, generateTTS, error: ', error);
    console.log('inundationControl/speakerService.js, generateTTS, error: ', error);
    return {
      success: false,
      message: 'Error occurred in TTS generation',
      error: error.message,
    };
  }
};

exports.uploadAudio = async ({ ipaddress, text }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 스피커 타입 확인
    const typeQuery = await speakerMapper.getSpeakerType();
    const typeResult = await client.query(typeQuery, [ipaddress]);

    if (!typeResult.rows[0]) {
      throw new Error(`등록되지 않은 스피커: ${ipaddress}`);
    }

    const speakerType = typeResult.rows[0].speaker_type || 'axis';

    // 2. TTS 생성
    const ttsResult = await textToSpeech.generateTTS(text);
    if (!ttsResult.success) {
      throw new Error(ttsResult.message);
    }

    // 3. 타입별 업로드
    let uploadResult;
    let clipId, fileNo;

    if (speakerType === 'aepel') {
      fileNo = await this.getNextAepelFileNo(ipaddress, client);
      uploadResult = await AepelSpeaker.uploadAudio(ipaddress, ttsResult.fullPath, fileNo);
      clipId = fileNo.toString();
    } else {
      uploadResult = await AxisSpeaker.uploadAudioToSpeaker(ipaddress, ttsResult.fullPath, text);
      clipId = uploadResult.clipId;
      fileNo = null;
    }

    if (!uploadResult.success) {
      throw new Error(uploadResult.message);
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Audio file uploaded successfully',
      speakerType,
      clipId,
      fileNo,
      filePath: ttsResult.filePath,
      fileName: text,
    };

  } catch (error) {
    logger.error('speakerService.js, uploadAudio, error: ', error);
    await client.query('ROLLBACK');
    return {
      success: false,
      message: 'TTS upload failed',
      error: error.message,
    };
  } finally {
    await client.release();
  }
};

exports.getClipMetadata = async ({ ip, text }) => {
  const client = await pool.connect();

  try {
    const typeQuery = await speakerMapper.getSpeakerType();
    const typeResult = await client.query(typeQuery, [ip]);

    if (!typeResult.rows[0]) {
      return {
        success: false,
        message: `등록되지 않은 스피커: ${ip}`
      };
    }

    const speakerType = typeResult.rows[0].speaker_type || 'axis';

    const findQuery = await speakerMapper.findClipByMessage();
    const findResult = await client.query(findQuery, [ip, text]);

    if (findResult.rows.length > 0) {
      const clipData = findResult.rows[0];

      return {
        success: true,
        clipId: clipData.clip_id,
        fileNo: clipData.file_no,
        speakerType: clipData.speaker_type,
        message: `clip id: ${clipData.clip_id}${clipData.file_no ? `, file_no: ${clipData.file_no}` : ''}`
      };
    } else {
      return {
        success: false,
        clipId: null,
        message: 'clip id is undefined',
      };
    }

  } catch (error) {
    logger.error('speakerService.js, getClipMetadata, error: ', error);
    return {
      success: false,
      message: 'Error occurred while retrieving clip',
      error: error.message,
    };
  } finally {
    await client.release();
  }
};

exports.controlSpeaker = async ({ ip, pathUrl, params }) => {
  try {
    const result = await SpeakerControl.activateSpeaker(ip, pathUrl, params);
    return result;
  } catch (error) {
    logger.info('inundationControl/speakerService.js, controlSpeaker, error: ', error);
    console.log('inundationControl/speakerService.js, controlSpeaker, error: ', error);
    return {
      success: false,
      message: 'Speaker control failure',
      error: error.message,
    };
  }
};

exports.processTTSAndStoreClip = async ({ ipaddress, text }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ttsResult = await textToSpeech.generateTTS(text);
    if (!ttsResult.success) {
      await client.query('ROLLBACK');
      throw new Error(ttsResult.message);
    }

    const uploadResult = await SpeakerControl.uploadAudioToSpeaker(ipaddress, ttsResult.fullPath, text);
    if (!uploadResult.success) {
      await client.query('ROLLBACK');
      throw new Error(uploadResult.message);
    }

    const clipId = uploadResult.clipId;

    if (!clipId) {
      await client.query('ROLLBACK');
      throw new Error('No clip ID was generated by Axis device');
    }

    let binds = [text, clipId];
    let query = await speakerMapper.insertAudioClip();
    const insertResult = await client.query(query, binds);

    await client.query('COMMIT');

    return {
      success: true,
      message: `Successfully processed and stored audio for "${text}"`,
      clipId: clipId,
      data: insertResult.rows[0],
    };

  } catch (error) {
    console.log(`inundationControl/speakerService.js, processTTSAndStoreClip, error: ${error.message}`);
    await client.query('ROLLBACK');
    return {
      success: false,
      message: 'TTS processing and storage failed',
      error: error.message,
    };
  } finally {
    await client.release();
  }
};

exports.playTTS = async ({ ip, text }) => {
  const client = await pool.connect();

  try {
    console.log(`[playTTS] 시작: IP=${ip}, 텍스트="${text}"`);

    await client.query('BEGIN');

    const typeQuery = await speakerMapper.getSpeakerType();
    const typeResult = await client.query(typeQuery, [ip]);

    if (!typeResult.rows[0]) {
      await client.query('ROLLBACK');
      throw new Error(`등록되지 않은 스피커: ${ip}`);
    }

    const speakerType = typeResult.rows[0].speaker_type || 'axis';
    console.log(`[playTTS] 스피커 타입: ${speakerType}`);

    const findResult = await client.query(
      await speakerMapper.findClipByMessage(),
      [ip, text]
    );

    let clipId, fileNo, isNewClip = false;

    if (findResult.rows.length > 0) {
      clipId = findResult.rows[0].clip_id;
      fileNo = findResult.rows[0].file_no;
      console.log(`[playTTS] 기존 클립 발견: clipId=${clipId}, fileNo=${fileNo}`);

      // Aepel인 경우 먼저 재생 시도
      if (speakerType === 'aepel') {
        console.log(`[playTTS] Aepel 재생 시도: fileNo=${fileNo}`);
        const testPlayResult = await AepelSpeaker.playAudio(ip, fileNo, 1);

        if (!testPlayResult.success && testPlayResult.error && testPlayResult.error.includes('File not found')) {
          // 파일이 없으면 DB 기록 삭제하고 새로 업로드
          await client.query(
            `DELETE FROM fl_audio_file_manage WHERE speaker_ip = $1 AND message = $2`,
            [ip, text]
          );

          isNewClip = true; // 새 클립으로 처리
        } else if (testPlayResult.success) {
          await client.query('COMMIT');
          return {
            success: true,
            message: '기존 오디오 재생 성공',
            speakerType,
            clipId,
            fileNo,
            isNewClip: false
          };
        } else {
          await client.query('ROLLBACK');
          throw new Error(`재생 실패: ${testPlayResult.message}`);
        }
      } else {
        await client.query('COMMIT');

        const playResult = await AxisSpeaker.activateSpeaker(
          ip,
          '/axis-cgi/playclip.cgi',
          `clip=${clipId}&audiooutput=1&volume=100&repeat=1`
        );

        if (!playResult.success) {
          console.error(`[playTTS] Axis 재생 실패:`, playResult);
          return {
            success: false,
            message: `재생 실패: ${playResult.message}`,
            error: playResult.error
          };
        }

        return {
          success: true,
          message: '기존 오디오 재생 성공',
          speakerType,
          clipId,
          fileNo: null,
          isNewClip: false
        };
      }
    } else {
      isNewClip = true;
    }

    if (isNewClip) {
      console.log(`[playTTS] 새 클립 생성 시작`);

      let ttsResult;

      if (speakerType === 'aepel') {
        console.log(`[playTTS] Aepel용 MP3 생성 시작`);
        ttsResult = await textToSpeech.generateTTSAsMp3(text);
      } else {
        console.log(`[playTTS] Axis용 WAV 생성 시작`);
        ttsResult = await textToSpeech.generateTTS(text);
      }

      if (!ttsResult.success) {
        await client.query('ROLLBACK');
        throw new Error(`TTS 생성 실패: ${ttsResult.error}`);
      }
      console.log(`[playTTS] TTS 파일 생성 완료: ${ttsResult.fullPath}`);

      let uploadResult;

      if (speakerType === 'aepel') {
        fileNo = await this.getNextAepelFileNo(ip, client);
        console.log(`[playTTS] Aepel 파일번호 할당: ${fileNo}`);

        uploadResult = await AepelSpeaker.uploadAudio(ip, ttsResult.fullPath, fileNo);
        clipId = fileNo.toString();
      } else {
        uploadResult = await AxisSpeaker.uploadAudioToSpeaker(ip, ttsResult.fullPath, text);
        clipId = uploadResult.clipId;
        fileNo = null;
      }

      if (!uploadResult.success) {
        await client.query('ROLLBACK');
        throw new Error(`업로드 실패: ${uploadResult.message}`);
      }
      console.log(`[playTTS] 업로드 성공: clipId=${clipId}`);

      await client.query(
        await speakerMapper.insertAudioClip(),
        [ip, speakerType, text, clipId, fileNo]
      );
      console.log(`[playTTS] DB 저장 완료`);

      await client.query('COMMIT');

      let playResult;

      if (speakerType === 'aepel') {
        console.log(`[playTTS] Aepel 재생 시작: fileNo=${fileNo}`);
        playResult = await AepelSpeaker.playAudio(ip, fileNo, 1);
      } else {
        console.log(`[playTTS] Axis 재생 시작: clipId=${clipId}`);
        playResult = await AxisSpeaker.activateSpeaker(
          ip,
          '/axis-cgi/playclip.cgi',
          `clip=${clipId}&audiooutput=1&volume=100&repeat=1`
        );
      }

      if (!playResult.success) {
        console.error(`[playTTS] 재생 실패:`, playResult);
        return {
          success: false,
          message: `재생 실패: ${playResult.message}`,
          error: playResult.error
        };
      }

      return {
        success: true,
        message: '새 오디오 재생 성공',
        speakerType,
        clipId,
        fileNo,
        isNewClip: true
      };
    }

  } catch (error) {
    console.error(`[playTTS] 오류:`, error);
    await client.query('ROLLBACK');
    return {
      success: false,
      message: 'TTS 재생 실패',
      error: error.message
    };
  } finally {
    await client.release();
  }
};

exports.getNextAepelFileNo = async (speakerIp, client = null) => {
  const useClient = client || pool;

  try {
    const query = await speakerMapper.getNextAepelFileNo();
    const result = await useClient.query(query, [speakerIp]);
    return result.rows[0]?.next_no || 1;
  } catch (error) {
    logger.error('speakerService.js, getNextAepelFileNo, error: ', error);
    throw error;
  }
};

exports.playTTSToSpeaker = async ({ ip, text, ttsFilePath }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const typeQuery = await speakerMapper.getSpeakerType();
    const typeResult = await client.query(typeQuery, [ip]);

    if (!typeResult.rows[0]) {
      await client.query('ROLLBACK');
      throw new Error(`등록되지 않은 스피커: ${ip}`);
    }

    const speakerType = typeResult.rows[0].speaker_type || 'axis';

    const findResult = await client.query(
      await speakerMapper.findClipByMessage(),
      [ip, text]
    );

    let clipId, fileNo, isNewClip = false;

    if (findResult.rows.length > 0) {
      clipId = findResult.rows[0].clip_id;
      fileNo = findResult.rows[0].file_no;
      console.log(`[playTTSToSpeaker] 기존 클립 재사용: ${clipId} (${ip})`);
    } else {
      console.log(`[playTTSToSpeaker] 새 클립 업로드: ${ip}`);

      let uploadResult;

      if (speakerType === 'aepel') {
        fileNo = await this.getNextAepelFileNo(ip, client);
        uploadResult = await AepelSpeaker.uploadAudio(ip, ttsFilePath, fileNo);
        clipId = fileNo.toString();
      } else {
        uploadResult = await SpeakerControl.uploadAudioToSpeaker(ip, ttsFilePath, text);
        clipId = uploadResult.clipId;
        fileNo = null;
      }

      if (!uploadResult.success) {
        await client.query('ROLLBACK');
        throw new Error(`업로드 실패 (${ip}): ${uploadResult.message}`);
      }

      await client.query(
        await speakerMapper.insertAudioClip(),
        [ip, speakerType, text, clipId, fileNo]
      );

      isNewClip = true;
      console.log(`[playTTSToSpeaker] 새 클립 저장 완료: ${clipId} (${ip})`);
    }

    await client.query('COMMIT');

    console.log(`[playTTSToSpeaker] 재생 시작: ${clipId} (${ip})`);

    let playResult;

    if (speakerType === 'aepel') {
      playResult = await AepelSpeaker.playAudio(ip, fileNo || clipId, 1);
    } else {
      playResult = await AxisSpeaker.activateSpeaker(
        ip,
        '/axis-cgi/playclip.cgi',
        `clip=${clipId}&audiooutput=1&volume=100&repeat=1`
      );
    }

    if (!playResult.success) {
      return {
        success: false,
        message: `재생 실패 (${ip}): ${playResult.message}`,
        error: playResult.error || '알 수 없는 오류',
      };
    }

    return {
      success: true,
      message: isNewClip
        ? `새 오디오 재생 성공 (${ip}): "${text}"`
        : `기존 오디오 재생 성공 (${ip}): "${text}"`,
      clipId,
      fileNo,
      isNewClip,
      speakerType
    };

  } catch (error) {
    console.error(`[playTTSToSpeaker] 오류 (${ip}):`, error);
    await client.query('ROLLBACK');
    return {
      success: false,
      message: `TTS 재생 실패 (${ip})`,
      error: error.message
    };
  } finally {
    await client.release();
  }
};

exports.controlSpeaker = async ({ ip, pathUrl, params }) => {
  try {
    const query = await speakerMapper.getSpeakerType();
    const result = await pool.query(query, [ip]);

    if (!result.rows[0]) {
      throw new Error(`등록되지 않은 스피커: ${ip}`);
    }

    const speakerType = result.rows[0].speaker_type || 'axis';

    if (speakerType === 'aepel') {
      return {
        success: false,
        message: 'Aepel 스피커는 controlSpeaker를 지원하지 않습니다. playTTS를 사용하세요.'
      };
    }

    const activateResult = await SpeakerControl.activateSpeaker(ip, pathUrl, params);
    return activateResult;

  } catch (error) {
    logger.error('speakerService.js, controlSpeaker, error: ', error);
    return {
      success: false,
      message: 'Speaker control failure',
      error: error.message,
    };
  }
};

async function cleanupWavClips(ipaddress) {
  try {
    const allClipsMetadata = await getAllClipsMetadata(ipaddress);
    if (!allClipsMetadata || !allClipsMetadata.data) {
      throw new Error('Failed to fetch clip metadata');
    }

    const wavClips = [];
    for (const [clipId, metadata] of Object.entries(allClipsMetadata.data)) {
      if (metadata.mediaTypes && metadata.mediaTypes.includes('audio/x-wav')) {
        wavClips.push({ id: clipId, name: metadata.name || clipId });
      }
    }

    if (wavClips.length === 0) {
      return {
        success: true,
        totalClips: 0,
        deletedClips: 0,
        details: []
      };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const clip of wavClips) {
        try {
          const deleteResult = await deleteClipFromSpeaker(ipaddress, clip.id);
          results.push({
            clipId: clip.id,
            name: clip.name,
            success: deleteResult.success,
            message: deleteResult.message || 'Deletion attempted'
          });

          if (deleteResult.success) {
            const dbDeleteResult = await deleteClipFromDatabase(clip.id, client);
            if (!dbDeleteResult) {
              throw new Error(`Failed to delete clip ${clip.id} from database`);
            }
          } else {
            logger.error(`Failed to delete clip`);
          }
        } catch (error) {
          logger.error(`Error during deletion of clip: ${error.message}`);
          results.push({
            clipId: clip.id,
            name: clip.name,
            success: false,
            message: error.message
          });
        }
      }

      await client.query('COMMIT');
      const successCount = results.filter(r => r.success).length;

      return {
        success: true,
        totalClips: wavClips.length,
        deletedClips: successCount,
        details: results
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;

    } finally {
      client.release();
    }

  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function deleteClipFromSpeaker(ipaddress, clipId) {
  const username = process.env.SPEAKER_USERNAME || 'root';
  const password = process.env.SPEAKER_PASSWORD || 'root';

  const command = `curl --fail --verbose --digest -u ${username}:${password} -X POST -H "Content-Type: application/json" -d '{"apiVersion":"0.1","method":"delete","clipId":"${clipId}"}' "http://${ipaddress}/axis-cgi/mediaclip2.cgi"`;

  logger.debug(`Executing delete command for clip ${clipId} on ${ipaddress}: ${command}`);

  try {
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Curl command failed for clip ${clipId}: ${stderr || error.message}`);
          reject(new Error(`Curl error: ${stderr || error.message}`));
          return;
        }
        resolve({ stdout, stderr });
      });
    });

    if (!stdout || stdout.trim() === '') {
      return { success: false, message: 'No response from speaker' };
    }

    let response;
    try {
      response = JSON.parse(stdout);
      if (response.error) {
        return { success: false, message: `API error: ${response.error.message || 'Unknown error'}` };
      }
    } catch (parseError) {
      return { success: false, message: 'Invalid response format from speaker' };
    }

    return { success: true, message: 'Clip deleted successfully from speaker' };

  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function deleteClipFromDatabase(clipId, client) {
  try {
    const query = await speakerMapper.deleteClipById();
    const result = await client.query(query, [clipId]);
    if (result.rowCount === 0) {
      logger.warn(`No clip found in database for clipId ${clipId}`);
      return false;
    }
    logger.info(`Successfully deleted clip ${clipId} from database`);
    return true;
  } catch (error) {
    logger.error(`Database deletion failed for clipId ${clipId}: ${error.message}`);
    throw error;
  }
}

async function getAllClipsMetadata(ipaddress) {
  const username = process.env.SPEAKER_USERNAME || 'root';
  const password = process.env.SPEAKER_PASSWORD || 'root';

  const command = `curl --fail --digest -u ${username}:${password} -X POST -H "Content-Type: application/json" -d '{"apiVersion":"0.1","method":"getAllMetadata"}' "http://${ipaddress}/axis-cgi/mediaclip2.cgi"`;

  try {
    const stdout = await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Metadata fetch failed: ${stderr || error.message}`));
          return;
        }
        resolve(stdout);
      });
    });

    if (!stdout || stdout.trim() === '') {
      throw new Error('Empty response from server');
    }

    let metadata;
    try {
      metadata = JSON.parse(stdout);
      if (metadata.error) {
        throw new Error(`API error: ${metadata.error.message || 'Unknown error'}`);
      }
    } catch (parseError) {
      throw new Error('Invalid metadata format');
    }

    return metadata;

  } catch (error) {
    return null;
  }
}

exports.cleanupAllSpeakersWavClips = async () => {
  try {
    const speakers = await this.getSpeakerList();
    if (!speakers || speakers.length === 0) {
      logger.warn('No speakers found in the database');
      return { success: false, message: 'No speakers found' };
    }

    const results = [];
    for (const speaker of speakers) {
      const ipaddress = speaker.speaker_ip;
      const cleanupResult = await cleanupWavClips(ipaddress);

      results.push({
        speakerIp: ipaddress,
        ...cleanupResult,
        details: cleanupResult.details || []
      });
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: true,
      totalSpeakers: speakers.length,
      processedSpeakers: successCount,
      details: results
    };

  } catch (error) {
    return { success: false, message: error.message };
  }
};

// wav 삭제 스케줄링
cron.schedule('0 0 * * 0', async () => {
  const result = await exports.cleanupAllSpeakersWavClips();
  if (!result.success) {
    logger.error(`Schedule cleanup failed: ${result.message}`);
  } else {
    logger.info(`Schedule cleanup completed: ${result.processedSpeakers}/${result.totalSpeakers}`);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Seoul'
});