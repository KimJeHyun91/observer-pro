const fs = require("fs").promises;
const path = require("path");

const LOG_DIR = "C:\\Program Files\\PostgreSQL\\17\\data\\log"; // 로그 폴더 경로
// const RETENTION_MINUTES = 30; // 보존 기준: 30분
const RETENTION_DAYS = 30;    // 보존 기준: 30일

const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 하루(밀리초)

// ✅ 로그 삭제 함수
async function cleanupOldLogs() {
    const now = Date.now();
    // const cutoff = now - RETENTION_MINUTES * 60 * 1000; // 30분 전 시각
    const cutoff = now - RETENTION_DAYS * 24 * 60 * 60 * 1000; // 30일 전 시각

    try {
        const entries = await fs.readdir(LOG_DIR, { withFileTypes: true });
        let deleted = 0;

        for (const entry of entries) {
            if (!entry.isFile()) continue;
            if (!entry.name.toLowerCase().endsWith(".log")) continue;

            const filePath = path.join(LOG_DIR, entry.name);
            const stat = await fs.stat(filePath);

            if (stat.mtimeMs < cutoff) {
                await fs.unlink(filePath);
                console.log(`🗑️ 삭제됨: ${entry.name}`);
                deleted++;
            }
        }

        console.log(
            `✅ ${new Date().toISOString()} → ${deleted}개 로그 삭제 완료`
        );
    } catch (err) {
        console.error("❌ 오류:", err.message);
    }
}

// ✅ 모듈 함수: 실행 시 하루 1번씩 자동 실행
exports.deletePostgresqlLog = async () => {
    // 시작 즉시 한 번 실행
    await cleanupOldLogs();

    // 하루(24시간)마다 실행
    setInterval(cleanupOldLogs, ONE_DAY_MS);
};

