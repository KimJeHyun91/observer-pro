const { pool } = require('../postgresqlPool');
const logger = require('../../logger');
const cryptography = require("../../utils/cryptography");

const { hashedPassword, salt } = cryptography.hashPassword('admin1234');
// console.log('hashedPassword : ', hashedPassword);

exports.createTables = async () => {

  const mainServiceTable = `
  CREATE TABLE IF NOT EXISTS main_service (        
    id integer NOT NULL PRIMARY KEY,
    main_service_name TEXT NOT NULL,
    main_service_name_kr TEXT NOT NULL,
    main_service_url TEXT,
    sub_name TEXT,
    map_image_url TEXT,
    use_service BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const defaultMainServiceInsert = `
  INSERT INTO main_service (
    id, main_service_name, main_service_name_kr, main_service_url, sub_name, map_image_url, use_service
  ) VALUES 
   (1, 'observer', 'Observer', null, 'ob', null, true),
   (2, 'inundation', '침수차단', null, 'fl', null, true),
   (3, 'vehicle', '차량관리', null, 'vm', null, true),
   (4, 'parking', '주차관리', null, 'pm', null, true),
   (5, 'tunnel', '터널관리', null, 'tm', null, true),
   (6, 'broadcast', '마을방송', null, 'vb', null, true),
   (7, 'parkingFee', '주차요금', null, 'pf', null, true)
  ON CONFLICT (id) DO NOTHING;
  `;

  const usersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT NOT NULL PRIMARY KEY,
    password TEXT NOT NULL,
    salt TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'user',
    enable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const defaultUserInsert = `
  INSERT INTO users (
    id, password, salt, user_name, user_role
  ) VALUES 
    ('admin00', '${hashedPassword}', '${salt}', 'admin', 'admin')
  ON CONFLICT (id) DO NOTHING;
  `;

  const operationLogTable = `
  CREATE TABLE IF NOT EXISTS operation_log (        
    idx bigserial NOT NULL PRIMARY KEY,
    user_id TEXT,
    log_type TEXT,
    log_description TEXT,
    req_ip TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const mainSettingTable = `
  CREATE TABLE IF NOT EXISTS main_setting (        
    idx serial NOT NULL PRIMARY KEY,
    setting_name TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const severityTable = `
  CREATE TABLE IF NOT EXISTS ob_severity (        
    id INTEGER NOT NULL PRIMARY KEY,
    severity TEXT NOT NULL,
    severity_color TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const defaultSeverityInsert = `
  INSERT INTO ob_severity (
    id, severity, severity_color
  ) VALUES 
    (0, 'info', 'gray'), 
    (1, 'minor', 'green'), 
    (2, 'major', 'yellow'),
    (3, 'critical', 'red')
    ON CONFLICT (id) DO NOTHING;
  `;

  const serviceTypeTable = `
  CREATE TABLE IF NOT EXISTS ob_service_type (
    id INTEGER NOT NULL PRIMARY KEY,
    service_type TEXT UNIQUE NOT NULL,
    service_type_kr TEXT NOT NULL,
    service_type_image TEXT NOT NULL,
    use_service_type BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const defaultServiceTypeInsert = `
  INSERT INTO ob_service_type (
    id, service_type, service_type_kr, service_type_image, use_service_type
  ) VALUES 
    (1, 'observer', '옵저버', '', true),
    (2, 'mgist', 'MGIST', '', true),
    (3, 'ebell', '비상벨', '', true),
    (4, 'accesscontrol', '출입통제', '', true),
    (5, 'guardianlite', '가디언라이트', '', true),
    (6, 'pids', 'PIDS', '', true),
    (7, 'anpr', 'ANPR', '', true),
    (8, 'ndoctor', 'NDoctor', '', true)
    ON CONFLICT (id) DO NOTHING;
  `;

  const eventTypeTable = `
  CREATE TABLE IF NOT EXISTS ob_event_type (        
    id INTEGER NOT NULL PRIMARY KEY,
    event_type TEXT UNIQUE NOT NULL,
    service_type TEXT NOT NULL,
    severity_id INTEGER NOT NULL,
    use_warning_board BOOLEAN NOT NULL DEFAULT true,
    use_popup BOOLEAN NOT NULL DEFAULT true,
    use_event_type BOOLEAN NOT NULL DEFAULT true,
    use_sop BOOLEAN NOT NULL DEFAULT false,
    sop_idx INTEGER DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const defaultEventTypeInsert = `
  INSERT INTO ob_event_type (
    id, event_type, service_type, severity_id, use_warning_board, use_popup, use_event_type, use_sop
  ) VALUES 
    (1, '화재 감지', 'mgist', 3, true, true, true, true), 
    (2, '연기 감지', 'mgist', 0, true, false, true, true),  
    (3, '움직임 감지', 'mgist', 0, false, false, true, true), 
    (4, '배회 감지', 'mgist', 0, false, false, true, true), 
    (5, '유기 감지', 'mgist', 0, false, false, true, true), 
    (6, '영역 침입 감지', 'mgist', 3, false, false, true, true),
    (7, '영역 이탈 감지', 'mgist', 0, false, false, true, true), 
    (8, '라인 크로스 감지', 'mgist', 0, false, false, true, true), 
    (9, '대기열 감지', 'mgist', 0, false, false, true, true), 
    (10, '쓰러짐 감지', 'mgist', 0, true, false, true, true), 
    (11, '앉은 자세 감지', 'mgist', 0, false, false, true, true), 
    (12, '정지 감지', 'mgist', 0, false, false, true, true), 
    (13, '영역 이동 감지', 'mgist', 0, false, false, true, true), 
    (14, '피플 카운트', 'mgist', 0, false, false, true, true), 
    (15, '근거리 감지', 'mgist', 0, false, false, true, true), 
    (16, '난간 잡기 감지', 'mgist', 0, false, false, true, true),
    (17, '양손 들기 감지', 'mgist', 0, false, false, true, true), 
    (18, '얼굴 감지', 'mgist', 0, false, false, true, true), 
    (19, '비상상황 발생', 'ebell', 3, false, false, true, false), 
    (20, '가디언라이트 연결 끊어짐', 'guardianlite', 0, false, false, true, false), 
    (21, '블랙리스트', 'mgist', 0, false, false, true, false), 
    (22, '화이트리스트', 'mgist', 0, false, false, true, false), 
    (23, '화재신호', 'accesscontrol', 3, true, true, true, false), 
    (24, '출입불가: 미등록 출입시도', 'accesscontrol', 3, true, true, true, false),
    (25, '강제 출입문 열림', 'accesscontrol', 3, true, true, true, false),
    (26, '사람 감지', 'mgist', 0, false, false, true, true),
    (27, '차량 감지', 'mgist', 0, true, false, true, true),
    (28, '안전모 미착용 감지', 'mgist', 0, false, false, true, true),
    (29, '연결 해제', 'ndoctor', 0, false, false, true, false),
    (30, '연결 복구', 'ndoctor', 0, false, false, true, false),
    (31, '카메라 녹화 오류', 'mgist', 3, false, false, true, true),
    (32, '카메라 네트워크 오류', 'mgist', 3, false, false, true, true),
    (33, '도메인 서버 끊어짐', 'mgist', 3, false, false, true, true),
    (34, '아카이브 오류', 'mgist', 3, false, false, true, true),
    (46, 'PIDS 이벤트 감지', 'pids', 3, false, false, true, true),
    (48, 'Anti-Passback(Soft)', 'accesscontrol', 3, true, true, true, false),
    (49, 'Anti-Passback(Timed)', 'accesscontrol', 3, true, true, true, false),
    (50, 'Anti-Passback(Hard)', 'accesscontrol', 3, true, true, true, false),
    (51, '장시간 문 열림', 'accesscontrol', 3, true, true, true, false),
    (52, '장시간 문 열림 종료', 'accesscontrol', 0, true, true, true, false),
    (53, '출입불가: 재인증 횟수초과', 'accesscontrol', 3, true, true, true, false),
    (54, '출입불가: 미승인 리더 출입시도', 'accesscontrol', 3, true, true, true, false),
    (55, '출입불가: 출입제한 시간에 출입시도', 'accesscontrol', 3, true, true, true, false),
    (56, '출입불가: 리더 출입제한 시간', 'accesscontrol', 3, true, true, true, false)
    ON CONFLICT (id) DO NOTHING;
  `;

  const warningBoardTable = `
  CREATE TABLE IF NOT EXISTS warning_board (
    event_name TEXT,
    location TEXT
  )
  `;

  const vmsTable = `
  CREATE TABLE IF NOT EXISTS ob_vms (
    idx SERIAL NOT NULL PRIMARY KEY,
    vms_id TEXT NOT NULL,
    vms_pw TEXT NOT NULL,
    vms_ip TEXT NOT NULL,
    vms_port TEXT NOT NULL,
    vms_name TEXT NOT NULL,
    main_service_name TEXT NOT NULL,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW(),
    UNIQUE(vms_name, main_service_name)
  )
  `;

  const cameraTable = `
  CREATE TABLE IF NOT EXISTS ob_camera (
    idx SERIAL NOT NULL,
    camera_id TEXT NOT NULL,
    vms_name TEXT NOT NULL,
    main_service_name TEXT NOT NULL,
    camera_name TEXT NOT NULL,
    camera_ip TEXT NOT NULL,
    camera_angle TEXT,
    outside_idx INTEGER,
    inside_idx INTEGER,
    dimension_type TEXT,
    water_level_idx INTEGER,
    left_location TEXT,
    top_location TEXT,
    use_status BOOLEAN NOT NULL DEFAULT false,
    service_type TEXT,
    camera_vendor TEXT,
    camera_model TEXT,
    camera_type TEXT,
    access_point TEXT,
    linked_status BOOLEAN NOT NULL DEFAULT true,
    alarm_status BOOLEAN NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_ob_camera_id_vms_name PRIMARY KEY (camera_id, vms_name, main_service_name)
  )
  `;

  const outsideCameraTable = `
  CREATE TABLE IF NOT EXISTS camera_outside_mapping (
    camera_id TEXT NOT NULL,
    vms_name TEXT NOT NULL,
    main_service_name TEXT NOT NULL,
    outside_idx INTEGER NOT NULL,
    PRIMARY KEY (camera_id, vms_name, main_service_name, outside_idx),
    FOREIGN KEY (camera_id, vms_name, main_service_name)
        REFERENCES ob_camera(camera_id, vms_name, main_service_name),
    FOREIGN KEY (outside_idx)
        REFERENCES fl_outside(idx)
        ON DELETE CASCADE,
    CONSTRAINT unique_outside_camera
        UNIQUE (outside_idx, camera_id)
  );`;

  const sopTable = `
  CREATE TABLE IF NOT EXISTS sop (
    idx SERIAL NOT NULL PRIMARY KEY,
    sop_name TEXT UNIQUE NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW()
  )
  `;

  const sopStageTable = `
  CREATE TABLE IF NOT EXISTS sop_stage (
    idx SERIAL NOT NULL PRIMARY KEY,
    sop_idx INTEGER NOT NULL,
    sop_stage INTEGER NOT NULL,
    sop_stage_name TEXT NOT NULL,
    sop_stage_description TEXT NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_sop_stage FOREIGN KEY(sop_idx) REFERENCES sop(idx) ON DELETE CASCADE
  )
  `;

  const falseAlarmTable = `
  CREATE TABLE IF NOT EXISTS false_alarm (
    idx SERIAL NOT NULL PRIMARY KEY,
    type text UNIQUE NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW()
  )
  `;

  const eventLogTable = `
  CREATE TABLE IF NOT EXISTS event_log (
    idx BIGSERIAL NOT NULL PRIMARY KEY,
    event_name TEXT,
    description TEXT,
    location TEXT,
    event_idx INTEGER DEFAULT NULL,
    event_type_id INTEGER,
    main_service_name TEXT,
    event_occurrence_time TEXT NOT NULL,
    event_end_time TEXT,
    severity_id INTEGER,
    is_acknowledge BOOLEAN NOT NULL DEFAULT false,
    acknowledge_user TEXT,
    acknowledged_at TEXT,
    sop_idx INTEGER,
    is_clear_sop_stage INTEGER,
    false_alarm_idx INTEGER,
    CONNECTION BOOLEAN NOT NULL DEFAULT true,
    outside_idx INTEGER,
    inside_idx INTEGER,
    dimension_type TEXT,
    water_level_idx INTEGER,
    device_idx INTEGER,
    device_type TEXT,
    device_name TEXT,
    device_ip TEXT,
    camera_id TEXT,
    snapshot_path TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const vehicleNumTable = `
  CREATE TABLE IF NOT EXISTS anpr_vehicle_num (
    idx BIGSERIAL NOT NULL PRIMARY KEY,
    vehicle_num text,
    event_camera_id text,
    recog_datetime text,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const eventLogPartialIndex = `
    CREATE UNIQUE INDEX IF NOT EXISTS polling_event_idx on event_log (event_idx) WHERE event_idx IS NOT NULL;
  `;

  const defaultMainSettings = `
  INSERT INTO main_setting (
    setting_name,
    setting_value,
    description
  ) VALUES (
    'ANPR 차량번호 검출',
    'use',
    'ANPR 번호 검출 카메라로 차량 번호를 검출합니다.'
  ), (
    '출입통제 설정',
    ',,,,',
    '출입통제 설정 정보'
  ), (
    '비상벨 설정',
    ',,,,',
    '비상벨 설정 정보'
  ), (
    'SMS 시간 설정',
    ',',
    'SMS 시간 설정 정보'
  ) ON CONFLICT (setting_name) DO NOTHING;`;


  const initialMapLocationTable = `
  CREATE TABLE IF NOT EXISTS initial_map_location (
    idx SERIAL PRIMARY KEY,
    main_service_name TEXT UNIQUE NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    zoom_level INTEGER NOT NULL DEFAULT 12,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `;

  const defaultInitialLocationInsert = {
    text: `
      INSERT INTO initial_map_location (main_service_name, lat, lng, zoom_level)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (main_service_name) DO NOTHING
    `,
    values: [
      'default',
      37.6162074367235,
      126.836542115685,
      12
    ],
  };

  const mapBoundaryControlTable = `
  CREATE TABLE IF NOT EXISTS map_boundary_control (
    sido TEXT NOT NULL,
    sigungu_cd TEXT PRIMARY KEY,
    sigungu_name TEXT NOT NULL,
    selected BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
  `;


  const defaultMapBoundaryControlSetting = `
  INSERT INTO map_boundary_control (sido, sigungu_cd, sigungu_name, selected) VALUES
    ('강원특별자치도', '42110', '춘천시', false),
    ('강원특별자치도', '42130', '원주시', false),
    ('강원특별자치도', '42150', '강릉시', false),
    ('강원특별자치도', '42170', '동해시', false),
    ('강원특별자치도', '42190', '태백시', false),
    ('강원특별자치도', '42210', '속초시', false),
    ('강원특별자치도', '42230', '삼척시', false),
    ('강원특별자치도', '42720', '홍천군', false),
    ('강원특별자치도', '42730', '횡성군', false),
    ('강원특별자치도', '42750', '영월군', false),
    ('강원특별자치도', '42760', '평창군', false),
    ('강원특별자치도', '42770', '정선군', false),
    ('강원특별자치도', '42780', '철원군', false),
    ('강원특별자치도', '42790', '화천군', false),
    ('강원특별자치도', '42800', '양구군', false),
    ('강원특별자치도', '42810', '인제군', false),
    ('강원특별자치도', '42820', '고성군', false),
    ('강원특별자치도', '42830', '양양군', false),
    ('경기도', '41111', '수원시 장안구', false),
    ('경기도', '41113', '수원시 권선구', false),
    ('경기도', '41115', '수원시 팔달구', false),
    ('경기도', '41117', '수원시 영통구', false),
    ('경기도', '41131', '성남시 수정구', false),
    ('경기도', '41133', '성남시 중원구', false),
    ('경기도', '41135', '성남시 분당구', false),
    ('경기도', '41150', '의정부시', false),
    ('경기도', '41171', '안양시만안구', false),
    ('경기도', '41173', '안양시동안구', false),
    ('경기도', '41190', '부천시', false),
    ('경기도', '41210', '광명시', false),
    ('경기도', '41220', '평택시', false),
    ('경기도', '41250', '동두천시', false),
    ('경기도', '41271', '안산시상록구', false),
    ('경기도', '41273', '안산시단원구', false),
    ('경기도', '41281', '고양시덕양구', false),
    ('경기도', '41285', '고양시일산동구', false),
    ('경기도', '41287', '고양시일산서구', false),
    ('경기도', '41290', '과천시', false),
    ('경기도', '41310', '구리시', false),
    ('경기도', '41360', '남양주시', false),
    ('경기도', '41370', '오산시', false),
    ('경기도', '41390', '시흥시', false),
    ('경기도', '41410', '군포시', false),
    ('경기도', '41430', '의왕시', false),
    ('경기도', '41450', '하남시', false),
    ('경기도', '41461', '용인시처인구', false),
    ('경기도', '41463', '용인시기흥구', false),
    ('경기도', '41465', '용인시수지구', false),
    ('경기도', '41480', '파주시', false),
    ('경기도', '41500', '이천시', false),
    ('경기도', '41550', '안성시', false),
    ('경기도', '41570', '김포시', false),
    ('경기도', '41590', '화성시', false),
    ('경기도', '41610', '광주시', false),
    ('경기도', '41630', '양주시', false),
    ('경기도', '41650', '포천시', false),
    ('경기도', '41670', '여주시', false),
    ('경기도', '41800', '연천군', false),
    ('경기도', '41820', '가평군', false),
    ('경기도', '41830', '양평군', false),
    ('경상남도', '48121', '창원시 의창구', false),
    ('경상남도', '48123', '창원시 성산구', false),
    ('경상남도', '48125', '창원시 마산합포구', false),
    ('경상남도', '48127', '창원시 마산회원구', false),
    ('경상남도', '48129', '창원시 진해구', false),
    ('경상남도', '48170', '진주시', false),
    ('경상남도', '48220', '통영시', false),
    ('경상남도', '48240', '사천시', false),
    ('경상남도', '48250', '김해시', false),
    ('경상남도', '48270', '밀양시', false),
    ('경상남도', '48310', '거제시', false),
    ('경상남도', '48330', '양산시', false),
    ('경상남도', '48720', '의령군', false),
    ('경상남도', '48730', '함안군', false),
    ('경상남도', '48740', '창녕군', false),
    ('경상남도', '48820', '고성군', false),
    ('경상남도', '48840', '남해군', false),
    ('경상남도', '48850', '하동군', false),
    ('경상남도', '48860', '산청군', false),
    ('경상남도', '48870', '함양군', false),
    ('경상남도', '48880', '거창군', false),
    ('경상남도', '48890', '합천군', false),
    ('경상북도', '47111', '포항시 남구', false),
    ('경상북도', '47113', '포항시 북구', false),
    ('경상북도', '47130', '경주시', false),
    ('경상북도', '47150', '김천시', false),
    ('경상북도', '47170', '안동시', false),
    ('경상북도', '47190', '구미시', false),
    ('경상북도', '47210', '영주시', false),
    ('경상북도', '47230', '영천시', false),
    ('경상북도', '47250', '상주시', false),
    ('경상북도', '47280', '문경시', false),
    ('경상북도', '47290', '경산시', false),
    ('경상북도', '47720', '군위군', false),
    ('경상북도', '47730', '의성군', false),
    ('경상북도', '47750', '청송군', false),
    ('경상북도', '47760', '영양군', false),
    ('경상북도', '47770', '영덕군', false),
    ('경상북도', '47820', '청도군', false),
    ('경상북도', '47830', '고령군', false),
    ('경상북도', '47840', '성주군', false),
    ('경상북도', '47850', '칠곡군', false),
    ('경상북도', '47900', '예천군', false),
    ('경상북도', '47920', '봉화군', false),
    ('경상북도', '47930', '울진군', false),
    ('경상북도', '47940', '울릉군', false),
    ('광주광역시', '29110', '동구', false),
    ('광주광역시', '29140', '서구', false),
    ('광주광역시', '29155', '남구', false),
    ('광주광역시', '29170', '북구', false),
    ('광주광역시', '29200', '광산구', false),
    ('대구광역시', '27110', '중구', false),
    ('대구광역시', '27140', '동구', false),
    ('대구광역시', '27170', '서구', false),
    ('대구광역시', '27200', '남구', false),
    ('대구광역시', '27230', '북구', false),
    ('대구광역시', '27260', '수성구', false),
    ('대구광역시', '27290', '달서구', false),
    ('대구광역시', '27710', '달성군', false),
    ('대전광역시', '30110', '동구', false),
    ('대전광역시', '30140', '중구', false),
    ('대전광역시', '30170', '서구', false),
    ('대전광역시', '30200', '유성구', false),
    ('대전광역시', '30230', '대덕구', false),
    ('부산광역시', '26110', '중구', false),
    ('부산광역시', '26140', '서구', false),
    ('부산광역시', '26170', '동구', false),
    ('부산광역시', '26230', '부산진구', false),
    ('부산광역시', '26260', '동래구', false),
    ('부산광역시', '26290', '남구', false),
    ('부산광역시', '26320', '북구', false),
    ('부산광역시', '26350', '해운대구', false),
    ('부산광역시', '26380', '사하구', false),
    ('부산광역시', '26410', '금정구', false),
    ('부산광역시', '26440', '강서구', false),
    ('부산광역시', '26470', '연제구', false),
    ('부산광역시', '26500', '수영구', false),
    ('부산광역시', '26530', '사상구', false),
    ('부산광역시', '26710', '기장군', false),
    ('서울특별시', '11110', '종로구', false),
    ('서울특별시', '11140', '중구', false),
    ('서울특별시', '11170', '용산구', false),
    ('서울특별시', '11200', '성동구', false),
    ('서울특별시', '11215', '광진구', false),
    ('서울특별시', '11230', '동대문구', false),
    ('서울특별시', '11260', '중랑구', false),
    ('서울특별시', '11290', '성북구', false),
    ('서울특별시', '11305', '강북구', false),
    ('서울특별시', '11320', '도봉구', false),
    ('서울특별시', '11350', '노원구', false),
    ('서울특별시', '11380', '은평구', false),
    ('서울특별시', '11410', '서대문구', false),
    ('서울특별시', '11440', '마포구', false),
    ('서울특별시', '11470', '양천구', false),
    ('서울특별시', '11500', '강서구', false),
    ('서울특별시', '11530', '구로구', false),
    ('서울특별시', '11545', '금천구', false),
    ('서울특별시', '11560', '영등포구', false),
    ('서울특별시', '11590', '동작구', false),
    ('서울특별시', '11620', '관악구', false),
    ('서울특별시', '11650', '서초구', false),
    ('서울특별시', '11680', '강남구', false),
    ('서울특별시', '11710', '송파구', false),
    ('서울특별시', '11740', '강동구', false),
    ('세종특별자치시', '36110', '세종특별자치시', false),
    ('울산광역시', '31110', '중구', false),
    ('울산광역시', '31140', '남구', false),
    ('울산광역시', '31170', '동구', false),
    ('울산광역시', '31200', '북구', false),
    ('울산광역시', '31710', '울주군', false),
    ('인천광역시', '28110', '중구', false),
    ('인천광역시', '28140', '동구', false),
    ('인천광역시', '28177', '미추홀구', false),
    ('인천광역시', '28185', '연수구', false),
    ('인천광역시', '28200', '남동구', false),
    ('인천광역시', '28237', '부평구', false),
    ('인천광역시', '28245', '계양구', false),
    ('인천광역시', '28260', '서구', false),
    ('인천광역시', '28710', '강화군', false),
    ('인천광역시', '28720', '옹진군', false),
    ('전라남도', '46110', '목포시', false),
    ('전라남도', '46130', '여수시', false),
    ('전라남도', '46150', '순천시', false),
    ('전라남도', '46170', '나주시', false),
    ('전라남도', '46230', '광양시', false),
    ('전라남도', '46710', '담양군', false),
    ('전라남도', '46720', '곡성군', false),
    ('전라남도', '46730', '구례군', false),
    ('전라남도', '46770', '고흥군', false),
    ('전라남도', '46780', '보성군', false),
    ('전라남도', '46790', '화순군', false),
    ('전라남도', '46800', '장흥군', false),
    ('전라남도', '46810', '강진군', false),
    ('전라남도', '46820', '해남군', false),
    ('전라남도', '46830', '영암군', false),
    ('전라남도', '46840', '무안군', false),
    ('전라남도', '46860', '함평군', false),
    ('전라남도', '46870', '영광군', false),
    ('전라남도', '46880', '장성군', false),
    ('전라남도', '46890', '완도군', false),
    ('전라남도', '46900', '진도군', false),
    ('전라남도', '46910', '신안군', false),
    ('전라북도', '45111', '전주시완산구', false),
    ('전라북도', '45113', '전주시덕진구', false),
    ('전라북도', '45130', '군산시', false),
    ('전라북도', '45140', '익산시', false),
    ('전라북도', '45180', '정읍시', false),
    ('전라북도', '45190', '남원시', false),
    ('전라북도', '45210', '김제시', false),
    ('전라북도', '45710', '완주군', false),
    ('전라북도', '45720', '진안군', false),
    ('전라북도', '45730', '무주군', false),
    ('전라북도', '45740', '장수군', false),
    ('전라북도', '45750', '임실군', false),
    ('전라북도', '45770', '순창군', false),
    ('전라북도', '45790', '고창군', false),
    ('전라북도', '45800', '부안군', false),
    ('충청남도', '44131', '천안시동남구', false),
    ('충청남도', '44133', '천안시서북구', false),
    ('충청남도', '44150', '공주시', false),
    ('충청남도', '44180', '보령시', false),
    ('충청남도', '44200', '아산시', false),
    ('충청남도', '44210', '서산시', false),
    ('충청남도', '44230', '논산시', false),
    ('충청남도', '44250', '계룡시', false),
    ('충청남도', '44270', '당진시', false),
    ('충청남도', '44710', '금산군', false),
    ('충청남도', '44760', '부여군', false),
    ('충청남도', '44770', '서천군', false),
    ('충청남도', '44790', '청양군', false),
    ('충청남도', '44800', '홍성군', false),
    ('충청남도', '44810', '예산군', false),
    ('충청남도', '44825', '태안군', false),
    ('충청북도', '43111', '청주시 상당구', false),
    ('충청북도', '43112', '청주시 서원구', false),
    ('충청북도', '43113', '청주시 흥덕구', false),
    ('충청북도', '43114', '청주시 청원구', false),
    ('충청북도', '43130', '충주시', false),
    ('충청북도', '43150', '제천시', false),
    ('충청북도', '43720', '보은군', false),
    ('충청북도', '43730', '옥천군', false),
    ('충청북도', '43740', '영동군', false),
    ('충청북도', '43745', '증평군', false),
    ('충청북도', '43750', '진천군', false),
    ('충청북도', '43760', '괴산군', false),
    ('충청북도', '43770', '음성군', false),
    ('충청북도', '43800', '단양군', false)
    ON CONFLICT (sigungu_cd) DO NOTHING;
  `;



  const client = await pool.connect();

  try {
    await client.query(mainServiceTable);
    await client.query(usersTable);
    await client.query(operationLogTable);

    
    await client.query(severityTable);
    await client.query(serviceTypeTable);
    await client.query(eventTypeTable);
    
    await client.query(warningBoardTable);
    
    await client.query(vmsTable);
    await client.query(cameraTable);
    await client.query(outsideCameraTable);
    
    await client.query(sopTable);
    await client.query(sopStageTable);
    await client.query(falseAlarmTable);
    await client.query(eventLogTable);
    await client.query(vehicleNumTable);
    await client.query(mapBoundaryControlTable);
    await client.query(mainSettingTable);
    await client.query(initialMapLocationTable);

    await client.query(eventLogPartialIndex);
    
    await client.query('BEGIN');

    await client.query(defaultMainSettings);
    await client.query(defaultUserInsert);
    await client.query(defaultSeverityInsert);
    await client.query(defaultServiceTypeInsert);
    await client.query(defaultEventTypeInsert);
    await client.query(defaultMainServiceInsert);
    await client.query(defaultInitialLocationInsert);
    await client.query(defaultMapBoundaryControlSetting);
    
    await client.query('COMMIT'); 

  } catch (error) {
    logger.info('db/query/commonDBmanager.js, createTables, error: ', error);
    console.log('db/query/commonDBmanager.js, createTables, error: ', error);
    await client.query('ROLLBACK'); 
  } finally {
    await client.release();
  }
}
