const express = require('express');
const router = express.Router();
const { pool } = require('../db/postgresqlPool');
const { addOperLog } = require('../utils/addOperLog');

// 그룹 목록 조회
router.get('/groups', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          wlg.idx,
          wlg.group_name,
          wlg.threshold_mode,
          wlg.created_at,
          COUNT(wlgm.water_level_idx) as water_level_count
        FROM fl_water_level_group wlg
        LEFT JOIN fl_water_level_group_mapping wlgm ON wlg.idx = wlgm.group_idx
        GROUP BY wlg.idx, wlg.group_name, wlg.threshold_mode, wlg.created_at
        ORDER BY wlg.created_at DESC
      `;
      const result = await client.query(query);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('그룹 목록 조회 오류:', error);
    res.status(500).json({ error: '그룹 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 그룹 상세 조회 (포함된 수위계들)
router.get('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const client = await pool.connect();
    try {
      const groupQuery = `
        SELECT idx, group_name, threshold_mode, created_at
        FROM fl_water_level_group 
        WHERE idx = $1
      `;
      const groupResult = await client.query(groupQuery, [groupId]);
      
      if (groupResult.rows.length === 0) {
        return res.status(404).json({ error: '그룹을 찾을 수 없습니다.' });
      }

      const waterLevelsQuery = `
        SELECT 
          wl.idx,
          wl.water_level_name,
          wl.water_level_ip,
          wl.water_level_location,
          wl.water_level_model,
          wl.threshold,
          wlgm.water_level_role
        FROM fl_water_level_group_mapping wlgm
        JOIN fl_water_level wl ON wlgm.water_level_idx = wl.idx
        WHERE wlgm.group_idx = $1
        ORDER BY wlgm.water_level_role, wl.water_level_name
      `;
      const waterLevelsResult = await client.query(waterLevelsQuery, [groupId]);

      res.json({
        group: groupResult.rows[0],
        waterLevels: waterLevelsResult.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('그룹 상세 조회 오류:', error);
    res.status(500).json({ error: '그룹 상세 조회 중 오류가 발생했습니다.' });
  }
});

// 그룹 생성
router.post('/groups', async (req, res) => {
  try {
    const { groupName, thresholdMode = 'AND', waterLevelIds = [], disableIndividualControl = false } = req.body;
    
    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ error: '그룹 이름은 필수입니다.' });
    }

    if (waterLevelIds.length < 2) {
      return res.status(400).json({ error: '최소 2개 이상의 수위계가 필요합니다.' });
    }

    // waterLevelService의 createWaterLevelGroup 함수 사용
    const { createWaterLevelGroup } = require('./inundationControl/services/waterLevelService');
    
    const result = await createWaterLevelGroup({
      groupName: groupName.trim(),
      thresholdMode,
      waterLevelIds,
      disableIndividualControl
    });

    if (result.status) {
      // 로그 기록
      await addOperLog({
        logAction: 'addoper',
        operatorId: req.session?.user?.id || 'admin',
        logType: '수위계 그룹 생성',
        logDescription: `수위계 그룹 "${groupName}" 생성 (${waterLevelIds.length}개 수위계, ${disableIndividualControl ? '그룹 전용' : '하이브리드'} 모드)`,
        reqIp: req.ip
      });

      res.json({ 
        success: true, 
        groupId: result.groupId,
        message: '그룹이 성공적으로 생성되었습니다.' 
      });
    } else {
      res.status(500).json({ error: result.message || '그룹 생성 중 오류가 발생했습니다.' });
    }
  } catch (error) {
    console.error('그룹 생성 오류:', error);
    res.status(500).json({ error: '그룹 생성 중 오류가 발생했습니다.' });
  }
});

// 그룹 수정
router.put('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { groupName, thresholdMode, waterLevelIds = [], disableIndividualControl = false } = req.body;
    
    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ error: '그룹 이름은 필수입니다.' });
    }

    if (waterLevelIds.length < 2) {
      return res.status(400).json({ error: '최소 2개 이상의 수위계가 필요합니다.' });
    }

    // waterLevelService의 updateWaterLevelGroup 함수 사용
    const { updateWaterLevelGroup } = require('./inundationControl/services/waterLevelService');
    
    const result = await updateWaterLevelGroup(groupId, {
      groupName: groupName.trim(),
      thresholdMode,
      waterLevelIds,
      disableIndividualControl
    });

    if (result.status) {
      // 로그 기록
      await addOperLog({
        logAction: 'addoper',
        operatorId: req.session?.user?.id || 'admin',
        logType: '수위계 그룹 수정',
        logDescription: `수위계 그룹 "${groupName}" 수정 (${waterLevelIds.length}개 수위계, ${disableIndividualControl ? '그룹 전용' : '하이브리드'} 모드)`,
        reqIp: req.ip
      });

      res.json({ 
        success: true, 
        message: '그룹이 성공적으로 수정되었습니다.' 
      });
    } else {
      res.status(500).json({ error: result.message || '그룹 수정 중 오류가 발생했습니다.' });
    }
  } catch (error) {
    console.error('그룹 수정 오류:', error);
    res.status(500).json({ error: '그룹 수정 중 오류가 발생했습니다.' });
  }
});

// 그룹 삭제
router.delete('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const client = await pool.connect();
    try {
      // 그룹 이름 조회 (로그용)
      const groupQuery = `SELECT group_name FROM fl_water_level_group WHERE idx = $1`;
      const groupResult = await client.query(groupQuery, [groupId]);
      
      if (groupResult.rows.length === 0) {
        return res.status(404).json({ error: '그룹을 찾을 수 없습니다.' });
      }

      const groupName = groupResult.rows[0].group_name;

      // 그룹 삭제 (CASCADE로 매핑도 함께 삭제)
      const deleteQuery = `DELETE FROM fl_water_level_group WHERE idx = $1`;
      await client.query(deleteQuery, [groupId]);

      // 로그 기록
      await addOperLog({
        logAction: 'addoper',
        operatorId: req.session?.user?.id || 'admin',
        logType: '수위계 그룹 삭제',
        logDescription: `수위계 그룹 "${groupName}" 삭제`,
        reqIp: req.ip
      });

      res.json({ 
        success: true, 
        message: '그룹이 성공적으로 삭제되었습니다.' 
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('그룹 삭제 오류:', error);
    res.status(500).json({ error: '그룹 삭제 중 오류가 발생했습니다.' });
  }
});

// 그룹에 포함되지 않은 수위계 목록
router.get('/available-water-levels', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          wl.idx,
          wl.water_level_name,
          wl.water_level_ip,
          wl.water_level_location,
          wl.water_level_model,
          wl.threshold
        FROM fl_water_level wl
        LEFT JOIN fl_water_level_group_mapping wlgm ON wl.idx = wlgm.water_level_idx
        WHERE wl.use_status = true 
        AND wlgm.water_level_idx IS NULL
        ORDER BY wl.water_level_location, wl.water_level_name
      `;
      const result = await client.query(query);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('사용 가능한 수위계 조회 오류:', error);
    res.status(500).json({ error: '사용 가능한 수위계 조회 중 오류가 발생했습니다.' });
  }
});

// 모든 수위계 목록 (그룹 포함 여부 표시)
router.get('/all-water-levels', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          wl.idx,
          wl.water_level_name,
          wl.water_level_ip,
          wl.water_level_location,
          wl.water_level_model,
          wl.threshold,
          wl.use_status,
          wlg.group_name,
          wlgm.water_level_role
        FROM fl_water_level wl
        LEFT JOIN fl_water_level_group_mapping wlgm ON wl.idx = wlgm.water_level_idx
        LEFT JOIN fl_water_level_group wlg ON wlgm.group_idx = wlg.idx
        WHERE wl.use_status = true
        ORDER BY wl.water_level_location, wl.water_level_name
      `;
      const result = await client.query(query);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('전체 수위계 조회 오류:', error);
    res.status(500).json({ error: '전체 수위계 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
