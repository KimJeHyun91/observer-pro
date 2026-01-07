const { pool } = require('../postgresqlPool');
const logger = require('../../logger');


exports.createTables = async () => {

  const outSideTable = `
  CREATE TABLE IF NOT EXISTS ob_outside (
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
  CREATE TABLE IF NOT EXISTS ob_inside (
    idx SERIAL NOT NULL PRIMARY KEY,
    inside_name TEXT NOT NULL,
    outside_idx INTEGER,
    three_d_model_id INTEGER,
    map_image_url TEXT,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    group_name TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const deviceTable = `
  CREATE TABLE IF NOT EXISTS ob_device (
    idx SERIAL NOT NULL PRIMARY KEY,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_ip TEXT UNIQUE NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'ebell',
    device_location TEXT,
    outside_idx INTEGER,
    dimension_type TEXT,
    inside_idx INTEGER,
    left_location TEXT,
    top_location TEXT,
    camera_id TEXT,
    service_type TEXT,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    is_lock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const pidsTable = `
  CREATE TABLE IF NOT EXISTS ob_pids (
    idx SERIAL NOT NULL PRIMARY KEY,
    pids_id TEXT UNIQUE,
    pids_ip TEXT,
    pids_name TEXT,
    pids_type TEXT,
    pids_location TEXT,
    line_x1 TEXT,
    line_x2 TEXT,
    line_y1 TEXT,
    line_y2 TEXT,
    outside_idx INTEGER,
    inside_idx INTEGER,
    dimension_type TEXT,
    telemetry_control_id TEXT,
    telemetry_control_preset TEXT,
    camera_id TEXT,
    camera_id_preset_start TEXT,
    camera_id_preset_end TEXT,
    alarm_status BOOLEAN DEFAULT FALSE,
    linked_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ob_pids_ip FOREIGN KEY(pids_ip) REFERENCES ob_device(device_ip) ON DELETE CASCADE
  )
  `;

  const accessControlLogTable = `
  CREATE TABLE IF NOT EXISTS ob_access_control_log (
    "LogIDX" BIGSERIAL PRIMARY KEY,
    "LogDate" TEXT, 
    "LogTime" TEXT,
    "LogDateTime" TEXT,
    "LogType" TEXT, 
    "LogStatus" TEXT, 
    "LogStatusName" TEXT, 
    "LogRFID" TEXT, 
    "LogPIN" TEXT, 
    "LogIDType" TEXT, 
    "LogIDCredit" TEXT, 
    "LogAuthType" TEXT, 
    "LogDeviceID" TEXT, 
    "LogDeviceName" TEXT, 
    "LogReaderID" TEXT, 
    "LogReaderName" TEXT, 
    "LogDoorID" TEXT, 
    "LogDoorName" TEXT, 
    "LogInputMode" TEXT, 
    "LogInputID" TEXT, 
    "LogInputType" TEXT, 
    "LogInputName" TEXT, 
    "LogLocationArea" TEXT, 
    "LogLocationFloor" TEXT, 
    "LogPersonID" TEXT, 
    "LogPersonLastName" TEXT, 
    "LogPersonFirstName" TEXT, 
    "LogCompanyID" integer, 
    "LogCompanyName" TEXT, 
    "LogDepartmentID" integer, 
    "LogDepartmentName" TEXT, 
    "LogTitleID" integer, 
    "LogTitleName" TEXT, 
    "LastUpdateDateTime" TEXT, 
    "LogSystemWorkID" TEXT,
    "camera_id" TEXT,
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW()
  )`;

  const accessCtlSMSTable = `
  CREATE TABLE IF NOT EXISTS ob_access_control_person (
    idx SERIAL NOT NULL PRIMARY KEY,
    student_id TEXT UNIQUE,
    student_name TEXT,
    student_contact TEXT,
    school_id TEXT,
    school_name TEXT,
    class_id TEXT,
    class_name TEXT,
    next_of_kin_name TEXT,
    next_of_kin_contact1 TEXT,
    next_of_kin_contact2 TEXT,
    use_sms boolean DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)
`;

  const guardianliteTable = `
  CREATE TABLE IF NOT EXISTS ob_guardianlite (
    guardianlite_ip TEXT NOT NULL PRIMARY KEY,
    guardianlite_name TEXT NOT NULL,
    status BOOLEAN DEFAULT true,
    user_id TEXT DEFAULT 'admin',
    user_pw TEXT DEFAULT 'greenit',
    outside_idx INTEGER,
    inside_idx INTEGER,
    dimension_type TEXT,
    top_location TEXT,
    left_location TEXT,
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
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_inside FOREIGN KEY(inside_idx)
      REFERENCES ob_inside(idx)
      ON DELETE CASCADE
  )
  `;

  const ebellDeviceSensorTable = `
  CREATE TABLE IF NOT EXISTS ob_eb_device_sensor (
    idx SERIAL NOT NULL PRIMARY KEY,
    extension TEXT NOT NULL,
    pm1_0 TEXT,
    pm2_5 TEXT,
    pm10 TEXT,
    temper TEXT,
    humid TEXT,
    inside TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const ebellDeviceEventTable = `
  CREATE TABLE IF NOT EXISTS ob_eb_device_event (
    idx SERIAL NOT NULL PRIMARY KEY,
    extension_req TEXT NOT NULL,
    extension_res TEXT,
    call_req TEXT,
    call_start TEXT,
    call_end TEXT,
    device_ip TEXT NOT NULL,
    call_type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const anprVehicleNumberTable = `
    CREATE TABLE IF NOT EXISTS anpr_vehicle_num (
      idx SERIAL NOT NULL PRIMARY KEY,
      vehicle_num TEXT,
      event_camera_id TEXT,
      recog_datetime TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  // const vmsTable = `
  // CREATE TABLE IF NOT EXISTS ob_vms (
  //   idx SERIAL NOT NULL PRIMARY KEY,
  //   vms_id TEXT NOT NULL,
  //   vms_pw TEXT NOT NULL,
  //   vms_ip TEXT NOT NULL,
  //   vms_port TEXT NOT NULL,
  //   vms_name TEXT NOT NULL,
  //   main_service_name TEXT NOT NULL,
  //   linked_status BOOLEAN NOT NULL DEFAULT true,
  //   created_at timestamp NOT NULL DEFAULT NOW(),
  //   updated_at timestamp NOT NULL DEFAULT NOW(),
  //   UNIQUE(vms_name, main_service_name)
  // )
  // `;

  // const cameraTable = `
  // CREATE TABLE IF NOT EXISTS ob_camera (
  //   idx SERIAL NOT NULL,
  //   camera_id TEXT NOT NULL,
  //   vms_name TEXT NOT NULL,
  //   main_service_name TEXT NOT NULL,
  //   camera_name TEXT NOT NULL,
  //   camera_ip TEXT NOT NULL,
  //   camera_angle TEXT,
  //   outside_idx INTEGER,
  //   inside_idx INTEGER,
  //   water_level_idx INTEGER,
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
  //   CONSTRAINT pk_ob_camera_id_vms_name PRIMARY KEY (camera_id, vms_name, main_service_name)
  // )
  // `;
  const client = await pool.connect();

  try {

    await client.query(outSideTable);
    await client.query(inSideTable);
    await client.query(deviceTable);
    await client.query(pidsTable);
    await client.query(accessControlLogTable);
    await client.query(accessCtlSMSTable);

    await client.query(guardianliteTable);
    
    await client.query(ebellDeviceSensorTable);
    await client.query(ebellDeviceEventTable);
    await client.query(anprVehicleNumberTable);

    const insideSequence = `
    SELECT setval(
      pg_get_serial_sequence('ob_inside','idx'),
      (SELECT COALESCE(MAX(idx),0) + 1 FROM ob_inside),
      false
    );`

    await client.query(insideSequence);

    // await client.query(vmsTable);
    // await client.query(cameraTable);

    
    
  } catch(error) {
    logger.info('db/query/observerDBmanager.js, createTables, error: ', error);
    console.log('db/query/observerDBmanager.js, createTables, error: ', error);
  } finally {
    await client.release();
  }
}
