exports.addSpeaker = async () => {
  
  let query = `
  INSERT INTO vb_speaker (
    outside_idx, 
    speaker_name, 
    speaker_ip, 
    speaker_status, 
    speaker_location,
    speaker_left_location, 
    speaker_top_location
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7
  ) RETURNING idx;
  `;

  return query;
}

exports.getSpeakerInfo = async () => {
  
  let query = `
  SELECT * FROM
    vb_speaker
  WHERE
    outside_idx != $1;
  `;

  return query;
}

exports.getSpeakerIpInfo = async () => {
  
  let query = `
  SELECT * FROM
    vb_speaker
  WHERE
    speaker_ip = $1;
  `;

  return query;
}

exports.getSpeakerList = async () => {
  
  let query = `
  SELECT
    speaker.idx AS speaker_idx
    , speaker.speaker_name
    , speaker.speaker_ip
    , speaker.speaker_msg
    , speaker.speaker_status
    , speaker.speaker_location
    , speaker.linked_status AS speaker_linked_status
    , speaker.speaker_left_location
    , speaker.speaker_top_location
    , outside.idx AS outside_idx
    , outside.outside_name
    , outside.location AS outside_location
  FROM (
    (SELECT * FROM vb_speaker) speaker
    LEFT JOIN
    (SELECT * FROM vb_outside) outside
    ON
      speaker.outside_idx = outside.idx
  );
  `;

  return query;
}

exports.deleteSpeaker = async () => {
  
  let query = `
  DELETE FROM
    vb_speaker
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteOutsideSpeaker = async () => {
  
  let query = `
  DELETE FROM
    vb_speaker
  WHERE
    outside_idx = $1;
  `;

  return query;
}

exports.addSpeakerMacro = async () => {
  
  let query = `
  INSERT INTO vb_speaker_macro (
    speaker_msg
    , speaker_msg_file
  ) VALUES (
    $1
    , $2
  ) RETURNING idx;
  `;

  return query;
}

exports.modifySpeakerMacro = async () => {
  
  let query = `
  UPDATE vb_speaker_macro
  SET
    speaker_msg = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getSpeakerMacroList = async () => {
  
  let query = `
  SELECT
    idx AS speaker_idx
    , speaker_msg
  FROM
    vb_speaker_macro
  ORDER BY
    speaker_msg ASC;
  `;

  return query;
}

exports.deleteSpeakerMacro = async () => {
  
  let query = `
  DELETE FROM
    vb_speaker_macro
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getSpeakerStatusCount = async () => {
  
  let query = `
  SELECT 
    COUNT(CASE WHEN speaker_status = 'ON' THEN 1 END) AS on_count
    , COUNT(CASE WHEN speaker_status = 'OFF' THEN 1 END) AS off_count
    , COUNT(CASE WHEN linked_status = false THEN 1 END) AS disconnected
  FROM
    vb_speaker;
  `;

  return query;
}

exports.modifyLinkedStatusSpeaker = async () => {
  
  let query = `
  UPDATE vb_speaker
  SET
    linked_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}