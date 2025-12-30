const axios = require("axios");
const logger = require('../../../logger');
const { pool } = require('../../../db/postgresqlPool');

exports.getNetworkStatus = async (data) => {

  const client = await pool.connect();

  try {
      const speakerQuery = `
        SELECT s.*, o.outside_name 
        FROM vb_speaker s 
        LEFT JOIN vb_outside o 
        ON s.outside_idx = o.idx 
        WHERE s.speaker_status = 'OFF'
      `;
      const speakerData = await client.query(speakerQuery);

    return {
      speakers: speakerData.rows.map(row => ({
        outsideName: row.outside_name,
        name: row.speaker_name,
        location: row.speaker_location
      }))
    }

  } catch (error) {
    logger.error('villageBroadcast/dashboardService.js, getNetworkStatus, error: ', error);
    throw error;
  }finally {
    await client.release();
  }
}

exports.getDeviceStatus = async (token, data) => {

  const client = await pool.connect();

  try {

    const { siteId } = data;

    let url = `https://greenitkr.towncast.kr/api/transmitters?siteid=${siteId}`;

    // const response = await axios.get(url, {
    //     headers: {
    //       Authorization: `Bearer ${token}`
    //     }
    //   });


      const query = `SELECT * FROM vb_outside WHERE site_transmitter_id IS NOT NULL`;
      const transmitterData = await client.query(query);

      const speakerQuery = `SELECT * FROM vb_speaker`;
      const speakerData = await client.query(speakerQuery);

      const speakerStatusCount = speakerData.rows.reduce((acc, row) => {
        if (row.speaker_status === 'ON') {
          acc.onCount++;
        } else if (row.speaker_status === 'OFF') {
          acc.offCount++;
        }
        return acc;
      }, { onCount: 0, offCount: 0 });

    return {
        camera: {
            total: 0,
            active: 0,
            disconnected: 0
        },
        transmitter: {
            total: transmitterData.rows.length,
            active: transmitterData.rows.length,
            disconnected: 0
        },
        receiver: {
            total: speakerData.rows.length,
            active: speakerStatusCount.onCount,
            disconnected: speakerStatusCount.offCount
        },
        power: {
            total: 0,
            active: 0,
            disconnected: 0
            // total: response.data.receiverCount,
            // active: response.data.receiverCount,
            // disconnected: 0
        }
    }

  } catch (error) {
    logger.error('villageBroadcast/dashboardService.js, getDeviceStatus, error: ', error);
    throw error;
  }finally {
    await client.release();
  }
}

exports.getBroadcastTransmissionStatus = async (token, data) => {
    try {
      const { siteId, start, end } = data;
      let url = `https://greenitkr.towncast.kr/api/broadcasts?siteid=${siteId}&start=${start}&end=${end}`;
  
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
  
      let totalLogs = 0;
      let successCount = 0;
      let failureCount = 0;

      response.data.forEach(broadcast => {
        if (broadcast.broadcastLogs && Array.isArray(broadcast.broadcastLogs)) {
          broadcast.broadcastLogs.forEach(log => {
            totalLogs++;
            if (log.status === "Finished") {
              successCount++;
            } else if (log.status === "Error" || log.status === "Unknown") {
              failureCount++;
            }
          });
        }
      });
  
      if (totalLogs === 0) {
        return {
          successRate: 0,
          failureRate: 0,
          totalLogs: 0,
          successCount: 0,
          failureCount: 0
        };
      }
  
      return {
        successRate: Math.round((successCount / totalLogs) * 100),
        failureRate: Math.round((failureCount / totalLogs) * 100),
        totalLogs,
        successCount,
        failureCount
      };
  
    } catch (error) {
      logger.error('villageBroadcast/dashboardService.js, getBroadcastTransmissionStatus, error: ', error);
      throw error;
    }
  };



