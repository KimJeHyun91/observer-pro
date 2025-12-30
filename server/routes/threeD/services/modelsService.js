const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const { deleteInSide } = require('../../observer/services/insideService');
const modelsMapper = require('../mappers/modelsMapper');

exports.insertModelsFile = async (addfileData) => {
  const client = await pool.connect();

  const { 
    modelName, 
    mapImageUrl, 
    serviceType,
    modelType
  } = addfileData

  try {
    const binds = [modelName, mapImageUrl, serviceType, modelType];
    const query = await modelsMapper.insertModelsFile();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');
  
    return res.rowCount;
  } catch (error) {
    logger.info('threeD/modelsService.js, insertModelsFile, error: ', error);
    console.log('threeD/modelsService.js, insertModelsFile, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.insertDevicesFile = async (addfileData) => {
  const client = await pool.connect();

  const { 
    name, 
    filename, 
    type, 
    description 
  } = addfileData;

  try {
    const binds = [name, filename, type, description];
    const query = await modelsMapper.insertDevicesFile();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');
  
    return res.rowCount;
  } catch (error) {
    logger.info('threeD/modelsService.js, insertDevicesFile, error: ', error);
    console.log('threeD/modelsService.js, insertDevicesFile, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getGlbModels = async ({ serviceType }) => {
  const client = await pool.connect();

  try {
    const binds = [serviceType];
    const query = await modelsMapper.getGlbModels();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('threeD/modelsService.js, getGlbModels, error: ', error);
    console.log('threeD/modelsService.js, getGlbModels, error: ', error);
  } finally {
    await client.release();
  }
}

exports.saveDefaultModel = async (defaultModel) => {
  const client = await pool.connect();

  const { 
    modelId, 
    serviceType,
    camera_pos_x,
    camera_pos_y,
    camera_pos_z,
    camera_target_x,
    camera_target_y,
    camera_target_z,
    camera_zoom
  } = defaultModel

  try {
    const binds = [
      modelId, serviceType,
      camera_pos_x, camera_pos_y, camera_pos_z,
      camera_target_x, camera_target_y, camera_target_z, camera_zoom
    ];
    const query = await modelsMapper.saveDefaultModel();

    const res = await client.query(query, binds);

    if (res.rowCount === 0) {
      return null;
    }

    return res.rowCount;
  } catch (error) {
    logger.info('threeD/modelsService.js, saveDefaultModel, error: ', error);
    console.log('threeD/modelsService.js, saveDefaultModel, error: ', error);
  } finally {
    await client.release();
  }
}

exports.deleteModel = async ({ modelId, serviceType }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    
    const binds = [modelId, serviceType];
    const query = await modelsMapper.deleteModel();

    const res = await client.query(query, binds);

    if (res.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `DELETE FROM three_d_device_mapping WHERE linked_model_id = $1`,
      [modelId]
    );
    await deleteInSide({ modelId });
    await client.query("COMMIT");
    return res.rowCount;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.info('threeD/modelsService.js, saveDefaultModel, error: ', error);
    console.log('threeD/modelsService.js, saveDefaultModel, error: ', error);
  } finally {
    await client.release();
  }
}

exports.threedDeleteDevice = async ({ id }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 장비 삭제
    const deviceRes = await client.query(
      `DELETE FROM three_d_devices WHERE id = $1`,
      [id]
    );

    if (deviceRes.rowCount === 0) {
      // 장비가 없으면 ROLLBACK
      await client.query("ROLLBACK");
      return null;
    }

    // 매핑 삭제 (장비 삭제되면 ON DELETE CASCADE로 자동 삭제되긴 함 - 이중체크)
    await client.query(
      `DELETE FROM three_d_device_mapping WHERE device_id = $1`,
      [id]
    );

    await client.query("COMMIT");
    return deviceRes.rowCount;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.info('threeD/modelsService.js, saveDefaultModel, error: ', error);
    console.log('threeD/modelsService.js, saveDefaultModel, error: ', error);
  } finally {
    await client.release();
  }
}

exports.savePositionModel = async (modelPosition) => {
  const client = await pool.connect();

  const { 
    modelId, 
    serviceType,
    camera_pos_x,
    camera_pos_y,
    camera_pos_z,
    camera_target_x,
    camera_target_y,
    camera_target_z,
    camera_zoom
  } = modelPosition

  try {
    const binds = [
      modelId, serviceType,
      camera_pos_x, camera_pos_y, camera_pos_z,
      camera_target_x, camera_target_y, camera_target_z, 
      camera_zoom
    ];
    const query = await modelsMapper.savePositionModel();

    const res = await client.query(query, binds);

    if (res.rowCount === 0) {
      return null;
    }

    return res.rowCount;
  } catch (error) {
    logger.info('threeD/modelsService.js, saveDefaultModel, error: ', error);
    console.log('threeD/modelsService.js, saveDefaultModel, error: ', error);
  } finally {
    await client.release();
  }
}

exports.threedDeviceList = async () => {
  const client = await pool.connect();

  try {
    const binds = [];
    const query = await modelsMapper.threedDeviceList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('threeD/modelsService.js, threedDeviceList, error: ', error);
    console.log('threeD/modelsService.js, threedDeviceList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addDeviceMapping = async (deviceMapping) => {
  const client = await pool.connect();

  const {
    model_id, 
    device_id,
    position_x,
    position_y,
    position_z,
    rotation_x,
    rotation_y,
    rotation_z,
    scale,
    linked_model_id,
    mapping_name,
    group_name
  } = deviceMapping;

  try {
    await client.query('BEGIN');

    const binds = [
      model_id, device_id,
      position_x, position_y, position_z,
      rotation_x, rotation_y, rotation_z, 
      scale, linked_model_id, mapping_name, group_name
    ];

    const query = await modelsMapper.addDeviceMapping();

    const res = await client.query(query, binds);

    if (res.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('COMMIT');

    return res.rows[0];
  } catch (error) {
    logger.info('threeD/modelsService.js, addDeviceMapping, error: ', error);
    console.log('threeD/modelsService.js, addDeviceMapping, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addModelFloors = async ({
  modelId,
  buildingGroup,
  floorList
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const floorName of floorList) {
      const exists = await client.query(
        `
        SELECT 1
        FROM three_d_device_mapping
        WHERE model_id = $1
          AND device_id = -1
          AND linked_model_id = -1
          AND mapping_name = $2
          AND group_name = $3
        `,
        [modelId, floorName, buildingGroup]
      );

      if (exists.rowCount > 0) continue;
    
      const res = await client.query(
        `
        INSERT INTO three_d_device_mapping (
          model_id,
          device_id,
          position_x,
          position_y,
          position_z,
          rotation_x,
          rotation_y,
          rotation_z,
          scale,
          linked_model_id,
          mapping_name,
          group_name
        ) VALUES (
          $1, -1,
          NULL, NULL, NULL,
          NULL, NULL, NULL,
          NULL, -1, $2, $3
        )
        RETURNING *;
        `,
        [modelId, floorName, buildingGroup]
      );

      if (res.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

       const inserted = res.rows[0];

      if (inserted.device_id === -1) {
        const insertInsideQuery = `
          INSERT INTO ob_inside (
            idx,
            inside_name,
            outside_idx,
            three_d_model_id,
            group_name,
            map_image_url,
            alarm_status,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, NULL, $3, $4, NULL, false, now(), now()
          )
          RETURNING *;
        `;

        const insideBinds = [
          inserted.id,
          inserted.mapping_name || '',
          inserted.model_id,
          inserted.group_name
        ];

        await client.query(insertInsideQuery, insideBinds);
      }
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    logger.info('threeD/modelsService.js, addModelFloors, error: ', error);
    console.log('threeD/modelsService.js, addModelFloors, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
};


exports.getDeviceMappings = async ({ modelId, serviceType }) => {
  const client = await pool.connect();

  try {
    const binds = [modelId, serviceType];
    const query = await modelsMapper.getDeviceMappings();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('threeD/modelsService.js, getDeviceMappings, error: ', error);
    console.log('threeD/modelsService.js, getDeviceMappings, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getAllDeviceMappings = async ({ serviceType }) => {
  const client = await pool.connect();

  try {
    const binds = [serviceType];
    const query = await modelsMapper.getAllDeviceMappings();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('threeD/modelsService.js, getAllDeviceMappings, error: ', error);
    console.log('threeD/modelsService.js, getAllDeviceMappings, error: ', error);
  } finally {
    await client.release();
  }
}

exports.deleteDeviceMapping = async ({ id}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const binds = [id];
    const query = await modelsMapper.deleteDeviceMapping();

    const res = await client.query(query, binds);

    if (res.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await deleteInSide({ idx: id });

    await client.query('COMMIT');
    return res.rowCount;
  } catch (error) {
    logger.info('threeD/modelsService.js, deleteDeviceMapping, error: ', error);
    console.log('threeD/modelsService.js, deleteDeviceMapping, error: ', error);
  } finally {
    await client.release();
  }
}