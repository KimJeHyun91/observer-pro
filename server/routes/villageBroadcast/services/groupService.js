const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const groupMapper = require('../mappers/groupMapper');


exports.addgroup = async ({ groupIdx, groupName, outsideIdxArray }) => {

  const client = await pool.connect();

  try {
    
    let returnValue = 0;

    const inputGroupIdx = groupIdx;
    let inputGroupName = groupName;
    const inputOutsideIdxArray = outsideIdxArray;

    let binds = [];
    let query = '';

    await client.query('BEGIN');

    // group idx 값이 있으면 수정, 삭제
    if(inputGroupIdx) {

      binds = [inputGroupIdx];
      query = await groupMapper.getGroupIdxOutsideList();
      const resGroupIdxOutsideList = await client.query(query, binds);

      // 그룹에 개소가 있으면, 삭제, 추가 
      if((resGroupIdxOutsideList) && (resGroupIdxOutsideList.rows) && (resGroupIdxOutsideList.rows.length > 0)) {

        let getGroupOutsideList = []; // 그룹에 속한 outside_idx 만 저장하는 배열
        let addOutsideIdxList = []; // 추가해야 하는 outside_idx 배열
        let deleteOutsideIdxList = []; // 삭제해야 하는 outside_idx 배열

        // 그룹에 속한 outside_idx 만 저장하기 위한 반복문
        for(let i in resGroupIdxOutsideList.rows) {

          getGroupOutsideList.push(resGroupIdxOutsideList.rows[i].outside_idx);
        }

        // filter 차집합으로 추가, 삭제할 outside_idx 값 배열에 저장
        addOutsideIdxList = outsideIdxArray.filter(x => !getGroupOutsideList.includes(parseInt(x)));
        deleteOutsideIdxList = getGroupOutsideList.filter(x => !outsideIdxArray.includes(parseInt(x)));

        // 추가
        for(const outsideIdx of addOutsideIdxList) {

          binds = [inputGroupIdx, outsideIdx];
          query = await groupMapper.addGroupOutside();
          await client.query(query, binds);
        }

        // 삭제
        for(const outsideIdx of deleteOutsideIdxList) {

          binds = [inputGroupIdx, outsideIdx];
          query = await groupMapper.deleteGroupOutside();
          await client.query(query, binds);
        }

        // 그룹명 수정
        binds = [inputGroupIdx, inputGroupName];
        query = await groupMapper.modifyGroupName();
        await client.query(query, binds);

      } else {
        // 그룹에 개소가 없으면, 추가

        for(const outsideIdx of inputOutsideIdxArray) {
          
          binds = [inputGroupIdx, outsideIdx];
          query = await groupMapper.addGroupOutside();
          await client.query(query, binds);
        }
      }

    } else {
      // group idx 값이 없으면 추가

      if(inputGroupName) {
        inputGroupName = inputGroupName.trim();
      } else {
        inputGroupName = '그룹 이름 없음';
      }

      binds = [inputGroupName];
      query = await groupMapper.addGroup();
      const resAddGroup = await client.query(query, binds);

      if((resAddGroup) && (resAddGroup.rows) && (resAddGroup.rows.length > 0)) {

        const groupIdx = resAddGroup.rows[0].idx;
        
        for(const outsideIdx of outsideIdxArray) {
          
          binds = [groupIdx, outsideIdx];
          query = await groupMapper.addGroupOutside();
          await client.query(query, binds);
        }
      }
    }

    await client.query('COMMIT');

    if((global.websocket) && (returnValue > 0)) {
      global.websocket.emit("vb_groups-update", { groupList: {'add':returnValue} });
    }

    return returnValue;

  } catch (error) {
    logger.info('villageBroadcast/groupService.js, addgroup, error: ', error);
    console.log('villageBroadcast/groupService.js, addgroup, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.deleteGroup = async ({ groupIdx }) => {

  const client = await pool.connect();

  try {

    await client.query('BEGIN');
    let binds = [groupIdx];
    let query = await groupMapper.deleteGroup(); // cascade 로 vb_group_outside 테이블은 자동삭제 됨
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("vb_groups-update", { groupList: {'delete':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('villageBroadcast/groupService.js, deleteSpeakerMacro, error: ', error);
    console.log('villageBroadcast/groupService.js, deleteSpeakerMacro, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getGroupOutsideInfo = async ({ groupIdx }) => {

  const client = await pool.connect();

  try {

    let binds = [groupIdx];
    let query = await groupMapper.getGroupOutsideInfo();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('villageBroadcast/groupService.js, getGroupOutsideInfo, error: ', error);
    console.log('villageBroadcast/groupService.js, getGroupOutsideInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getGroupOutsideList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await groupMapper.getGroupOutsideList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('villageBroadcast/groupService.js, getGroupOutsideList, error: ', error);
    console.log('villageBroadcast/groupService.js, getGroupOutsideList, error: ', error);
  } finally {
    await client.release();
  }
}