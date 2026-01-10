/**
 * [Database Initialization Script]
 * node-pg-migrate 의존성 없이 pg 라이브러리를 사용하여 직접 스키마를 생성합니다.
 * * 실행 방법:
 * 1. npm install pg
 * 2. DB 접속 정보 설정 (환경변수 또는 코드 상단 config 수정)
 * 3. node init_db.js
 */

const { pool } = require('../db/postgresqlPool');
const logger = require('../logger');

async function initParkingFeeDbSchema() {
    logger.info('🚀 [ParkingFeeServer] DB 스키마 초기화 시작...');
    
    const client = await pool.connect();
    logger.info('✅ [ParkingFeeServer] DB 연결 성공');

    try {

        await client.query('BEGIN');
        
        // =================================================================
        // 0. 확장 모듈 및 유틸리티 함수 설정
        // =================================================================
        // await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
        
        // pg_partman 설정
        // await client.query(`CREATE EXTENSION IF NOT EXISTS pg_partman;`);
        // await client.query(`CREATE SCHEMA IF NOT EXISTS partman;`);
        // await client.query(`CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA partman;`);

        // UUID v7 생성 함수
        await client.query(`
            CREATE OR REPLACE FUNCTION uuid_generate_v7()
            RETURNS uuid
            AS $$
            DECLARE
              unix_time_ms bytea;
              uuid_bytes bytea;
            BEGIN
              unix_time_ms = int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint);
              uuid_bytes = uuid_send(gen_random_uuid());
              uuid_bytes = overlay(uuid_bytes placing substring(unix_time_ms from 3) from 1 for 6);
              uuid_bytes = set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
              uuid_bytes = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
              RETURN encode(uuid_bytes, 'hex')::uuid;
            END
            $$ LANGUAGE plpgsql VOLATILE;
        `);

        // Updated_at 트리거 함수
        await client.query(`
            CREATE OR REPLACE FUNCTION update_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // =================================================================
        // 1. pf_sites (주차장 사이트)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_sites (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),

                name TEXT NOT NULL UNIQUE,  -- 주차장 이름
                description TEXT,           -- 주차장 설명
                code TEXT,                  -- 주차장 코드

                manager_name TEXT,  -- 담당자 이름
                manager_phone TEXT, -- 담당자 연락처  

                phone TEXT,             -- 주차장 연락처
                zip_code TEXT,          -- 우편번호
                address_base TEXT,      -- 기본 주소
                address_detail TEXT,    -- 상세 주소
                
                total_capacity INTEGER DEFAULT 0 NOT NULL,  -- 전체 수용량

                --세부 면수 정보 (JSONB)
                --general: integer     - 일반 주차면 수
                --disabled: integer    - 장애인 전용 주차면 수 
                --compact: integer     - 경차 전용 주차면 수 
                --ev_slow: integer     - 전기차 완속 충전면 수 
                --ev_fast: integer     - 전기차 급속 충전면 수 
                --women: integer       - 여성 우선/전용 주차면 수 
                capacity_detail JSONB DEFAULT '{}' NOT NULL,

                status TEXT CHECK (status IN ('normal', 'error', 'log')), -- 주차장 상태

                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ
            );
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_sites;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_sites FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 2. pf_zones (구역)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_zones (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                site_id UUID NOT NULL REFERENCES pf_sites(id) ON DELETE CASCADE,

                name TEXT NOT NULL, -- 구역 이름 (예: B1, 1F)
                description TEXT,   -- 구역 설명
                code TEXT,          -- 구역 코드

                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ,

                CONSTRAINT uq_pf_zones_site_name UNIQUE (site_id, name)
            );
            CREATE INDEX IF NOT EXISTS zones_site_id_idx ON pf_zones (site_id);
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_zones;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_zones FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 4. pf_lanes (차선)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_lanes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                zone_id UUID NOT NULL REFERENCES pf_zones(id) ON DELETE CASCADE,

                type TEXT CHECK (type IN ('IN', 'OUT', 'BOTH')),    -- 차선 유형 (IN, OUT, BOTH)

                name TEXT NOT NULL, -- 차선 이름 (예: 정문 입구)
                description TEXT,   -- 차선 설명
                code TEXT,          -- 차선 코드     

                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ,

                CONSTRAINT uq_pf_lanes_zone_name UNIQUE (zone_id, name)
            );
            CREATE INDEX IF NOT EXISTS lanes_zone_id_idx ON pf_lanes (zone_id);
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_lanes;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_lanes FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 5. pf_device_controllers (장비 제어기)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_device_controllers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),

                site_id UUID REFERENCES pf_sites(id) ON DELETE CASCADE,

                type TEXT NOT NULL CHECK (type IN ('SERVER', 'EMBEDDED', 'MIDDLEWARE')),    -- 장비 제어기 유형

                name TEXT NOT NULL,         -- 장비 제어기 이름
                description TEXT,           -- 장비 제어기 설명
                code TEXT,                  -- 장비 제어기 코드

                ip_address INET NOT NULL,       -- 대상 시스템 IP
                port INTEGER NOT NULL,          -- 대상 시스템 포트
                status TEXT DEFAULT 'OFFLINE',  -- 연결 상태

                config JSONB,   -- 추가 설정 (JSON)

                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ,

                CONSTRAINT uq_pf_device_controllers_site_name UNIQUE (site_id, name),
                CONSTRAINT uq_pf_device_controllers_site_network UNIQUE (site_id, ip_address, port)
            );
            CREATE INDEX IF NOT EXISTS device_controllers_site_id_idx ON pf_device_controllers (site_id);
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_device_controllers;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_device_controllers FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 6. pf_devices (물리적 장비)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_devices (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                site_id UUID REFERENCES pf_sites(id) ON DELETE CASCADE,
                zone_id UUID REFERENCES pf_zones(id) ON DELETE CASCADE,
                lane_id UUID REFERENCES pf_lanes(id) ON DELETE CASCADE,
                device_controller_id UUID REFERENCES pf_device_controllers(id) ON DELETE CASCADE,

                parent_device_id UUID REFERENCES pf_devices(id) ON DELETE CASCADE,  -- 상위 장비 ID
                
                type TEXT NOT NULL CHECK (type IN ('INTEGRATED_GATE','BARRIER', 'LPR', 'LED', 'KIOSK', 'LOOP')),    -- 장비 유형

                name TEXT NOT NULL, -- 장비 이름
                description TEXT,   -- 장비 설명
                code TEXT,          -- 장비 코드

                vendor TEXT,            -- 장비 제조사 (예: Techwin, Hikvision)
                model_name TEXT,        -- 장비 모델명
                ip_address INET,        -- 장비 IP 주소
                port INTEGER,           -- 장비 포트 번호
                mac_address TEXT,       -- 장비 MAC 주소
                connection_type TEXT,   -- 장비 통신 유형 (예: TCP/IP, Serial(RS232/485), HTTP)    
                serial_number TEXT,     -- 제조 시리얼  
                firmware_version TEXT,  -- 펌웨어 버전
                direction TEXT,         -- 장비 방향  
                location TEXT,          -- 설치 위치

                status TEXT DEFAULT 'UNKNOWN',  -- 장비 연결 상태 (ONLINE/OFFLINE)    
                last_heartbeat TIMESTAMPTZ,     -- 마지막 상태 확인 시간

                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ,

                CONSTRAINT uq_pf_devices_site_name UNIQUE (site_id, name),
                CONSTRAINT uq_pf_devices_site_network UNIQUE (site_id, ip_address, port),
                CONSTRAINT uq_pf_devices_controller_name UNIQUE (device_controller_id, name)
            );
            CREATE INDEX IF NOT EXISTS devices_site_id_idx ON pf_devices (site_id);
            CREATE INDEX IF NOT EXISTS devices_zone_id_idx ON pf_devices (zone_id);
            CREATE INDEX IF NOT EXISTS devices_lane_id_idx ON pf_devices (lane_id);
            CREATE INDEX IF NOT EXISTS devices_controller_id_idx ON pf_devices (device_controller_id);
            CREATE INDEX IF NOT EXISTS devices_parent_id_idx ON pf_devices (parent_device_id);
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_devices;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_devices FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 7. pf_policies (정책)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_policies (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                site_id UUID REFERENCES pf_sites(id) ON DELETE CASCADE,

                type TEXT NOT NULL CHECK (type IN ('FEE', 'DISCOUNT', 'MEMBERSHIP', 'BLACKLIST', 'HOLIDAY')),   -- 정책 유형

                name TEXT NOT NULL, -- 정책 이름
                description TEXT,   -- 정책 설명
                code TEXT,          -- 정책 코드

                -- 정책 설정 (JSONB)
                -- 
                -- 요금 정책
                -- base_time_minutes: integer     - 기본 시간(분)
                -- base_fee: inetger             - 기본 요금(원)
                -- unit_time_minutes: integer     - 추가 단위 시간(분)
                -- unit_fee: integer             - 추가 단위 요금(원)
                -- grace_time_minutes: integer    - 회차 유예 시간(분)
                -- daily_max_fee: integer         - 일일 최대 요금(원)
                -- 
                -- 할인 정책
                -- discount_type: string     - 할인 종류(PERCENT, FIXED_AMOUNT, FREE_TIME)
                -- discount_value: integer   - 할인 값(%, 원, 분)
                -- discount_method: string   - 할인 방식(AUTO, MANUAL)
                --           
                -- 휴일 정책
                -- holiday_id: uuid            - 휴일 ID
                -- holiday_fee_policy_id: uuid - 휴일 요금 정책 ID
                --
                -- 블랙 리스트 정책
                -- blacklist_action: string - 실행 설정(BLOCK, WARN)
                --
                -- 회원 정책
                -- membership_fee: integer              - 회원 요금(원)
                -- membership_validity_days: integer    - 회원 적용 기간(일)
                config JSONB NOT NULL,

                is_system BOOLEAN DEFAULT false,    -- 시스템 정책 여부

                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ,

                CONSTRAINT uq_pf_policies_site_name UNIQUE (site_id, name)
            );
            CREATE INDEX IF NOT EXISTS policies_site_id_idx ON pf_policies (site_id);
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_policies;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_policies FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 8. pf_members (회원)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_members (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                site_id UUID REFERENCES pf_sites(id) ON DELETE CASCADE,

                car_number TEXT NOT NULL,   -- 차량 번호

                name TEXT,          -- 회원 이름
                description TEXT,   -- 회원 설명
                code TEXT,          -- 회원 코드

                phone_encrypted TEXT,   -- 연락처
                phone_last_digits TEXT, -- 연락처 마스킹
                phone_hash TEXT,        -- 연락처 해쉬

                group_name TEXT,    -- 그룹
                note TEXT,          -- 메모

                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ,

                CONSTRAINT uq_pf_members_site_car_number UNIQUE (site_id, car_number)
            );
            CREATE INDEX IF NOT EXISTS members_site_id_idx ON pf_members (site_id);
            CREATE INDEX IF NOT EXISTS members_car_number_idx ON pf_members (car_number);
            CREATE INDEX IF NOT EXISTS members_phone_hash_idx ON pf_members (phone_hash);
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_members;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_members FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 8-1. pf_member_payment_histories (회원 결제 기록)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_member_payment_histories (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),

                car_number TEXT NOT NULL,

                member_id UUID NOT NULL,
                member_name TEXT NOT NULL,
                member_code TEXT,
                member_phone TEXT,
                
                policy_id UUID NOT NULL,
                policy_name TEXT NOT NULL,
                policy_code TEXT,

                amount INTEGER NOT NULL,                            -- 실제 결재 금액
                payment_method TEXT NOT NULL DEFAULT 'CASH',        -- 결제 수단(CARD, CASH, TRANSFER)
                payment_status TEXT NOT NULL DEFAULT 'SUCCESS',     -- 결제 상태(SUCCESS, CANCELED, FAILED)
                note TEXT,                                          -- 메모    

                start_date DATE NOT NULL,   -- 등록 시작일
                end_date DATE NOT NULL,     -- 등록 종료일

                paid_at TIMESTAMPTZ,    -- 결제 시각

                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ
            );
            CREATE INDEX IF NOT EXISTS member_payment_histories_member_id_idx ON pf_member_payment_histories (member_id);
            CREATE INDEX IF NOT EXISTS member_payment_histories_paid_at_idx ON pf_member_payment_histories (paid_at);
            CREATE INDEX IF NOT EXISTS member_payment_histories_dates_idx ON pf_member_payment_histories (start_date, end_date);
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_member_payment_histories;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_member_payment_histories FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 9. pf_blacklists (블랙리스트)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_blacklists (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                site_id UUID NOT NULL REFERENCES pf_sites(id) ON DELETE CASCADE,

                car_number TEXT NOT NULL,   -- 차량 번호
                reason TEXT,                -- 제한 사유

                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ,

                CONSTRAINT uq_pf_blacklists_site_car_number UNIQUE (site_id, car_number)
            );
            CREATE INDEX IF NOT EXISTS blacklists_site_id_idx ON pf_blacklists (site_id);
            CREATE INDEX IF NOT EXISTS blacklists_car_number_idx ON pf_blacklists (car_number);
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_blacklists;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_blacklists FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 10. pf_holidays (휴일 관리)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_holidays (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                site_id UUID REFERENCES pf_sites(id) ON DELETE CASCADE,

                name TEXT NOT NULL, -- 휴일 명칭
                description TEXT,   -- 휴일 설명
                code TEXT,          -- 휴일 코드

                date DATE NOT NULL,                 -- 날짜
                is_recurring BOOLEAN DEFAULT false, -- 매년 반복 여부

                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ,

                CONSTRAINT uq_pf_holidays_site_date UNIQUE (site_id, date)
            );
            CREATE INDEX IF NOT EXISTS holidays_site_id_idx ON pf_holidays (site_id);
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_holidays;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_holidays FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 11. pf_parking_sessions (주차 세션 - 파티션 테이블)
        // =================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_parking_sessions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                site_id UUID NOT NULL,
                site_name TEXT NOT NULL,
                site_code TEXT,

                entry_zone_id UUID,     -- 입차 구역 ID
                entry_zone_name TEXT,   -- 입차 구역 이름
                entry_zone_code TEXT,   -- 입차 구역 코드
                entry_lane_id UUID,     -- 입차 차선 ID
                entry_lane_name TEXT,   -- 입차 차선 이름
                entry_lane_code TEXT,   -- 입차 차선 코드
                entry_time TIMESTAMPTZ, -- 입차 시각     
                entry_image_url TEXT,   -- 입차 이미지 URL   
        
                pre_settled_at TIMESTAMPTZ, -- 사전 정산 시각 (유예 시간 계산 및 추가 과금 판단용)
        
                exit_zone_id UUID,      -- 출차 구역 ID
                exit_zone_name TEXT,    -- 출차 구역 이름
                exit_zone_code TEXT,    -- 출차 구역 코드
                exit_lane_id UUID,      -- 출차 차선 ID
                exit_lane_name TEXT,    -- 출차 차선 이름
                exit_lane_code TEXT,    -- 출차 차선 코드
                exit_time TIMESTAMPTZ,  -- 출차 시각     
                exit_image_url TEXT,    -- 출차 이미지 URL   
        
                car_number TEXT NOT NULL,           -- 차량 번호 (미인식 시 'UNKNOWN' 등으로 저장)
                vehicle_type TEXT DEFAULT 'NORMAL', -- 차량 유형 (NORMAL, MEMBER, COMPACT, ELECTRIC)
                duration INTEGER DEFAULT 0,         -- 주차 시간 (분)
        
                total_fee INTEGER DEFAULT 0,    -- 전체 요금(원)    
                discount_fee INTEGER DEFAULT 0, -- 할인 요금(원)
                paid_fee INTEGER DEFAULT 0,     -- 지불 요금(원)
        
                -- 적용된 할인 상세 (JSONB)
                -- policy_id: uuid  - 할인 정책 ID
                -- code: string     - 할인 코드
                -- name: string     - 할인 이름
                -- type: string     - 할인 종류(PERCENT, FIXED_AMOUNT, FREE_TIME)
                -- value: integer   - 할인 값(%, 원, 분)
                -- method: string   - 할인 방식(AUTO, MANUAL)
                -- amount: integer  - 실제 차감액
                -- applied_at: timestamptz  - 적용 시각
                applied_discounts JSONB,
        
                -- 상태
                -- PENDING(입차중)
                -- PRE_SETTLED(사전정산됨)
                -- PAYMENT_PENDING(정산대기)
                -- COMPLETED(출차완료)
                -- UNRECOGNIZED(번호미인식)
                -- CANCELLED(취소/오인식무효화)
                -- RUNAWAY(도주)
                -- FORCE_COMPLETED(강제 출차완료: 관리자 수동 출차완료 처리 또는 출차 기록이 없고 입차 기록만 있는 차량이 재입차 했을 경우 처리를 위해) 
                status TEXT DEFAULT 'PENDING',

                note TEXT, -- 메모
        
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ
            );
            
            CREATE INDEX IF NOT EXISTS idx_parking_sessions_site_id ON pf_parking_sessions (site_id);
            CREATE INDEX IF NOT EXISTS idx_parking_sessions_car_number ON pf_parking_sessions (car_number);
            CREATE INDEX IF NOT EXISTS idx_parking_sessions_status ON pf_parking_sessions (status);
            CREATE INDEX IF NOT EXISTS idx_parking_sessions_entry_time ON pf_parking_sessions (entry_time);
            CREATE INDEX IF NOT EXISTS idx_parking_sessions_exit_time ON pf_parking_sessions (exit_time);
            CREATE INDEX IF NOT EXISTS idx_parking_sessions_discounts ON pf_parking_sessions USING GIN (applied_discounts);
            CREATE INDEX IF NOT EXISTS idx_sessions_site_status ON pf_parking_sessions (site_id, status);
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pf_parking_sessions;
            CREATE TRIGGER trigger_update_timestamp BEFORE UPDATE ON pf_parking_sessions FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        `);

        // =================================================================
        // 12. 로그 테이블 (파티션)
        // =================================================================

        // 12.1 pf_vehicle_detection_logs (차량 감지 로그)
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_vehicle_detection_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                site_id UUID,   -- 사이트 ID
                site_name TEXT, -- 사이트 이름
                site_code TEXT, -- 사이트 코드
                zone_id UUID,   -- 구역 ID
                zone_name TEXT, -- 구역 이름
                zone_code TEXT, -- 구역 코드
                lane_id UUID,   -- 차선 ID
                lane_name TEXT, -- 차선 이름
                lane_code TEXT, -- 차선 코드

                direction TEXT,         -- 입/출차 방향 (in: 입차, out: 출차)
                status TEXT,            -- 상태 (on: 감지, off: 통과)
                event_time TIMESTAMPTZ, -- 감지 시각

                payload JSONB, -- 원본 데이터
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_vehicle_detection_logs_payload ON pf_vehicle_detection_logs USING GIN (payload);
        `);

        // 12.2 pf_payment_logs (결제 로그)
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_payment_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), -- 결제 로그 ID
                site_id UUID NOT NULL,                          -- 사이트 ID
                site_name TEXT NOT NULL,                        -- 사이트 이름
                site_code TEXT,                                 -- 사이트 코드

                category TEXT,                  -- 결제 분류(EXIT, MEMBERSHIP)
                parking_session_id UUID ,       -- 차량 출입 로그 ID
                member_payment_history_id UUID, -- 회원 결제 기록 ID

                device_controller_id UUID,      -- 소속 장비 제어 서비스 ID
                device_controller_name TEXT,    -- 소속 장비 제어 서비스 이름
                device_controller_code TEXT,    -- 소속 장비 제어 서비스 코드

                device_id UUID,     -- 결제 장비 ID
                device_name TEXT,   -- 결제 장비 이름
                device_code TEXT,   -- 결제 장비 코드

                version INTEGER DEFAULT 1 NOT NULL, -- 낙관적 락을 위한 버전 관리 컬럼

                transaction_id UUID,    -- 시스템에서 생성한 거래 식별자
                total_amount INTEGER,   -- 최종 결제 금액
                payment_method TEXT,    -- 결제 수단(CARD, APP, POINT, DISCOUNT, CASH)
                status TEXT,            -- 결제 상태(SUCCESS, FAIL, CANCEL, PENDING)
                paid_at	TIMESTAMPTZ, 	-- 결제 승인 시각

                -- 결제 상세 (JSONB)
                --
                -- 카드 결제
                -- approval_no: integer         - 카드 승인 번호
                -- card_number: text            - 양방향 암호화 한 카드 번호 (취소/환불 시 필요)
                -- card_number_masked: text     - 마스크 처리한 카드 번호 (영수증 출력용)
                -- card_number_hash: text       - 단방향 암호화 한 카드 번호 (동일 카드 재사용 통계, 부정 사용 감지용)
                -- issuer: text                 - 카드사 정보
                -- terminal_id: text            - 단말기 번호
                --
                -- 모바일/앱 결제
                -- pay_provider: text           - 결제 제공사(KAKAO, NAVER 등)          
                payment_details JSONB,

                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_payment_logs_session_id ON pf_payment_logs (parking_session_id);
            CREATE INDEX IF NOT EXISTS idx_payment_logs_transaction_id ON pf_payment_logs (transaction_id);
        `);

        // 12.3 pf_system_event_logs (시스템 이벤트 로그)
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_system_event_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), 
                site_id UUID NOT NULL,      -- 사이트 ID
                site_name TEXT NOT NULL,    -- 사이트 이름
                site_code TEXT,             -- 사이트 코드
                zone_id UUID,               -- 구역 ID
                zone_name TEXT,             -- 구역 이름
                zone_code TEXT,             -- 구역 코드
                lane_id UUID,               -- 차선 ID
                lane_name TEXT,             -- 차선 이름
                lane_code TEXT,             -- 차선 코드

                device_controller_id UUID,    -- 소속 장비 제어기 ID
                device_controller_name TEXT,  -- 소속 장비 제어기 이름
                device_controller_code TEXT,  -- 소속 장비 제어기 코드

                device_id UUID NOT NULL,    -- 장비 ID
                device_name TEXT,           -- 장비 이름
                device_code TEXT,           -- 장비 코드               
                type TEXT NOT NULL,         -- 이벤트 유형
                message TEXT,               -- 이벤트 메시지
                raw_data JSONB,             -- 원본 데이터 (JSON)
                time TIMESTAMPTZ NOT NULL,  -- 발생 시간

                created_at TIMESTAMPTZ DEFAULT NOW()   -- 데이터 생성 일시
            );
            CREATE INDEX IF NOT EXISTS idx_device_event_logs_device_time ON pf_system_event_logs (device_id, time);
            CREATE INDEX IF NOT EXISTS idx_device_event_logs_raw_data ON pf_system_event_logs USING GIN (raw_data);
        `);

        // 12.4 pf_communication_logs (통신 로그)
        await client.query(`
            CREATE TABLE IF NOT EXISTS pf_communication_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
                site_id UUID,   -- 사이트 ID
                site_name TEXT, -- 사이트 이름
                site_code TEXT, -- 사이트 코드

                device_controller_id UUID,      -- 장비 제어기 ID
                device_controller_name TEXT,    -- 장비 제어기 이름
                device_controller_code TEXT,    -- 장비 제어기 코드       

                direction TEXT,             -- 통신 방향 (SEND, RECV)
                path TEXT,                  -- API 경로 또는 커맨드
                payload JSONB,              -- 데이터 본문 (JSON)
                time TIMESTAMPTZ NOT NULL,  -- 통신 시간 (파티션 키)

                status_code INTEGER,        -- HTTP 상태코드 또는 장비 응답코드
                response_time_ms INTEGER,   -- 응답 속도 (성능 모니터링용)
                error_message TEXT,         -- 에러 내용

                created_at TIMESTAMPTZ DEFAULT NOW()       -- 데이터 생성 일시
            );
            CREATE INDEX IF NOT EXISTS idx_communication_logs_time ON pf_communication_logs (time);
            CREATE INDEX IF NOT EXISTS idx_communication_logs_payload ON pf_communication_logs USING GIN (payload);
        `);

        // 12.5 pf_audit_logs (감사 로그)

        // =================================================================
        // 13. [최적화] pg_partman 파티션 자동화 적용
        // =================================================================
        // logger.info(`🛠 [Partitioning] pg_partman 설정 중...`);
        
        // const partmanConfig = [
        //     { parent: 'pf_vehicle_detection_logs', control: 'event_time' },
        //     { parent: 'pf_parking_sessions', control: 'entry_time' },
        //     { parent: 'pf_payment_logs', control: 'paid_at' },
        //     { parent: 'pf_system_event_logs', control: 'time' },
        //     { parent: 'pf_communication_logs', control: 'time' }
        // ];

        // for (const config of partmanConfig) {
        //     // create_parent 함수 호출 (node-pg-migrate와 동일한 로직)
        //     await client.query(`
        //         SELECT create_parent(
        //             p_parent_table => 'public.${config.parent}'::text,
        //             p_control => '${config.control}'::text,
        //             p_interval => '1 month'::text,
        //             p_premake => 2
        //         );
        //     `);
        // }

        logger.info('✅ 전체 스키마 마이그레이션 및 설정이 완료되었습니다 (v3.7 - Final).');

        await client.query('COMMIT');

    } catch (err) {

        logger.error('❌ 스키마 초기화 실패:', err);
        await client.query('ROLLBACK');

    } finally {
    
        if(client){

            client.release();

        }
    
    }
}

module.exports = { initParkingFeeDbSchema };