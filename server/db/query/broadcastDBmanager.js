const { pool } = require('../postgresqlPool');
const logger = require('../../logger');


exports.createTables = async () => {

  const outSideTable = `
  CREATE TABLE IF NOT EXISTS vb_outside (
    idx SERIAL NOT NULL PRIMARY KEY,
    site_id TEXT,
    site_transmitter_id TEXT,
    outside_name TEXT NOT NULL,
    location TEXT,
    left_location TEXT,
    top_location TEXT,
    map_image_url TEXT,
    service_type TEXT,
    camera_id TEXT,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const speakerTable = `
  CREATE TABLE IF NOT EXISTS vb_speaker (
    idx SERIAL NOT NULL PRIMARY KEY,
    outside_idx INT,
    speaker_name TEXT,
    speaker_ip TEXT UNIQUE NOT NULL,
    speaker_msg TEXT,
    speaker_status TEXT,
    speaker_location TEXT,
    speaker_left_location TEXT,
    speaker_top_location TEXT,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    use_status BOOLEAN NOT NULL DEFAULT true,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const speakerMacroTable = `
  CREATE TABLE IF NOT EXISTS vb_speaker_macro (
    idx SERIAL NOT NULL PRIMARY KEY,
    speaker_msg TEXT,
    speaker_msg_file TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const guardianliteTable = `
  CREATE TABLE IF NOT EXISTS vb_guardianlite (
    guardianlite_ip TEXT NOT NULL PRIMARY KEY,
    guardianlite_name TEXT,
    status BOOLEAN DEFAULT true,
    user_id TEXT DEFAULT 'admin',
    user_pw TEXT DEFAULT 'greenit',
    outside_idx INTEGER,
    ch1 TEXT,
    ch2 TEXT,
    ch3 TEXT,
    ch4 TEXT,
    ch5 TEXT,
    ch6 TEXT,
    ch7 TEXT,
    ch8 TEXT,
    temper TEXT,
    ch1_label TEXT,
    ch2_label TEXT,
    ch3_label TEXT,
    ch4_label TEXT,
    ch5_label TEXT,
    ch6_label TEXT,
    ch7_label TEXT,
    ch8_label TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const eventTable = `
  CREATE TABLE IF NOT EXISTS vb_event (
    idx BIGSERIAL NOT NULL PRIMARY KEY,
    event_name TEXT,
    description TEXT,
    event_type_id INTEGER,
    service_type TEXT,
    event_occurrence_time TEXT NOT NULL,
    event_end_time TEXT,
    severity_id INTEGER,
    is_acknowledge BOOLEAN NOT NULL DEFAULT false,
    acknowledge_user TEXT,
    acknowledged_at TEXT,
    connection BOOLEAN NOT NULL DEFAULT true,
    outside_idx INTEGER,
    inside_idx INTEGER,
    water_level_idx INTEGER,
    device_idx INTEGER,
    camera_idx INTEGER,
    snapshot_path TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;
  
  const deviceTable = `
  CREATE TABLE IF NOT EXISTS vb_device (
    idx SERIAL NOT NULL PRIMARY KEY,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_ip TEXT NOT NULL,
    device_type TEXT NOT NULL,
    device_location TEXT,
    outside_idx INTEGER,
    left_location TEXT,
    top_location TEXT,
    camera_idx INTEGER,
    service_type TEXT,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const eventTypeTable = `
  CREATE TABLE IF NOT EXISTS vb_event_type (        
    id INTEGER NOT NULL PRIMARY KEY,
    event_type TEXT UNIQUE NOT NULL,
    service_type TEXT NOT NULL,
    severity_id INTEGER NOT NULL,
    use_warning_board BOOLEAN NOT NULL DEFAULT true,
    use_popup BOOLEAN NOT NULL DEFAULT true,
    use_event_type BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const defaultEventTypeInsert = `
  INSERT INTO vb_event_type (
    id, event_type, service_type, severity_id, use_warning_board, use_popup, use_event_type
  ) VALUES 
    (36, '마을 예약 방송', 'reserve', 3, true, true, true),
    (37, '마을 정기 방송', 'regular', 3, true, true, true),
    (42, '실시간 방송', 'live_broadcast', 3, true, false, true)
    ON CONFLICT (id) DO NOTHING;
  `;
  /**
   * 이벤트 추가 ? : 방송 시작, 장치 연동 오류, 방송 실패, 파일 업로드 실패, 파일 불러오기 실패
   */

  const groupTable = `
  CREATE TABLE IF NOT EXISTS vb_group (
    idx SERIAL NOT NULL PRIMARY KEY,
    group_name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const groupOutsideTable = `
  CREATE TABLE IF NOT EXISTS vb_group_outside (
    group_idx INTEGER NOT NULL,
    outside_idx INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_vb_group_idx_outside_idx PRIMARY KEY (group_idx, outside_idx),
    CONSTRAINT fk_vb_group_idx FOREIGN KEY(group_idx) REFERENCES vb_group(idx) ON DELETE CASCADE,
    CONSTRAINT fk_vb_outside_idx FOREIGN KEY(outside_idx) REFERENCES vb_outside(idx) ON DELETE CASCADE
  )
  `;

  const audioFileTable = `
  CREATE TABLE IF NOT EXISTS vb_audio_file (
    idx SERIAL NOT NULL PRIMARY KEY,
    audio_file_name TEXT NOT NULL,
    audio_file TEXT NOT NULL,
    audio_file_url TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const reserveTable = `
  CREATE TABLE IF NOT EXISTS vb_reserve (
    idx SERIAL NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    target TEXT NOT NULL,
    group_idx INTEGER,
    outside_idx INTEGER,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    device_control TEXT NOT NULL,
    audio_file_idx INTEGER,
    speaker_idx INTEGER,
    speaker_msg TEXT,
    start_chime_option BOOLEAN,
    end_chime_option BOOLEAN,
    repeat INTEGER,
    repeat_interval INTEGER,
    voice_type TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const regularTable = `
  CREATE TABLE IF NOT EXISTS vb_regular (
    idx SERIAL NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    target TEXT NOT NULL,
    group_idx INTEGER,
    outside_idx INTEGER,
    repeat_type TEXT NOT NULL,
    day_of_week INTEGER,
    day_of_month INTEGER,
    week_of_month INTEGER,
    repeat_count INTEGER DEFAULT 999,
    start_at TEXT NOT NULL,
    end_at TEXT,
    device_control TEXT NOT NULL,
    audio_file_idx INTEGER,
    speaker_msg TEXT,
    speaker_idx INTEGER,
    start_chime_option BOOLEAN,
    end_chime_option BOOLEAN,
    repeat INTEGER,
    repeat_interval INTEGER,
    voice_type TEXT,
    use_status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const client = await pool.connect();

  try {

    await client.query(outSideTable);

    await client.query(eventTable);
    await client.query(guardianliteTable);

    await client.query(speakerTable);
    await client.query(speakerMacroTable);

    await client.query(deviceTable);

    await client.query(eventTypeTable);
    await client.query(defaultEventTypeInsert);

    await client.query(groupTable);
    await client.query(groupOutsideTable);

    await client.query(audioFileTable)
    
    await client.query(reserveTable);
    await client.query(regularTable);

  } catch(error) {
    logger.info('db/query/broadcastDBmanager.js, createTables, error: ', error);
    console.log('db/query/broadcastDBmanager.js, createTables, error: ', error);
  } finally {
    await client.release();
  }
}