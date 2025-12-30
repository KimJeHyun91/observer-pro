const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');

// 현장 수정
exports.modify = async ({ completionDate, fieldManagerName, relatedCompanies }) => {
    
    const client = await pool.connect();

    try {

        const updateQuery = `
            UPDATE
                field
            SET
                completion_date = $1
                , field_manager_name = $2
                , related_companies = $3
        `;

        const values = [
            completionDate || null,
            fieldManagerName || null,
            relatedCompanies || null
        ]

        await client.query(updateQuery, values);

        return true;

    } catch (error) {

        logger.error('routes/productManager/fieldService.js, modify, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}

// 현장 조회
exports.find = async () => {

    const client = await pool.connect();

    try {

        const query = `
            SELECT
                idx
                , TO_CHAR(completion_date, 'YYYY-MM-DD') AS completion_date
                , field_manager_name
                , related_companies
                , created_at
                , updated_at
            FROM
                field
            WHERE
                idx = 1
        `;

        const result = await client.query(query);

        return result.rows[0] || null;        

    } catch (error) {

        logger.error('routes/productManager/fieldService.js, find, error: ', error);
        throw error;

    } finally {

        client.release();

    }

}
