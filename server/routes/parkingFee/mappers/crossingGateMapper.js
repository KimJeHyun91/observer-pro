exports.setCrossingGateInfo = async () => {

  let query = `
  INSERT INTO pf_crossing_gate (
    crossing_gate_ip
    , crossing_gate_port
    , gate_index
    , ledd_index
    , pt_index
    , direction
    , location
    , ledd_ip
    , ledd_port
    , pt_ip
    , pt_port
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
  ) RETURNING idx;
  `;

  return query;
}

exports.updateCrossingGateInfo = async () => {

  let query = `
  UPDATE 
    pf_crossing_gate 
  SET
    crossing_gate_ip = $2
    , crossing_gate_port = $3
    , gate_index = $4
    , ledd_index = $5
    , pt_index = $6
    , direction = $7
    , location = $8
    , ledd_ip = $9
    , ledd_port = $10
    , pt_ip = $11
    , pt_port = $12
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.updateCrossingGateUsedInfo = async () => {

  let query = `
  UPDATE 
    pf_crossing_gate 
  SET
    is_used = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getLineCrossingGateList = async () => {

  let query = `
  SELECT 
    crossing_gate_mapping.idx AS crossing_gate_mapping_idx
    , crossing_gate_mapping.line_idx
    , crossing_gate.idx
    , crossing_gate.crossing_gate_ip
    , crossing_gate.crossing_gate_port
    , crossing_gate.gate_index
    , crossing_gate.ledd_index
    , crossing_gate.pt_index
    , crossing_gate.direction
    , crossing_gate.location
    , crossing_gate.is_used
  FROM
    pf_crossing_gate AS crossing_gate
  JOIN
    pf_crossing_gate_mapping AS crossing_gate_mapping
  ON
    crossing_gate.idx = crossing_gate_mapping.crossing_gate_idx
  WHERE
    crossing_gate_mapping.line_idx = $1
  ORDER BY
    crossing_gate.direction ASC;
  `;

  return query;
}

exports.getLineCrossingGateAnyList = async () => {

  let query = `
  SELECT 
    crossing_gate_mapping.idx AS crossing_gate_mapping_idx
    , crossing_gate_mapping.line_idx
    , crossing_gate_mapping.crossing_gate_idx
    , crossing_gate.crossing_gate_ip
    , crossing_gate.crossing_gate_port
    , crossing_gate.gate_index
    , crossing_gate.ledd_index
    , crossing_gate.pt_index
    , crossing_gate.direction
    , crossing_gate.location
    , crossing_gate.is_used
  FROM
    pf_crossing_gate AS crossing_gate
  JOIN
    pf_crossing_gate_mapping AS crossing_gate_mapping
  ON
    crossing_gate.idx = crossing_gate_mapping.crossing_gate_idx
  WHERE
    crossing_gate_mapping.line_idx = ANY($1)
  ORDER BY
    crossing_gate.direction ASC;
  `;

  return query;
}

// ANY($1) : 배열로 받아서 여러개 한번에 삭제함.
exports.deleteCrossingGateInfo = async () => {

  let query = `
  DELETE FROM
    pf_crossing_gate
  WHERE
    idx = ANY($1);
  `;

  return query;
}

// ANY($1) : in, out 배열로 받음
exports.getCrossingGateDirectionList = async () => {

  let query = `
  SELECT * FROM
    pf_crossing_gate
  WHERE
    direction = ANY($1)
  AND
    is_used = ANY($2)
  ORDER BY
    crossing_gate_ip ASC;
  `;

  return query;
}

exports.getCrossingGateIpInfo = async () => {

  let query = `
  SELECT * FROM
    pf_crossing_gate
  WHERE
    crossing_gate_ip = $1
  AND
    crossing_gate_port = $2
  AND
    direction = $3;
  `;

  return query;
}

// 주차요금 계산을 위해 차단기 ip, port 로 출구만 검색
exports.getCrossingGateIpFeeInfo = async () => {

  let query = `
  SELECT * FROM
    pf_crossing_gate
  WHERE
    crossing_gate_ip = $1
  AND
    crossing_gate_port = $2
  AND
    direction = 'out';
  `;

  return query;
}

// 차단기 연동된 주차장 위치 검색
exports.getParkingLocationInfo = async () => {

  let query = `
  SELECT 
    outside.idx AS outside_idx
    , outside.outside_name
    , outside.outside_ip
    , outside.outside_port
    , inside.idx AS inside_idx
    , inside.inside_name
    , line.idx AS line_idx
    , line.line_name
    , crossing_gate.idx AS crossing_gate_idx
    , crossing_gate.status
    , crossing_gate.crossing_gate_ip
    , crossing_gate.crossing_gate_port
    , crossing_gate.ledd_index
    , crossing_gate.pt_index
    , crossing_gate.direction
    , crossing_gate.location
    , crossing_gate.ledd_ip
    , crossing_gate.ledd_port
    , crossing_gate.pt_ip
    , crossing_gate.pt_port
  FROM 
    pf_outside AS outside
  JOIN
    pf_inside AS inside
  ON
    outside.idx = inside.outside_idx
  JOIN
    pf_line AS line
  ON
    inside.idx = line.inside_idx
  JOIN
    pf_crossing_gate_mapping AS crossing_gate_mapping
  ON
    line.idx = crossing_gate_mapping.line_idx
  JOIN
    pf_crossing_gate AS crossing_gate
  ON
    crossing_gate_mapping.crossing_gate_idx = crossing_gate.idx
  WHERE
    outside.outside_ip = $1
  AND
    crossing_gate.crossing_gate_ip = $2
  AND
    crossing_gate.crossing_gate_port = $3
  `;

  return query;
}

exports.updateCrossingGateStatusInfo = async () => {

  let query = `
  UPDATE 
    pf_crossing_gate 
  SET
    status = $4
    , updated_at = NOW()
  WHERE
    crossing_gate_ip = $1
  AND
    crossing_gate_port = $2
  AND
    location = $3;
  `;

  return query;
}


/////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 차단기 매핑 
 */
/////////////////////////////////////////////////////////////////////////////////////////////////////
exports.setCrossingGateMappingInfo = async () => {

  let query = `
  INSERT INTO pf_crossing_gate_mapping (
    line_idx
    , crossing_gate_idx
  ) VALUES (
    $1, $2
  ) RETURNING idx;
  `;

  return query;
}

exports.deleteCrossingGateMappingInfo = async () => {

  let query = `
  DELETE FROM
    pf_crossing_gate_mapping
  WHERE
    line_idx = $1
  AND
    crossing_gate_idx = $2;
  `;

  return query;
}

