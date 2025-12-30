const speakerService = require('../services/speakerService');
const logger = require('../../../logger');
const { SpeakerControl, AepelSpeaker } = require('../../../worker/inundation/speakerControl');
const speakerMapper = require('../../inundationControl/mappers/speakerMapper');
const textToSpeech = new (require('../../../worker/inundation/ttsControl'))('./public/tts-output');
const { pool } = require('../../../db/postgresqlPool');

// API 호출 캐시를 위한 변수
let speakerMacroCache = null;
let speakerMacroCacheTime = 0;
const CACHE_DURATION = 1000; 

exports.addSpeakerMacro = async (req, res) => {

  try {
    
    let message = 'fail';
    const { speakerMessage: speakerMsg } = req.body;
    const result = await speakerService.addSpeakerMacro({ speakerMsg });

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/speakerController.js, addSpeakerMacro, error: ', error);
    console.log('inundationControl/speakerController.js, addSpeakerMacro, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.setVolume = async (req, res) => {
  try {
    let message = 'fail';
    const { ipaddress, level } = req.query;

    const result = await AepelSpeaker.setVolume({ ipaddress, level });
    if (result.success) {
      message = 'ok';
    }
    res.status(200).send({
      message: message,
      result: result
    });
  } catch (error) {
    logger.info('inundationControl/speakerController.js, setVolume, error: ', error);
    console.log('inundationControl/speakerController.js, setVolume, error: ', error);
  }
}

exports.modifySpeakerMacro = async (req, res) => {

  try {
    
    let message = 'fail';
    const { 
      speakerMessage: speakerMsg ,speakerMessageIdx: idx } = req.body;
    const result = await speakerService.modifySpeakerMacro({ idx, speakerMsg });

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/speakerController.js, modifySpeakerMacro, error: ', error);
    console.log('inundationControl/speakerController.js, modifySpeakerMacro, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getSpeakerMacroList = async (req, res) => {

  try {
    
    let message = 'fail';
    const now = Date.now();

    if (speakerMacroCache && (now - speakerMacroCacheTime < CACHE_DURATION)) {
      console.log('getSpeakerMacroList: 캐시된 응답 반환');
      return res.status(200).send(speakerMacroCache);
    }

    const result = await speakerService.getSpeakerMacroList(req.body);

    if(result) {
      message = 'ok';
    }

    const response = {
      message: message,
      result: result
    };

    speakerMacroCache = response;
    speakerMacroCacheTime = now;

    res.status(200).send(response);

  } catch (error) {
    logger.info('inundationControl/speakerController.js, getSpeakerMacroList, error: ', error);
    console.log('inundationControl/speakerController.js, getSpeakerMacroList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteSpeakerMacro = async (req, res) => {

  try {
    
    let message = 'fail';
    const { speakerMessageIdx: idx } = req.body;
    const result = await speakerService.deleteSpeakerMacro({ idx });

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/speakerController.js, deleteSpeakerMacro, error: ', error);
    console.log('inundationControl/speakerController.js, deleteSpeakerMacro, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addSpeaker = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await speakerService.addSpeaker(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/speakerController.js, addSpeaker, error: ', error);
    console.log('inundationControl/speakerController.js, addSpeaker, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getSpeakerList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await speakerService.getSpeakerList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/speakerController.js, getSpeakerList, error: ', error);
    console.log('inundationControl/speakerController.js, getSpeakerList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteSpeaker = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await speakerService.deleteSpeaker(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/speakerController.js, deleteSpeaker, error: ', error);
    console.log('inundationControl/speakerController.js, deleteSpeaker, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.updateMessageToSpeaker = async (req, res) => {
  try {
    console.log(req.body);
  } catch (error) {
    logger.info('inundationControl/billboardController.js, updateMessageToSpeaker, error: ', error);
    console.log('inundationControl/billboardController.js, updateMessageToSpeaker, error: ', error);
  }
}

exports.updateMessageToAllSpeakers = async (req, res) => {
  try {
    console.log(req.body);
  } catch (error) {
    logger.info('inundationControl/billboardController.js, updateMessageToAllSpeakers, error: ', error);
    console.log('inundationControl/billboardController.js, updateMessageToAllSpeakers, error: ', error);
  }
}

exports.clicksound = async (req, res) => {
  const { ip, pathUrl, params } = req.query; 

  if (!ip || !pathUrl) {
    return res.status(400).json({
      success: false,
      message: 'Required input value not found',
    });
  }

  try {
    const result = await SpeakerControl.activateSpeaker(ip, pathUrl, params);
    res.json(result);
  } catch (error) {
    console.error('Speaker activation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

exports.controlgate = async (req, res) => {
  const { ip, pathUrl, params } = req.query; 

  if (!ip || !pathUrl) {
    return res.status(400).json({
      success: false,
      message: 'Required input value not found',
    });
  }
  
  try {
    if (ip === 'all') {
      const speakerList = await speakerService.getSpeakerList();
      
      if (!speakerList || speakerList.length === 0) {
        return res.status(404).json({
          success: false,
          message: '등록된 스피커가 없습니다.',
        });
      }
      
      const promises = speakerList.map(speaker => {
        return SpeakerControl.activateSpeaker(speaker.speaker_ip, pathUrl, params);
      });
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      
      return res.json({
        success: successCount > 0,
        message: `${speakerList.length}개 중 ${successCount}개 스피커 방송 성공`,
        results
      });
    } else {
      const result = await SpeakerControl.activateSpeaker(ip, pathUrl, params);
      res.json(result);
    }
  } catch (error) {
    console.error('Speaker activation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

exports.generateTTS = async (req, res) => {
  try {
    let message = 'fail';
    const { text } = req.query;

    const result = await speakerService.generateTTS({ text });

    if (result.success) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result,
    });
  } catch (error) {
    logger.info('inundationControl/speakerController.js, generateTTS, error: ', error);
    console.log('inundationControl/speakerController.js, generateTTS, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error.message,
    });
  }
};

exports.uploadAudio = async (req, res) => {
  try {
    let message = 'fail';
    const { ip: ipaddress, text } = req.body;

    const result = await speakerService.uploadAudio({ ipaddress, text });

    if (result.success) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result,
    });
  } catch (error) {
    logger.info('inundationControl/speakerController.js, uploadAudio, error: ', error);
    console.log('inundationControl/speakerController.js, uploadAudio, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error.message,
    });
  }
};

exports.getClipMetadata = async (req, res) => {
  try {
    let message = 'fail';
    const { ip, text } = req.body;

    const result = await speakerService.getClipMetadata({ ip, text });

    if (result.success) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result,
    });
  } catch (error) {
    logger.info('inundationControl/speakerController.js, getClipMetadata, error: ', error);
    console.log('inundationControl/speakerController.js, getClipMetadata, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error.message,
    });
  }
};

exports.controlSpeaker = async (req, res) => {
  try {
    let message = 'fail';
    const { ip, pathUrl, params } = req.query;

    const result = await speakerService.controlSpeaker({ ip, pathUrl, params });

    if (result.success) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result,
    });
  } catch (error) {
    logger.info('inundationControl/speakerController.js, controlSpeaker, error: ', error);
    console.log('inundationControl/speakerController.js, controlSpeaker, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error.message,
    });
  }
};

exports.processTTSAndStoreClip = async (req, res) => {
  try {
    let message = 'fail';
    const { ip: ipaddress, text } = req.body;

    const result = await speakerService.processTTSAndStoreClip({ ipaddress, text });

    if (result.success) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result,
    });
  } catch (error) {
    logger.info('inundationControl/speakerController.js, processTTSAndStoreClip, error: ', error);
    console.log('inundationControl/speakerController.js, processTTSAndStoreClip, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error.message,
    });
  }
};


exports.playTTS = async (req, res) => {
  try {
    const { ip, text } = req.body;
    
    if (!ip || !text) {
      return res.status(400).send({
        status: false,
        message: 'IP address and text required',
        result: null
      });
    }

    const result = await speakerService.playTTS({ ip, text });

    return res.status(200).send({
      status: result.success,
      message: result.message || (result.success ? 'ok' : 'fail'),
      result: result,
      clipId: result.clipId
    });
    
  } catch (error) {
    logger.info('inundationControl/speakerController.js, playTTS, error: ', error);
    console.log('inundationControl/speakerController.js, playTTS, error: ', error);
    
    return res.status(500).send({
      status: false,
      message: 'error',
      result: { error: error.message },
      error: error.message
    });
  }
};

exports.broadcastAll = async (req, res) => {
  const { type, text } = req.body;

  try {
    // 1. 등록된 스피커 목록 조회
    const speakerList = await speakerService.getSpeakerList();
    const validSpeakers = speakerList
      .filter(speaker => speaker.speaker_ip)
      .map(speaker => speaker.speaker_ip); // IP만 추출

    if (!validSpeakers.length) {
      return res.status(404).json({
        success: false,
        message: '등록된 스피커가 없습니다.'
      });
    }

    console.log(`전체 방송 시작: ${validSpeakers.length}개 스피커`);

    // 2. 타입별 처리
    let results;

    if (type === 'click') {
      results = await handleClickBroadcast(validSpeakers);
    } else if (type === 'broadcast' && text) {
      results = await handleTTSBroadcast(validSpeakers, text);
    } else {
      return res.status(400).json({
        success: false,
        message: '잘못된 요청입니다.',
        error: 'Invalid request type or missing text'
      });
    }

    // 3. 결과 응답
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return res.json({
      success: failCount === 0,
      message: failCount === 0
        ? '모든 스피커가 정상 동작했습니다'
        : `${failCount}개의 스피커에서 오류가 발생했습니다`,
      result: {
        total: validSpeakers.length,
        successCount: successCount,
        failCount: failCount,
        successList: results.filter(r => r.success).map(r => r.ip),
        failList: results.filter(r => !r.success).map(r => ({
          ip: r.ip,
          error: r.error || r.message
        }))
      }
    });

  } catch (error) {
    console.error('전체 방송 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류',
      error: error.message
    });
  }
};

// 클릭음 전체 방송 처리 (병렬 처리로 개선)
async function handleClickBroadcast(speakerIPs) {
  console.log('클릭음 전체 방송 시작...');
  
  const promises = speakerIPs.map(async (ip, index) => {
    try {
      console.log(`클릭음 ${index + 1}/${speakerIPs.length} 처리 중: ${ip}`);
      
      const result = await Promise.race([
        SpeakerControl.activateSpeaker(
          ip,
          '/axis-cgi/playclip.cgi',
          'location=logo.mp3&repeat=0&volume=100&audiooutput=1'
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('요청 시간 초과')), 5000)
        )
      ]);

      if (result.success) {
        return {
          success: true,
          ip: ip,
          type: 'click',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error(result.error || '경고음 재생 실패');
      }

    } catch (error) {
      console.error(`스피커 ${ip} 클릭음 실패:`, error.message);
      return {
        success: false,
        ip: ip,
        type: 'click',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  });

  return await Promise.all(promises);
}

// TTS 전체 방송 처리 (아까 만든 로직 재사용)
async function handleTTSBroadcast(speakerIPs, text) {
  console.log('TTS 전체 방송 시작...');
  
  try {
    // 1단계: TTS 파일 한 번만 생성
    console.log('TTS 파일 생성 중...');
    const ttsResult = await textToSpeech.generateTTS(text);
    
    if (!ttsResult.success) {
      // 모든 스피커가 실패한 것으로 처리
      return speakerIPs.map(ip => ({
        success: false,
        ip: ip,
        error: `TTS 생성 실패: ${ttsResult.error}`
      }));
    }

    console.log('TTS 파일 생성 완료, 각 스피커에 방송 시작...');

    // 2단계: 각 스피커에 병렬로 업로드 및 재생
    const promises = speakerIPs.map(async (ip, index) => {
      try {
        console.log(`TTS ${index + 1}/${speakerIPs.length} 처리 중: ${ip}`);
        
        // speakerService의 playTTSToSpeaker 재사용
        const result = await speakerService.playTTSToSpeaker({
          ip,
          text,
          ttsFilePath: ttsResult.fullPath
        });

        return {
          success: result.success,
          ip: ip,
          type: 'broadcast',
          message: text,
          clipId: result.clipId,
          isNewClip: result.isNewClip,
          timestamp: new Date().toISOString(),
          error: result.success ? null : result.error
        };

      } catch (error) {
        console.error(`스피커 ${ip} TTS 방송 실패:`, error.message);
        return {
          success: false,
          ip: ip,
          type: 'broadcast',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });

    return await Promise.all(promises);

  } catch (error) {
    console.error('TTS 방송 전체 처리 오류:', error);
    // 모든 스피커가 실패한 것으로 처리
    return speakerIPs.map(ip => ({
      success: false,
      ip: ip,
      error: `TTS 방송 처리 실패: ${error.message}`
    }));
  }
}

exports.broadcastToGroup = async (req, res) => {
  const { speaker_ips, text } = req.body;

  if (!speaker_ips || !text) {
    return res.status(400).json({
      success: false,
      message: 'Required input value not found (speaker_ips or text)',
    });
  }

  try {
    console.log(`[Controller] 그룹 방송 시작: ${speaker_ips.length}개 스피커`);
    
    const typeChecks = await Promise.all(
      speaker_ips.map(async (ip) => {
        try {
          const query = await speakerMapper.getSpeakerType();
          const result = await pool.query(query, [ip]);
          return {
            ip,
            type: result.rows[0]?.speaker_type || 'axis'
          };
        } catch (error) {
          return { ip, type: 'axis' };
        }
      })
    );

    const hasAepel = typeChecks.some(s => s.type === 'aepel');
    const hasAxis = typeChecks.some(s => s.type === 'axis');

    let ttsFilePath;

    if (hasAepel && hasAxis) {
      const ttsResult = await textToSpeech.generateTTSAsMp3(text);
      if (!ttsResult.success) {
        return res.status(500).json({
          success: false,
          message: 'TTS MP3 생성 실패',
          error: ttsResult.error
        });
      }
      ttsFilePath = ttsResult.fullPath;
    } else if (hasAepel) {
      // Aepel만 있으면 MP3
      console.log('[Controller] Aepel 전용 - MP3 생성');
      const ttsResult = await textToSpeech.generateTTSAsMp3(text);
      if (!ttsResult.success) {
        return res.status(500).json({
          success: false,
          message: 'TTS MP3 생성 실패',
          error: ttsResult.error
        });
      }
      ttsFilePath = ttsResult.fullPath;
    } else {
      // Axis만 있으면 WAV
      console.log('[Controller] Axis 전용 - WAV 생성');
      const ttsResult = await textToSpeech.generateTTS(text);
      if (!ttsResult.success) {
        return res.status(500).json({
          success: false,
          message: 'TTS WAV 생성 실패',
          error: ttsResult.error
        });
      }
      ttsFilePath = ttsResult.fullPath;
    }

    console.log(`[Controller] TTS 파일 생성 완료: ${ttsFilePath}`);

    const promises = speaker_ips.map(async (ip, index) => {
      try {
        console.log(`[Controller] 스피커 ${index + 1}/${speaker_ips.length} 처리 중: ${ip}`);
        
        const result = await speakerService.playTTSToSpeaker({ 
          ip, 
          text, 
          ttsFilePath 
        });
        
        return {
          success: result.success,
          message: result.message,
          ip,
          clipId: result.clipId,
          speakerType: result.speakerType
        };
      } catch (error) {
        console.error(`[Controller] 스피커 ${ip} TTS 실패:`, error);
        return {
          success: false,
          message: error.message || 'TTS 재생 실패',
          ip,
          error: error.message
        };
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    const successList = results.filter(r => r.success).map(r => r.ip);
    const failList = results.filter(r => !r.success);

    console.log(`[Controller] 그룹 방송 완료: ${successCount}/${speaker_ips.length}개 성공`);

    return res.json({
      success: successCount > 0,
      message: `${speaker_ips.length}개 중 ${successCount}개 스피커 방송 성공`,
      result: {
        total: speaker_ips.length,
        successCount,
        failCount: speaker_ips.length - successCount,
        successList,
        failList: failList.map(f => ({ ip: f.ip, error: f.error }))
      }
    });

  } catch (error) {
    console.error('[Controller] 그룹 방송 전체 실패:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

exports.clickSoundToGroup = async (req, res) => {
  const { speaker_ips } = req.body;

  if (!speaker_ips) {
    return res.status(400).json({
      success: false,
      message: 'Required input value not found (speaker_ips)',
    });
  }

  try {
    const promises = speaker_ips.map(async (ip) => {
      const pathUrl = '/axis-cgi/playclip.cgi';
      const params = 'location=logo.mp3&repeat=0&volume=100&audiooutput=1'; 
      return SpeakerControl.activateSpeaker(ip, pathUrl, params);
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    const successList = speaker_ips.filter((ip, idx) => results[idx].success);
    const failList = speaker_ips.filter((ip, idx) => !results[idx].success);

    return res.json({
      success: successCount > 0,
      message: `${speaker_ips.length}개 중 ${successCount}개 스피커 경고음 성공`,
      result: {
        total: speaker_ips.length,
        successCount,
        failCount: speaker_ips.length - successCount,
        successList,
        failList
      }
    });
  } catch (error) {
    console.error('Group speaker click sound failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
