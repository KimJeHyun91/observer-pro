const { pool } = require('../../db/postgresqlPool');
const { readBarrierStatus, barrierStatusCache } = require('./barrierControl');

let ioInstance = null;

async function getBarrierIpListFromDB() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT DISTINCT barrier_ip
      FROM tm_outside
      WHERE barrier_ip IS NOT NULL AND barrier_ip != ''
    `);
    return res.rows.map(row => row.barrier_ip);
  } finally {
    client.release();
  }
}

async function updateBarrierStatusAndEmit(ip) {
  const result = await readBarrierStatus(ip);
  barrierStatusCache.set(ip, result);
  if (ioInstance) {
    ioInstance.emit('barrierStatusUpdate', result); 
  }
}

async function pollAllBarrierStatuses() {
  const ipList = await getBarrierIpListFromDB();
  for (const ip of ipList) {
    await updateBarrierStatusAndEmit(ip);
  }
}


// function init(io) {
//   ioInstance = io;

//   io.on('connection', (socket) => {
//     console.log(`Barrier Socket Connected: ${socket.id}`);

//     // 클라이언트가 요청 시 전체 차단기 상태 반환
//     socket.on('requestAllBarrierStatuses', async () => {
//       const ipList = await getBarrierIpListFromDB();

//       for (const ip of ipList) {
//         const result = await readBarrierStatus(ip);
//         socket.emit('barrierStatusUpdate', result);
//       }
//     });

//     // 클라이언트가 특정 barrier 제어 후 상태 요청 시
//     socket.on('requestBarrierStatus', async (ip) => {
//       await updateBarrierStatusAndEmit(ip);
//     });
//   });


//   pollAllBarrierStatuses();
// }

function init(io) {
  io.on('connection', (socket) => {

      socket.on('requestAllBarrierStatuses', async () => {
        const ipList = await getBarrierIpListFromDB();

        for (const ip of ipList) {
          const result = await readBarrierStatus(ip);
          barrierStatusCache.set(ip, result);
          socket.emit('barrierStatusUpdate', result);
        }
      });

      socket.on('requestBarrierStatus', async (ip) => {
        await updateBarrierStatusAndEmit(ip);
      });
    
  });
}

module.exports = {
  init,
  updateBarrierStatusAndEmit,
};
