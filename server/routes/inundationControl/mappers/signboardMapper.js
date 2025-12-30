exports.addSignboard = async () => {

    let query = `
    INSERT INTO fl_signboard (
        outside_idx
        , signboard_ip
        , signboard_name
        , signboard_status
        , signboard_port
        , signboard_controller_model
    ) VALUES (
        $1, $2, $3, $4, $5, $6
    ) RETURNING idx;
    `;

    return query;
}

exports.getSignboardIpInfo = async () => {
    return `
    SELECT * 
    FROM fl_signboard 
    WHERE signboard_ip = $1
  `;
};

exports.getSignboardByOutsideIdx = async () => {
    return `
    SELECT * 
    FROM fl_signboard 
    WHERE outside_idx = $1
  `;
};

exports.updateSignboard = async () => {
    return `
    UPDATE fl_signboard 
    SET 
      signboard_ip = $2,
      signboard_name = $3,
      signboard_status = $4,
      signboard_port = $5,
      signboard_controller_model = $6,
      updated_at = NOW()
    WHERE outside_idx = $1
    RETURNING *
  `;
};

exports.deleteSignboardByOutsideIdx = async () => {
    return `
    DELETE FROM fl_signboard 
    WHERE outside_idx = $1
    RETURNING *
  `;
};