const mysql = require('mysql2/promise');
const { mySqlConfig } = require("../config");

const pool = mysql.createPool({
	host: mySqlConfig.WATER_DB_HOST,
	user: mySqlConfig.WATER_DB_USER,
	password: mySqlConfig.WATER_DB_PASSWORD,
	database: mySqlConfig.WATER_DB_DBNAME,
	port: mySqlConfig.WATER_DB_PORT,
	connectionLimit: 100,
});

async function executeQuery(query, params) {
	if (!query) {
		throw new Error('Query string error');
	}

	try {
		const [rows, fields] = await pool.query(query, params);
		return rows;
	} catch (error) {
		console.error('Database query error:', error);
		throw error;
	}
}

module.exports = { executeQuery };
