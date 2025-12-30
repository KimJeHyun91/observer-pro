exports.addReserve = async () => {
  
    let query = `
    INSERT INTO vb_reserve (
      title
      , target
      , group_idx
      , outside_idx
      , start_at
      , end_at
      , device_control
      , audio_file_idx
      , speaker_idx
      , speaker_msg
      , start_chime_option
      , end_chime_option
      , repeat
      , repeat_interval
      , voice_type
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    ) 
    `;
  
    return query;
}

exports.addRegular = async () => {
  
    let query = `
    INSERT INTO vb_regular (
      title
      , target
      , group_idx
      , outside_idx
      , repeat_type
      , day_of_week
      , day_of_month
      , week_of_month
      , repeat_count
      , start_at
      , end_at
      , device_control
      , audio_file_idx
      , speaker_idx
      , speaker_msg
      , start_chime_option
      , end_chime_option
      , repeat
      , repeat_interval
      , voice_type
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    ) 
    `;
  
    return query;
}


exports.getReserveList = async () => {
  let query = `
    SELECT 
      vb_reserve.idx
      ,vb_reserve.title
      ,vb_reserve.description
      ,vb_reserve.target
      ,vb_reserve.group_idx
      ,array_agg(vb_group_outside.outside_idx) AS outside_group_idx
      ,vb_reserve.outside_idx
      ,vb_reserve.start_at
      ,vb_reserve.end_at
      ,vb_reserve.device_control
      ,vb_reserve.audio_file_idx
      ,vb_reserve.speaker_idx
      ,vb_reserve.speaker_msg
      ,vb_reserve.start_chime_option
      ,vb_reserve.end_chime_option
      ,vb_reserve.repeat
      ,vb_reserve.repeat_interval
      ,vb_reserve.voice_type
      ,vb_reserve.created_at
      ,vb_reserve.updated_at
      ,NULL AS repeat_type  
      ,NULL AS day_of_week  
      ,NULL AS day_of_month  
      ,NULL AS week_of_month  
      ,NULL AS repeat_count 
      ,'예약' AS type
    FROM vb_reserve
    LEFT JOIN vb_group_outside 
      ON vb_reserve.group_idx = vb_group_outside.group_idx
    GROUP BY 
      vb_reserve.idx 
      ,vb_reserve.title 
      ,vb_reserve.description 
      ,vb_reserve.target 
      ,vb_reserve.group_idx
      ,vb_reserve.outside_idx 
      ,vb_reserve.start_at 
      ,vb_reserve.end_at 
      ,vb_reserve.device_control 
      ,vb_reserve.audio_file_idx 
      ,vb_reserve.speaker_idx
      ,vb_reserve.speaker_msg
      ,vb_reserve.start_chime_option
      ,vb_reserve.end_chime_option
      ,vb_reserve.repeat
      ,vb_reserve.repeat_interval
      ,vb_reserve.voice_type
      ,vb_reserve.created_at 
      ,vb_reserve.updated_at
    UNION ALL
    SELECT 
      vb_regular.idx
      ,vb_regular.title
      ,vb_regular.description
      ,vb_regular.target
      ,vb_regular.group_idx
      ,array_agg(vb_group_outside.outside_idx) AS outside_group_idx
      ,vb_regular.outside_idx 
      ,vb_regular.start_at
      ,vb_regular.end_at
      ,vb_regular.device_control
      ,vb_regular.audio_file_idx
      ,vb_regular.speaker_idx
      ,vb_regular.speaker_msg
      ,vb_regular.start_chime_option
      ,vb_regular.end_chime_option
      ,vb_regular.repeat
      ,vb_regular.repeat_interval
      ,vb_regular.voice_type
      ,vb_regular.created_at
      ,vb_regular.updated_at
      ,vb_regular.repeat_type
      ,vb_regular.day_of_week
      ,vb_regular.day_of_month
      ,vb_regular.week_of_month
      ,vb_regular.repeat_count
      ,'정기' AS type
    FROM vb_regular
    LEFT JOIN vb_group_outside 
      ON vb_regular.group_idx = vb_group_outside.group_idx
    GROUP BY 
      vb_regular.idx 
      ,vb_regular.title 
      ,vb_regular.description 
      ,vb_regular.target 
      ,vb_regular.group_idx 
      ,vb_regular.outside_idx
      ,vb_regular.repeat_type
      ,vb_regular.day_of_week
      ,vb_regular.day_of_month
      ,vb_regular.week_of_month
      ,vb_regular.repeat_count 
      ,vb_regular.start_at 
      ,vb_regular.end_at 
      ,vb_regular.device_control 
      ,vb_regular.audio_file_idx 
      ,vb_regular.speaker_idx
      ,vb_regular.speaker_msg
      ,vb_regular.start_chime_option
      ,vb_regular.end_chime_option
      ,vb_regular.repeat
      ,vb_regular.repeat_interval
      ,vb_regular.voice_type
      ,vb_regular.created_at 
      ,vb_regular.updated_at;
  `;
  
  return query;
};



exports.modifyReserve = async () => {
  
  let query = `
  UPDATE vb_reserve
  SET
    title = $1
    ,target = $2
    ,group_idx = $3
    ,outside_idx = $4
    ,start_at = $5
    ,end_at = $6
    ,device_control = $7
    ,audio_file_idx = $8
    ,speaker_idx = $9
    ,speaker_msg = $10
    ,start_chime_option = $11
    ,end_chime_option = $12
    ,repeat = $13
    ,repeat_interval = $14
    ,voice_type = $15
    , updated_at = NOW()
  WHERE
    idx = $16;
  `;

  return query;
}

exports.modifyRegular = async () => {
  let query = `
  UPDATE vb_regular
  SET
    title = $1
    ,target = $2
    ,group_idx = $3
    ,outside_idx = $4
    ,repeat_type = $5
    ,day_of_week = $6
    ,day_of_month = $7
    ,week_of_month = $8
    ,repeat_count = $9
    ,start_at = $10
    ,end_at = $11
    ,device_control = $12
    ,audio_file_idx = $13
    ,speaker_idx = $14
    ,speaker_msg = $15
    ,start_chime_option = $16
    ,end_chime_option = $17
    ,repeat = $18
    ,repeat_interval = $19
    ,voice_type = $20
    ,updated_at = NOW()
  WHERE
    idx = $21;
  `;

  return query;
}




