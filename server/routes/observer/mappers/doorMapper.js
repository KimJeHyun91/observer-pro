exports.doorSendPacket = async () => {
  
  let query = `
  INSERT INTO Comm_Send_Packet (
    SenderIPAddress,
    DestIPAddress,
    SystemWorkID,
    DeviceID, 
    PacketCommand,
    PacketData1,
    PacketData2,
    PacketData3,
    PacketData4,
    PacketData5,
    PacketStatus
  ) VALUES (
    @SenderIPAddress,
    @DestIPAddress, 
    @SystemWorkID, 
    @DeviceID, 
    @PacketCommand, 
    @PacketData1, 
    @PacketData2,
    @PacketData3, 
    @PacketData4, 
    @PacketData5,
    @PacketStatus
  );
  `;

  return query;
}

exports.doorControl = async () => {
  
  let query = `
  INSERT INTO Comm_Control (
    SenderIPAddress,
    DestIPAddress,
    CommCommand,
    SystemWorkID,
    DeviceID
  ) VALUES (
    @SenderIPAddress, 
    @DestIPAddress, 
    @CommCommand, 
    @SystemWorkID, 
    @DeviceID
  );
  `;

  return query;
}


exports.getDoors = async (insideIdx, dimension_type) => {
  
  let query;
  if(insideIdx && dimension_type === '2d'){
    query = `
      SELECT 
        device.*, inside_name, outside_name, outside_map_image_url, inside_map_image_url
      FROM 
      ob_device device
        LEFT OUTER JOIN
          (
            SELECT
              idx, inside_name, map_image_url AS inside_map_image_url
            FROM 
              ob_inside
          ) inside
        ON
          device.inside_idx = inside.idx
        LEFT OUTER JOIN
          (
            SELECT
              idx, outside_name, map_image_url AS outside_map_image_url
            FROM 
              ob_outside
          ) outside
        ON
          device.outside_idx = outside.idx
      WHERE
        device_type='door'
        AND
        inside_idx=$1
      `;
  } else if(insideIdx && dimension_type === '3d'){
    query = `
      SELECT 
        device.*, inside_name, outside_name, inside_map_image_url
      FROM 
      ob_device device
        LEFT OUTER JOIN
          (
            SELECT
              idx, inside_name, map_image_url AS inside_map_image_url
            FROM 
              ob_inside
          ) inside
        ON
          device.inside_idx = inside.idx
        LEFT OUTER JOIN
          (
            SELECT
              id, name as outside_name
            FROM 
              three_d_models
          ) model
        ON
          device.outside_idx = model.id
      WHERE
        device_type='door'
        AND
        inside_idx=$1
      `;
  } else if(insideIdx == null && dimension_type) {
    query = `
      SELECT 
        device.*, inside_name, outside_name, outside_map_image_url, inside_map_image_url
      FROM ob_device device
        LEFT OUTER JOIN
          (
            SELECT
              idx, inside_name, map_image_url AS inside_map_image_url
            FROM 
              ob_inside
          ) inside
        ON
          device.inside_idx = inside.idx
        LEFT OUTER JOIN
          (
            SELECT
              idx, outside_name, map_image_url AS outside_map_image_url
            FROM 
              ob_outside
          ) outside
        ON
          device.outside_idx = outside.idx
      WHERE
        device_type='door'
        AND
        inside_idx IS NULL
      `;
  } else if(insideIdx == null && dimension_type == null) {
        query = `
      SELECT 
        device.*, inside_name, outside_name, outside_map_image_url, inside_map_image_url, model_name
      FROM ob_device device
        LEFT OUTER JOIN
          (
            SELECT
              idx, inside_name, map_image_url AS inside_map_image_url
            FROM 
              ob_inside
          ) inside
        ON
          device.inside_idx = inside.idx
        LEFT OUTER JOIN
          (
            SELECT
              idx, outside_name, map_image_url AS outside_map_image_url
            FROM 
              ob_outside
          ) outside
        ON
          device.outside_idx = outside.idx
        LEFT OUTER JOIN
          (
            SELECT
              id, name as model_name
            FROM 
              three_d_models
          ) model
        ON
          device.outside_idx = model.id
      WHERE
        device_type='door'
      `;
  }
  return query;
}

exports.updateDoorLocation = async () => {
  
  let query = `
    UPDATE ob_device
    SET
      inside_idx=$2,
      outside_idx=$3,
      top_location=$4,
      left_location=$5,
      dimension_type=$6
    WHERE
      idx=$1
    `;
  return query;
}

exports.updateDoorCamera = async () => {
  
  let query = `
    UPDATE ob_device
    SET
      camera_id=$2
    WHERE
      idx=$1
    `;
  return query;
};


exports.getAcus = async () => {
  
  const query = `
  SELECT * FROM ob_device
  WHERE
    device_type='acu'
  `;
  return query;
};