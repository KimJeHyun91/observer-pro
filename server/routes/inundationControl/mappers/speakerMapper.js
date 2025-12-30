exports.addSpeaker = async () => {
  
  let query = `
  INSERT INTO fl_speaker (
    outside_idx
    , speaker_ip
    , speaker_name
    , speaker_status
    , speaker_port
    , speaker_id
    , speaker_password
    , speaker_type
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
  ) RETURNING idx;
  `;

  return query;
}

exports.getSpeakerType = () => {
  return `
    SELECT speaker_type, speaker_port, speaker_id, speaker_password
    FROM fl_speaker 
    WHERE speaker_ip = $1
  `;
};

exports.getSpeakerIpInfo = async () => {
  
  let query = `
  SELECT
    idx AS speaker_idx
    , outside_idx
    , speaker_name
    , speaker_ip
    , speaker_msg
    , speaker_status
    , speaker_type
    , linked_status
    , alarm_status
  FROM
    fl_speaker
  WHERE
    speaker_ip = $1;
  `;

  return query;
}

exports.addSpeakerMacro = async () => {
  
  let query = `
  INSERT INTO fl_speaker_macro (
    speaker_msg
  ) VALUES (
    $1
  ) RETURNING idx;
  `;

  return query;
}

exports.modifySpeakerMacro = async () => {
  
  let query = `
  UPDATE fl_speaker_macro
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
    fl_speaker_macro
  ORDER BY
    speaker_msg ASC;
  `;

  return query;
}

exports.deleteSpeakerMacro = async () => {
  
  let query = `
  DELETE FROM
    fl_speaker_macro
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getSpeakerList = async () => {
  
  let query = `
  SELECT
    idx AS speaker_idx
    , outside_idx
    , speaker_name
    , speaker_ip
    , speaker_type
    , speaker_msg
    , speaker_status
    , linked_status
    , alarm_status
  FROM
    fl_speaker
  ORDER BY
    speaker_name ASC;
  `;

  return query;
}

exports.modifyLinkedStatusSpeaker = async () => {
  
  let query = `
  UPDATE fl_speaker
  SET
    linked_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteOutsideSpeaker = async () => {
  
  let query = `
  DELETE FROM
    fl_speaker
  WHERE
    outside_idx = $1;
  `;

  return query;
}

exports.deleteSpeaker = async () => {
  
  let query = `
  DELETE FROM
    fl_speaker
  WHERE
    idx = $1;
  `;

  return query;
}

exports.updateOutsideSpeaker = async () => {
  return `
    UPDATE fl_speaker
    SET speaker_ip = $1,
    speaker_port = $3,
    speaker_id = $4,
    speaker_password = $5,
    speaker_type = $6
    WHERE outside_idx = $2;
  `;
};

exports.getOutsideSpeaker = async () => {
  
  let query = `
  SELECT
    idx AS speaker_idx
    , outside_idx
    , speaker_name
    , speaker_ip
    , speaker_msg
    , speaker_status
    , linked_status
    , alarm_status
  FROM
    fl_speaker
  WHERE
    outside_idx = $1
  ORDER BY
    speaker_name ASC;
  `;

  return query;
}

// exports.insertAudioClip = async () => {
//   return `
//     INSERT INTO fl_audio_file_manage 
//     (speaker_ip, speaker_type, message, clip_id, file_no) 
//     VALUES ($1, $2, $3, $4, $5)
//     ON CONFLICT (speaker_ip, message) 
//     DO UPDATE SET 
//       clip_id = EXCLUDED.clip_id,
//       file_no = EXCLUDED.file_no,
//       updated_at = CURRENT_TIMESTAMP
//     RETURNING *
//   `
// }

exports.insertAudioClip = () => {
  return `
    INSERT INTO fl_audio_file_manage 
    (speaker_ip, speaker_type, message, clip_id, file_no) 
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (speaker_ip, message) 
    DO UPDATE SET 
      clip_id = EXCLUDED.clip_id,
      file_no = EXCLUDED.file_no,
      speaker_type = EXCLUDED.speaker_type
    RETURNING *
  `;
};

exports.findAllClipsBySpeaker = async () => {
  return `
    SELECT idx, message, clip_id, created_at
    FROM fl_audio_file_manage
    WHERE speaker_ip = $1
    ORDER BY created_at DESC;
  `;
};

// exports.findClipByMessage = async () => {
//   return `
//     SELECT clip_id
//     FROM fl_audio_file_manage
//     WHERE speaker_ip = $1 AND message = $2;
//   `
// }
exports.findClipByMessage = () => {
  return `
    SELECT clip_id, file_no, speaker_type
    FROM fl_audio_file_manage 
    WHERE speaker_ip = $1 
    AND message = $2
    LIMIT 1
  `;
};

exports.deleteClipById = async () => {
  return `
    DELETE FROM fl_audio_file_manage
    WHERE clip_id = $1
    RETURNING message, clip_id;
  `;
};

exports.getNextAepelFileNo = () => {
  return `
    SELECT COALESCE(MAX(file_no), 0) + 1 as next_no 
    FROM fl_audio_file_manage 
    WHERE speaker_ip = $1 
    AND speaker_type = 'aepel'
  `;
};

exports.findClipByMessage = () => {
  return `
    SELECT clip_id, file_no, speaker_type
    FROM fl_audio_file_manage 
    WHERE speaker_ip = $1 
    AND message = $2
  `;
};