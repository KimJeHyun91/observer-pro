const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const reserveMapper = require('../mappers/reserveMapper');

exports.addReserve = async (data) => {
  const {broadcastType} = data
  const client = await pool.connect();

  try {

    if (broadcastType === 'reserve') {

      const { title, target, group_idx, outside_idx, start_at, end_at, device_control, audio_file_idx, speaker_idx, speaker_msg, start_chime, end_chime, repeat, repeat_interval, voice_type } = data

      const audioFileIdx = device_control === '음원' ? `${audio_file_idx || null}` : null;
      const ttsIdx = device_control === 'TTS' ? speaker_idx : null
      const ttsMsg = device_control === 'TTS' ? speaker_msg : null
      const groupIdx = group_idx !== undefined ? group_idx : null;
      const outsideIdx = outside_idx !== undefined ? outside_idx : null;
      const voice = device_control === 'TTS' ? voice_type : null

      const binds = [
        title,
        target,
        groupIdx,
        outsideIdx,
        start_at,
        end_at,
        device_control,
        audioFileIdx,
        ttsIdx,
        ttsMsg,
        start_chime,
        end_chime,
        repeat,
        repeat_interval,
        voice
      ];

      await client.query('BEGIN');
      let query = await reserveMapper.addReserve();
      const res = await client.query(query, binds);
      await client.query('COMMIT');

      if((global.websocket) && (res) && (res.rowCount > 0)) {
        global.websocket.emit("vb_reserve-update", { reserveList: {'update':res.rowCount} });
      }

      return res.rows;

    } 
    else if (broadcastType === 'regular') {
      const { title, target, group_idx, outside_idx, repeat_type, day_of_week, day_of_month, week_of_month, repeat_count, start_at, end_at, device_control, audio_file_idx,speaker_idx, speaker_msg, start_chime, end_chime, repeat, repeat_interval, voice_type } = data
    
      const audioFileIdx = device_control === '음원' ? `${audio_file_idx || null}` : null;
      const ttsIdx = device_control === 'TTS' ? speaker_idx : null
      const ttsMsg = device_control === 'TTS' ? speaker_msg : null
      const groupIdx = group_idx !== undefined ? group_idx : null;
      const outsideIdx = outside_idx  ? outside_idx : null;
      const voice = device_control === 'TTS' ? voice_type : null

      const binds = [
        title,
        target,
        groupIdx,
        outsideIdx,
        repeat_type,
        day_of_week,
        day_of_month,
        week_of_month,
        repeat_count,
        start_at,
        end_at,
        device_control,
        audioFileIdx,
        ttsIdx,
        ttsMsg,
        start_chime,
        end_chime,
        repeat,
        repeat_interval,
        voice
      ];

      await client.query('BEGIN');
      let query = await reserveMapper.addRegular();
      const res = await client.query(query, binds);
      await client.query('COMMIT');

      if((global.websocket) && (res) && (res.rowCount > 0)) {
        global.websocket.emit("vb_reserve-update", { reserveList: {'update':res.rowCount} });
      }

      return res.rows
    } 


  } catch (error) {
    logger.info('villageBroadcast/reserveService.js, addReserve, error: ', error);
    console.log('villageBroadcast/reserveService.js, addReserve, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getReserveList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await reserveMapper.getReserveList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('villageBroadcast/reserveService.js, getReserveList, error: ', error);
    console.log('villageBroadcast/reserveService.js, getReserveList, error: ', error);
  } finally {
    await client.release();
  }
}


exports.deleteReserve = async ({ idx, broadcastType }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let query;
    let binds = [idx];

    if (broadcastType === '예약') {
      query = `DELETE FROM vb_reserve WHERE idx = $1`;
    } else if (broadcastType === '정기') {
      query = `DELETE FROM vb_regular WHERE idx = $1`;
    } else {
      throw new Error('Invalid broadcast type');
    }

    const res = await client.query(query, binds);

    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("vb_reserve-update", { reserveList: {'delete':res.rowCount} });
    }

    return res.rowCount; 
  } catch (error) {
    logger.info('villageBroadcast/reserveService.js, deleteReserve, error: ', error);
    console.log('villageBroadcast/reserveService.js, deleteReserve, error: ', error);

    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};


exports.modifyReserve = async (data) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');


    const {idx, broadcastType, title, target, group_idx, outside_idx, start_at, end_at, device_control, audio_file_idx, speaker_idx, speaker_msg, start_chime, end_chime, repeat, repeat_interval, voice_type  } = data;
    const audioFileIdx = device_control === '음원' ? `${audio_file_idx || null}` : null;
    const groupIdx = group_idx !== undefined ? group_idx : null;
    const outsideIdx = outside_idx !== undefined ? outside_idx : null;
    const voice = device_control === 'TTS' ? voice_type : null

    let query;
    let binds;

    if (broadcastType === '예약') {

      binds = [title, target, groupIdx, outsideIdx, start_at, end_at, device_control, audioFileIdx, speaker_idx, speaker_msg, start_chime, end_chime, repeat, repeat_interval, voice, idx ];
      query = await reserveMapper.modifyReserve();

    } else if (broadcastType === '정기') {
      
      const {title, target, groupIdx, outsideIdx, repeat_type, day_of_week, day_of_month, week_of_month, repeat_count, start_at, end_at, device_control, audio_file_idx, speaker_idx, speaker_msg, start_chime, end_chime, repeat, repeat_interval, voice_type, idx} = data

      const voice = device_control === 'TTS' ? voice_type : null

      binds = [ title, target, groupIdx, outsideIdx, repeat_type, day_of_week, day_of_month, week_of_month, repeat_count, start_at, end_at, device_control, audio_file_idx, speaker_idx, speaker_msg, start_chime, end_chime, repeat, repeat_interval, voice, idx];
      query = await reserveMapper.modifyRegular();
    }

   
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("vb_reserve-update", { reserveList: {'update':res.rowCount} });
    }

    return res.rowCount; 

  } catch (error) {
    logger.info('villageBroadcast/reserveService.js, modifyReserve, error: ', error);
    console.log('villageBroadcast/reserveService.js, modifyReserve, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};
