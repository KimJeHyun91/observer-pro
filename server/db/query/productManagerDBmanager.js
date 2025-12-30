const { pool } = require('../postgresqlPool');
const logger = require('../../logger');

exports.createTables = async () => {

    const createProductTable = `
        CREATE TABLE IF NOT EXISTS product (
            idx SERIAL NOT NULL PRIMARY KEY
            , device_identifier JSONB NOT NULL UNIQUE
            , device_name TEXT
            , device_ip TEXT
            , service_type TEXT NOT NULL
            , device_type TEXT NOT NULL
            , vendor TEXT
            , model_name TEXT
            , model_number TEXT
            , firmware_version TEXT
            , location TEXT
            , notes JSONB
            , installation_date DATE NULL
            , maintenance_end_date DATE NULL
            , created_at TIMESTAMP NOT NULL DEFAULT NOW()
            , updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `;

    const createMaintenanceHistoryTable = `
        CREATE TABLE IF NOT EXISTS maintenance_history (
            idx SERIAL NOT NULL PRIMARY KEY
            , title TEXT NOT NULL
            , service_request_date DATE
            , visit_date DATE NOT NULL
            , worker_name TEXT NOT NULL
            , department TEXT NOT NULL
            , work_detail TEXT NOT NULL
            , notes TEXT
            , isDelete BOOLEAN NOT NULL DEFAULT FALSE
            , created_at TIMESTAMP NOT NULL DEFAULT NOW()
            , updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `;

    const createFieldTable = `
        CREATE TABLE IF NOT EXISTS field (
            idx SERIAL NOT NULL PRIMARY KEY
            , completion_date DATE
            , field_manager_name TEXT
            , related_companies TEXT
            , created_at TIMESTAMP NOT NULL DEFAULT NOW()
            , updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        ); 
    `;

    const insertField = `
        INSERT INTO field
            (completion_date, field_manager_name, related_companies)
        SELECT
            NULL, NULL, NULL
        WHERE
            (SELECT COUNT(*) FROM field) = 0;     
        ;
    `;

    const createProductDeviceIdentifierIndex = `
        CREATE INDEX IF NOT EXISTS idx_product_device_identifier_gin 
        ON product 
        USING GIN (device_identifier);
    `;

    const createUpdateUpdatedAtTrigger = `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `;

    const dropProductUpdateUpdatedAtTrigger = `
        DROP TRIGGER IF EXISTS update_product_updated_at
        ON product
    `;

    const createProductUpdateUpdatedAtTrigger = `
        CREATE TRIGGER update_product_updated_at
        BEFORE UPDATE ON product
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    const dropMaintenanceHistoryUpdateUpdatedAtTrigger = `
        DROP TRIGGER IF EXISTS update_maintenance_history_updated_at
        ON maintenance_history
    `;

    const createMaintenanceHistoryUpdateUpdatedAtTrigger = `
        CREATE TRIGGER update_maintenance_history_updated_at
        BEFORE UPDATE ON maintenance_history
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    const dropFieldUpdateUpdatedAtTrigger = `
        DROP TRIGGER IF EXISTS update_field_updated_at
        ON field
    `;    

    const createFieldUpdateUpdatedAtTrigger = `
        CREATE TRIGGER update_field_updated_at
        BEFORE UPDATE ON field
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    const createAllDevicesView = `
        CREATE OR REPLACE VIEW all_devices_view AS

        SELECT
            json_build_object(
                'table', 'fl_billboard', 
                'key', json_build_object(
                    'idx', idx
                )
            ) AS device_identifier
            , NULL AS device_name
            , NULLIF(billboard_ip, '') AS device_ip
            , '침수' AS service_type
            , '전광판' AS device_type
            , NULL AS location
            , created_at
        FROM
            fl_billboard

        UNION ALL

        SELECT
            json_build_object(
                'table', 'fl_water_level', 
                'key', json_build_object(
                    'idx', idx
                )
            ) AS device_identifier
            , NULLIF(water_level_name, '') AS device_name
            , NULLIF(water_level_ip, '') AS device_ip
            , '침수' AS service_type
            , '수위계' AS device_type
            , water_level_location AS location
            , created_at
        FROM
            fl_water_level

        UNION ALL

        SELECT
            json_build_object(
                'table', 'fl_speaker', 
                'key', json_build_object(
                    'idx', idx
                )
            ) AS device_identifier
            , NULL AS device_name
            , NULLIF(speaker_ip, '') AS device_ip
            , '침수' AS service_type
            , '스피커' AS device_type
            , NULL AS location
            , created_at
        FROM
            fl_speaker
        
        UNION ALL

        SELECT
            json_build_object(
                'table', 'fl_guardianlite', 
                'key', json_build_object(
                    'guardianlite_ip', guardianlite_ip
                )
            ) AS device_identifier
            , NULL AS device_name
            , NULLIF(guardianlite_ip, '') AS device_ip
            , '침수' AS service_type
            , '가디언라이트' AS device_type
            , NULL AS location
            , created_at
        FROM
            fl_guardianlite

        UNION ALL

        SELECT
            json_build_object(
                'table', 'fl_outside', 
                'key', json_build_object(
                    'idx', idx
                )
            ) AS device_identifier
            , NULLIF(outside_name, '') AS device_name
            , NULLIF(crossing_gate_ip, '') AS device_ip
            , '침수' AS service_type
            , '차단기' AS device_type
            , NULLIF(location, '') AS location
            , created_at
        FROM
            fl_outside

        UNION ALL

        SELECT
            json_build_object(
                'table', 'ob_camera', 
                'key', json_build_object(
                    'camera_id', NULLIF(camera_id, ''), 
                    'vms_name', NULLIF(vms_name, ''), 
                    'main_service_name', NULLIF(main_service_name, '')
                )
            ) AS device_identifier
            , NULLIF(camera_name, '') AS device_name
            , NULLIF(camera_ip, '') AS device_ip
            , CASE
                WHEN main_service_name = 'origin' THEN '오리진'
                WHEN main_service_name = 'inundation' THEN '침수'
                WHEN main_service_name = 'parking' THEN '주차'
                WHEN main_service_name = 'tunnel' THEN '터널'
                ELSE '기타'
            END AS service_type
            , '카메라' AS device_type
            , NULL AS location
            , created_at
        FROM
            ob_camera

        UNION ALL

        SELECT
            json_build_object(
                'table', 'ob_device', 
                'key', json_build_object(
                    'idx', idx
                )
            ) AS device_identifier
            , NULLIF(device_name, '') AS device_name
            , NULLIF(device_ip, '') AS device_ip
            , '오리진' AS service_type
            , CASE
                WHEN device_type = 'acu' THEN 'ACU'
                WHEN device_type = 'door' THEN '출입문'
                WHEN device_type = 'ebell' THEN '비상벨'
                WHEN device_type = 'pids' THEN 'PIDS'
                ELSE '기타'
            END AS device_type
            , NULLIF(device_location, '') AS location
            , created_at
        FROM
            ob_device

        UNION ALL

        SELECT
            json_build_object(
                'table', 'ob_guardianlite', 
                'key', json_build_object(
                    'guardianlite_ip', guardianlite_ip
                )
            ) AS device_identifier
            , NULLIF(guardianlite_name, '') AS device_name
            , NULLIF(guardianlite_ip, '') AS device_ip
            , '오리진' AS service_type
            , '가디언라이트' AS device_type
            , NULL AS location
            , created_at
        FROM
            ob_guardianlite

        UNION ALL

        SELECT
            json_build_object(
                'table', 'tm_water_level', 
                'key', json_build_object(
                    'idx', idx
                )
            ) AS device_identifier
            , NULLIF(water_level_name, '') AS device_name
            , NULLIF(water_level_ip, '') AS device_ip
            , '터널' AS service_type
            , '수위계' AS device_type
            , NULLIF(water_level_location, '') AS location
            , created_at
        FROM
            tm_water_level

        UNION ALL
        
        SELECT
            json_build_object(
                'table', 'tm_guardianlite', 
                'key', json_build_object(
                    'guardianlite_ip', guardianlite_ip
                )
            ) AS device_identifier
            , NULL AS device_name
            , NULLIF(guardianlite_ip, '') AS device_ip
            , '터널' AS service_type
            , '가디언라이트' AS device_type
            , NULL AS location
            , created_at
        FROM
            tm_guardianlite

        UNION ALL

        SELECT
            json_build_object(
                'table', 'tm_outside', 
                'key', json_build_object(
                    'idx', idx
                )
            ) AS device_identifier
            , NULLIF(outside_name, '') AS device_name
            , NULLIF(barrier_ip, '') AS device_ip
            , '터널' AS service_type
            , '차단기' AS device_type
            , NULLIF(location, '') AS location
            , created_at
        FROM
            tm_outside

        UNION ALL

        SELECT
            json_build_object(
                'table', 'tm_billboard', 
                'key', json_build_object(
                    'idx', idx
                )
            ) AS device_identifier
            , NULLIF(billboard_name, '') AS device_name
            , NULLIF(billboard_ip, '') AS device_ip
            , '터널' AS service_type
            , '전광판' AS device_type
            , NULL AS location
            , created_at
        FROM
            tm_billboard
            
        UNION ALL

        SELECT
            json_build_object(
                'table', 'pm_device', 
                'key', json_build_object(
                    'idx', idx
                )
            ) AS device_identifier
            , NULLIF(device_no16, '') AS device_name
            , NULLIF(device_ip, '') AS device_ip
            , '주차' AS service_type
            , CASE
                WHEN device_type = 'sensor' THEN '센서'
                ELSE '기타'
            END AS device_type
            , NULLIF(device_location, '') AS location
            , created_at
        FROM
            pm_device

        UNION ALL

        SELECT
            json_build_object(
                'table', 'pf_crossing_gate', 
                'key', json_build_object(
                    'idx', idx
                )
            ) AS device_identifier
            , NULLIF(crossing_gate_ip || ':' || crossing_gate_port, ':') AS device_name
            , NULLIF(crossing_gate_ip, '') AS device_ip
            , '주차' AS service_type
            , '차단기' AS device_type
            , NULLIF(location, '') AS location
            , created_at
        FROM
            pf_crossing_gate
    `;

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        // 테이블 생성
        await client.query(createProductTable);
        await client.query(createMaintenanceHistoryTable);
        await client.query(createFieldTable);

        // 데이터 추가
        await client.query(insertField);

        // 인덱스 생성
        await client.query(createProductDeviceIdentifierIndex);

        // 트리거
        await client.query(createUpdateUpdatedAtTrigger);
        await client.query(dropProductUpdateUpdatedAtTrigger);
        await client.query(createProductUpdateUpdatedAtTrigger);
        await client.query(dropMaintenanceHistoryUpdateUpdatedAtTrigger);
        await client.query(createMaintenanceHistoryUpdateUpdatedAtTrigger);
        await client.query(dropFieldUpdateUpdatedAtTrigger);
        await client.query(createFieldUpdateUpdatedAtTrigger);

        // 뷰
        await client.query(createAllDevicesView);

        await client.query('COMMIT');
        
    } catch (error) {

        await client.query('ROLLBACK');

        logger.error('db/query/productManagerDBmanager.js, createTables, error: ', error);

    } finally {

        client.release();

    }

}