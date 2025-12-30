const cron = require('node-cron');
const { pool } = require("../../../db/postgresqlPool");
const logger = require("../../../logger");

const LOG_RETENTION_DAYS = 4;

const cleanupWaterLevelLogs = async () => {
    try {
        const pgClient = await pool.connect();
        try {
            const deleteQuery = `
                DELETE FROM fl_water_level_log 
                WHERE created_at < CURRENT_DATE - INTERVAL '${LOG_RETENTION_DAYS} days'
            `;

            const deleteResult = await pgClient.query(deleteQuery);

            // 삭제 기준일 로그
            const cutoffDateQuery = `
                SELECT (CURRENT_DATE - INTERVAL '${LOG_RETENTION_DAYS} days')::date as cutoff_date
            `;
            const cutoffResult = await pgClient.query(cutoffDateQuery);
            const cutoffDate = cutoffResult.rows[0].cutoff_date;

            logger.info(
                `[수위계 로그 정리] ${deleteResult.rowCount}개 삭제 ` +
                `(${cutoffDate} 이전, ${LOG_RETENTION_DAYS}일 보관 정책)`
            );

            const statsQuery = `
                SELECT 
                COUNT(*) as total_logs,
                MIN(created_at) as oldest_log,
                MAX(created_at) as newest_log,
                pg_size_pretty(pg_total_relation_size('fl_water_level_log')) as table_size
                FROM fl_water_level_log
            `;

            const statsResult = await pgClient.query(statsQuery);
            const stats = statsResult.rows[0];

            if (parseInt(stats.total_logs) > 0) {
                logger.info(
                    `[수위계 로그 통계] 총 ${stats.total_logs}개, ` +
                    `기간: ${stats.oldest_log?.toISOString().split('T')[0]} ~ ${stats.newest_log?.toISOString().split('T')[0]}, ` +
                    `테이블 크기: ${stats.table_size}`
                );
            } else {
                logger.info('[수위계 로그 통계] 로그 없음');
            }

            const modelStatsQuery = `
                SELECT 
                wl.water_level_model,
                COUNT(wll.*) as log_count
                FROM fl_water_level wl
                LEFT JOIN fl_water_level_log wll ON wl.idx = wll.water_level_idx
                GROUP BY wl.water_level_model
                ORDER BY wl.water_level_model
            `;

            const modelStatsResult = await pgClient.query(modelStatsQuery);

            return {
                deleted: deleteResult.rowCount,
                cutoffDate: cutoffDate,
                totalLogs: parseInt(stats.total_logs),
                oldestLog: stats.oldest_log,
                newestLog: stats.newest_log,
                tableSize: stats.table_size,
                modelStats: modelStatsResult.rows
            };

        } finally {
            pgClient.release();
        }
    } catch (error) {
        logger.error('[수위계 로그 정리] 오류:', error);
        return null;
    }
};

// cron job 객체 저장
let cleanupJob = null;

const startLogCleanup = () => {
    if (cleanupJob) {
        logger.warn('[수위계 로그 정리] 이미 실행 중');
        return;
    }

    logger.info(`[수위계 로그 정리] 스케줄러 시작 ` + `(${LOG_RETENTION_DAYS}일 보관, 매일 새벽 12시 실행)`);

    // 서버 시작 시 즉시 1회 실행
    cleanupWaterLevelLogs();

    // 매일 새벽 12시에 실행
    cleanupJob = cron.schedule('0 0 * * *', () => {
        logger.info('[수위계 로그 정리] 스케줄 실행 시작');
        cleanupWaterLevelLogs();
    });
};

const stopLogCleanup = () => {
    if (cleanupJob) {
        cleanupJob.stop();
        cleanupJob = null;
        logger.info('[수위계 로그 정리] 스케줄러 중지');
    }
};

module.exports = {
    cleanupWaterLevelLogs,
    startLogCleanup,
    stopLogCleanup,
    LOG_RETENTION_DAYS
};