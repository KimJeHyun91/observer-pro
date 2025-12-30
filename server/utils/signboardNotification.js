const { pool } = require('../db/postgresqlPool');
const logger = require('../logger');

// 군위 침수차단시스템 에이엘테크 안내판 전용 함수
const sendToSignboard = async (crossing_gate_ip, status) => {
    try {
        const axios = require('axios');

        const result = await pool.query(`
            SELECT b.*
            FROM fl_signboard AS b
            JOIN fl_outside AS o
            ON b.outside_idx = o.idx
            WHERE o.crossing_gate_ip = $1
        `, [crossing_gate_ip]);

        const signboardInfo = result.rows[0];

        if (!signboardInfo || signboardInfo.signboard_controller_model !== '에이엘테크') {
            logger.debug(`[${crossing_gate_ip}] 연동된 안내판 없음 - 스킵`);
            return { success: true, skipped: true };
        }

        const signboardIp = signboardInfo.signboard_ip;
        const signboardPort = signboardInfo.signboard_port;

        const payload = {
            id: `${signboardInfo.idx}`, 
            ipaddress: crossing_gate_ip,
            status: status ? "open" : "close",
            dateTime: new Date().toISOString()
        };

        const response = await axios.post(
            `http://${signboardIp}:${signboardPort}/status/crossinggate`,
            // `http://127.0.0.1:5005/status/crossinggate`,
            payload,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            }
        );

        logger.info(`[${crossing_gate_ip}] 안내판 알림 전송 완료: ${payload.status}`);
        
        return { success: true, data: response.data };

    } catch (error) {
        logger.error(`[${crossing_gate_ip}] 안내판 알림 전송 실패:`, error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { sendToSignboard };
