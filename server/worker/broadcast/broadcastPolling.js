const logger = require('../../logger');
const { pool } = require('../../db/postgresqlPool');
const axios = require('axios');
const { syncGuardianlites } = require('./guardianlitePolling');
const { checkSpeaker, checkCamera, checkDevice } = require('./checkPingDevices');
const { fetchToken, getCachedToken,  getTokenExpiresAt} = require('./tokenService')
const commonService = require('../../routes/common/services/commonService');

let guardianliteTimerId;
let deviceTimerId;

let guardianlitesInterval = 1000 * 60 * 1;
let deviceInterval = 1000 * 60 * 60; // 장비 ping 체크


exports.startDevicePolling = () => {

  guardianliteTimerId = setInterval(() => {
    try {

      syncGuardianlites();

    } catch(error) {
      logger.info('worker/broadcast/broadcastPolling.js, startDevicePolling, guardianliteTimerId : ', error);
      console.error('worker/broadcast/broadcastPolling.js, startDevicePolling, guardianliteTimerId : ', error);
    }
  }, guardianlitesInterval);

  deviceTimerId = setInterval(() => {
    try {

      checkSpeaker();
      checkCamera();
      checkDevice();

    } catch(error) {
      logger.info('worker/broadcast/broadcastPolling.js, startDevicePolling, deviceTimerId : ', error);
      console.error('worker/broadcast/broadcastPolling.js, startDevicePolling, deviceTimerId : ', error);
    }
  }, deviceInterval);
}

exports.stopDevicePolling = () => {
  clearInterval(guardianliteTimerId);
  clearInterval(deviceTimerId);
}

// 현재 시간을 YYYYMMDDTHHmmss 형식으로 반환
function getCurrentTime() {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "T" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    "00"; 
}

function parseStartAt(start_at) {
  // "20250217T160300" → "2025-02-17T16:03:00"
  const year = start_at.substring(0, 4);
  const month = start_at.substring(4, 6);
  const day = start_at.substring(6, 8);
  const hours = start_at.substring(9, 11);
  const minutes = start_at.substring(11, 13);
  const seconds = start_at.substring(13, 15);

  const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

  return new Date(formattedDate);
}

// 예약 방송 확인 및 실행
exports.checkReserveBroadcast = async() => {
  
  const client = await pool.connect();

  const now = getCurrentTime();
  const query = `
    SELECT * FROM vb_reserve
    WHERE start_at = $1;
  `;

  try {


    const res = await client.query(query, [now]);

    for (const broadcast of res.rows) {
      broadcast.broadcast_type = 'reserve';
      triggerBroadcast(broadcast);
    }
  } catch (error) {
    console.error("예약 방송 확인 중 오류 발생:", error);
  } finally {
    await client.release();
  }
}


/**
 * 방송 API 호출
 */
const triggerBroadcast = async(broadcast) => {

  const client = await pool.connect();

  try{
    await fetchToken()
    let cachedToken = getCachedToken()
    let tokenExpiresAt = getTokenExpiresAt()

    const now = Math.floor(Date.now() / 1000);
    if (!cachedToken || now >= tokenExpiresAt) {
      await fetchToken(); 
    }
 
      const {broadcast_type, audio_file_idx: audioFileIdx, device_control: messageType,  speaker_msg: audioText, voice_type: voiceType, start_chime_option: startChimeOption, end_chime_option: endChimeOption, repeat, repeat_interval: repeatInterval} = broadcast

      const siteIdquery = `
      SELECT DISTINCT site_id, site_transmitter_id, outside_name
      FROM vb_outside
      WHERE site_transmitter_id IS NOT NULL;
      `
      const speakerIdquery = `
      SELECT ARRAY_AGG(speaker_ip) AS speaker_ips 
      FROM vb_speaker;
      `

      const siteIdRes = await client.query(siteIdquery, []);
      const siteId = siteIdRes.rows[0].site_id
      const transmitterId = siteIdRes.rows[0].site_transmitter_id
      const outsideName = siteIdRes.rows[0].outside_name
      // const speakerIdRes = await client.query(speakerIdquery, []);
      // const speakerId = speakerIdRes.rows[0].speaker_ips
      const query = `
      SELECT audio_file_url 
      FROM vb_audio_file 
      WHERE idx = $1;
      `;

      const res = messageType === '음원' && await client.query(query, [audioFileIdx]);
      const url = messageType === '음원' &&  res.rows[0].audio_file_url

      const eventTypeId = broadcast_type === 'reserve' ? 36 : 37
      const eventQuery = `
      SELECT * FROM vb_event_type WHERE id = $1;
      `;
      
      const eventRes = await client.query(eventQuery, [eventTypeId]);
      const eventType = eventRes.rows[0];

        const response = await axios.post(
                  `https://greenitkr.towncast.kr/api/broadcasts?siteid=${siteId}`,
                  {
                    content: {
                      broadcastId: null,
                      messageType: messageType === '음원' ? 'FILE' : 'TTS',
                      url: messageType === '음원' ? url : null,
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
                    targets: [transmitterId],
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${cachedToken}`,
                      "Content-Type": "application/json"
                    },
                  }
                );

          if (response.status) {
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
                  headers: { Authorization: `Bearer ${cachedToken}` },
                });
    
                const selectedLogs = statusResponse.data
          
                if (selectedLogs.length === 0 || !selectedLogs.broadcastLogs || selectedLogs.broadcastLogs.length === 0) {
                  console.warn("방송 정보를 찾을 수 없습니다.");
                  continue; 
                }

                status = selectedLogs.broadcastLogs[0].status;
          
          
                if (status === "Finished" || status === 'Error') {
                    if((global.websocket) && status) {
                        global.websocket.emit("vb_reserve_broadcast-update", { broadcastStatus: {type: eventType.id, status: status} });
                      }
                      break
                  
                }
          
                if (status === "Ready" || status === "Started") {
                    if((global.websocket) && status) {
                        global.websocket.emit("vb_reserve_broadcast-update", { broadcastStatus: {type: eventType.id, status: status} });
                      }
                }
          
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              } catch (error) {
                console.error("방송 상태 확인 중 오류:", error.message);
              }
            }
          }
         

  }catch(err){
    console.log(err)
  } finally {
    await client.release();
  }
 
}

// 정기 방송 확인 및 실행
exports.checkRegularBroadcast = async() => {

  const now = new Date();
  const formattedNowTime = getCurrentTime(); // HH:mm:ss 형식
  const currentDate = now.toISOString().split("T")[0] + "T" + 
                     now.getHours().toString().padStart(2, '0') + 
                     now.getMinutes().toString().padStart(2, '0') + 
                     '00' // 'YYYY-MM-DDTHHmmss' 형식

  // 현재 날짜를 YYYYMMDDTHHmmss 형식으로 변환
  const currentFormatDate = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "T" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      '00';

  const currentDayOfWeek = now.getDay(); // 0(일) ~ 6(토)
  const currentDayOfMonth = now.getDate(); // 1 ~ 31
  const currentWeekOfMonth = Math.ceil(currentDayOfMonth / 7); // 몇째 주인지 계산

  const client = await pool.connect();
  const query = `SELECT * FROM vb_regular WHERE use_status = true;`;

  try {
    const res = await client.query(query);

    for (const broadcast of res.rows) {
      const { start_at, start_date, end_at, repeat_type, repeat_count, day_of_week, week_of_month, day_of_month, title } = broadcast;

      const startTime = start_at.split("T")[1]; 

      // 현재 시간이 방송 시작 시간과 일치하는지 확인 (날짜는 무시)
      if (formattedNowTime.split("T")[1] !== startTime) continue;

      let shouldBroadcast = false;

      if (repeat_count) {
        // repeat_count가 있는 경우
        // const startDate = new Date(start_date);
        let repeatDates = [];

        if (repeat_type === "일") {
          const startDate = new Date(parseStartAt(start_at)); 

          for (let i = 0; i < repeat_count; i++) {
            const nextDate = new Date(startDate); // 매 반복마다 새로운 Date 객체 생성
            nextDate.setDate(startDate.getDate() + i); // i일 후 날짜 설정
            repeatDates.push(nextDate.toISOString().split("T")[0] + "T" + start_at.split("T")[1]); 
          }

        } else if (repeat_type === "주" && day_of_week !== null) {
        
          const targetDay = parseInt(day_of_week, 10); // 목표 요일 (예: 1 = 월요일)
        
          let count = 0;
          let nextDate = new Date(parseStartAt(start_at)); // start_at을 기준으로 시간까지 포함
          // start_at 기준으로 첫 번째 해당 요일을 먼저 찾기
          if (nextDate.getDay() !== targetDay) {
            while (nextDate.getDay() !== targetDay) {
              nextDate.setDate(nextDate.getDate() + 1);
            }
          }
        
          while (count < repeat_count) {
            // 날짜 포맷을 맞추기 위해 start_at의 시간 포함
            const formattedDate = nextDate.toISOString().split("T")[0] + "T" + start_at.split("T")[1];
            repeatDates.push(formattedDate);
            nextDate.setDate(nextDate.getDate() + 7); // 매주 반복
            count++;
          }
        
        
        }else if (repeat_type === "월") {
          const startDate = parseStartAt(start_at); // start_at을 Date 객체로 변환
          let count = 0;
          let monthOffset = 0;
      
          if (day_of_week && week_of_month) {
              // 특정 요일 + 특정 주차의 경우
              const targetDay = parseInt(day_of_week, 10); // 숫자로 변환 (요일)
              const targetWeek = parseInt(week_of_month, 10); // 숫자로 변환 (몇째 주)
      
              while (count < repeat_count) {
                  const firstDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + monthOffset, 1);
                  let weekdayCount = 0;
                  let targetDate = null;
      
                  // 1일부터 31일까지 반복하여 목표 요일을 찾음
                  for (let i = 1; i <= 31; i++) {
                    const tempDate = new Date(firstDayOfMonth);
                    tempDate.setDate(i);  // i일로 설정
                
                    //  로컬 시간 기준으로 요일 가져오기
                    const dayOfWeek = tempDate.getDay();
                
                    console.log(`tempDate: ${tempDate}, dayOfWeek: ${dayOfWeek}, targetDay: ${targetDay}`); 
                
                    // 다음 달로 넘어가면 종료
                    if (tempDate.getMonth() !== firstDayOfMonth.getMonth()) break;
                
                    // 목표 요일일 경우
                    if (dayOfWeek === targetDay) {
                        weekdayCount++;
                        if (weekdayCount === targetWeek) {
                            targetDate = tempDate;
                            break;
                        }
                    }
                }
                
                  if (targetDate) {
                      const localDate = targetDate.getFullYear() +
                      '-' + String(targetDate.getMonth() + 1).padStart(2, '0') +
                      '-' + String(targetDate.getDate()).padStart(2, '0');

                      const timePart = start_at.split("T")[1]; 

                      repeatDates.push(`${localDate}T${timePart}`);
                      count++;
                  }
      
                  monthOffset++;
                  console.log({repeatDates}, '!!!!!!!!!!!!!!')
                  if (monthOffset > 12) break;
              }
          } else if (day_of_month) {
              // 특정 일(day_of_month) 기준 반복
              console.log('특정 일자')
              const targetDayOfMonth = parseInt(day_of_month, 10);
      
              while (count < repeat_count) {
                  const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth() + monthOffset, 1);
                  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
      
                  if (targetDayOfMonth <= daysInMonth) {
                    const targetDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), targetDayOfMonth);
                
                    const localDate = targetDate.getFullYear() +
                                      '-' + String(targetDate.getMonth() + 1).padStart(2, '0') +
                                      '-' + String(targetDate.getDate()).padStart(2, '0');
                
                    const timePart = start_at.split("T")[1];
                
                    repeatDates.push(`${localDate}T${timePart}`);
                    count++;
                }
                
      
                  monthOffset++;
                  console.log({repeatDates}, '!!!!!!!!!!!!')
                  if (monthOffset > 12) break;
              }
          }
      }
        
      
        shouldBroadcast = repeatDates.includes(currentDate);
        console.log(shouldBroadcast ,repeatDates, currentDate, "???")
      } else {
        console.log('일자 있는 경우----------------------')

        // repeat_count가 없으면 end_at이 유효함
        if (currentFormatDate >= start_at && currentFormatDate <= end_at) {
          if (repeat_type === "일") {
            const startDate = parseStartAt(start_at);
            const endDate = parseStartAt(end_at);
            const now = new Date();

            // 현재 날짜와 시간을 `YYYY-MM-DDTHH:mm:ss` 형식으로 변환
            const formattedNow = now.toISOString().slice(0, 19); // 초까지 포함


            const nowDateStr = now.toISOString().split("T")[0]; // 현재 날짜 (YYYY-MM-DD)
            const startAtDateStr = startDate.toISOString().split("T")[0]; // start_at 날짜

            // 현재 날짜가 start_at과 end_at 사이에 있고, 현재 시간이 start_at과 같을 때만 API 호출
            if (nowDateStr >= startAtDateStr && nowDateStr <= endDate.toISOString().split("T")[0]) {
              console.log( now.getMinutes(), startDate.getMinutes() , "?????")
                if (
                    now.getHours() === startDate.getHours() &&
                    now.getMinutes() === startDate.getMinutes() 
                ) {

                    shouldBroadcast = true;
                }
            }
        } else if (repeat_type === "주" && day_of_week !== null) {
          const startDate = parseStartAt(start_at);
          const endDate = parseStartAt(end_at);
          const now = new Date();
      
          const nowDateStr = now.toISOString().split("T")[0]; 
          const startAtDateStr = startDate.toISOString().split("T")[0];
          const endAtDateStr = endDate.toISOString().split("T")[0];
      
          // start_at ~ end_at 기간 안에 있는지 확인
          if (nowDateStr >= startAtDateStr && nowDateStr <= endAtDateStr) {
              // 현재 요일이 설정된 요일과 같은지 확인
              if (parseInt(day_of_week, 10) === currentDayOfWeek) {
                  // start_at 시간과 같은지 확인
                  if (now.getHours() === startDate.getHours() && now.getMinutes() === startDate.getMinutes()) {
                      shouldBroadcast = true;
                  }
              }
          }
      }else if (repeat_type === "월") {
        const startDate = parseStartAt(start_at);
        const endDate = parseStartAt(end_at);
        const now = new Date();
   
        const nowDateStr = now.toISOString().split("T")[0];
        const startAtDateStr = startDate.toISOString().split("T")[0];
        const endAtDateStr = endDate.toISOString().split("T")[0];
    
        // start_at ~ end_at 기간 안에 있는지 확인
        if (nowDateStr >= startAtDateStr && nowDateStr <= endAtDateStr) {
    
            // 특정 날짜 day_of_month가 있을 경우
            if (day_of_month !== null) {
              console.log()
                if (parseInt(day_of_month, 10) === now.getDate()) {
                    if (now.getHours() === startDate.getHours() && now.getMinutes() === startDate.getMinutes()) {
                        shouldBroadcast = true;
                    }
                }
            }
            // 특정 요일 & 주차 day_of_week, week_of_month 가 있을 경우
            else if (day_of_week !== null && week_of_month !== null) {
              console.log(currentWeekOfMonth, "현재 요일??", now.getMinutes(), '??,', startDate.getMinutes() )
                if (parseInt(day_of_week, 10) === currentDayOfWeek && parseInt(week_of_month, 10) === currentWeekOfMonth) {

                    if (now.getHours() === startDate.getHours() && now.getMinutes() === startDate.getMinutes()) {
                        shouldBroadcast = true;
                    }
                }
            }
          }
        } } 
      }

      if (shouldBroadcast) {
        console.log(`정기 방송 실행: ${title}`);
        broadcast.broadcast_type = 'regular';
        triggerBroadcast(broadcast);
      }
    }
  } catch (error) {
    console.error("정기 방송 확인 중 오류 발생:", error);
  } finally {
    client.release();
  }
}



