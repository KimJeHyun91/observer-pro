const { pool } = require('../../../db/postgresqlPool');
const axios = require("axios");
const logger = require('../../../logger');
const dayjs = require('dayjs');
const commonService = require('../../common/services/commonService');

exports.addBroadcast = async (token, req) => {

  const client = await pool.connect();

  try {
    const {siteId, messageType, url, audioText, voiceType, startChimeOption, endChimeOption, repeat, repeatInterval, targets} = req

    const siteIdquery = `
    SELECT DISTINCT site_id, site_transmitter_id, outside_name
    FROM vb_outside
    WHERE site_transmitter_id IS NOT NULL;
    `;
    const siteIdRes = await client.query(siteIdquery);
    const outsideName = siteIdRes.rows[0].outside_name;

    const response = await axios.post(
        `https://greenitkr.towncast.kr/api/broadcasts?siteid=${siteId}`,
        {
          content: {
            broadcastId: null,
            messageType: messageType,
            url: messageType === 'FILE' ? url : null,
            audioText: messageType === 'TTS' ? audioText : null,
            voice: messageType === 'TTS' ? voiceType : null,
          },
          options: {
            startChimeOption: startChimeOption,
            endChimeOption: endChimeOption,
            repeatOption: repeat ? true : false,
            repeat,
            repeatInterval,
            displayText: null,
            displayTextOption: false,
          },
          targets: targets,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        }
      );


      if (response.status) {

        const eventTypeId = 42
        const eventQuery = `
        SELECT * FROM vb_event_type WHERE id = $1;
        `;
        
        const eventRes = await client.query(eventQuery, [eventTypeId]);
        const eventType = eventRes.rows[0];

        await commonService.addEventLog( {
                  event_name : eventType.event_type,
                  description : '',
                  location : outsideName ?? '',
                  main_service_name : 'broadcast',
                  event_type_id : eventType.id,
                  device_type : eventType.service_type,
                  severity_id : eventType.severity_id,
                  device_idx : null,
              })

        const statusUrl = `https://greenitkr.towncast.kr/api/broadcasts/${response.data.id}?siteid=${siteId}`;
        let status = null;
        const retryDelay = 2000; 
      
        while (true) {
          try {
            const statusResponse = await axios.get(statusUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });

            const selectedLogs = statusResponse.data
      
            if (selectedLogs.length === 0 || !selectedLogs.broadcastLogs || selectedLogs.broadcastLogs.length === 0) {
              console.warn("방송 정보를 찾을 수 없습니다.");
              continue; 
            }
      
            // 첫 번째 로그의 상태 가져오기
            status = selectedLogs.broadcastLogs[0].status;
      
      
            if (status === "Finished" || status === 'Error') {
                if((global.websocket) && status) {
                    global.websocket.emit("vb_broadcast-update", { broadcastStatus: {status: status} });
                  }
                  break
              
            }
      
            if (status === "Ready" || status === "Started") {
                if((global.websocket) && status) {
                    global.websocket.emit("vb_broadcast-update", { broadcastStatus: {status: status} });
                  }
            }
      
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          } catch (error) {
            console.error("방송 상태 확인 중 오류:", error.message);
          }
        }
      }
      
      
  } catch (error) {
    console.error('데이터 저장 중 오류 발생: ', error);
    throw error;
  } finally {
    await client.release();
  }
};

exports.getBroadcastLogList = async (token, req) => {
  try {
    const { siteId, start, end, status, type, startTime, endTime } = req;
    const siteIdquery = `
    SELECT DISTINCT site_id
    FROM vb_outside
    WHERE site_id IS NOT NULL;
    `;
    const siteIdRes = await pool.query(siteIdquery);
    const siteIds = siteIdRes.rows.map(row => row.site_id);

    let url = `https://greenitkr.towncast.kr/api/broadcasts?siteid=${siteIds[0]}&start=${start}&end=${end}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    let filteredData = response.data;

    if (status && status !== 'ALL') {
      filteredData = filteredData.filter(item => 
        item.broadcastLogs.some(log => log.status === status)
      );
    }
 
    if (type && type !== 'ALL') {
      filteredData = filteredData.filter(item => item.type === type);
    }

    if (startTime && !endTime) {
      filteredData = filteredData.filter(item => {
      const broadcastTime = dayjs(item.createdTime * 1000).format('HH:mm');
      return broadcastTime >= startTime;
      });
    } else if (!startTime && endTime) {
      filteredData = filteredData.filter(item => {
      const broadcastTime = dayjs(item.createdTime * 1000).format('HH:mm');
      return broadcastTime <= endTime;
      });
    } else if (startTime && endTime) {
      filteredData = filteredData.filter(item => {
      const broadcastTime = dayjs(item.createdTime * 1000).format('HH:mm');
      return broadcastTime >= startTime && broadcastTime <= endTime;
      });
    }


    return filteredData;

  } catch (error) {
    console.error('방송 로그 목록 조회 중 오류:', error);
    throw error;
  }
};


exports.getEventLogList = async (req) => {
  const client = await pool.connect();
  try {
    const { eventType, start, end, startTime, endTime, type } = req;
    let filteredData = [];
    let startDate = start ? dayjs(start).startOf('day').toDate() : new Date(0);
    let endDate = end ? dayjs(end).endOf('day').toDate() : new Date();

    if (eventType === 'ALL' || eventType === 'FILE') {
      const audioFileQuery = `
      SELECT audio_file_name AS name, created_at, '음원 업로드' AS event_type
      FROM vb_audio_file
      WHERE created_at BETWEEN $1 AND $2;
      `;
      const audioFileRes = await client.query(audioFileQuery, [startDate, endDate]);
      filteredData = filteredData.concat(audioFileRes.rows);
    }

    if (eventType === 'ALL' || eventType === 'TTS') {
      const speakerMacroQuery = `
      SELECT speaker_msg AS name, created_at, 'TTS 업로드' AS event_type
      FROM vb_speaker_macro
      WHERE created_at BETWEEN $1 AND $2;
      `;
      const speakerMacroRes = await client.query(speakerMacroQuery, [startDate, endDate]);
      filteredData = filteredData.concat(speakerMacroRes.rows);
    }

    filteredData = filteredData.map(item => ({
      ...item,
      created_at: dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss')
    }));

    if (startTime && !endTime) {
      filteredData = filteredData.filter(item => {
      const broadcastTime = dayjs(item.created_at).format('HH:mm');
      return broadcastTime >= startTime;
      });
    } else if (!startTime && endTime) {
      filteredData = filteredData.filter(item => {
      const broadcastTime = dayjs(item.created_at).format('HH:mm');
      return broadcastTime <= endTime;
      });
    } else if (startTime && endTime) {
      filteredData = filteredData.filter(item => {
      const broadcastTime = dayjs(item.created_at).format('HH:mm');
      return broadcastTime >= startTime && broadcastTime <= endTime;
      });
    }

    if (eventType && eventType !== 'ALL') {
      filteredData = filteredData.filter(item => item.event_type === (eventType === 'FILE' ? '음원 업로드' : 'TTS 업로드'));
    }

    return filteredData;

  } catch (error) {
    console.error('이벤트 로그 목록 조회 중 오류:', error);
    throw error;
  } finally {
    await client.release();
  }
};