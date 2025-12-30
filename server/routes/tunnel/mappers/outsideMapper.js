exports.addOutside = () => {
  return `
    INSERT INTO tm_outside (
      outside_name,
      location,
      barrier_ip,
      barrier_status,
      left_location,
      top_location,
      direction,
      service_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'tunnel')
    RETURNING *
  `;
};


exports.getOutsideList = () => {
  return `
    SELECT 
      o.idx,
      o.outside_name,
      o.location,
      o.barrier_ip,
      o.barrier_status,
      o.left_location,
      o.top_location,
      o.service_type,
      o.direction,
      o.alarm_status,
      o.created_at,
      o.updated_at,

      -- ✅ 현재 수위 (수위계 없으면 0)
      COALESCE((
        SELECT w.curr_water_level
        FROM tm_mapping_tunnel_water_level mw
        JOIN tm_water_level w ON mw.water_level_idx = w.idx
        WHERE mw.outside_idx = o.idx AND w.communication_type = 'control_in'
        ORDER BY w.idx
        LIMIT 1
      ), 0) AS waterLevel,

      -- ✅ 활성 수위계 여부 (use_status = true인 수위계가 연결되어 있으면 true)
      EXISTS (
        SELECT 1
        FROM tm_mapping_tunnel_water_level mw
        JOIN tm_water_level w ON mw.water_level_idx = w.idx
        WHERE mw.outside_idx = o.idx AND w.use_status = true
      ) AS water_gauge_use_status,

      -- ✅ 가디언라이트 IP (없으면 '')
      COALESCE(STRING_AGG(DISTINCT g.guardianlite_ip, ','), '') AS guardianlite_ip,

      -- ✅ LCS billboard idx list
      COALESCE(
      STRING_AGG(b.idx::text, ',' ORDER BY m.ctid) FILTER (WHERE b.controller_type = 'LCS'),
      ''
      ) AS billboard_idx_list_lcs,

      -- ✅ VMS billboard idx list
      COALESCE(
        STRING_AGG(b.idx::text, ',' ORDER BY m.ctid) FILTER (WHERE b.controller_type = 'VMS'),
        ''
      ) AS billboard_idx_list_vms

    FROM tm_outside o
    LEFT JOIN tm_mapping_tunnel_billboard m ON o.idx = m.outside_idx
    LEFT JOIN tm_billboard b ON m.billboard_idx = b.idx
    LEFT JOIN tm_guardianlite g ON g.outside_idx = o.idx 
    GROUP BY o.idx
    ORDER BY o.idx DESC
  `;
};


exports.updateOutside = () => {
  return `
      UPDATE tm_outside
      SET
        outside_name = $2,
        location = $3,
        barrier_ip = $4,
        direction = $5
      WHERE idx = $1
      RETURNING *
    `;
};


exports.deleteOutside = async () => {

  return `
    DELETE FROM
      tm_outside
    WHERE
      idx = $1;
    `;

}


exports.getUnLinkBarrierList = async () => {

  return `
    SELECT 
      COUNT(*) FILTER (WHERE barrier_status = true) AS connected,
      COUNT(*) FILTER (WHERE barrier_status = false OR barrier_status IS NULL) AS disconnected
    FROM tm_outside;
    `;

}

exports.getDeviceList = async () => {

  return `
        SELECT
            o.idx,
            o.outside_name,
            o.direction,
            o.barrier_ip,

            -- 리스트 포맷: 이름/IP/linked_status (IP 없으면 이름//linked_status)
            COALESCE(wl_agg.water_level_list, '') AS water_level_list,
            COALESCE(bb_agg.billboard_list,  '')  AS billboard_list,
            COALESCE(cam_agg.camera_list,    '')  AS camera_list

          FROM tm_outside o

          -- 수위계 (tm_water_level.water_level_ip)
          LEFT JOIN LATERAL (
            SELECT
              STRING_AGG(
                DISTINCT wl.water_level_name
                  || '/' || COALESCE(wl.water_level_ip, '')
                  || '/' || wl.linked_status::text,
                CHR(10)  -- \n
              ) AS water_level_list
            FROM tm_mapping_tunnel_water_level mtl
            JOIN tm_water_level wl ON mtl.water_level_idx = wl.idx
            WHERE mtl.outside_idx = o.idx
          ) wl_agg ON TRUE

          -- 전광등 (tm_billboard.billboard_ip)
          LEFT JOIN LATERAL (
            SELECT
              STRING_AGG(
                DISTINCT b.billboard_name
                  || '/' || COALESCE(b.billboard_ip, '')
                  || '/' || b.linked_status::text,
                CHR(10)  -- \n
              ) AS billboard_list
            FROM tm_mapping_tunnel_billboard mtb
            JOIN tm_billboard b ON mtb.billboard_idx = b.idx
            WHERE mtb.outside_idx = o.idx
          ) bb_agg ON TRUE

          -- 카메라 (ob_camera.camera_ip)
          LEFT JOIN LATERAL (
            SELECT
              STRING_AGG(
                DISTINCT c.camera_name
                  || '/' || COALESCE(c.camera_ip, '')
                  || '/' || c.linked_status::text,
                CHR(10)  -- \n
              ) AS camera_list
            FROM ob_camera c
            WHERE c.outside_idx = o.idx
          ) cam_agg ON TRUE

          ORDER BY o.idx;
    `;
}


exports.getOutsideAutomatic = async () => {

  return `
    SELECT automatic
    FROM tm_outside
    ORDER BY created_at DESC
    LIMIT 1;
    `;

}

exports.updateOutsideAutomatic = async () => {

  return `
    UPDATE tm_outside
    SET automatic = $1
    RETURNING *;
    `;

}