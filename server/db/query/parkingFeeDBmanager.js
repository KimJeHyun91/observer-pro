const { pool } = require('../postgresqlPool');
const logger = require('../../logger');


exports.createTables = async () => {

  // 주차장
  const outsideTable = `
  CREATE TABLE IF NOT EXISTS pf_outside (
    idx SERIAL NOT NULL PRIMARY KEY,
    outside_name TEXT NOT NULL,
    outside_ip TEXT UNIQUE NOT NULL,
    outside_port TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'normal',
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `;

  // 층
  const insideTable = `
  CREATE TABLE IF NOT EXISTS pf_inside (
    idx SERIAL NOT NULL PRIMARY KEY,
    outside_idx INTEGER NOT NULL,
    inside_name TEXT NOT NULL,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pf_inside_outside_idx FOREIGN KEY(outside_idx) REFERENCES pf_outside(idx) ON DELETE CASCADE
  );
  `;

  // 라인
  const lineTable = `
  CREATE TABLE IF NOT EXISTS pf_line (
    idx SERIAL NOT NULL PRIMARY KEY,
    inside_idx INTEGER NOT NULL,
    line_name TEXT NOT NULL,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pf_line_inside_idx FOREIGN KEY(inside_idx) REFERENCES pf_inside(idx) ON DELETE CASCADE
  );
  `;

  // 차단기
  const crossingGateTable = `
  CREATE TABLE IF NOT EXISTS pf_crossing_gate (
    idx SERIAL NOT NULL PRIMARY KEY,
    crossing_gate_ip TEXT NOT NULL,
    crossing_gate_port TEXT NOT NULL,
    gate_index TEXT,
    ledd_index TEXT,
    pt_index TEXT,
    direction TEXT,
    location TEXT,
    ledd_ip TEXT,
    ledd_port TEXT,
    pt_ip TEXT,
    pt_port TEXT,
    is_used BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'down',
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `;

  // 라인, 차단기 매핑 테이블
  const outsideLineCrossingGateTable = `
  CREATE TABLE IF NOT EXISTS pf_crossing_gate_mapping (
    idx SERIAL NOT NULL PRIMARY KEY,
    line_idx INTEGER NOT NULL,
    crossing_gate_idx INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pf_crossing_gate_mapping_line_idx FOREIGN KEY(line_idx) REFERENCES pf_line(idx) ON DELETE CASCADE,
    CONSTRAINT fk_pf_crossing_gate_mapping_crossing_gate_idx FOREIGN KEY(crossing_gate_idx) REFERENCES pf_crossing_gate(idx) ON DELETE CASCADE
  );
  `;

  // PLS => 옵저버, 차량 입출차
  const receive_lpr_log = `
  CREATE TABLE IF NOT EXISTS pf_receive_lpr_log (
    lp TEXT NOT NULL,
    lp_type TEXT NOT NULL DEFAULT '일반차량',
    in_time BIGINT NOT NULL,
    in_time_person TEXT NOT NULL,
    in_ip TEXT NOT NULL,
    in_port TEXT NOT NULL,
    in_direction TEXT NOT NULL,
    in_location TEXT NOT NULL,
    in_fname TEXT,
    in_folder_name TEXT,
    in_image_url_header TEXT,

    outside_ip TEXT NOT NULL,

    out_time BIGINT,
    out_time_person TEXT,
    out_ip TEXT,
    out_port TEXT,
    out_direction TEXT,
    out_location TEXT,
    out_fname TEXT,
    out_folder_name TEXT,
    out_image_url_header TEXT,

    parking_fee INTEGER, -- 주차요금
    discount_fee INTEGER, -- 할인금액
    paytype INTEGER, -- 1 : 'IC카드', 2: 'MS카드', 3:'RF카드'
    restype TEXT, -- 'typeB'(정상결제), typeA(비정상적인 결제) 
    cardinfo TEXT, -- 결제카드정보(번호)
    approvno TEXT, -- 결제 승인번호
    paydate TEXT, -- 결제 승인날짜(YYYYMMDD)
    paytime TEXT, -- 결제 승인시간(HH24mmdd)
    memberid TEXT, -- 가맹점 번호
    termid TEXT, -- 결제단말기 번호
    issuer TEXT, -- 결제카드 발급사명
    acquirer TEXT, -- 결제 매입사명

    pre_parking_fee INTEGER, -- 사전정산 주차요금
    pre_cardinfo TEXT, -- 사전정산 결제카드정보(번호)
    pre_approvno TEXT, -- 사전정산 결제 승인번호
    pre_paydate TEXT, -- 사전정산 결제 승인날짜(YYYYMMDD)
    pre_paytime TEXT, -- 사전정산 결제 승인시간(HH24mmdd)
    pre_termid TEXT, -- 사전정산 결제단말기 번호
    pre_issuer TEXT, -- 사전정산 결제카드 발급사명

    contents TEXT,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (lp, in_time)
  );
  `;

  // PLS => 옵저버, 차량 입차 임시저장
  const receive_lpr_temp = `
  CREATE TABLE IF NOT EXISTS pf_receive_lpr_temp (
    lp TEXT NOT NULL,
    lp_type TEXT,
    loop_event_time BIGINT NOT NULL,
    loop_event_time_person TEXT NOT NULL,
    ip TEXT NOT NULL,
    port TEXT NOT NULL,
    direction TEXT NOT NULL,
    location TEXT NOT NULL,
    fname TEXT,
    folder_name TEXT,
    image_url_header TEXT,
    outside_ip TEXT NOT NULL,
    kind TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (lp, loop_event_time)
  );
  `;

  // 요금정책
  const feePolicy = `
  CREATE TABLE IF NOT EXISTS pf_fee_policy (
    idx INTEGER NOT NULL PRIMARY KEY,
    fee_policy_name TEXT UNIQUE NOT NULL,
    std_duration INTEGER NOT NULL default 0,
    std_fee INTEGER NOT NULL  default 0,
    repeat_duration INTEGER NOT NULL default 0,
    repeat_fee INTEGER NOT NULL default 0,
    free_duration INTEGER NOT NULL default 0,
    settlement_duration INTEGER NOT NULL default 0,
    contents TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `;

  const defaultFeePolicy = `
  INSERT INTO pf_fee_policy (
    idx, fee_policy_name, std_duration, std_fee, repeat_duration, repeat_fee, free_duration, settlement_duration, contents
  ) VALUES 
   (1, '일반요금', 10, 500, 10, 500, 5, 10, '일반요금')
   ON CONFLICT (fee_policy_name) DO NOTHING;
  `;

  // 감면정책
  const reductionPolicy = `
  CREATE TABLE IF NOT EXISTS pf_reduction_policy (
    idx INTEGER NOT NULL PRIMARY KEY,
    reduction_name TEXT NOT NULL,
    reduction_ratio INTEGER NOT NULL default 0,
    reduction_minute INTEGER NOT NULL default 0,
    reduction_fee INTEGER NOT NULL default 0,
    contents TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `;

  const defaultReductionPolicy = `
  INSERT INTO pf_reduction_policy (
    idx, reduction_name, reduction_ratio, reduction_minute, reduction_fee, contents
  ) VALUES 
    (1, '장애인', 50, 180, 0, '등록장애인 운전 차량 및 장애인 동반 차량')
    --, (2, '국가유공자', 50, 180, 0, '(노상주차장)국가유공자 증서를 소지한 사람이 탑승한 차량')
    , (3, '고엽제후유의증', 50, 180, 0, '고엽제 후유의증 환자가 사용하는 비사업용 차량')
    , (4, '5.18민주유공자', 50, 180, 0, '5·18민주화운동 부상자 운전 차량 및 동반 차량')

    , (5, '친환경', 50, 120, 0, '환경친화적 자동차')
    --, (6, '다자녀', 50, 120, 0, '(노상주차장)다자녀 증명자료 제시자')

    , (7, '요일제', 20, 0, 0, '요일제 전자태그를 부착하고 운휴일을 준수한 차량')

    , (8, '경차', 50, 0, 0, '경형 자동차')
    , (9, '저공해', 50, 0, 0, '저공해 표시(스티커) 부착 차량')
    , (10, '장기기증', 50, 0, 0, '장기기증자 및 장기기증 등록자')
    , (11, '우수자원봉사자', 50, 0, 0, '구리시 종합자원봉사센터에서 인증한 자의 운전 차량')
    , (12, '병역명문가', 50, 0, 0, '예우대상자 또는 가족 운전 차량')
    , (13, '효행', 50, 0, 0, '부양자(세대주로 한정한다) 운전 차량')
    , (14, '의사상자', 50, 0, 0, '의사자 유족 또는 의상자 및 그 가족이4,  탑승한 차량')
    , (15, '시민대상', 50, 0, 0, '구리시 시민대상 수상자 소유의 차량')

    , (16, '긴급차량', 100, 0, 0, '긴급차량')
    , (17, '공무수행', 100, 0, 0, '공무수행 차량')
    , (18, '유공납세', 100, 0, 0, '유공납세증 표시(스티커)를 부착한 차량(유공납세증 교부일부터 1년으로 한정함)')
    , (19, '투표확인', 0, 0, 2000, '투표확인증(해당 선거의 선거일 후 3개월까지 유효함)을 제출한 차량')
    , (20, '국가유공자', 0, 2880, 0, '(노외주차장)국가유공자 증서를 소지한 사람이 탑승한 차량')
    , (21, '다자녀', 0, 2880, 0, '(노외주차장)다자녀 증명자료 제시자')
    , (22, '무료', 100, 0, 0, '상시무료')
   ON CONFLICT (idx) DO NOTHING;
  `;

  // 등록차량
  const regVehicle = `
  CREATE TABLE IF NOT EXISTS pf_reg_vehicle (
    idx BIGSERIAL NOT NULL PRIMARY KEY,
    reduction_name TEXT NOT NULL DEFAULT '무료',
    lp TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    contents TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `;

  // // 정기권 그룹
  // const seasonTicketGroup = `
  // CREATE TABLE IF NOT EXISTS pf_season_ticket_group (
  //   idx BIGSERIAL NOT NULL PRIMARY KEY,
  //   name TEXT NOT NULL,
  //   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  //   updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  // );
  // `;

  // const defaultSeasonTicketGroup = `
  // INSERT INTO pf_season_ticket_group (
  //   name
  // ) VALUES 
  //  ('기본그룹')
  //  ON CONFLICT (id) DO NOTHING;
  // `;

  // // 정기권
  // const seasonTicket = `
  // CREATE TABLE IF NOT EXISTS pf_season_ticket (
  //   idx BIGSERIAL NOT NULL PRIMARY KEY,
  //   name TEXT NOT NULL,
  //   group_idx INTEGER NOT NULL default 1,
  //   fee INTEGER NOT NULL default 0,
  //   days INTEGER NOT NULL default 30,
  //   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  //   updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  // );
  // `;

  // // 정기권 판매
  // const seasonTicketSales = `
  // CREATE TABLE IF NOT EXISTS pf_season_ticket_sales (
  //   idx BIGSERIAL NOT NULL PRIMARY KEY,
  //   lp TEXT NOT NULL,
  //   group_idx INTEGER NOT NULL default 1,
  //   period_start_date TEXT NOT NULL,
  //   period_end_date TEXT NOT NULL,
  //   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  //   updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  // );
  // `;

  // // 블랙리스트
  // const blackList = `
  // CREATE TABLE IF NOT EXISTS pf_black_list (
  //   idx BIGSERIAL NOT NULL PRIMARY KEY,
  //   lp TEXT NOT NULL,
  //   contents
  //   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  //   updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  // );
  // `;

  const client = await pool.connect();

  try {

    await client.query(outsideTable);
    await client.query(insideTable);
    await client.query(lineTable);
    await client.query(crossingGateTable);
    await client.query(outsideLineCrossingGateTable);

    await client.query(receive_lpr_log); // 차량 입출차
    await client.query(receive_lpr_temp); // 차량 입차 임시저장
    
    await client.query(feePolicy); // 요금정책
    await client.query(defaultFeePolicy); // 요금정책 초기저장

    await client.query(reductionPolicy); // 감면정책
    await client.query(defaultReductionPolicy); // 감면정책 초기저장
    await client.query(regVehicle); // 등록차량

  } catch(error) {
    logger.info('db/query/parkingFeeDBmanager.js, createTables, error: ', error);
    console.log('db/query/parkingFeeDBmanager.js, createTables, error: ', error);
  } finally {
    await client.release();
  }
}