const { pool } = require('../postgresqlPool');
const logger = require('../../logger');


exports.createTables = async () => {

  const outSideTable = `
  CREATE TABLE IF NOT EXISTS pm_outside (
    idx SERIAL NOT NULL PRIMARY KEY,
    outside_name TEXT NOT NULL,
    left_location TEXT,
    top_location TEXT,
    map_image_url TEXT,
    service_type TEXT NOT NULL,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const inSideTable = `
  CREATE TABLE IF NOT EXISTS pm_inside (
    idx SERIAL NOT NULL PRIMARY KEY,
    inside_name TEXT NOT NULL,
    outside_idx INTEGER NOT NULL,
    map_image_url TEXT,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pm_outside_idx FOREIGN KEY(outside_idx) REFERENCES pm_outside(idx) ON DELETE CASCADE
  )
  `;

  const areaTable = `
  CREATE TABLE IF NOT EXISTS pm_area (
    idx SERIAL NOT NULL PRIMARY KEY,
    area_name TEXT NOT NULL,
    outside_idx INTEGER,
    inside_idx INTEGER,
    parking_type_id INTEGER,
    device_idx INTEGER,
    left_location TEXT,
    top_location TEXT,
    icon_width TEXT,
    icon_height TEXT,
    use_area BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const deviceTable = `
  CREATE TABLE IF NOT EXISTS pm_device (
    idx SERIAL NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_pw TEXT NOT NULL,
    device_ip TEXT NOT NULL,
    device_port TEXT NOT NULL,
    device_no16 TEXT UNIQUE NOT NULL,
    device_no10 INTEGER NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'sensor',
    device_location TEXT,
    use_status BOOLEAN NOT NULL DEFAULT false,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    is_alarm_send BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const eventTable = `
  CREATE TABLE IF NOT EXISTS pm_event (
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
    camera_id TEXT,
    snapshot_path TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const accessLogTable = `
  CREATE TABLE IF NOT EXISTS pm_access_log (
    idx BIGSERIAL NOT NULL PRIMARY KEY,
    area_idx INTEGER,
    vehicle_number TEXT NOT NULL,
    in_at TEXT NOT NULL,
    out_at TEXT,
    vehicle_image TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const parkingTypeTable = `
  CREATE TABLE IF NOT EXISTS pm_parking_type (
    id INTEGER NOT NULL PRIMARY KEY,
    parking_type_name TEXT NOT NULL,
    parking_type_image TEXT,
    parking_type_color TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const defaultParkingTypeInsert = `
  INSERT INTO pm_parking_type (
    id, parking_type_name, parking_type_image, parking_type_color
  ) VALUES 
   (1, '일반', null, 'green'),
   (2, '경차', null, 'yellow'),
   (3, '장애인', null, 'blue'),
   (4, '전기차', null, 'sky')
   ON CONFLICT (id) DO NOTHING;
  `;

  // const vmsTable = `
  // CREATE TABLE IF NOT EXISTS pm_vms (
  //   idx SERIAL NOT NULL PRIMARY KEY,
  //   vms_id TEXT NOT NULL,
  //   vms_pw TEXT NOT NULL,
  //   vms_ip TEXT NOT NULL,
  //   vms_port TEXT NOT NULL,
  //   vms_name TEXT UNIQUE NOT NULL,
  //   linked_status BOOLEAN NOT NULL DEFAULT true,
  //   created_at timestamp NOT NULL DEFAULT NOW(),
  //   updated_at timestamp NOT NULL DEFAULT NOW()
  // )
  // `;

  // const cameraTable = `
  // CREATE TABLE IF NOT EXISTS pm_camera (
  //   idx SERIAL NOT NULL,
  //   camera_id TEXT NOT NULL,
  //   vms_name TEXT NOT NULL,
  //   camera_name TEXT NOT NULL,
  //   camera_ip TEXT NOT NULL,
  //   camera_angle TEXT,
  //   outside_idx INTEGER,
  //   inside_idx INTEGER,
  //   left_location TEXT,
  //   top_location TEXT,
  //   use_status BOOLEAN NOT NULL DEFAULT false,
  //   service_type TEXT,
  //   camera_vendor TEXT,
  //   camera_model TEXT,
  //   access_point TEXT,
  //   linked_status BOOLEAN NOT NULL DEFAULT true,
  //   alarm_status BOOLEAN NOT NULL DEFAULT false,
  //   created_at timestamp NOT NULL DEFAULT NOW(),
  //   updated_at timestamp NOT NULL DEFAULT NOW(),
  //   CONSTRAINT pk_pm_camera_id_vms_name PRIMARY KEY (camera_id, vms_name)
  // )
  // `;

  const eventTypeTable = `
  CREATE TABLE IF NOT EXISTS pm_event_type (        
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
  INSERT INTO pm_event_type (
    id, event_type, service_type, severity_id, use_warning_board, use_popup, use_event_type
  ) VALUES 
    (35, '만차', 'mgist', 3, true, true, true),
    (41, '주차면 센서 네트워크 끊김', 'mgist', 3, true, true, true)
    ON CONFLICT (id) DO NOTHING;
  `;
  const client = await pool.connect();

  try {

    await client.query(outSideTable);
    await client.query(inSideTable);
    await client.query(areaTable);
    await client.query(deviceTable);
    await client.query(eventTable);
    await client.query(accessLogTable);
    await client.query(parkingTypeTable);
    await client.query(defaultParkingTypeInsert);

    // await client.query(vmsTable);
    // await client.query(cameraTable);

    await client.query(eventTypeTable);
    await client.query(defaultEventTypeInsert);
    
  } catch(error) {
    logger.info('db/query/parkingDBmanager.js, createTables, error: ', error);
    console.log('db/query/parkingDBmanager.js, createTables, error: ', error);
  } finally {
    await client.release();
  }
}
