const { pool } = require('../db/postgresqlPool');
const logger = require('../logger');

// exports.getLocation = async (outsideIdx, insideIdx) => {
//   let result = {
//     location: '',
//     mapImageURL: null
//   }
//   const client = await pool.connect();
//   try {
//     if(outsideIdx === 0){
//       result = {
//         location: '실외',
//         mapImageURL: null
//       }
//     } else {
//       const queryLocationInfo = `
//       SELECT 
//         outside.outside_name
//         , inside.inside_name
//         , inside.map_image_url
//       FROM (
//         (SELECT * FROM ob_outside) outside
//         JOIN
//         (SELECT * FROM ob_inside) inside
//         ON
//           outside.idx = inside.outside_idx
//       )
//       WHERE
//         outside.idx = ${outsideIdx} 
//         AND
//         inside.idx = ${insideIdx}
//       `;
//       const resLocationInfo = await client.query(queryLocationInfo);
//       if(resLocationInfo && resLocationInfo.rows.length === 1) {
//         result.location = resLocationInfo.rows[0].outside_name + ' ' + resLocationInfo.rows[0].inside_name;
//         result.mapImageURL = resLocationInfo.rows[0].map_image_url;
//       };
//     };
//     return result
//   } catch(error){
//     logger.info('utils/getLocation.js, getLocation, error: ', error);
//     console.log('utils/getLocation.js, getLocation, error: ', error);
//   } finally {
//     client.release();
//   }
// }

exports.getLocation = async (outsideIdx, insideIdx) => {
  let result = {
    location: '',
    mapImageURL: null
  }
  const client = await pool.connect();
  try {
    if(outsideIdx === 0){
      result = {
        location: '실외',
        mapImageURL: null
      }
    } else {
      const queryLocationInfo = `
      SELECT 
        model.name as outside_name
        , inside.inside_name
        , inside.map_image_url
      FROM (
        (SELECT * FROM three_d_models) model
        JOIN
        (SELECT * FROM ob_inside) inside
        ON
          model.id = inside.three_d_model_id
      )
      WHERE
        model.id = ${outsideIdx} 
        AND
        inside.idx = ${insideIdx}
      `;
      const resLocationInfo = await client.query(queryLocationInfo);
      if(resLocationInfo && resLocationInfo.rows.length === 1) {
        result.location = resLocationInfo.rows[0].outside_name + ' ' + resLocationInfo.rows[0].inside_name;
        result.mapImageURL = resLocationInfo.rows[0].map_image_url;
      };
    };
    return result
  } catch(error){
    logger.info('utils/getLocation.js, getLocation, error: ', error);
    console.log('utils/getLocation.js, getLocation, error: ', error);
  } finally {
    client.release();
  }
}