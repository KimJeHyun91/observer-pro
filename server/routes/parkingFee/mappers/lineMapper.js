exports.getLineList = async () => {

  let query = `
  SELECT * FROM
    pf_line
  WHERE
    inside_idx = $1
  ORDER BY
    line_name ASC;
  `;

  return query;
}

exports.setLineInfo = async () => {

  let query = `
  INSERT INTO pf_line (
    inside_idx
    , line_name
  ) VALUES (
    $1, $2
  ) RETURNING idx;
  `;

  return query;
}

exports.updateLineInfo = async () => {

  let query = `
  UPDATE 
    pf_line 
  SET
    line_name = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteLineInfo = async () => {

  let query = `
  DELETE FROM
    pf_line
  WHERE
    idx = $1;
  `;

  return query;
}

// ANY($1) : 배열로 받아서 여러개 한번에 검색
exports.getLineAnyList = async () => {

  let query = `
  SELECT * FROM
    pf_line
  WHERE
    inside_idx = ANY($1);
  `;

  return query;
}

exports.getLineLPRInfo = async () => {

  let query = `
  SELECT 
    pf_receive_lpr_temp.lp
		, pf_receive_lpr_temp.loop_event_time
    , pf_receive_lpr_temp.loop_event_time_person
    , pf_receive_lpr_temp.ip
    , pf_receive_lpr_temp.port
    , pf_receive_lpr_temp.direction
    , pf_receive_lpr_temp.location
    , pf_receive_lpr_temp.fname
    , pf_receive_lpr_temp.folder_name
    , pf_receive_lpr_temp.image_url_header
    , pf_receive_lpr_temp.outside_ip
    , pf_receive_lpr_temp.kind
    , outside.idx AS outside_idx
    , outside.outside_name
    , outside.outside_port
    , inside.idx AS inside_idx
    , inside.inside_name
    , line.idx AS line_idx
    , line.line_name
    , crossing_gate.ledd_ip
    , crossing_gate.ledd_port
    , crossing_gate.pt_ip
    , crossing_gate.pt_port
  FROM (
    (SELECT * FROM pf_line WHERE idx = $1) line
    JOIN
    (SELECT * FROM 
      pf_crossing_gate_mapping
    ) crossing_gate_mapping
    ON
      line.idx = crossing_gate_mapping.line_idx
    JOIN
    (SELECT * FROM pf_crossing_gate) crossing_gate
    ON
      crossing_gate_mapping.crossing_gate_idx = crossing_gate.idx
    JOIN
    (SELECT * FROM pf_receive_lpr_temp) pf_receive_lpr_temp
    ON
      crossing_gate.crossing_gate_ip = pf_receive_lpr_temp.ip
    AND
      crossing_gate.crossing_gate_port = pf_receive_lpr_temp.port
    JOIN
    (SELECT * FROM pf_outside) outside
    ON
      pf_receive_lpr_temp.outside_ip = outside.outside_ip
    JOIN
    (SELECT * FROM pf_inside) inside
    ON
      outside.idx = inside.outside_idx
  )
  ORDER BY
    loop_event_time DESC
  LIMIT 1;
  `;

  return query;
}