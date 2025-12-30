const { pool } = require('../postgresqlPool');
const logger = require('../../logger');


exports.createTables = async () => {

  const outSideTable = `
  CREATE TABLE IF NOT EXISTS fl_outside (
    idx SERIAL NOT NULL PRIMARY KEY,
    outside_name TEXT NOT NULL,
    location TEXT,
    crossing_gate_ip TEXT UNIQUE NOT NULL,
    crossing_gate_status BOOLEAN DEFAULT false,
    left_location TEXT,
    top_location TEXT,
    service_type TEXT,
    controller_model TEXT,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const billboardTable = `
  CREATE TABLE IF NOT EXISTS fl_billboard (
    idx SERIAL NOT NULL PRIMARY KEY,
    outside_idx INTEGER,
    billboard_name TEXT,
    billboard_ip TEXT NOT NULL,
    billboard_controller_model TEXT,
    billboard_port TEXT,
    billboard_msg TEXT,
    billboard_color TEXT DEFAULT 'red',
    controller_type TEXT DEFAULT 'default',
    first_text TEXT,
    first_color TEXT,
    first_effect INTEGER, 
    second_text TEXT,
    second_color TEXT,
    second_effect INTEGER,
    billboard_status TEXT,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `;

    const signboardTable = `
    CREATE TABLE IF NOT EXISTS fl_signboard (
      idx SERIAL NOT NULL PRIMARY KEY,
      outside_idx INTEGER,
      signboard_name TEXT,
      signboard_ip TEXT NOT NULL,
      signboard_controller_model TEXT,
      signboard_port TEXT,
      signboard_msg TEXT,
      controller_type TEXT DEFAULT 'default',
      signboard_status TEXT,
      linked_status BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    `;

  const billboardMacroTable = `
  CREATE TABLE IF NOT EXISTS fl_billboard_macro (
    idx SERIAL NOT NULL PRIMARY KEY,
    billboard_msg TEXT UNIQUE,
    billboard_color TEXT DEFAULT 'red',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const speakerTable = `
  CREATE TABLE IF NOT EXISTS fl_speaker (
    idx SERIAL NOT NULL PRIMARY KEY,
    outside_idx INTEGER,
    speaker_name TEXT,
    speaker_ip TEXT NOT NULL,
    speaker_port TEXT,
    speaker_id TEXT,
    speaker_password TEXT,
    speaker_msg TEXT,
    speaker_status TEXT,
    speaker_type TEXT,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const speakerMacroTable = `
  CREATE TABLE IF NOT EXISTS fl_speaker_macro (
    idx SERIAL NOT NULL PRIMARY KEY,
    speaker_msg TEXT UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;
  
  const waterLevelTable = `
  CREATE TABLE IF NOT EXISTS fl_water_level (
    idx SERIAL NOT NULL PRIMARY KEY,
    water_level_name TEXT,
    water_level_location TEXT,
    water_level_ip TEXT UNIQUE NOT NULL,
    water_level_port TEXT NOT NULL,
    water_level_id TEXT NOT NULL,
    water_level_pw TEXT NOT NULL,
    water_level_model TEXT NOT NULL,
    curr_water_level NUMERIC NOT NULL DEFAULT 0,
    threshold NUMERIC NOT NULL DEFAULT 0,
    ground_value INTEGER DEFAULT 10000,
    left_location TEXT,
    top_location TEXT,
    water_level_uid INTEGER,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    use_status BOOLEAN NOT NULL DEFAULT false,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const guardianliteTable = `
  CREATE TABLE IF NOT EXISTS fl_guardianlite (
    guardianlite_ip TEXT NOT NULL PRIMARY KEY,
    guardianlite_name TEXT,
    status BOOLEAN DEFAULT true,
    user_id TEXT DEFAULT 'admin',
    user_pw TEXT DEFAULT 'greenit',
    outside_idx INTEGER,
    water_level_idx INTEGER,
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
    linked_status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  // const waterLevelLogTable = `
  // CREATE TABLE IF NOT EXISTS fl_water_level_log (
  //   idx BIGSERIAL NOT NULL PRIMARY KEY,
  //   water_level_idx INTEGER,
  //   water_level NUMERIC NOT NULL,
  //   created_at TIMESTAMP NOT NULL DEFAULT NOW()
  // )
  // `;

  const speakerAudioFileManageTable = `
  CREATE TABLE IF NOT EXISTS fl_audio_file_manage (
    idx SERIAL PRIMARY KEY,
    speaker_ip TEXT NOT NULL,
    speaker_type TEXT,
    message TEXT NOT NULL,
    clip_id TEXT NOT NULL,
    file_no INTEGER,    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_speaker_message UNIQUE (speaker_ip, message)
  );
  `;

  const eventTable = `
  CREATE TABLE IF NOT EXISTS fl_event (
    idx BIGSERIAL NOT NULL PRIMARY KEY,
    event_name TEXT,
    description TEXT,
    event_type_id INTEGER,
    service_type TEXT,
    event_occurrence_time TEXT NOT NULL,
    event_end_time TEXT,
    severity_id INTEGER,
    is_acknowledge TEXT NOT NULL DEFAULT false,
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

  // 수위계, 개소(차단기) N:N 구조 적용을 위해 테이블 새로 생성
  const outsideWaterlevelTable = `
  CREATE TABLE IF NOT EXISTS fl_outside_water_level (
    outside_idx INTEGER,
    water_level_idx INTEGER,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_fl_outside_idx_water_level_idx PRIMARY KEY (outside_idx, water_level_idx),
    CONSTRAINT fk_fl_water_level_idx FOREIGN KEY(water_level_idx) REFERENCES fl_water_level(idx) ON DELETE CASCADE,
    CONSTRAINT fk_fl_outside_idx FOREIGN KEY(outside_idx) REFERENCES fl_outside(idx) ON DELETE CASCADE
  )
  `;

  const waterLevelAutoControlTable = `
  CREATE TABLE IF NOT EXISTS fl_water_level_auto_control (
    idx SERIAL NOT NULL PRIMARY KEY,
    water_level_idx INTEGER NOT NULL,
    outside_idx INTEGER NOT NULL,
    auto_control_enabled BOOLEAN NOT NULL DEFAULT true,
    control_mode VARCHAR(20) NOT NULL DEFAULT 'individual',
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_auto_control_water_level_idx FOREIGN KEY(water_level_idx) REFERENCES fl_water_level(idx) ON DELETE CASCADE,
    CONSTRAINT fk_auto_control_outside_idx FOREIGN KEY(outside_idx) REFERENCES fl_outside(idx) ON DELETE CASCADE,
    CONSTRAINT unique_water_level_outside_auto_control UNIQUE(water_level_idx, outside_idx),
    CONSTRAINT check_control_mode CHECK (control_mode IN ('individual', 'group_only', 'hybrid'))
  )
  `;

  const areaGroupTable = `
  CREATE TABLE IF NOT EXISTS fl_area_group (
    id SERIAL NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`;

const areaGroupMappingTable = `
  CREATE TABLE IF NOT EXISTS fl_area_group_mapping (
    group_id INTEGER,
    area_idx INTEGER,
    PRIMARY KEY (group_id, area_idx),
    FOREIGN KEY (group_id) REFERENCES fl_area_group(id) ON DELETE CASCADE,
    FOREIGN KEY (area_idx) REFERENCES fl_outside(idx) ON DELETE CASCADE
  )
`;

// 수위계 그룹 테이블
const waterLevelGroupTable = `
  CREATE TABLE IF NOT EXISTS fl_water_level_group (
    idx SERIAL NOT NULL PRIMARY KEY,
    group_name TEXT NOT NULL UNIQUE,
    threshold_mode VARCHAR(10) NOT NULL DEFAULT 'AND',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT check_threshold_mode CHECK (threshold_mode IN ('AND', 'OR'))
  )
`;

// 수위계 그룹 매핑 테이블
const waterLevelGroupMappingTable = `
  CREATE TABLE IF NOT EXISTS fl_water_level_group_mapping (
    group_idx INTEGER NOT NULL,
    water_level_idx INTEGER NOT NULL,
    water_level_role VARCHAR(20) NOT NULL DEFAULT 'primary',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_fl_water_level_group_mapping PRIMARY KEY (group_idx, water_level_idx),
    CONSTRAINT fk_fl_water_level_group_idx FOREIGN KEY (group_idx) REFERENCES fl_water_level_group(idx) ON DELETE CASCADE,
    CONSTRAINT fk_fl_water_level_idx_mapping FOREIGN KEY (water_level_idx) REFERENCES fl_water_level(idx) ON DELETE CASCADE,
    CONSTRAINT check_water_level_role CHECK (water_level_role IN ('primary', 'secondary'))
  )
`;

  const severityTable = `
  CREATE TABLE IF NOT EXISTS fl_severity (        
    id INTEGER NOT NULL PRIMARY KEY,
    severity TEXT NOT NULL,
    severity_en TEXT NOT NULL,
    severity_color TEXT,
    classify NUMERIC,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const defaultSeverityInsert = `
  INSERT INTO fl_severity (
    id, severity, severity_en, severity_color, classify
  ) VALUES 
    (1, '안전', 'safety', '#40A640', 0), 
    (2, '관심', 'attention', '#203CEF', 0.66), 
    (3, '주의', 'caution', '#FBDB4F', 0.70),
    (4, '경계', 'warning', '#FCA421', 0.78),
    (5, '심각', 'severe', '#E6393E', 0.84), 
    (6, '대피', 'danger', '#7952BF', 0.90)
    ON CONFLICT (id) DO NOTHING;
  `;

  const eventTypeTable = `
  CREATE TABLE IF NOT EXISTS fl_event_type (        
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

  const waterlevelEcuationStats= `
  CREATE TABLE IF NOT EXISTS fl_water_level_evacuation_stats (
    water_level_idx INTEGER NOT NULL,
    evacuation_count INTEGER NOT NULL DEFAULT 0,
    last_evacuation_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_water_level_idx PRIMARY KEY (water_level_idx),
    CONSTRAINT fk_water_level_idx FOREIGN KEY (water_level_idx) 
        REFERENCES fl_water_level(idx) ON DELETE CASCADE
  );
  `

  const defaultEventTypeInsert = `
  INSERT INTO fl_event_type (
    id, event_type, service_type, severity_id, use_warning_board, use_popup, use_event_type
  ) VALUES 
    (19, '비상상황 발생', 'ebell', 3, false, false, true), 
    (20, '가디언라이트 연결 끊어짐', 'guardianlite', 0, false, false, true), 
    (29, '연결 해제', 'ndoctor', 0, false, false, true),
    (30, '연결 복구', 'ndoctor', 0, false, false, true),
    (31, '카메라 녹화 오류', 'mgist', 3, false, false, true),
    (32, '카메라 네트워크 오류', 'mgist', 3, false, false, true),
    (33, '도메인 서버 끊어짐', 'mgist', 3, false, false, true),
    (34, '아카이브 오류', 'mgist', 3, false, false, true),
    (38, '위험 수위 감지 (주의)', 'waterlevel', 1, false, false, true),
    (39, '위험 수위 감지 (경계)', 'waterlevel', 2, false, false, true),
    (40, '위험 수위 감지 (심각)', 'waterlevel', 3, false, false, true),
    (44, '위험 수위 감지 (대피)', 'waterlevel', 3, false, false, true),
    (45, '인접 개소 침수 주의', 'waterlevel', 3, false, false, true),
    (47, '차단기 자동제어', 'crossinggate', 3, false, false, true)
    ON CONFLICT (id) DO NOTHING;
  `;

    const waterLevelLogTable = `
      CREATE TABLE IF NOT EXISTS fl_water_level_log (
        idx SERIAL PRIMARY KEY,
        water_level_idx INTEGER NOT NULL,
        water_level_value DECIMAL(10,3) NOT NULL,
        water_level_status VARCHAR(50),
        water_level_height DECIMAL(10,3),
        water_level_height1 DECIMAL(10,3),
        water_level_height2 DECIMAL(10,3),
        water_level_lat DECIMAL(10,6),
        water_level_lng DECIMAL(10,6),
        water_level_time TIMESTAMP,
        system_cpu DECIMAL(5,2),
        system_memory DECIMAL(5,2),
        system_disk DECIMAL(5,2),
        system_temp DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (water_level_idx) REFERENCES fl_water_level(idx) ON DELETE CASCADE
      );
    `;
    
  const client = await pool.connect();

  try {

    await client.query(outSideTable);
    // await client.query(inSideTable); // 사용안함
    // await client.query(deviceTable); // 사용안함

    await client.query(billboardTable);
    await client.query(billboardMacroTable);
    await client.query(signboardTable);
    await client.query(speakerTable);
    await client.query(speakerMacroTable);
    await client.query(areaGroupTable);
    await client.query(areaGroupMappingTable);
    await client.query(waterLevelTable);
    await client.query(waterLevelGroupTable);
    await client.query(waterLevelGroupMappingTable);
    // await client.query(waterLevelDeviceTable); // 사용안함
    await client.query(waterLevelLogTable);
    await client.query(waterlevelEcuationStats);

    await client.query(guardianliteTable);
    // await client.query(eventTable);

    await client.query(speakerAudioFileManageTable);
    
    // await client.query(vmsTable);
    // await client.query(cameraTable);

    await client.query(outsideWaterlevelTable); // 개소(차단기) : 수위계 (N:N) 구조 적용을 위해 생성
    await client.query(waterLevelAutoControlTable); 
    
    await client.query(severityTable);
    await client.query(defaultSeverityInsert);

    await client.query(eventTypeTable);
    await client.query(defaultEventTypeInsert);

  } catch(error) {
    logger.info('db/query/inundationControlDBmanager.js, createTables, error: ', error);
    console.log('db/query/inundationControlDBmanager.js, createTables, error: ', error);
  } finally {
    await client.release();
  }
}