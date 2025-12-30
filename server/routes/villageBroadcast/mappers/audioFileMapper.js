exports.addAudioFile = async () => {
  
  let query = `
  INSERT INTO vb_audio_file (
    audio_file_name, audio_file, audio_file_url
  ) VALUES (
    $1, $2, $3
  ) RETURNING idx, audio_file_name, audio_file, audio_file_url;
  `;

  return query;
}
  

exports.getAudioFileList = async () => {

  let query = `
  SELECT * FROM 
    vb_audio_file;
  `;

  return query;
}

exports.deleteAudioFile = async () => {

  let query = `
  DELETE FROM 
    vb_audio_file
  WHERE 
    idx = ANY($1);
  `;

  return query;
}

exports.modifyAudioFile = async () => {

  let query = `
  UPDATE 
    vb_audio_file
  SET 
    audio_file_name = $1
    , updated_at = NOW()
  WHERE 
    idx = $2
  RETURNING idx, audio_file_name;
  `;

  return query;
}
