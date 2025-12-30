const { pool } = require('../postgresqlPool');
const logger = require('../../logger');

exports.createTables = async () => {
  const threedModels = `
    CREATE TABLE IF NOT EXISTS three_d_models (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT NOT NULL,
        service_type TEXT,
        model_type TEXT,
        is_use BOOLEAN DEFAULT FALSE,
        camera_pos_x DOUBLE PRECISION,
        camera_pos_y DOUBLE PRECISION,
        camera_pos_z DOUBLE PRECISION,
        camera_target_x DOUBLE PRECISION,
        camera_target_y DOUBLE PRECISION,
        camera_target_z DOUBLE PRECISION,
        camera_zoom DOUBLE PRECISION,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  const threedMappingDevice = `
    CREATE TABLE IF NOT EXISTS three_d_device_mapping (
        id SERIAL PRIMARY KEY,
        mapping_name TEXT NOT NULL,
        group_name TEXT NULL,
        model_id INTEGER NOT NULL REFERENCES three_d_models(id) ON DELETE CASCADE,
        device_id INTEGER NOT NULL REFERENCES three_d_devices(id) ON DELETE CASCADE,
        position_x DOUBLE PRECISION,
        position_y DOUBLE PRECISION,
        position_z DOUBLE PRECISION,
        rotation_x DOUBLE PRECISION,
        rotation_y DOUBLE PRECISION,
        rotation_z DOUBLE PRECISION,
        scale DOUBLE PRECISION DEFAULT 1.0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        linked_model_id INTEGER
    );
  `;

  const threedDevices = `
    CREATE TABLE IF NOT EXISTS three_d_devices (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  const initImageDevice = `
    INSERT INTO three_d_devices (id, name, filename, type, description)
    SELECT -1, 'Image', '', 'image_model', '2D 이미지용'
    WHERE NOT EXISTS (
      SELECT 1 FROM three_d_devices WHERE id = -1
    );
  `;

  const initLinkedDevice = `
    INSERT INTO three_d_devices (id, name, filename, type, description)
    SELECT 0, 'Link', '', 'linked_model', 'link 이동용'
    WHERE NOT EXISTS (
      SELECT 1 FROM three_d_devices WHERE id = 0
    );
  `;

  const fixSequence = `
    SELECT setval(pg_get_serial_sequence('three_d_devices', 'id'), 
    GREATEST((SELECT MAX(id) FROM three_d_devices), 0) + 1, false);
  `;

  const client = await pool.connect();

  try {
    await client.query(threedModels);
    await client.query(threedDevices);    
    await client.query(threedMappingDevice);
    await client.query(initImageDevice);
    await client.query(initLinkedDevice);
    await client.query(fixSequence);
  } catch(error) {
    logger.info('db/query/threedDBmanager.js, createTables, error: ', error);
    console.log('db/query/threedDBmanager.js, createTables, error: ', error);
  } finally {
    await client.release();
  }
}