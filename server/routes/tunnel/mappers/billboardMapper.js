exports.addBillboard = () => {
  return `
    INSERT INTO tm_billboard (
      billboard_ip,
      billboard_port,
      billboard_name,
      row,
      col,
      controller_type,
      manufacturer
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
};

exports.modifyBillboarde = () => {

  return `
      UPDATE tm_billboard
      SET
        billboard_ip = $2,
        billboard_port = $3,
        billboard_name = $4,
        row = $5,
        col = $6,
        controller_type = $7,
        manufacturer = $8,
        updated_at = NOW()
      WHERE idx = $1
      RETURNING *;
  `;
};

exports.getBillboardList = () => {
  return `
      SELECT 
        idx,
        billboard_name AS name,
        billboard_ip AS ip,
        billboard_port AS port,
        CAST(row AS text) AS row,
        CAST(col AS text) AS col,
        controller_type AS type,
        manufacturer
        FROM tm_billboard
        ORDER BY idx DESC
      `;
};

exports.removeBillboard = () => {
  return `
    DELETE FROM tm_billboard
    WHERE idx IN 
  `;
};

exports.addBillboardMapping = () => {
  return `
    INSERT INTO tm_mapping_tunnel_billboard (
      outside_idx,
      billboard_idx
    ) VALUES ($1, $2)
    RETURNING *
  `;
};

exports.modifyBillboardMapping = () => {

  return `
      UPDATE tm_mapping_tunnel_billboard
      SET
        billboard_idx = $2,
        updated_at = NOW()
      WHERE outside_idx = $1
      RETURNING *;
  `;
};

exports.deleteBillboardMapping = () => {
  return `
    DELETE FROM tm_mapping_tunnel_billboard
    WHERE outside_idx = $1
  `;
};

exports.getBillboardInfo = () => {
  return `
        SELECT 
          m.billboard_idx AS idx,
          b.billboard_name AS name,
          b.billboard_ip   AS ip,
          b.billboard_port AS port,
          CAST(b.row AS TEXT) AS row,
          CAST(b.col AS TEXT) AS col,
          b.controller_type  AS type,
          b.billboard_msg    AS msg,
          b.direction        AS direction,
          b.billboard_color  AS color,
          b.manufacturer AS manufacturer
        FROM tm_mapping_tunnel_billboard m
        LEFT JOIN tm_billboard b ON m.billboard_idx = b.idx
        WHERE m.outside_idx = $1
        ORDER BY m.ctid;
      `;
};

exports.modifyVMSBillboarde = () => {

  return `
      UPDATE tm_billboard
      SET
        billboard_msg = $2,
        billboard_color = $3,
        updated_at = NOW()
      WHERE idx = $1
      RETURNING *;
  `;
};

exports.modifyLCSBillboarde = () => {

  return `
      UPDATE tm_billboard
      SET
        billboard_msg = $2,
        direction = $3,
        updated_at = NOW()
      WHERE idx = $1
      RETURNING *;
  `;
};

