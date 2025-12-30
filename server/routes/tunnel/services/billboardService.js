const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const outsideMapper = require('../mappers/outsideMapper');
const cameraMapper = require('../../observer/mappers/cameraMapper');
const warningBoardService = require('../../common/services/warningBoardService');
const mainServiceName = 'tunnel';
const { barrierStatusCache } = require('../../../worker/tunnel/barrierControl')
const billboardSocketControl = require('../../../worker/tunnel/billboardSocketControl');
const billboardMapper = require('../mappers/billboardMapper');


// 전광판 추가
exports.addBillboard = async ({ ip, port, name, row, col, type, manufacturer }) => {
    const client = await pool.connect();

    try {

        const rowValue = isNaN(parseInt(row)) ? 1 : parseInt(row);
        const colValue = isNaN(parseInt(col)) ? 1 : parseInt(col);

        const binds = [
            ip,
            port,
            name,
            rowValue,
            colValue,
            type,
            manufacturer
        ];

        const query = billboardMapper.addBillboard();

        await client.query('BEGIN');
        const res = await client.query(query, binds);
        await client.query('COMMIT');

        // 소켓 연결 추후 개발
        // if((res) && (res.rowCount > 0) && (global.websocket)) {
        //   global.websocket.emit("tm_areaList-update", { areaList: { 'add': res.rowCount } });
        // }

        return res.rows;

    } catch (error) {
        logger.info('tunnel/BillboardService.js, addBillboard, error: ', error);
        console.log('tunnel/BillboardService.js, addBillboard, error: ', error);
        await client.query('ROLLBACK');
        throw error;
    } finally {
        await client.release();
    }
};

// 전광판 리스트 정보 받기
exports.getBillboardList = async () => {
    const client = await pool.connect();

    try {
        const query = billboardMapper.getBillboardList();
        const res = await client.query(query);
        return {
            status: true,
            data: res.rows
        };
    } catch (error) {
        logger.info('tunnel/billboardService.js, getBillboardList, error: ', error);
        console.log('tunnel/billboardService.js, getBillboardList, error: ', error);
        return {
            status: false,
            error
        };
    } finally {
        client.release();
    }
};

// 전광판 설정창에서 수정
exports.modifyBillboard = async ({ idx, name, ip, port, row, col, type, manufacturer }) => {
    const client = await pool.connect();

    try {
        const rowValue = isNaN(parseInt(row)) ? 1 : parseInt(row);
        const colValue = isNaN(parseInt(col)) ? 1 : parseInt(col);

        const binds = [idx, ip, port, name, rowValue, colValue, type, manufacturer];
        const query = billboardMapper.modifyBillboarde();
        const res = await client.query(query, binds);


        if ((global.websocket)) {
            global.websocket.emit("tm_billboard-update", { billboard: { 'modify': 'success' } });
        }

        return {
            status: true,
            data: res.rows
        };
    } catch (error) {
        logger.info('tunnel/billboardService.js, modifyBillboard, error: ', error);
        console.log('tunnel/billboardService.js, modifyBillboard, error: ', error);
        return {
            status: false,
            error
        };
    } finally {
        client.release();
    }
};

// 전광판 삭제
exports.removeBillboard = async (idxList) => {
    const client = await pool.connect();

    try {
        binds = idxList
        const queryBinds = '(' + idxList.map((_, i) => `$${i + 1}`).join(', ') + ')';
        const query = billboardMapper.removeBillboard() + queryBinds;
        const res = await client.query(query, binds);


        if ((global.websocket)) {
            global.websocket.emit("tm_billboard-update", { billboard: { 'modify': 'success' } });
        }

        return {
            status: true,
            data: res.rows
        };
    } catch (error) {
        logger.info('tunnel/billboardService.js, removeBillboard, error: ', error);
        console.log('tunnel/billboardService.js, removeBillboard, error: ', error);
        return {
            status: false,
            error
        };
    } finally {
        client.release();
    }
};

// 전광판 상세 정보 받기
exports.getBillboardInfo = async ({ outsideIdx }) => {
    const client = await pool.connect();

    try {

        let bind = [outsideIdx];
        const query = billboardMapper.getBillboardInfo();
        const res = await client.query(query, bind);

        return {
            status: true,
            data: res.rows
        };
    } catch (error) {
        logger.info('tunnel/billboardService.js, getBillboardInfo, error: ', error);
        console.log('tunnel/billboardService.js, getBillboardInfo, error: ', error);
        return {
            status: false,
            error
        };
    } finally {
        client.release();
    }
};

// VMS 전광판 정보 수정
exports.modifyVMSBillboard = async (vmsInfo) => {
  const client = await pool.connect();
  try {
    const idxList = Object.keys(vmsInfo);
    const results = [];
    const laneResults = [];

    for (const idx of idxList) {
      const { msg, color, ip, port, lane, userId, manufacturer } = vmsInfo[idx];
      const billboardIdx = parseInt(idx, 10);

      // 각 전광판별 트랜잭션 시작
      await client.query('BEGIN');

      try {
        // 1) 메시지/색상 업데이트 (선 저장)
        const query = billboardMapper.modifyVMSBillboarde();
        const binds = [billboardIdx, msg, color];
        const res = await client.query(query, binds);

        // 2) 전송 시도
        const connectRes = await billboardSocketControl.sendToBillboard(
          ip,
          msg,
          color,
          'singleBillboard',
          userId,
          '',
          'vms',
          manufacturer 
        );
        const ok = Array.isArray(connectRes?.success) && connectRes.success.length > 0;

        if (ok) {
          // 3-a) 성공: linked_status=true 반영하고 커밋
          await client.query(
            'UPDATE tm_billboard SET linked_status = $1 WHERE idx = $2',
            [true, billboardIdx]
          );
          await client.query('COMMIT');

          results.push(res.rows?.[0] ?? null);
          laneResults.push(`${lane} 수정 성공`);
        } else {
          // 3-b) 실패: 메시지/색상 변경 롤백
          await client.query('ROLLBACK');

          // 롤백 후 별도로 상태만 false로 표기
          await client.query(
            'UPDATE tm_billboard SET linked_status = $1 WHERE idx = $2',
            [false, billboardIdx]
          );
          laneResults.push(`${lane} 수정 실패`);
        }
      } catch (e) {
        // 쿼리/전송 중 예외 발생 시 롤백
        try { await client.query('ROLLBACK'); } catch {}
        // 상태만 false로 표시
        try {
          await client.query(
            'UPDATE tm_billboard SET linked_status = $1 WHERE idx = $2',
            [false, billboardIdx]
          );
        } catch {}
        laneResults.push(`${lane} 수정 실패`);
        console.error('modifyVMSBillboard per-item error:', billboardIdx, e);
      }
    }

    // 전체 브로드캐스트 (선택)
    if (results.length > 0 && global.websocket) {
      global.websocket.emit('tm_billboard-update', { billboard: { modify: results } });
    }

    return { status: true, data: results, lanes: laneResults };
  } catch (error) {
    console.log('modifyVMSBillboard error:', error);
    return { status: false, error };
  } finally {
    client.release();
  }
};


// LCS 전광판 정보 수정
exports.modifyLCSBillboard = async (lcsInfoMap) => {
  const client = await pool.connect();
  try {
    // 객체 값 → 배열
    const lcsInfoList = Object.values(lcsInfoMap);

    // lane 문자열에서 숫자만 뽑아 정렬 (1차선, 2차선, 3차선…)
    const laneNo = (s) => {
      const m = String(s ?? '').match(/\d+/);
      return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
    };
    const sortedList = lcsInfoList.slice().sort((a, b) => laneNo(a.lane) - laneNo(b.lane));

    const laneResults = []; // "1차선 성공/실패" 누적

    await client.query('BEGIN');

    for (const lcsInfo of sortedList) {
      // 1) DB 업데이트 (선저장)
      const binds = [lcsInfo.idx, lcsInfo.msg, lcsInfo.direction];
      const query = billboardMapper.modifyLCSBillboarde();
      await client.query(query, binds);

      // 2) 장비로 전송
      const connectRes = await billboardSocketControl.sendToBillboard(
        lcsInfo.ip,
        lcsInfo.msg,
        (lcsInfo.color = ''),          // color 미사용이면 공백
        'singleBillboard',             // type
        lcsInfo.userId,                // id (operator)
        (lcsInfo.billboard_controller_model == ''), // (원 코드 유지)
        (controller_type = 'lcs'),      // (원 코드 유지)
        lcsInfo.manufacturer
      );
   

      // 3) 성공/실패 판정
      const ok = Array.isArray(connectRes?.success) && connectRes.success.length > 0;

      // 3-1) ✅ linked_status 갱신 (idx 기준)
      if (typeof lcsInfo.idx === 'number') {
        try {
          await client.query(
            'UPDATE tm_billboard SET linked_status = $1 WHERE idx = $2',
            [ok, lcsInfo.idx]
          );
        } catch (e) {
          console.error('linked_status 업데이트 실패:', lcsInfo.idx, e);
        }
      }

      // 4) 실패 시 msg를 'delete'로 덮어쓰기 (DB 재업데이트)
      if (!ok) {
        try {
          lcsInfo.msg = 'delete'; // 메모리 상 객체도 갱신
          const deleteBinds = [lcsInfo.idx, 'delete', lcsInfo.direction];
          await client.query(billboardMapper.modifyLCSBillboarde(), deleteBinds);
        } catch (e) {
          console.error('LCS 실패 시 delete 업데이트 실패:', lcsInfo.idx, e);
        }
      }

      // 5) 결과 누적
      laneResults.push(`${lcsInfo.lane} ${ok ? '성공' : '실패'}`);
    }

    await client.query('COMMIT');

    if (global.websocket) {
      global.websocket.emit('tm_billboard-update', { billboard: { modify: 'success' } });
    }

    return {
      status: true,
      data: null,
      lanes: laneResults, // 예: ['1차선 성공', '2차선 실패', ...]
    };
  } catch (error) {
    logger.info('tunnel/billboardService.js, modifyLCSBillboard, error: ', error);
    console.log('tunnel/billboardService.js, modifyLCSBillboard, error: ', error);
    return { status: false, error };
  } finally {
    client.release();
  }
};


