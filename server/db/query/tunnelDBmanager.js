const { pool } = require('../postgresqlPool');
const logger = require('../../logger');
const { cli } = require('winston/lib/winston/config');


exports.createTables = async () => {

  const outSideTable = `
  CREATE TABLE IF NOT EXISTS tm_outside (
    idx SERIAL NOT NULL PRIMARY KEY,
    outside_name TEXT NOT NULL,
    location TEXT,
    barrier_ip TEXT NOT NULL,
    barrier_status BOOLEAN NOT NULL DEFAULT false,
    left_location TEXT,
    top_location TEXT,
    map_image_url TEXT,
    service_type TEXT,
    direction TEXT NOT NULL, 
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    automatic BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const waterGaugeTable = `
  CREATE TABLE IF NOT EXISTS tm_water_gauge (
    idx SERIAL NOT NULL PRIMARY KEY,
    outside_idx INTEGER NOT NULL REFERENCES tm_outside(idx) ON DELETE CASCADE,
    water_gauge_name TEXT NOT NULL,
    water_gauge_port TEXT NOT NULL,
    water_gauge_baudRate INTEGER NOT NULL,
    water_gauge_slaveId INTEGER NOT NULL,
    water_gauge_address INTEGER NOT NULL,
    top_location TEXT,
    left_location TEXT,
    use_status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `;

  // 수위계 테이블 추가
  const waterLevelTable = `
  CREATE TABLE IF NOT EXISTS tm_water_level (
    idx SERIAL NOT NULL PRIMARY KEY,
    communication_type TEXT,
    water_level_name TEXT,
    water_level_location TEXT,
    water_level_ip TEXT UNIQUE NOT NULL,
    water_level_port TEXT,
    water_level_id TEXT,
    water_level_pw TEXT,
    curr_water_level NUMERIC NOT NULL DEFAULT 0,
    threshold NUMERIC NOT NULL DEFAULT 0,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    use_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  // 터널과 수위계 매핑 테이블 추가
  const mappingTunnelWaterLevelTable = `
  CREATE TABLE IF NOT EXISTS tm_mapping_tunnel_water_level (
    outside_idx INTEGER,
    water_level_idx INTEGER,
    top_location TEXT,
    left_location TEXT,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tm_outside_idx_water_level_idx PRIMARY KEY (outside_idx, water_level_idx),
    CONSTRAINT fk_tm_water_level_idx FOREIGN KEY(water_level_idx) REFERENCES tm_water_level(idx) ON DELETE CASCADE,
    CONSTRAINT fk_tm_outside_idx FOREIGN KEY(outside_idx) REFERENCES tm_outside(idx) ON DELETE CASCADE
  )
  `;

  // 수위계 로그 테이블 추가
  const waterLevelLogTable = `
  CREATE TABLE IF NOT EXISTS tm_water_level_log (
    idx BIGSERIAL PRIMARY KEY,
    water_level_idx INTEGER NOT NULL,
    water_level NUMERIC  NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_water_level
    FOREIGN KEY (water_level_idx)
    REFERENCES tm_water_level(idx)
    ON DELETE CASCADE
  );
  `;



  const groupTable = `
  CREATE TABLE IF NOT EXISTS tm_group (
    idx SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,                        
    has_up_tunnel BOOLEAN NOT NULL DEFAULT false,      
    has_down_tunnel BOOLEAN NOT NULL DEFAULT false,    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `;

  // ajy add 전광판 테이블 추가
  const billboardTable = `
  CREATE TABLE IF NOT EXISTS tm_billboard (
    idx SERIAL NOT NULL PRIMARY KEY,
    billboard_name TEXT,
    billboard_ip TEXT UNIQUE NOT NULL,
    billboard_controller_model TEXT,
    billboard_port TEXT,
    billboard_msg TEXT,
    billboard_color TEXT DEFAULT 'red',
    controller_type TEXT DEFAULT 'LCS',
    manufacturer TEXT,
    billboard_status TEXT,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    direction text,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `;

  // ajy add 터널과 전광판 매핑 테이블 추가
  const mappingTunnelBillboardTable = `
  CREATE TABLE IF NOT EXISTS tm_mapping_tunnel_billboard (
    outside_idx INTEGER,
    billboard_idx INTEGER,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tm_outside_idx_billboard_idx PRIMARY KEY (outside_idx, billboard_idx),
    CONSTRAINT fk_tm_billboard_idx FOREIGN KEY(billboard_idx) REFERENCES tm_billboard(idx) ON DELETE CASCADE,
    CONSTRAINT fk_tm_outside_idx FOREIGN KEY(outside_idx) REFERENCES tm_outside(idx) ON DELETE CASCADE
  )
  `;

  // ajy add 가디언 라이트 테이블 추가
  const guardianliteTable = `
  CREATE TABLE IF NOT EXISTS tm_guardianlite (
    guardianlite_ip TEXT NOT NULL PRIMARY KEY,
    guardianlite_name TEXT,
    status BOOLEAN DEFAULT true,
    user_id TEXT DEFAULT 'admin',
    user_pw TEXT DEFAULT 'greenit',
    outside_idx INTEGER NOT NULL,
    ch1 TEXT,
    ch2 TEXT,
    ch3 TEXT,
    ch4 TEXT,
    ch5 TEXT,
    ch6 TEXT,
    ch7 TEXT,
    ch8 TEXT,
    temper TEXT,
    ch1_label TEXT DEFAULT 'CH1',
    ch2_label TEXT DEFAULT 'CH2',
    ch3_label TEXT DEFAULT 'CH3',
    ch4_label TEXT DEFAULT 'CH4',
    ch5_label TEXT DEFAULT 'CH5',
    ch6_label TEXT,
    ch7_label TEXT,
    ch8_label TEXT,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tm_guardianlite_outside_idx
      FOREIGN KEY (outside_idx) REFERENCES tm_outside(idx) ON DELETE CASCADE
  )
`;

  // 이벤트 테이블 추가
  const eventTypeTable = `
  CREATE TABLE IF NOT EXISTS tm_event_type (        
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
  // 이벤트 테이블 기본값 추가
  const defaultEventTypeInsert = `
  INSERT INTO tm_event_type (
    id, event_type, service_type, severity_id, use_warning_board, use_popup, use_event_type
  ) VALUES 
    (38, '위험 수위 감지 (주의)', 'waterlevel', 1, false, false, true),
    (39, '위험 수위 감지 (경계)', 'waterlevel', 2, false, false, true),
    (40, '위험 수위 감지 (심각)', 'waterlevel', 3, false, false, true),
    (44, '위험 수위 감지 (대피)', 'waterlevel', 3, false, false, true),
    (47, '차단기 자동제어', 'crossinggate', 3, false, false, true)
    ON CONFLICT (id) DO NOTHING;
  `;

  const client = await pool.connect();

  try {

    await client.query(outSideTable);
    await client.query(waterLevelTable);
    await client.query(mappingTunnelWaterLevelTable);
    await client.query(waterLevelLogTable);
    await client.query(billboardTable);
    await client.query(mappingTunnelBillboardTable);
    await client.query(guardianliteTable);
    await client.query(eventTypeTable);
    await client.query(defaultEventTypeInsert);

  } catch (error) {
    logger.info('db/query/tunnelDBmanager.js, createTables, error: ', error);
    console.log('db/query/tunnelDBmanager.js, createTables, error: ', error);
  } finally {
    await client.release();
  }
}