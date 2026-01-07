const { pool } = require('../../../db/postgresqlPool');

class ParkingSessionRepository {
  /**
   * [입차] 주차 세션 생성
   */
  async create(client, data) {
    const query = `
      INSERT INTO parking_sessions 
        (site_id, site_name, entry_lane_id, entry_lane_name, car_number, entry_time, entry_image, vehicle_type, status)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, 'RUNNING')
      RETURNING *
    `;
    
    const values = [
      data.siteId, 
      data.siteName || 'Unknown', 
      data.laneId, 
      data.laneName || 'Unknown', 
      data.carNum, 
      data.inTime, 
      data.imageUrl,
      data.type // 'MEMBER' or 'GENERAL'
    ];

    const { rows } = await client.query(query, values);
    return rows[0];
  }

  /**
   * [조회] 현재 주차 중인 차량 조회 (출차하지 않은 차량)
   */
  async findByCarNum(siteId, carNum) {
    const query = `
      SELECT * FROM parking_sessions
      WHERE site_id = $1 
        AND car_number = $2 
        AND exit_time IS NULL
      ORDER BY entry_time DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [siteId, carNum]);
    return rows[0];
  }

  /**
   * [조회] ID로 조회
   */
  async findById(siteId, id) {
    const query = `
      SELECT * FROM parking_sessions
      WHERE site_id = $1 AND id = $2
    `;
    const { rows } = await pool.query(query, [siteId, id]);
    return rows[0];
  }

  /**
   * [검색] 차량번호 4자리로 현재 주차 중인 차량 검색 (사전정산용)
   */
  async findRunningByCarNum4Digit(siteId, carNum4Digit) {
    const query = `
      SELECT * FROM parking_sessions
      WHERE site_id = $1 
        AND car_number LIKE $2 
        AND exit_time IS NULL
    `;
    const { rows } = await pool.query(query, [siteId, `%${carNum4Digit}`]);
    return rows[0] ? rows : [];
  }

  /**
   * [상태변경] 결제 대기 상태 등으로 변경
   */
  async updateStatus(client, id, status, totalFee) {
    const query = `
      UPDATE parking_sessions
      SET status = $1, total_fee = $2, updated_at = NOW()
      WHERE id = $3
    `;
    await client.query(query, [status, totalFee, id]);
  }

  /**
   * [사전정산] 정산 완료 정보 업데이트
   */
  async updatePreSettlement(client, id, data) {
    const query = `
      UPDATE parking_sessions
      SET 
        paid_fee = $1,
        status = 'PRE_SETTLED',
        updated_at = NOW()
      WHERE id = $2
    `;
    await client.query(query, [data.paidFee, id]);
  }

  /**
   * [출차] 세션 종료 (업데이트)
   */
  async closeSession(client, id, data) {
    const query = `
      UPDATE parking_sessions
      SET 
        exit_time = $1,
        exit_lane_id = $2,
        paid_fee = paid_fee + $3, -- 기존 납부액에 추가
        status = 'COMPLETED',
        updated_at = NOW()
      WHERE id = $4
    `;
    const values = [
      data.outTime,
      data.laneId,
      data.fee || 0,
      id
    ];
    await client.query(query, values);
  }
}

module.exports = ParkingSessionRepository;