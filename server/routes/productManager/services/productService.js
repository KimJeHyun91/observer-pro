const logger = require('../../../logger');
const { pool } = require('../../../db/postgresqlPool');
const { createMaintenanceLabel } = require('../../../utils/labelMaker');
const { DAYS_TO_NOTIFY } = require('../../../config');

// 제품 조회(idx)
const findByIdx = async ({ idx }) => {
    
    const client = await pool.connect();

    try {

        const query = `
            SELECT
                *
            FROM
                product
            WHERE
                idx = $1
        `;

        const result = await client.query(query, [idx]);

        return result.rows[0];

    } catch (error) {

        logger.error('routes/productManager/services/productService.js, findByIdx, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 제품 조회(idxList)
const findByIdxList = async ({ idxList }) => {

    const parsedIdxList = idxList.map(idx => parseInt(idx, 10))

    logger.error(typeof parsedIdxList);

    const client = await pool.connect();

    try {

        const query = `
            SELECT
                *
            FROM
                product
            WHERE
                idx = ANY($1)
        `;

        const result = await client.query(query, [parsedIdxList]);

        return result.rows;

    } catch (error) {

        logger.error('routes/productManager/services/productService.js, findByIdxList, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

const findByDeviceIdentifier = async ({ deviceIdentifier }) => {

    const client = await pool.connect();

    try {

        const table = deviceIdentifier.table;
        const key = deviceIdentifier.key;

        const whereClauses = Object.keys(key).map((key, index) => `device_identifier->'key'->>'${key}' = $${index + 2}`);

        const query = `
            SELECT
                *
            FROM
                product
            WHERE
                device_identifier->>'table' = $1 AND ${whereClauses.join(' AND ')}
        `;

        const values = [table, ...Object.values(key)]; 

        const result = await client.query(query, values);

        return result.rows[0];

    } catch (error) {

        logger.error('routes/productManager/services/productService.js, findByDeviceIdentifier, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 제품 수정
exports.modify = async ({ idx, vendor, modelName, modelNumber, firmwareVersion, notes, installationDate, maintenanceEndDate }) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');
        
        const setParts = [];
        const values = [];

        if(vendor !== undefined) {
            setParts.push(`vendor = $${values.length + 1}`);
            values.push(vendor === '' ? null : vendor);
        }

        if(modelName !== undefined) {
            setParts.push(`model_name = $${values.length + 1}`);
            values.push(modelName === '' ? null : modelName);
        }

        if(modelNumber !== undefined) {
            setParts.push(`model_number = $${values.length + 1}`);
            values.push(modelNumber === '' ? null : modelNumber);
        }

        if(firmwareVersion !== undefined) {
            setParts.push(`firmware_version = $${values.length + 1}`);
            values.push(firmwareVersion === '' ? null : firmwareVersion);
        }

        if(notes !== undefined) {
            setParts.push(`notes = $${values.length + 1}`);
            values.push(JSON.stringify(notes));
        }

        if(installationDate !== undefined) {
            setParts.push(`installation_date = $${values.length + 1}`);
            values.push(installationDate === '' ? null : installationDate);
        }

        if(maintenanceEndDate !== undefined) {
            setParts.push(`maintenance_end_date = $${values.length + 1}`);
            values.push(maintenanceEndDate === '' ? null : maintenanceEndDate);
        }

        if (setParts.length === 0) {
            await client.query('COMMIT');
            return true;
        }

        values.push(idx);

        const setClause = setParts.join(', ');

        const query = `
            UPDATE product
            SET ${setClause}
            WHERE idx = $${values.length}
        `;

        const result = await client.query(query, values);

        if(result.rowCount === 0) {
            throw new Error(`제품(idx: ${idx})이 존재하지 않습니다.`);
        }

        await client.query('COMMIT');

        return true;

    } catch (error) {

        await client.query('ROLLBACK');
        logger.error('routes/productManager/services/productService.js, modify, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 제품 일괄수정
exports.bulkModify = async ({ idxList, vendor, firmwareVersion, maintenanceEndDate }) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const updateData = {};

        if(vendor !== undefined) {
            updateData.vendor = vendor === '' ? null : vendor;
        }

        if(firmwareVersion !== undefined) {
            updateData.firmware_version = firmwareVersion === '' ? null : firmwareVersion;
        }

        if(maintenanceEndDate !== undefined) {
            updateData.maintenance_end_date = maintenanceEndDate === '' ? null : maintenanceEndDate;
        }

        const updateFields = Object.keys(updateData);

        if(updateFields.length === 0) {
            await client.query('COMMIT');
            return 'noChange';
        }

        const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const setValues = updateFields.map(field => updateData[field]);

        const wherePlaceholders = idxList.map((_, index) => `$${setValues.length + index + 1}`).join(', ');

        const allValues = [...setValues, ...idxList];

        const query = `
            UPDATE product
            SET ${setClause}
            WHERE idx IN (${wherePlaceholders})
        `;

        const result = await client.query(query, allValues);

        if(result.rowCount !== idxList.length) {
            throw new Error('일괄 수정에 실패했습니다.');
        }
        
        await client.query('COMMIT');

        return true;

    } catch (error) {

        await client.query('ROLLBACK');
        logger.error('routes/productManager/services/productService.js, multipleModify, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 제품 삭제
exports.delete = async ({ idx }) => {

    const client = await pool.connect();

    try {

        // 제품 삭제
        const productQuery = `
            DELETE
            FROM
                product
            WHERE
                idx = $1
            RETURNING
                idx
        `;

        const result = await client.query(productQuery, [idx]);

        return result.rowCount === 1;      

    } catch (error) {

        logger.error('routes/productManager/services/productService.js, delete, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 제품 조회(최신순)
exports.find = async ({ deviceName, location, serviceType, deviceType, idx }) => {

    const client = await pool.connect();

    try {

        await this.syncDevicesAndProducts();

        const conditions = [];
        const values = [];

        if(deviceName) {
            values.push(`%${deviceName}%`);
            conditions.push(`device_name LIKE $${values.length}`);
        }

        if(location) {
            values.push(`%${location}%`);
            conditions.push(`location LIKE $${values.length}`);
        }
        
        if(serviceType) {
            values.push(serviceType);
            conditions.push(`service_type = $${values.length}`);
        }

        if(deviceType) {
            values.push(deviceType);
            conditions.push(`device_type = $${values.length}`);
        }

        if(idx) {
            values.push(`${idx}`);
            conditions.push(`idx = $${values.length}`);
        }

        const whereClauses = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const selectQuery = `
            SELECT 
                idx
                , device_identifier
                , device_name
                , device_ip
                , service_type
                , device_type
                , vendor
                , model_name
                , model_number
                , firmware_version
                , location
                , notes
                , TO_CHAR(installation_date, 'YYYY-MM-DD') AS installation_date
                , TO_CHAR(maintenance_end_date, 'YYYY-MM-DD') AS maintenance_end_date
                , created_at
                , updated_at
            FROM
                product
            ${whereClauses}
            ORDER BY
                installation_date DESC
                , created_at DESC;
        `;

        const result = await client.query(selectQuery, values);

        return result.rows;

    } catch (error) {

        logger.error('routes/productManager/services/productService.js, find, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 제품 조회(제품 요약 정보)(최신순)
exports.findAllWithSummuries = async ({ sortColum, deviceName, serviceType, deviceType, notificationLabel }) => {

    const client = await pool.connect();

    try {

        await this.syncDevicesAndProducts();

        // 동적 CASE문 생성
        const sortedDays = [...DAYS_TO_NOTIFY].sort((a, b) => a - b);
        const whenClause = sortedDays.map(day => {
            if(30 > day) {
                day = 30;
            }
            const label = createMaintenanceLabel(day, 'less');
            return `WHEN maintenance_end_date - CURRENT_DATE <= ${day} THEN '${label}'`;
        }).join('\n');

        const lastDay = sortedDays[sortedDays.length - 1];
        const elseLabel = createMaintenanceLabel(lastDay, 'more');

        const dynamicCaseStatement = `
            CASE
                WHEN maintenance_end_date IS NULL THEN '미입력'
                WHEN maintenance_end_date - CURRENT_DATE < 0 THEN '만료'
                ${whenClause}
                ELSE '${elseLabel}'
            END
        `;

        // WHERE, ORDER BY 절 생성
        const outerWhereConditions = [];
        const values = [];

        if(deviceName) {
            values.push(`%${deviceName}%`);
            outerWhereConditions.push(`device_name Like $${values.length}`);
        }

        if(serviceType) {
            values.push(serviceType);
            outerWhereConditions.push(`service_type = $${values.length}`);
        }

        if(deviceType) {
            values.push(deviceType);
            outerWhereConditions.push(`device_type = $${values.length}`);
        }

        if(notificationLabel) {
            values.push(notificationLabel);
            outerWhereConditions.push(`notification_label = $${values.length}`);
        }

        const whereClauses = outerWhereConditions.length > 0 ? `WHERE ${outerWhereConditions.join(' AND ')}` : '';

        const sortColumMap = {
            installationDate: 'installation_date',
            remainingDays: '(maintenance_end_date::date - CURRENT_DATE)'
        };

        let orderByClauses = 'ORDER BY installation_date DESC, created_at DESC';

        if(sortColum && sortColumMap[sortColum]) {
            let finalOrderBy;
            const sqlSortExpression = sortColumMap[sortColum];
            if(sortColum === 'remainingDays') {
                finalOrderBy = `ORDER BY ${sqlSortExpression} ASC NULLS LAST`;
            } else {
                finalOrderBy = `ORDER BY ${sqlSortExpression} DESC`;
            }
            orderByClauses = finalOrderBy;
        }

        
        
        const query = `
            WITH ProductWithLabel AS (
                SELECT
                    *,
                    (${dynamicCaseStatement}) AS notification_label
                FROM
                    product
            )
            SELECT
                idx
                , device_identifier
                , device_name
                , device_ip
                , service_type
                , device_type
                , TO_CHAR(installation_date, 'YYYY-MM-DD') AS installation_date
                , TO_CHAR(maintenance_end_date, 'YYYY-MM-DD') AS maintenance_end_date
                , notification_label
            FROM
                ProductWithLabel
            ${whereClauses}
            ${orderByClauses}
        `;

        const result = await client.query(query, values);

        return result.rows;

    } catch (error) {

        logger.error('routes/productManager/services/productService.js, findAllWithSummuries, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 유지보수 만료일이 특정일인 모든 제품을 조회
exports.findWithNearbyMaintenanceEndDate = async (daysLeft) => {

    const client = await pool.connect();

    try {

        const query = `
            SELECT
                device_name
                , service_type
                , device_type
                , TO_CHAR(installation_date, 'YYYY-MM-DD') AS installation_date
                , TO_CHAR(maintenance_end_date, 'YYYY-MM-DD') AS maintenance_end_date
                , (maintenance_end_date::date - CURRENT_DATE) AS days_remaining
            FROM
                product
            WHERE
                (maintenance_end_date::date - CURRENT_DATE) = ANY($1::int[])
            ORDER BY
                days_remaining ASC;
        `;

        const result = await client.query(query, [daysLeft]);

        return result.rows;

    } catch (error) {

        logger.error('routes/productManager/services/productService.js, findProductsNearingMaintenanceEnd, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 제품 테이블에 등록된 모든 타입 조회
exports.findTypes = async ({ requestType }) => {

    const client = await pool.connect();

    const validColumns = {
        'service': 'service_type',
        'device': 'device_type'
    };

    const columnNmae = validColumns[requestType];

    try {

        await this.syncDevicesAndProducts();

        const query = `
            SELECT DISTINCT ${columnNmae}
            FROM product
            WHERE ${columnNmae} IS NOT NULL;
        `;

        const result = await client.query(query);

        return result.rows.map(row => row[columnNmae]);

    } catch (error) {

        logger.error('routes/productManager/services/productService.js, findtypes, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 기기 테이블, 제품 테이블 동기화
exports.syncDevicesAndProducts = async () => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const mergeQuery = `
            MERGE INTO 
                product p
            USING 
                all_devices_view v
                ON (p.device_identifier = v.device_identifier::jsonb)
            WHEN 
                MATCHED 
                AND 
                (
                    p.device_name IS DISTINCT FROM NULLIF(v.device_name, '')
                    OR p.device_ip IS DISTINCT FROM NULLIF(v.device_ip, '')
                    OR p.service_type IS DISTINCT FROM NULLIF(v.service_type, '')
                    OR p.device_type IS DISTINCT FROM NULLIF(v.device_type, '')
                    OR p.location IS DISTINCT FROM NULLIF(v.location, '')
                ) 
                THEN
                    UPDATE SET
                        device_name = NULLIF(v.device_name, '')
                        , device_ip = NULLIF(v.device_ip, '')
                        , service_type = NULLIF(v.service_type, '')
                        , device_type = NULLIF(v.device_type, '')
                        , location = NULLIF(v.location, '')
            WHEN
                NOT MATCHED
                THEN
                    INSERT 
                        (
                            device_identifier
                            , device_name
                            , device_ip
                            , service_type
                            , device_type
                            , location
                            , installation_date
                            , created_at
                        )
                    VALUES
                        (
                            v.device_identifier::jsonb
                            , NULLIF(v.device_name, '')
                            , NULLIF(v.device_ip, '')
                            , NULLIF(v.service_type, '')
                            , NULLIF(v.device_type, '')
                            , NULLIF(v.location, '')
                            , v.created_at::date
                            , v.created_at
                        );
        `;

        const mergeResult = await client.query(mergeQuery);

        const deleteQuery = `
            DELETE
            FROM
                product p
            WHERE
                NOT EXISTS (
                    SELECT 1
                    FROM all_devices_view v
                    WHERE v.device_identifier::jsonb = p.device_identifier
                );
        `;

        const deleteResult = await client.query(deleteQuery);
        
        await client.query('COMMIT');

        return (mergeResult.rowCount || 0) + (deleteResult.rowCount || 0);

    } catch (error) {

        await client.query('ROLLBACK');
        logger.error('routes/productManager/services/productService.js, syncDevicesAndProducts, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 제품 유지보수 기간 알림 라벨 조회
exports.findNotificationLabel = async () => {

    const client = await pool.connect();

    try {

        const sortedDays = [...DAYS_TO_NOTIFY].sort((a, b) => a - b);
        const whenClause = sortedDays.map(day => {
            if(30 > day) {
                day = 30;
            }
            const label = createMaintenanceLabel(day, 'less');
            return `WHEN maintenance_end_date - CURRENT_DATE <= ${day} THEN '${label}'`;
        }).join('\n');

        const lastDay = sortedDays[sortedDays.length - 1];
        const elseLabel = createMaintenanceLabel(lastDay, 'more');

        const dynamicCaseStatement = `
            CASE
                WHEN maintenance_end_date IS NULL THEN '미입력'
                WHEN maintenance_end_date - CURRENT_DATE < 0 THEN '만료'
                ${whenClause}
                ELSE '${elseLabel}'
            END
        `;

        const query = `
            SELECT DISTINCT
                (${dynamicCaseStatement}) AS notification_label
            FROM
                product           
        `;

        const result = await client.query(query);
        const uniqueLabels = result.rows.map(row => row.notification_label);

        const order = [
            '만료',
            ...sortedDays.map(day => createMaintenanceLabel(day, 'less')),
            elseLabel,
            '미입력'
        ];

        const sortedLabels = uniqueLabels.sort((a, b) => {
            return order.indexOf(a) - order.indexOf(b);
        });

        return sortedLabels;
        
    } catch (error) {

        logger.error('routes/productManager/services/productService.js, findNotificationLabel, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

exports.findByDeviceIdentifier = findByDeviceIdentifier;
exports.findByIdxList = findByIdxList;