const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const warningBoardMapper = require('../mappers/warningBoardMapper');
// const eventTypeMapper = require('../mappers/eventTypeMapper');

/**
 * @param { mainService } : observer,  inundation, vehicle, parking, tunnel, broadcast
 * @param { eventIdx } : 각 서비스 event idx
 * @param { serviceType } : 서비스 종류
 * @param { eventTypeId } : 이벤트 종류 id
 * @param { locationInfo } : outside 이름 + ' ' + inside 이름
 * @param { cameraInfo } : 카메라 id.카메라 이름(장비 id.장비 이름)
 */
// exports.insertWarningBoard = async ({ mainService, eventIdx, serviceType, eventTypeId, locationInfo, cameraInfo }) => {

//   const client = await pool.connect();

//   try {
    
//     let binds = [eventTypeId];

//     let query = await eventTypeMapper.getEventTypeInfo();
//     let resEventTypeInfo = await client.query(query, binds);

//     // 워닝보드가 활성화 상태이면
//     if(resEventTypeInfo && resEventTypeInfo.rows[0].use_warning_board) {

//       const eventTypeName = resEventTypeInfo.rows[0].event_type;

//       binds = [];
//       query = await warningBoardMapper.deleteWarningBoard();
//       await client.query(query, binds);

//       binds = [mainService, eventIdx, serviceType, eventTypeName, locationInfo, cameraInfo];
//       // 워닝보드에 저장
//       query = await warningBoardMapper.insertWarningBoard();
//       let resInsertWarningBoard = await client.query(query, binds);
      
//       if(resInsertWarningBoard && global.websocket) {
//         global.websocket.emit("cm_warningBoard-update", { warningBoard: { 'add': resInsertWarningBoard.rowCount } });
//       }
//     }

//   } catch (error) {
//     logger.info('common/warningBoardService.js, insertWarningBoard, error: ', error);
//     console.log('common/warningBoardService.js, insertWarningBoard, error: ', error);
//   } finally {
//     await client.release();
//   }
// }

// 워닝보드 알림 해제
exports.deleteWarningBoard = async ({ mainService, eventIdx }) => {

  const client = await pool.connect();

  try {
    
    let binds = [];
    let query = await warningBoardMapper.getWarningBoard();
    const resWarningBoard = await client.query(query, binds);

    if(resWarningBoard && resWarningBoard.rows.length > 0) {

      if((resWarningBoard[0].main_service === mainService) && (resWarningBoard[0].event_idx === eventIdx)) {
        await client.query('BEGIN');
        query = await warningBoardMapper.deleteWarningBoard();
        await client.query(query, binds);
        await client.query('COMMIT');
      }

    } else {
      console.log('삭제할 데이터가 없습니다.');
    }

  } catch (error) {
    logger.info('common/warningBoardService.js, deleteWarningBoard, error: ', error);
    console.log('common/warningBoardService.js, deleteWarningBoard, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getWarningBoard = async () => {

  const client = await pool.connect();

  try {
    let binds = [];
    let query = await warningBoardMapper.getWarningBoard();
    let result = await client.query(query, binds);
    
    return result.rows;

  } catch (error) {
    logger.info('common/warningBoardService.js, getWarningBoard, error: ', error);
    console.log('common/warningBoardService.js, getWarningBoard, error: ', error);
  } finally {
    await client.release();
  }
}

exports.warningDelete = async () => {

  const client = await pool.connect();

  try {
    const binds = [];
    const query = await warningBoardMapper.deleteWarningBoard();
    const res = await client.query(query, binds);
    
    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_warningBoard-update", { warningBoard: { 'remove': res.rowCount } });
    }

    return res.rowCount;
  } catch (error) {
    logger.info('common/warningBoardService.js, getWarningBoard, error: ', error);
    console.log('common/warningBoardService.js, getWarningBoard, error: ', error);
  } finally {
    await client.release();
  }
}

exports.checkUseWarningBoard = async (eventLogCheckCount) => {
  const client = await pool.connect();

  try {
    let results = [];

    // 이벤트 데이터 그룹화 (테이블별로 나누기)
    const groupedEvents = eventLogCheckCount.reduce((acc, event) => {
      const tableName = {
        parking: "pm_event_type",
        origin: "ob_event_type",
        inundation: "fl_event_type",
        broadcast: "vb_event_type",
        tunnel:"tm_event_type",
      }[event.main_service_name || ''];

      if (!tableName) return acc;
      if (!acc[tableName]) acc[tableName] = [];
      acc[tableName].push(event);

      return acc;
    }, {});

    // 각 테이블별로 배치 처리 (IN 절 최적화)
    const BATCH_SIZE = 1000;

    // 데이터 개수가 많아질 경우 대비 1000개씩 처리
    for (const [tableName, events] of Object.entries(groupedEvents)) {
      const eventMap = new Map(events.map(event => [event.event_type_id, event])); // O(1) 탐색
    
      for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        const eventTypeIds = batch.map(event => event.event_type_id);
    
        const query = `
          SELECT e.id as event_type_id, e.use_warning_board
          FROM ${tableName} e
          WHERE e.id = ANY($1) AND e.use_warning_board = TRUE;
        `;
    
        const res = await client.query(query, [eventTypeIds]);
    
        if (res.rows.length > 0) {
          // 처음 발견 된 결과만 사용 반복문 전체 X
          const firstMatch = res.rows[0]; // 첫 번째 결과만 가져옴
          return {
            ...firstMatch,
            ...eventMap.get(firstMatch.event_type_id) // O(1) 탐색
          };
        }
      }
    }
    
    return results;
  } catch (error) {
    logger.info('common/warningBoardService.js, checkUseWarningBoard, error: ', error);
    console.log('common/warningBoardService.js, checkUseWarningBoard, error: ', error);
    return [];
  } finally {
    await client.release();
  }
};

exports.insertWarningBoard = async ({eventName, location}) => {
  
  const client = await pool.connect();

  try {
    const binds = [eventName,location];
    const deletequery = await warningBoardMapper.deleteWarningBoard();
    await client.query(deletequery);

    const insertQuery = await warningBoardMapper.insertWarningBoard();
    const insertRes = await client.query(insertQuery, binds);
    
    if(insertRes.rowCount > 0 && global.websocket) {
      global.websocket.emit("cm_warningBoard-update", { warningBoard: { 'insert': insertRes.rowCount } });
    }

    return insertRes.rowCount;

  } catch (error) {
    logger.info('common/warningBoardService.js, insertWarningBoard, error: ', error);
    console.log('common/warningBoardService.js, insertWarningBoard, error: ', error);
  } finally {
    await client.release();
  }
}